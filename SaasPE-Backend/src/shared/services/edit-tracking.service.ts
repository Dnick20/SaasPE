import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { diff_match_patch } from 'diff-match-patch';

interface EditData {
  proposalId: string;
  userId: string;
  tenantId: string;
  section: string;
  originalText: string;
  editedText: string;
  clientIndustry?: string;
  proposalType?: string;
}

interface EditPattern {
  type: 'addition' | 'deletion' | 'replacement' | 'tone_shift' | 'length_change';
  category: string;
  examples: string[];
  impact: 'high' | 'medium' | 'low';
}

interface EditAnalysis {
  editType: string;
  editCategory: string;
  editDistance: number;
  editMagnitude: number;
  patterns: EditPattern[];
}

@Injectable()
export class EditTrackingService {
  private readonly logger = new Logger(EditTrackingService.name);
  private readonly dmp = new diff_match_patch();

  constructor(private prisma: PrismaService) {}

  /**
   * Track edits made to a proposal section
   */
  async trackEdit(editData: EditData): Promise<void> {
    try {
      // Analyze the edit
      const analysis = this.analyzeEdit(editData.originalText, editData.editedText);

      // Store in database
      await this.prisma.proposalEditTracking.create({
        data: {
          proposalId: editData.proposalId,
          userId: editData.userId,
          tenantId: editData.tenantId,
          section: editData.section,
          originalText: editData.originalText,
          editedText: editData.editedText,
          editType: analysis.editType,
          editCategory: analysis.editCategory,
          editDistance: analysis.editDistance,
          editMagnitude: analysis.editMagnitude,
          clientIndustry: editData.clientIndustry,
          proposalType: editData.proposalType,
          timestamp: new Date(),
        },
      });

      this.logger.log(
        `Tracked edit for proposal ${editData.proposalId}, section ${editData.section}: ` +
        `${analysis.editType} (${(analysis.editMagnitude * 100).toFixed(1)}% changed)`
      );
    } catch (error) {
      this.logger.error(`Failed to track edit: ${error.message}`, error.stack);
    }
  }

  /**
   * Analyze differences between original and edited text
   */
  private analyzeEdit(original: string, edited: string): EditAnalysis {
    // Calculate Levenshtein distance
    const editDistance = this.calculateLevenshteinDistance(original, edited);

    // Calculate edit magnitude (percentage changed)
    const maxLength = Math.max(original.length, edited.length);
    const editMagnitude = maxLength > 0 ? editDistance / maxLength : 0;

    // Determine edit type
    const editType = this.determineEditType(original, edited, editMagnitude);

    // Categorize the edit
    const editCategory = this.categorizeEdit(original, edited, editType);

    // Extract patterns
    const patterns = this.extractPatterns(original, edited);

    return {
      editType,
      editCategory,
      editDistance,
      editMagnitude,
      patterns,
    };
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private calculateLevenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    // Create distance matrix
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Determine the primary type of edit
   */
  private determineEditType(
    original: string,
    edited: string,
    magnitude: number
  ): string {
    const origLength = original.length;
    const editLength = edited.length;
    const lengthRatio = editLength / (origLength || 1);

    // Check for major length changes
    if (lengthRatio < 0.8) {
      return 'deletion';
    } else if (lengthRatio > 1.2) {
      return 'addition';
    }

    // Check for tone shift
    if (this.detectToneShift(original, edited)) {
      return 'tone_shift';
    }

    // Check for minor vs major edits
    if (magnitude < 0.2) {
      return 'replacement'; // Minor changes
    } else {
      return 'replacement'; // Major rewrite
    }
  }

  /**
   * Categorize the edit based on content analysis
   */
  private categorizeEdit(original: string, edited: string, editType: string): string {
    const diff = this.dmp.diff_main(original, edited);
    this.dmp.diff_cleanupSemantic(diff);

    const additions = diff.filter(([op]) => op === 1).map(([_, text]) => text).join(' ');
    const deletions = diff.filter(([op]) => op === -1).map(([_, text]) => text).join(' ');

    // Analyze additions
    if (editType === 'addition' || additions.length > deletions.length) {
      return this.categorizeAdditions(additions);
    }

    // Analyze deletions
    if (editType === 'deletion' || deletions.length > additions.length) {
      return this.categorizeDeletions(deletions);
    }

    // Analyze tone/style changes
    if (editType === 'tone_shift') {
      const toneChange = this.analyzeToneChange(original, edited);
      return `tone_${toneChange.from}_to_${toneChange.to}`;
    }

    return 'general_edit';
  }

  /**
   * Categorize text additions
   */
  private categorizeAdditions(addedText: string): string {
    const lower = addedText.toLowerCase();

    // Check for metrics/numbers
    if (/\d+%|\$\d+|increase|decrease|roi|kpi|metric/i.test(lower)) {
      return 'adds_metrics';
    }

    // Check for client-specific details
    if (/specifically|unique|tailored|custom|your|client/i.test(lower)) {
      return 'adds_client_specifics';
    }

    // Check for risk mitigation
    if (/risk|mitigation|guarantee|insurance|protection/i.test(lower)) {
      return 'adds_risk_mitigation';
    }

    // Check for technical details
    if (/implement|configure|deploy|integrate|setup|technical/i.test(lower)) {
      return 'adds_technical_details';
    }

    // Check for timeline/deadlines
    if (/deadline|timeline|schedule|delivery|milestone/i.test(lower)) {
      return 'adds_timeline_details';
    }

    return 'adds_generic_content';
  }

  /**
   * Categorize text deletions
   */
  private categorizeDeletions(deletedText: string): string {
    const lower = deletedText.toLowerCase();

    // Check for jargon removal
    if (/leverage|utilize|synergy|paradigm|ecosystem|robust/i.test(lower)) {
      return 'removes_jargon';
    }

    // Check for generic fluff
    if (/very|really|just|actually|basically|simply/i.test(lower)) {
      return 'removes_fluff';
    }

    // Check for redundancy
    if (/again|repeat|reiterate|aforementioned|previously/i.test(lower)) {
      return 'removes_redundancy';
    }

    return 'removes_generic_content';
  }

  /**
   * Detect tone shifts between original and edited text
   */
  private detectToneShift(original: string, edited: string): boolean {
    const origTone = this.analyzeTone(original);
    const editTone = this.analyzeTone(edited);

    return origTone !== editTone;
  }

  /**
   * Analyze the tone of text
   */
  private analyzeTone(text: string): 'professional' | 'casual' | 'consultative' | 'technical' {
    const lower = text.toLowerCase();

    // Professional indicators
    const professionalWords = ['hereby', 'pursuant', 'therefore', 'accordingly', 'regarding'];
    const professionalScore = professionalWords.filter(word => lower.includes(word)).length;

    // Casual indicators
    const casualWords = ['we\'ll', 'you\'ll', 'let\'s', 'we\'re', 'you\'re'];
    const casualScore = casualWords.filter(word => lower.includes(word)).length;

    // Consultative indicators
    const consultativeWords = ['recommend', 'suggest', 'advise', 'propose', 'consider'];
    const consultativeScore = consultativeWords.filter(word => lower.includes(word)).length;

    // Technical indicators
    const technicalWords = ['implement', 'configure', 'integrate', 'api', 'database'];
    const technicalScore = technicalWords.filter(word => lower.includes(word)).length;

    // Determine dominant tone
    const scores = {
      professional: professionalScore,
      casual: casualScore,
      consultative: consultativeScore,
      technical: technicalScore,
    };

    return Object.entries(scores).reduce((a, b) => (scores[a[0]] > scores[b[0]] ? a : b))[0] as any;
  }

  /**
   * Analyze tone change between original and edited
   */
  private analyzeToneChange(original: string, edited: string): { from: string; to: string } {
    return {
      from: this.analyzeTone(original),
      to: this.analyzeTone(edited),
    };
  }

  /**
   * Extract patterns from the edit
   */
  private extractPatterns(original: string, edited: string): EditPattern[] {
    const patterns: EditPattern[] = [];
    const diff = this.dmp.diff_main(original, edited);
    this.dmp.diff_cleanupSemantic(diff);

    // Extract additions
    const additions = diff.filter(([op]) => op === 1).map(([_, text]) => text);
    if (additions.length > 0) {
      const category = this.categorizeAdditions(additions.join(' '));
      patterns.push({
        type: 'addition',
        category,
        examples: additions.slice(0, 3), // First 3 examples
        impact: this.determineImpact(category),
      });
    }

    // Extract deletions
    const deletions = diff.filter(([op]) => op === -1).map(([_, text]) => text);
    if (deletions.length > 0) {
      const category = this.categorizeDeletions(deletions.join(' '));
      patterns.push({
        type: 'deletion',
        category,
        examples: deletions.slice(0, 3),
        impact: this.determineImpact(category),
      });
    }

    return patterns;
  }

  /**
   * Determine impact level of a pattern
   */
  private determineImpact(category: string): 'high' | 'medium' | 'low' {
    const highImpactCategories = [
      'adds_metrics',
      'adds_client_specifics',
      'adds_risk_mitigation',
      'removes_jargon',
    ];

    const mediumImpactCategories = [
      'adds_technical_details',
      'adds_timeline_details',
      'removes_redundancy',
    ];

    if (highImpactCategories.includes(category)) {
      return 'high';
    } else if (mediumImpactCategories.includes(category)) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Get edit history for a user
   */
  async getUserEditHistory(userId: string, limit: number = 100) {
    return this.prisma.proposalEditTracking.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  /**
   * Get edit statistics for a user
   */
  async getUserEditStats(userId: string) {
    const edits = await this.prisma.proposalEditTracking.findMany({
      where: { userId },
    });

    if (edits.length === 0) {
      return null;
    }

    // Calculate statistics
    const totalEdits = edits.length;
    const avgEditMagnitude = edits.reduce((sum, e) => sum + (e.editMagnitude || 0), 0) / totalEdits;

    // Count by type
    const typeCount: Record<string, number> = {};
    const categoryCount: Record<string, number> = {};
    const sectionCount: Record<string, number> = {};

    edits.forEach(edit => {
      typeCount[edit.editType] = (typeCount[edit.editType] || 0) + 1;
      if (edit.editCategory) {
        categoryCount[edit.editCategory] = (categoryCount[edit.editCategory] || 0) + 1;
      }
      sectionCount[edit.section] = (sectionCount[edit.section] || 0) + 1;
    });

    // Find most edited section
    const mostEditedSection = Object.entries(sectionCount)
      .sort(([, a], [, b]) => b - a)[0];

    // Find most common category
    const mostCommonCategory = Object.entries(categoryCount)
      .sort(([, a], [, b]) => b - a)[0];

    return {
      totalEdits,
      avgEditMagnitude,
      typeDistribution: typeCount,
      categoryDistribution: categoryCount,
      sectionDistribution: sectionCount,
      mostEditedSection: mostEditedSection ? mostEditedSection[0] : null,
      mostCommonEditCategory: mostCommonCategory ? mostCommonCategory[0] : null,
    };
  }
}
