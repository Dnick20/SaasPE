import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';

/**
 * Statistical significance threshold (95% confidence)
 * Using Z-score of 1.96 for two-tailed test
 */
const SIGNIFICANCE_THRESHOLD = 1.96;

export interface ABTestVariant {
  id: string;
  name: string; // "A", "B", "C"
  subject: string;
  body: string;
  percentage: number; // 0-100

  // Metrics
  sentCount: number;
  openedCount: number;
  clickedCount: number;
  repliedCount: number;

  // Calculated rates
  openRate: number;
  clickRate: number;
  replyRate: number;
}

export interface ABTest {
  campaignId: string;
  status: 'running' | 'completed' | 'cancelled';
  metric: 'opens' | 'clicks' | 'replies'; // What to optimize for
  variants: ABTestVariant[];
  winner?: string; // Variant ID
  winnerDeclaredAt?: Date;
  created: Date;
}

/**
 * A/B Testing Service for Campaign Optimization
 *
 * Features:
 * - Multi-variant testing (A/B/C/D/etc)
 * - Statistical significance calculation
 * - Automatic winner detection
 * - Performance tracking per variant
 * - Smart traffic distribution
 */
@Injectable()
export class ABTestingService {
  private readonly logger = new Logger(ABTestingService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create an A/B test for a campaign
   */
  async createABTest(
    campaignId: string,
    tenantId: string,
    variants: Array<{
      name: string;
      subject: string;
      body: string;
      percentage: number;
    }>,
    metric: 'opens' | 'clicks' | 'replies' = 'opens',
  ): Promise<ABTest> {
    // Validate campaign exists
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId, tenantId },
    });

    if (!campaign) {
      throw new BadRequestException('Campaign not found');
    }

    if (campaign.status !== 'draft') {
      throw new BadRequestException(
        'Can only create A/B test for draft campaigns',
      );
    }

    // Validate variants
    if (variants.length < 2) {
      throw new BadRequestException(
        'At least 2 variants required for A/B test',
      );
    }

    const totalPercentage = variants.reduce((sum, v) => sum + v.percentage, 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      throw new BadRequestException('Variant percentages must sum to 100');
    }

    // Create test structure
    const test: ABTest = {
      campaignId,
      status: 'running',
      metric,
      variants: variants.map((v, index) => ({
        id: `variant_${index}`,
        name: v.name,
        subject: v.subject,
        body: v.body,
        percentage: v.percentage,
        sentCount: 0,
        openedCount: 0,
        clickedCount: 0,
        repliedCount: 0,
        openRate: 0,
        clickRate: 0,
        replyRate: 0,
      })),
      created: new Date(),
    };

    // Store test in campaign metadata
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        // Use sequence field to store A/B test data
        sequence: test as any,
      },
    });

    this.logger.log(
      `Created A/B test for campaign ${campaignId} with ${variants.length} variants`,
    );

    return test;
  }

  /**
   * Get A/B test for a campaign
   */
  async getABTest(campaignId: string): Promise<ABTest | null> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { sequence: true },
    });

    if (!campaign || !campaign.sequence) {
      return null;
    }

    const data = campaign.sequence as any;

    // Check if sequence contains A/B test data
    if (data.campaignId && data.variants && Array.isArray(data.variants)) {
      return data as ABTest;
    }

    return null;
  }

  /**
   * Assign a contact to a variant based on distribution percentages
   */
  assignVariant(test: ABTest, contactEmail: string): ABTestVariant {
    // Use email hash for deterministic assignment
    const hash = this.hashString(contactEmail);
    const random = (hash % 10000) / 100; // 0-100

    let cumulative = 0;
    for (const variant of test.variants) {
      cumulative += variant.percentage;
      if (random < cumulative) {
        return variant;
      }
    }

    // Fallback to last variant
    return test.variants[test.variants.length - 1];
  }

  /**
   * Record email sent for a variant
   */
  async recordSent(campaignId: string, variantId: string): Promise<void> {
    const test = await this.getABTest(campaignId);
    if (!test) return;

    const variant = test.variants.find((v) => v.id === variantId);
    if (variant) {
      variant.sentCount++;
      await this.saveTest(campaignId, test);
    }
  }

  /**
   * Record email opened for a variant
   */
  async recordOpened(campaignId: string, variantId: string): Promise<void> {
    const test = await this.getABTest(campaignId);
    if (!test) return;

    const variant = test.variants.find((v) => v.id === variantId);
    if (variant) {
      variant.openedCount++;
      variant.openRate =
        variant.sentCount > 0 ? variant.openedCount / variant.sentCount : 0;
      await this.saveTest(campaignId, test);
      await this.checkForWinner(campaignId, test);
    }
  }

  /**
   * Record email clicked for a variant
   */
  async recordClicked(campaignId: string, variantId: string): Promise<void> {
    const test = await this.getABTest(campaignId);
    if (!test) return;

    const variant = test.variants.find((v) => v.id === variantId);
    if (variant) {
      variant.clickedCount++;
      variant.clickRate =
        variant.sentCount > 0 ? variant.clickedCount / variant.sentCount : 0;
      await this.saveTest(campaignId, test);
      await this.checkForWinner(campaignId, test);
    }
  }

  /**
   * Record email replied for a variant
   */
  async recordReplied(campaignId: string, variantId: string): Promise<void> {
    const test = await this.getABTest(campaignId);
    if (!test) return;

    const variant = test.variants.find((v) => v.id === variantId);
    if (variant) {
      variant.repliedCount++;
      variant.replyRate =
        variant.sentCount > 0 ? variant.repliedCount / variant.sentCount : 0;
      await this.saveTest(campaignId, test);
      await this.checkForWinner(campaignId, test);
    }
  }

  /**
   * Check if we have a statistically significant winner
   */
  private async checkForWinner(
    campaignId: string,
    test: ABTest,
  ): Promise<void> {
    if (test.status !== 'running') return;

    // Need minimum sample size per variant (at least 30 for statistical validity)
    const minSampleSize = 30;
    if (test.variants.some((v) => v.sentCount < minSampleSize)) {
      return;
    }

    // Get metric rates
    const rates = test.variants.map((v) => {
      switch (test.metric) {
        case 'opens':
          return v.openRate;
        case 'clicks':
          return v.clickRate;
        case 'replies':
          return v.replyRate;
      }
    });

    // Find best performing variant
    const maxRate = Math.max(...rates);
    const bestIndex = rates.indexOf(maxRate);
    const bestVariant = test.variants[bestIndex];

    // Check statistical significance against other variants
    let isSignificant = true;

    for (let i = 0; i < test.variants.length; i++) {
      if (i === bestIndex) continue;

      const variant = test.variants[i];
      const zScore = this.calculateZScore(
        bestVariant.sentCount,
        rates[bestIndex],
        variant.sentCount,
        rates[i],
      );

      if (Math.abs(zScore) < SIGNIFICANCE_THRESHOLD) {
        isSignificant = false;
        break;
      }
    }

    if (isSignificant) {
      // Declare winner
      test.winner = bestVariant.id;
      test.winnerDeclaredAt = new Date();
      test.status = 'completed';

      await this.saveTest(campaignId, test);

      this.logger.log(
        `A/B test winner declared for campaign ${campaignId}: Variant ${bestVariant.name} (${(maxRate * 100).toFixed(1)}% ${test.metric} rate)`,
      );
    }
  }

  /**
   * Calculate Z-score for statistical significance
   * Using two-proportion z-test
   */
  private calculateZScore(
    n1: number,
    p1: number,
    n2: number,
    p2: number,
  ): number {
    // Pooled proportion
    const pPool = (n1 * p1 + n2 * p2) / (n1 + n2);

    // Standard error
    const se = Math.sqrt(pPool * (1 - pPool) * (1 / n1 + 1 / n2));

    if (se === 0) return 0;

    // Z-score
    return (p1 - p2) / se;
  }

  /**
   * Manually declare a winner (override statistical significance)
   */
  async declareWinner(
    campaignId: string,
    variantId: string,
    tenantId: string,
  ): Promise<ABTest> {
    const test = await this.getABTest(campaignId);

    if (!test) {
      throw new BadRequestException('No A/B test found for this campaign');
    }

    if (test.status !== 'running') {
      throw new BadRequestException('A/B test is not running');
    }

    const variant = test.variants.find((v) => v.id === variantId);
    if (!variant) {
      throw new BadRequestException('Variant not found');
    }

    test.winner = variantId;
    test.winnerDeclaredAt = new Date();
    test.status = 'completed';

    await this.saveTest(campaignId, test);

    this.logger.log(
      `Manually declared winner for campaign ${campaignId}: Variant ${variant.name}`,
    );

    return test;
  }

  /**
   * Cancel A/B test and revert to standard campaign
   */
  async cancelABTest(campaignId: string, tenantId: string): Promise<void> {
    const test = await this.getABTest(campaignId);

    if (!test) {
      throw new BadRequestException('No A/B test found');
    }

    if (test.status !== 'running') {
      throw new BadRequestException('Can only cancel running tests');
    }

    test.status = 'cancelled';
    await this.saveTest(campaignId, test);

    this.logger.log(`A/B test cancelled for campaign ${campaignId}`);
  }

  /**
   * Get A/B test results with recommendations
   */
  async getResults(campaignId: string) {
    const test = await this.getABTest(campaignId);

    if (!test) {
      throw new BadRequestException('No A/B test found');
    }

    // Calculate confidence intervals and recommendations
    const results = test.variants.map((variant) => {
      const rate = variant[
        `${test.metric.slice(0, -1)}Rate` as keyof ABTestVariant
      ] as number;
      const confidenceInterval = this.calculateConfidenceInterval(
        variant.sentCount,
        rate,
      );

      return {
        variantId: variant.id,
        name: variant.name,
        sentCount: variant.sentCount,
        metric: test.metric,
        rate: rate,
        ratePercent: (rate * 100).toFixed(2),
        confidenceInterval: {
          lower: (confidenceInterval.lower * 100).toFixed(2),
          upper: (confidenceInterval.upper * 100).toFixed(2),
        },
        isWinner: test.winner === variant.id,
      };
    });

    return {
      campaignId: test.campaignId,
      status: test.status,
      metric: test.metric,
      winner: test.winner,
      winnerDeclaredAt: test.winnerDeclaredAt,
      variants: results,
      recommendation: this.generateRecommendation(test, results),
    };
  }

  /**
   * Calculate 95% confidence interval
   */
  private calculateConfidenceInterval(n: number, p: number) {
    if (n === 0) return { lower: 0, upper: 0 };

    const z = 1.96; // 95% confidence
    const se = Math.sqrt((p * (1 - p)) / n);

    return {
      lower: Math.max(0, p - z * se),
      upper: Math.min(1, p + z * se),
    };
  }

  /**
   * Generate recommendation based on test results
   */
  private generateRecommendation(test: ABTest, results: any[]): string {
    if (test.status === 'completed' && test.winner) {
      const winner = results.find((r) => r.variantId === test.winner);
      return `Variant ${winner.name} is the clear winner with a ${winner.ratePercent}% ${test.metric} rate. Use this variant for the full campaign.`;
    }

    if (test.status === 'running') {
      const maxSent = Math.max(...test.variants.map((v) => v.sentCount));
      if (maxSent < 30) {
        return `Keep testing. Need at least 30 sends per variant for statistical significance. Current max: ${maxSent}`;
      }

      const rates = results.map((r) => parseFloat(r.ratePercent));
      const maxRate = Math.max(...rates);
      const minRate = Math.min(...rates);
      const difference = maxRate - minRate;

      if (difference < 5) {
        return `Results are very close (${difference.toFixed(1)}% difference). Consider running the test longer or manually selecting a winner.`;
      }

      return `Test is running. Leading variant has ${maxRate.toFixed(1)}% ${test.metric} rate. Waiting for statistical significance.`;
    }

    return 'Test cancelled or incomplete.';
  }

  /**
   * Save test data back to database
   */
  private async saveTest(campaignId: string, test: ABTest): Promise<void> {
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { sequence: test as any },
    });
  }

  /**
   * Simple string hash function for deterministic variant assignment
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}
