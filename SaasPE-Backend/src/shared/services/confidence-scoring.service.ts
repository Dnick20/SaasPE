import { Injectable, Logger } from '@nestjs/common';

/**
 * Confidence Scoring Service
 *
 * Implements IR v2.0.31 confidence scoring and quality tracking.
 * Aggregates section-level confidence scores and provides quality metrics.
 */

export interface SectionConfidence {
  overall: number;
  [key: string]: number; // Additional dimension-specific scores
}

export interface SourceReference {
  insight: string;
  confidence: number;
  location: string;
}

export interface SectionQuality {
  sectionName: string;
  confidence: SectionConfidence;
  sources?: SourceReference[];
  reasoning?: string;
  flags?: string[]; // Quality warnings
}

export interface ProposalQualityMetrics {
  overallConfidence: number;
  sectionScores: Record<string, number>;
  lowConfidenceSections: string[]; // Sections with confidence < 0.6
  flaggedForReview: string[]; // Sections requiring manual review
  coverageScore: number; // Percentage of sections with confidence >= 0.6
  dataAvailabilityScore: number; // How much source data was available
  validationPassed: boolean;
}

@Injectable()
export class ConfidenceScoringService {
  private readonly logger = new Logger(ConfidenceScoringService.name);

  private readonly CONFIDENCE_THRESHOLD_LOW = 0.6;
  private readonly CONFIDENCE_THRESHOLD_HIGH = 0.8;

  /**
   * Calculate overall proposal quality metrics from section confidence scores
   */
  calculateProposalMetrics(
    sectionQualities: SectionQuality[],
  ): ProposalQualityMetrics {
    this.logger.debug(
      `Calculating proposal metrics for ${sectionQualities.length} sections`,
    );

    const sectionScores: Record<string, number> = {};
    const lowConfidenceSections: string[] = [];
    const flaggedForReview: string[] = [];

    // Aggregate section scores
    sectionQualities.forEach((section) => {
      const score = section.confidence.overall;
      sectionScores[section.sectionName] = score;

      if (score < this.CONFIDENCE_THRESHOLD_LOW) {
        lowConfidenceSections.push(section.sectionName);
        flaggedForReview.push(section.sectionName);
      }

      // Check for additional flags
      if (section.flags && section.flags.length > 0) {
        flaggedForReview.push(section.sectionName);
      }
    });

    // Calculate overall confidence (weighted average)
    const overallConfidence = this.calculateWeightedAverage(sectionQualities);

    // Calculate coverage score (% of sections with confidence >= 0.6)
    const sectionsWithGoodConfidence = sectionQualities.filter(
      (s) => s.confidence.overall >= this.CONFIDENCE_THRESHOLD_LOW,
    ).length;
    const coverageScore =
      sectionQualities.length > 0
        ? sectionsWithGoodConfidence / sectionQualities.length
        : 0;

    // Calculate data availability score (average of source confidence)
    const dataAvailabilityScore = this.calculateDataAvailability(
      sectionQualities,
    );

    // Validation: Pass if coverage >= 80% and overall confidence >= 0.6
    const validationPassed =
      coverageScore >= 0.8 && overallConfidence >= this.CONFIDENCE_THRESHOLD_LOW;

    const metrics: ProposalQualityMetrics = {
      overallConfidence,
      sectionScores,
      lowConfidenceSections: Array.from(new Set(lowConfidenceSections)),
      flaggedForReview: Array.from(new Set(flaggedForReview)),
      coverageScore,
      dataAvailabilityScore,
      validationPassed,
    };

    this.logger.log(
      `Proposal metrics calculated: overall=${overallConfidence.toFixed(2)}, coverage=${(coverageScore * 100).toFixed(0)}%, validation=${validationPassed}`,
    );

    return metrics;
  }

  /**
   * Calculate weighted average of section confidence scores
   * Critical sections (Executive Summary, Pricing) get higher weight
   */
  private calculateWeightedAverage(
    sectionQualities: SectionQuality[],
  ): number {
    if (sectionQualities.length === 0) return 0;

    const weights: Record<string, number> = {
      executiveSummary: 1.5,
      pricing: 1.5,
      objectivesAndOutcomes: 1.3,
      scopeOfWork: 1.2,
      deliverables: 1.2,
      overview: 1.0,
      approachAndTools: 1.0,
      timeline: 1.0,
      paymentTerms: 0.8,
      cancellationNotice: 0.8,
    };

    let weightedSum = 0;
    let totalWeight = 0;

    sectionQualities.forEach((section) => {
      const weight = weights[section.sectionName] || 1.0;
      weightedSum += section.confidence.overall * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Calculate data availability score from source references
   */
  private calculateDataAvailability(
    sectionQualities: SectionQuality[],
  ): number {
    const sectionsWithSources = sectionQualities.filter(
      (s) => s.sources && s.sources.length > 0,
    );

    if (sectionsWithSources.length === 0) return 0;

    const averageSourceConfidence =
      sectionsWithSources.reduce((sum, section) => {
        const avgSourceConf =
          section.sources!.reduce((s, src) => s + src.confidence, 0) /
          section.sources!.length;
        return sum + avgSourceConf;
      }, 0) / sectionsWithSources.length;

    return averageSourceConfidence;
  }

  /**
   * Validate and normalize confidence score to 0.0-1.0 range
   */
  validateConfidenceScore(score: any, sectionName: string): number {
    if (typeof score !== 'number') {
      this.logger.warn(
        `Invalid confidence score for ${sectionName}: ${typeof score}. Defaulting to 0.5`,
      );
      return 0.5;
    }

    if (score < 0 || score > 1) {
      this.logger.warn(
        `Confidence score out of range for ${sectionName}: ${score}. Clamping to [0,1]`,
      );
      return Math.max(0, Math.min(1, score));
    }

    return score;
  }

  /**
   * Extract confidence data from AI response
   * Handles various response formats for backward compatibility
   */
  extractConfidenceFromResponse(
    response: any,
    sectionName: string,
  ): SectionQuality | null {
    if (!response) {
      this.logger.warn(`No response for section ${sectionName}`);
      return null;
    }

    // New format with confidence object
    if (response.confidence && typeof response.confidence === 'object') {
      const overall = this.validateConfidenceScore(
        response.confidence.overall,
        sectionName,
      );

      return {
        sectionName,
        confidence: {
          overall,
          ...response.confidence,
        },
        sources: response.sources || [],
        reasoning: response.reasoning,
        flags: this.detectQualityFlags(response, overall),
      };
    }

    // Legacy format without confidence - assume medium confidence
    this.logger.debug(
      `No confidence data in response for ${sectionName}, assuming 0.7`,
    );
    return {
      sectionName,
      confidence: { overall: 0.7 },
      sources: [],
      reasoning: 'Legacy format - no confidence tracking',
      flags: ['LEGACY_FORMAT'],
    };
  }

  /**
   * Detect quality flags based on confidence scores and response data
   */
  private detectQualityFlags(response: any, overallConfidence: number): string[] {
    const flags: string[] = [];

    // Low confidence flag
    if (overallConfidence < this.CONFIDENCE_THRESHOLD_LOW) {
      flags.push('LOW_CONFIDENCE');
    }

    // Missing sources flag
    if (!response.sources || response.sources.length === 0) {
      flags.push('NO_SOURCES');
    }

    // Missing reasoning flag
    if (!response.reasoning || response.reasoning.trim().length === 0) {
      flags.push('NO_REASONING');
    }

    // Check for SMART validation failures (objectives section)
    if (response.smartValidation) {
      const failedCriteria = Object.entries(response.smartValidation)
        .filter(([_, value]) => value === false)
        .map(([key]) => key);

      if (failedCriteria.length > 0) {
        flags.push(`SMART_FAILED:${failedCriteria.join(',')}`);
      }
    }

    // Check dimension-specific low scores
    if (response.confidence) {
      Object.entries(response.confidence).forEach(([dimension, score]) => {
        if (
          dimension !== 'overall' &&
          typeof score === 'number' &&
          score < this.CONFIDENCE_THRESHOLD_LOW
        ) {
          flags.push(`LOW_${dimension.toUpperCase()}`);
        }
      });
    }

    return flags;
  }

  /**
   * Generate user-friendly quality report for display
   */
  generateQualityReport(metrics: ProposalQualityMetrics): string {
    const lines: string[] = [];

    lines.push(
      `Overall Confidence: ${(metrics.overallConfidence * 100).toFixed(0)}%`,
    );
    lines.push(`Coverage Score: ${(metrics.coverageScore * 100).toFixed(0)}%`);
    lines.push(
      `Data Availability: ${(metrics.dataAvailabilityScore * 100).toFixed(0)}%`,
    );
    lines.push(
      `Validation Status: ${metrics.validationPassed ? 'PASSED ✓' : 'NEEDS REVIEW ⚠'}`,
    );

    if (metrics.lowConfidenceSections.length > 0) {
      lines.push('');
      lines.push('Low Confidence Sections:');
      metrics.lowConfidenceSections.forEach((section) => {
        const score = metrics.sectionScores[section];
        lines.push(`  - ${section}: ${(score * 100).toFixed(0)}%`);
      });
    }

    if (metrics.flaggedForReview.length > 0) {
      lines.push('');
      lines.push('Flagged for Review:');
      metrics.flaggedForReview.forEach((section) => {
        lines.push(`  - ${section}`);
      });
    }

    return lines.join('\n');
  }
}
