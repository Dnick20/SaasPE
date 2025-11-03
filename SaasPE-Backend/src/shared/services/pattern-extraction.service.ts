import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { FeedbackValidationService } from './feedback-validation.service';

interface EditPattern {
  type: string;
  category: string;
  frequency: number;
  examples: string[];
  impact: 'high' | 'medium' | 'low';
}

interface UserProfile {
  userId: string;
  tenantId: string;
  preferredTone?: string;
  preferredLength?: string;
  topEditPatterns: EditPattern[];
  commonStrengths: string[];
  commonWeaknesses: string[];
  avoidPatterns: string[];
  emphasizePatterns: string[];
  sampleSize: number;
  confidenceScore: number;
}

@Injectable()
export class PatternExtractionService {
  private readonly logger = new Logger(PatternExtractionService.name);

  // Temporal decay settings
  private readonly HALF_LIFE_DAYS = 90; // Feedback loses 50% weight after 90 days
  private readonly MIN_WEIGHT = 0.1; // Never fully discard old data

  constructor(
    private prisma: PrismaService,
    private feedbackValidation: FeedbackValidationService
  ) {}

  /**
   * Build complete user learning profile from feedback and edit history
   */
  async buildUserProfile(userId: string): Promise<UserProfile | null> {
    // Get edit history
    const edits = await this.prisma.proposalEditTracking.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 100, // Last 100 edits
    });

    // Get feedback history
    const feedback = await this.prisma.aIGenerationFeedback.findMany({
      where: { userId },
      orderBy: { created: 'desc' },
      take: 100,
    });

    if (edits.length < 3 && feedback.length < 3) {
      this.logger.log(`Insufficient data for user ${userId}: ${edits.length} edits, ${feedback.length} feedback`);
      return null; // Need at least 3 data points
    }

    const tenantId = edits[0]?.tenantId || feedback[0]?.tenantId;
    if (!tenantId) return null;

    // Extract patterns
    const tone = await this.extractTonePreference(edits);
    const length = await this.extractLengthPreference(edits);
    const editPatterns = await this.aggregateEditPatterns(edits);
    const strengths = await this.identifyStrengths(feedback);
    const weaknesses = await this.identifyWeaknesses(edits, feedback);
    const avoidPatterns = this.extractAvoidPatterns(editPatterns);
    const emphasizePatterns = this.extractEmphasizePatterns(editPatterns);

    // Calculate confidence score
    const confidence = this.calculateProfileConfidence(edits.length + feedback.length, editPatterns);

    return {
      userId,
      tenantId,
      preferredTone: tone,
      preferredLength: length,
      topEditPatterns: editPatterns.slice(0, 10), // Top 10
      commonStrengths: strengths,
      commonWeaknesses: weaknesses,
      avoidPatterns,
      emphasizePatterns,
      sampleSize: edits.length + feedback.length,
      confidenceScore: confidence,
    };
  }

  /**
   * Extract user's preferred tone from edit history
   */
  private async extractTonePreference(edits: any[]): Promise<string | undefined> {
    const toneEdits = edits.filter(e =>
      e.editCategory && e.editCategory.startsWith('tone_')
    );

    if (toneEdits.length === 0) return undefined;

    // Count target tones (e.g., "tone_professional_to_casual" → "casual")
    const toneCounts: Record<string, number> = {};

    toneEdits.forEach(edit => {
      const match = edit.editCategory.match(/tone_\w+_to_(\w+)/);
      if (match) {
        const targetTone = match[1];
        const weight = this.calculateRecencyWeight(edit.timestamp);
        toneCounts[targetTone] = (toneCounts[targetTone] || 0) + weight;
      }
    });

    // Return most frequent tone (weighted by recency)
    const sorted = Object.entries(toneCounts).sort(([, a], [, b]) => b - a);
    return sorted.length > 0 ? sorted[0][0] : undefined;
  }

  /**
   * Extract user's preferred length from edit history
   */
  private async extractLengthPreference(edits: any[]): Promise<string | undefined> {
    const lengthEdits = edits.filter(e => e.editType === 'length_change');

    if (lengthEdits.length < 5) return undefined;

    // Calculate average length change
    const totalOrigLength = lengthEdits.reduce((sum, e) => sum + e.originalText.length, 0);
    const totalEditLength = lengthEdits.reduce((sum, e) => sum + e.editedText.length, 0);

    const avgOriginal = totalOrigLength / lengthEdits.length;
    const avgEdited = totalEditLength / lengthEdits.length;

    const ratio = avgEdited / avgOriginal;

    // Categorize
    if (ratio < 0.8) {
      return 'concise'; // User consistently shortens content
    } else if (ratio > 1.2) {
      return 'comprehensive'; // User consistently expands content
    } else {
      return 'detailed'; // User keeps similar length
    }
  }

  /**
   * Aggregate edit patterns with weighted voting
   */
  private async aggregateEditPatterns(edits: any[]): Promise<EditPattern[]> {
    const patternMap = new Map<string, EditPattern>();

    edits.forEach(edit => {
      if (!edit.editCategory) return;

      const key = `${edit.editType}:${edit.editCategory}`;
      const weight = this.calculateRecencyWeight(edit.timestamp);

      if (patternMap.has(key)) {
        const existing = patternMap.get(key)!;
        existing.frequency += weight;
        existing.examples.push(edit.editedText.substring(0, 100));
      } else {
        patternMap.set(key, {
          type: edit.editType,
          category: edit.editCategory,
          frequency: weight,
          examples: [edit.editedText.substring(0, 100)],
          impact: this.determineImpact(edit.editCategory),
        });
      }
    });

    // Sort by frequency and return
    return Array.from(patternMap.values())
      .sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Identify user's strengths (sections consistently rated high or left unedited)
   */
  private async identifyStrengths(feedback: any[]): Promise<string[]> {
    const strengths: string[] = [];

    // Group feedback by section (if available in metadata)
    const sectionRatings = new Map<string, number[]>();

    feedback.forEach(f => {
      if (f.detailedRatings) {
        Object.entries(f.detailedRatings).forEach(([section, rating]) => {
          if (!sectionRatings.has(section)) {
            sectionRatings.set(section, []);
          }
          sectionRatings.get(section)!.push(rating as number);
        });
      }
    });

    // Find sections with consistently high ratings (avg > 4.0)
    sectionRatings.forEach((ratings, section) => {
      const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      if (avg >= 4.0 && ratings.length >= 3) {
        strengths.push(section);
      }
    });

    return strengths;
  }

  /**
   * Identify user's weaknesses (sections consistently edited or rated low)
   */
  private async identifyWeaknesses(edits: any[], feedback: any[]): Promise<string[]> {
    const weaknesses = new Set<string>();

    // Check edit frequency by section
    const sectionEditCounts = new Map<string, number>();
    edits.forEach(edit => {
      const count = sectionEditCounts.get(edit.section) || 0;
      sectionEditCounts.set(edit.section, count + 1);
    });

    // Sections edited frequently are weaknesses
    const totalEdits = edits.length;
    sectionEditCounts.forEach((count, section) => {
      if (count / totalEdits > 0.3) { // More than 30% of edits in this section
        weaknesses.add(section);
      }
    });

    // Check low ratings by section
    const sectionRatings = new Map<string, number[]>();
    feedback.forEach(f => {
      if (f.detailedRatings) {
        Object.entries(f.detailedRatings).forEach(([section, rating]) => {
          if (!sectionRatings.has(section)) {
            sectionRatings.set(section, []);
          }
          sectionRatings.get(section)!.push(rating as number);
        });
      }
    });

    sectionRatings.forEach((ratings, section) => {
      const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      if (avg < 3.0) { // Average rating below 3/5
        weaknesses.add(section);
      }
    });

    return Array.from(weaknesses);
  }

  /**
   * Extract patterns user consistently removes
   */
  private extractAvoidPatterns(patterns: EditPattern[]): string[] {
    return patterns
      .filter(p => p.type === 'deletion' && p.frequency > 2)
      .map(p => p.category)
      .slice(0, 5); // Top 5 avoid patterns
  }

  /**
   * Extract patterns user consistently adds
   */
  private extractEmphasizePatterns(patterns: EditPattern[]): string[] {
    return patterns
      .filter(p => p.type === 'addition' && p.frequency > 2)
      .map(p => p.category)
      .slice(0, 5); // Top 5 emphasize patterns
  }

  /**
   * Calculate temporal weight using exponential decay
   */
  private calculateRecencyWeight(timestamp: Date): number {
    const now = new Date();
    const ageInDays = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60 * 24);

    // Exponential decay: weight = e^(-age / halfLife)
    const weight = Math.exp(-ageInDays / this.HALF_LIFE_DAYS);

    return Math.max(weight, this.MIN_WEIGHT);
  }

  /**
   * Calculate profile confidence based on sample size and pattern clarity
   */
  private calculateProfileConfidence(sampleSize: number, patterns: EditPattern[]): number {
    // Base confidence from sample size (sigmoid function)
    // 0 samples → 0.0, 5 samples → 0.5, 20 samples → 0.9
    const sizeConfidence = 1 / (1 + Math.exp(-0.3 * (sampleSize - 10)));

    // Pattern clarity (high-frequency patterns increase confidence)
    let patternClarity = 0;
    if (patterns.length > 0) {
      const topPattern = patterns[0];
      patternClarity = Math.min(topPattern.frequency / 10, 1.0); // Cap at 1.0
    }

    // Weighted average
    return 0.7 * sizeConfidence + 0.3 * patternClarity;
  }

  /**
   * Determine impact level of a pattern category
   */
  private determineImpact(category: string): 'high' | 'medium' | 'low' {
    const highImpact = [
      'adds_metrics',
      'adds_client_specifics',
      'adds_risk_mitigation',
      'removes_jargon',
    ];

    const mediumImpact = [
      'adds_technical_details',
      'adds_timeline_details',
      'removes_redundancy',
      'removes_fluff',
    ];

    if (highImpact.includes(category)) return 'high';
    if (mediumImpact.includes(category)) return 'medium';
    return 'low';
  }

  /**
   * Save user profile to database
   */
  async saveUserProfile(profile: UserProfile): Promise<void> {
    try {
      await this.prisma.userLearningPreferences.upsert({
        where: { userId: profile.userId },
        create: {
          userId: profile.userId,
          tenantId: profile.tenantId,
          preferredTone: profile.preferredTone,
          preferredLength: profile.preferredLength,
          topEditPatterns: profile.topEditPatterns as any,
          commonStrengths: profile.commonStrengths as any,
          commonWeaknesses: profile.commonWeaknesses as any,
          avoidPatterns: profile.avoidPatterns,
          emphasizePatterns: profile.emphasizePatterns,
          sampleSize: profile.sampleSize,
          confidenceScore: profile.confidenceScore,
        },
        update: {
          preferredTone: profile.preferredTone,
          preferredLength: profile.preferredLength,
          topEditPatterns: profile.topEditPatterns as any,
          commonStrengths: profile.commonStrengths as any,
          commonWeaknesses: profile.commonWeaknesses as any,
          avoidPatterns: profile.avoidPatterns,
          emphasizePatterns: profile.emphasizePatterns,
          sampleSize: profile.sampleSize,
          confidenceScore: profile.confidenceScore,
        },
      });

      this.logger.log(
        `Saved profile for user ${profile.userId}: ` +
        `confidence=${profile.confidenceScore.toFixed(2)}, ` +
        `samples=${profile.sampleSize}, ` +
        `patterns=${profile.topEditPatterns.length}`
      );
    } catch (error) {
      this.logger.error(`Failed to save user profile: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Rebuild profiles for all users in a tenant (batch operation)
   */
  async rebuildTenantProfiles(tenantId: string): Promise<number> {
    // Get all users with feedback or edits
    const usersWithEdits = await this.prisma.proposalEditTracking.findMany({
      where: { tenantId },
      distinct: ['userId'],
      select: { userId: true },
    });

    const usersWithFeedback = await this.prisma.aIGenerationFeedback.findMany({
      where: { tenantId },
      distinct: ['userId'],
      select: { userId: true },
    });

    // Combine and deduplicate
    const allUserIds = new Set([
      ...usersWithEdits.map(u => u.userId),
      ...usersWithFeedback.map(u => u.userId!).filter(Boolean),
    ]);

    this.logger.log(`Rebuilding profiles for ${allUserIds.size} users in tenant ${tenantId}`);

    let successCount = 0;
    for (const userId of allUserIds) {
      try {
        const profile = await this.buildUserProfile(userId);
        if (profile) {
          await this.saveUserProfile(profile);
          successCount++;
        }
      } catch (error) {
        this.logger.error(`Failed to rebuild profile for user ${userId}: ${error.message}`);
      }
    }

    this.logger.log(`Successfully rebuilt ${successCount}/${allUserIds.size} profiles`);
    return successCount;
  }

  /**
   * Get profile statistics for a tenant
   */
  async getTenantProfileStats(tenantId: string) {
    const profiles = await this.prisma.userLearningPreferences.findMany({
      where: { tenantId },
    });

    if (profiles.length === 0) {
      return {
        totalProfiles: 0,
        avgConfidence: 0,
        avgSampleSize: 0,
        toneDistribution: {},
        lengthDistribution: {},
      };
    }

    const avgConfidence = profiles.reduce((sum, p) => sum + p.confidenceScore, 0) / profiles.length;
    const avgSampleSize = profiles.reduce((sum, p) => sum + p.sampleSize, 0) / profiles.length;

    // Tone distribution
    const toneDistribution: Record<string, number> = {};
    profiles.forEach(p => {
      if (p.preferredTone) {
        toneDistribution[p.preferredTone] = (toneDistribution[p.preferredTone] || 0) + 1;
      }
    });

    // Length distribution
    const lengthDistribution: Record<string, number> = {};
    profiles.forEach(p => {
      if (p.preferredLength) {
        lengthDistribution[p.preferredLength] = (lengthDistribution[p.preferredLength] || 0) + 1;
      }
    });

    return {
      totalProfiles: profiles.length,
      avgConfidence,
      avgSampleSize,
      toneDistribution,
      lengthDistribution,
      highConfidenceProfiles: profiles.filter(p => p.confidenceScore > 0.7).length,
    };
  }
}
