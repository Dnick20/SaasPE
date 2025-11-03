import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

interface FeedbackInput {
  proposalId: string;
  userId: string;
  tenantId: string;
  userRating?: number; // 1-5
  wasEdited: boolean;
  editMagnitude?: number; // 0-1 (percentage changed)
  detailedRatings?: Record<string, number>;
  outcome?: string;
  dealValue?: number;
}

interface ValidationResult {
  isValid: boolean;
  confidenceScore: number; // 0-1
  warnings: string[];
  feedbackWeight: number; // 0-5.0
}

interface FeedbackQuality {
  hasOutcome: boolean;
  hasRating: boolean;
  hasDetailedEdits: boolean;
  hasExplanation: boolean;
  editMagnitude: number;
  timeToOutcome?: number; // Days
}

@Injectable()
export class FeedbackValidationService {
  private readonly logger = new Logger(FeedbackValidationService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Validate feedback and calculate quality scores
   */
  async validateFeedback(
    feedback: FeedbackInput,
    userHistory?: any[]
  ): Promise<ValidationResult> {
    const warnings: string[] = [];
    let confidence = 1.0;

    // Get user history if not provided
    const history = userHistory || await this.getUserFeedbackHistory(feedback.userId);

    // 1. Check for contradictory signals
    const contradictions = this.detectContradictions(feedback);
    if (contradictions.length > 0) {
      warnings.push(...contradictions);
      confidence *= 0.5; // Major penalty for contradictions
    }

    // 2. Check for rating variance (low-effort feedback detection)
    if (history.length >= 5) {
      const varianceWarning = this.checkRatingVariance(feedback, history);
      if (varianceWarning) {
        warnings.push(varianceWarning);
        confidence *= 0.7;
      }
    }

    // 3. Check for pattern shifts (changing preferences)
    if (history.length >= 10) {
      const shiftWarning = this.detectPatternShift(feedback, history);
      if (shiftWarning) {
        warnings.push(shiftWarning);
        confidence *= 0.8;
      }
    }

    // 4. Check for outliers
    if (history.length >= 5) {
      const outlierWarning = this.detectOutlier(feedback, history);
      if (outlierWarning) {
        warnings.push(outlierWarning);
        confidence *= 0.85;
      }
    }

    // Calculate feedback weight based on quality
    const feedbackWeight = this.calculateFeedbackWeight({
      hasOutcome: !!feedback.outcome,
      hasRating: !!feedback.userRating,
      hasDetailedEdits: feedback.wasEdited && !!feedback.editMagnitude,
      hasExplanation: false, // We don't have this in the input yet
      editMagnitude: feedback.editMagnitude || 0,
    });

    return {
      isValid: confidence > 0.5,
      confidenceScore: confidence,
      warnings,
      feedbackWeight,
    };
  }

  /**
   * Detect contradictory signals in feedback
   */
  private detectContradictions(feedback: FeedbackInput): string[] {
    const warnings: string[] = [];

    // High rating but heavy edits
    if (
      feedback.userRating &&
      feedback.userRating >= 4 &&
      feedback.wasEdited &&
      feedback.editMagnitude &&
      feedback.editMagnitude > 0.5
    ) {
      warnings.push('high_rating_but_heavy_edits');
      this.logger.warn(
        `Contradiction detected: Rating ${feedback.userRating}/5 but ${(feedback.editMagnitude * 100).toFixed(0)}% edited`
      );
    }

    // Low rating but minimal edits
    if (
      feedback.userRating &&
      feedback.userRating <= 2 &&
      feedback.wasEdited &&
      feedback.editMagnitude &&
      feedback.editMagnitude < 0.1
    ) {
      warnings.push('low_rating_but_minimal_edits');
      this.logger.warn(
        `Contradiction detected: Rating ${feedback.userRating}/5 but only ${(feedback.editMagnitude * 100).toFixed(0)}% edited`
      );
    }

    // Won deal but low rating
    if (
      feedback.outcome === 'won_deal' &&
      feedback.userRating &&
      feedback.userRating <= 2
    ) {
      warnings.push('won_deal_but_low_rating');
      this.logger.warn(
        `Contradiction detected: Won deal but rating is ${feedback.userRating}/5`
      );
    }

    // Lost deal but high rating
    if (
      feedback.outcome === 'lost_deal' &&
      feedback.userRating &&
      feedback.userRating >= 4
    ) {
      warnings.push('lost_deal_but_high_rating');
    }

    return warnings;
  }

  /**
   * Check for low rating variance (indicates low-effort feedback)
   */
  private checkRatingVariance(
    feedback: FeedbackInput,
    userHistory: any[]
  ): string | null {
    if (!feedback.userRating) return null;

    const ratings = userHistory
      .filter(h => h.userRating)
      .map(h => h.userRating)
      .concat([feedback.userRating]);

    if (ratings.length < 5) return null;

    const variance = this.calculateVariance(ratings);

    // Very low variance suggests user is not thoughtfully rating
    if (variance < 0.1) {
      this.logger.warn(
        `Low rating variance detected (${variance.toFixed(2)}) for user - possible low-effort feedback`
      );
      return 'low_rating_variance';
    }

    // All identical ratings
    const unique = new Set(ratings);
    if (unique.size === 1) {
      return 'all_identical_ratings';
    }

    return null;
  }

  /**
   * Detect significant pattern shifts (user's preferences changed)
   */
  private detectPatternShift(
    feedback: FeedbackInput,
    userHistory: any[]
  ): string | null {
    if (!feedback.userRating || userHistory.length < 10) return null;

    // Compare recent feedback (last 5) to older feedback
    const recentHistory = userHistory.slice(-5);
    const olderHistory = userHistory.slice(0, -5);

    const recentAvg = this.calculateAverage(
      recentHistory.filter(h => h.userRating).map(h => h.userRating)
    );
    const olderAvg = this.calculateAverage(
      olderHistory.filter(h => h.userRating).map(h => h.userRating)
    );

    // Significant shift in ratings (> 2 stars difference)
    const ratingShift = Math.abs(recentAvg - olderAvg);
    if (ratingShift > 2.0) {
      this.logger.warn(
        `Pattern shift detected: Recent avg ${recentAvg.toFixed(1)} vs older avg ${olderAvg.toFixed(1)}`
      );
      return 'significant_pattern_shift';
    }

    return null;
  }

  /**
   * Detect outlier feedback (deviates significantly from user's pattern)
   */
  private detectOutlier(
    feedback: FeedbackInput,
    userHistory: any[]
  ): string | null {
    if (!feedback.userRating || userHistory.length < 5) return null;

    const ratings = userHistory
      .filter(h => h.userRating)
      .map(h => h.userRating);

    const mean = this.calculateAverage(ratings);
    const stdDev = this.calculateStandardDeviation(ratings);

    // Z-score > 2 indicates outlier (more than 2 standard deviations from mean)
    const zScore = Math.abs((feedback.userRating - mean) / stdDev);

    if (zScore > 2.0) {
      this.logger.warn(
        `Outlier detected: Rating ${feedback.userRating} is ${zScore.toFixed(1)} std devs from mean ${mean.toFixed(1)}`
      );
      return 'rating_outlier';
    }

    return null;
  }

  /**
   * Calculate feedback quality weight (0-5.0)
   */
  calculateFeedbackWeight(quality: FeedbackQuality): number {
    let weight = 1.0;

    // Outcome is the strongest signal
    if (quality.hasOutcome) {
      weight *= 3.0;
    }

    // Rating provides explicit feedback
    if (quality.hasRating) {
      weight *= 1.5;
    }

    // Detailed edits show user engagement
    if (quality.hasDetailedEdits) {
      weight *= 2.0;
    }

    // Explanation adds context
    if (quality.hasExplanation) {
      weight *= 1.3;
    }

    // Heavy edits reduce weight (indicates poor initial generation)
    if (quality.editMagnitude > 0.5) {
      weight *= 0.7;
    }

    // Quick deal closure increases weight
    if (quality.timeToOutcome && quality.timeToOutcome < 30) {
      weight *= 1.2;
    }

    // Cap at 5.0
    return Math.min(weight, 5.0);
  }

  /**
   * Get user's feedback history
   */
  private async getUserFeedbackHistory(userId: string) {
    return this.prisma.aIGenerationFeedback.findMany({
      where: { userId },
      orderBy: { created: 'desc' },
      take: 50, // Last 50 feedback items
    });
  }

  /**
   * Calculate variance of an array of numbers
   */
  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;

    const mean = this.calculateAverage(numbers);
    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
    return this.calculateAverage(squaredDiffs);
  }

  /**
   * Calculate average of an array of numbers
   */
  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  /**
   * Calculate standard deviation
   */
  private calculateStandardDeviation(numbers: number[]): number {
    return Math.sqrt(this.calculateVariance(numbers));
  }

  /**
   * Validate feedback in batch (for historical data processing)
   */
  async validateFeedbackBatch(
    feedbackItems: FeedbackInput[]
  ): Promise<Map<string, ValidationResult>> {
    const results = new Map<string, ValidationResult>();

    // Group by user
    const byUser = new Map<string, FeedbackInput[]>();
    feedbackItems.forEach(item => {
      if (!byUser.has(item.userId)) {
        byUser.set(item.userId, []);
      }
      byUser.get(item.userId)!.push(item);
    });

    // Validate each user's feedback with their history
    for (const [userId, userFeedback] of byUser.entries()) {
      const history = await this.getUserFeedbackHistory(userId);

      for (const feedback of userFeedback) {
        const validation = await this.validateFeedback(feedback, history);
        results.set(feedback.proposalId, validation);
      }
    }

    return results;
  }

  /**
   * Get validation statistics for a tenant
   */
  async getTenantValidationStats(tenantId: string) {
    const feedback = await this.prisma.aIGenerationFeedback.findMany({
      where: { tenantId },
      select: {
        id: true,
        userId: true,
        userRating: true,
        wasEdited: true,
        validationScore: true,
        validationWarnings: true,
        feedbackWeight: true,
      },
    });

    const totalFeedback = feedback.length;
    const validFeedback = feedback.filter(f => (f.validationScore || 1.0) > 0.5).length;
    const avgConfidence = this.calculateAverage(
      feedback.map(f => f.validationScore || 1.0)
    );
    const avgWeight = this.calculateAverage(
      feedback.map(f => f.feedbackWeight || 1.0)
    );

    // Count warning types
    const warningCounts: Record<string, number> = {};
    feedback.forEach(f => {
      (f.validationWarnings || []).forEach(warning => {
        warningCounts[warning] = (warningCounts[warning] || 0) + 1;
      });
    });

    return {
      totalFeedback,
      validFeedback,
      validationRate: totalFeedback > 0 ? validFeedback / totalFeedback : 0,
      avgConfidenceScore: avgConfidence,
      avgFeedbackWeight: avgWeight,
      warningDistribution: warningCounts,
    };
  }
}
