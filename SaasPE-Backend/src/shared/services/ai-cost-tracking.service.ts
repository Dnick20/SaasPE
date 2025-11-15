import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

interface CostEntry {
  proposalId: string;
  tenantId: string;
  phase: 1 | 2;
  model: string;
  operation: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  metadata?: Record<string, any>;
  timestamp: Date;
}

interface CostSummary {
  totalCost: number;
  totalProposals: number;
  averageCostPerProposal: number;
  phase1Count: number;
  phase2Count: number;
  phase1TotalCost: number;
  phase2TotalCost: number;
  costByModel: Record<string, number>;
  costByOperation: Record<string, number>;
  timeRange: {
    start: Date;
    end: Date;
  };
}

interface Budget {
  tenantId: string;
  dailyLimit: number;
  monthlyLimit: number;
  alertThreshold: number; // Percentage of limit to trigger alert (e.g., 80)
}

@Injectable()
export class AICostTrackingService {
  private readonly logger = new Logger(AICostTrackingService.name);

  // Model pricing per 1M tokens (as of Jan 2024)
  private readonly PRICING = {
    'gpt-4o-mini': {
      input: 0.150 / 1_000_000,  // $0.150 per 1M input tokens
      output: 0.600 / 1_000_000, // $0.600 per 1M output tokens
    },
    'gpt-4o': {
      input: 2.50 / 1_000_000,   // $2.50 per 1M input tokens
      output: 10.00 / 1_000_000, // $10.00 per 1M output tokens
    },
    'gpt-4-turbo': {
      input: 10.00 / 1_000_000,
      output: 30.00 / 1_000_000,
    },
  };

  constructor(private prisma: PrismaService) {}

  /**
   * Calculate cost based on token usage
   */
  calculateCost(
    model: string,
    promptTokens: number,
    completionTokens: number,
  ): number {
    const pricing = this.PRICING[model];
    if (!pricing) {
      this.logger.warn(`Unknown model pricing: ${model}. Using gpt-4o pricing as fallback.`);
      return this.PRICING['gpt-4o'].input * promptTokens +
             this.PRICING['gpt-4o'].output * completionTokens;
    }

    return pricing.input * promptTokens + pricing.output * completionTokens;
  }

  /**
   * Track AI cost for a proposal generation
   */
  async trackCost(entry: Omit<CostEntry, 'timestamp'>): Promise<void> {
    try {
      // Calculate cost if not provided
      const cost = entry.cost || this.calculateCost(
        entry.model,
        entry.promptTokens,
        entry.completionTokens,
      );

      // Store in database
      await this.prisma.aICostLog.create({
        data: {
          proposalId: entry.proposalId,
          tenantId: entry.tenantId,
          phase: entry.phase,
          model: entry.model,
          operation: entry.operation,
          promptTokens: entry.promptTokens,
          completionTokens: entry.completionTokens,
          totalTokens: entry.totalTokens,
          cost: cost,
          metadata: entry.metadata || {},
          timestamp: new Date(),
        },
      });

      this.logger.log(
        `Tracked cost: $${cost.toFixed(4)} for proposal ${entry.proposalId} ` +
        `(${entry.operation}, Phase ${entry.phase})`
      );

      // Check budgets
      await this.checkBudget(entry.tenantId, cost);
    } catch (error) {
      this.logger.error(`Failed to track cost: ${error.message}`, error.stack);
    }
  }

  /**
   * Get cost summary for a time range
   */
  async getCostSummary(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<CostSummary> {
    const costs = await this.prisma.aICostLog.findMany({
      where: {
        tenantId,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const phase1Costs = costs.filter(c => c.phase === 1);
    const phase2Costs = costs.filter(c => c.phase === 2);

    const costByModel: Record<string, number> = {};
    const costByOperation: Record<string, number> = {};

    costs.forEach(cost => {
      costByModel[cost.model] = (costByModel[cost.model] || 0) + cost.cost;
      costByOperation[cost.operation] = (costByOperation[cost.operation] || 0) + cost.cost;
    });

    const uniqueProposals = new Set(costs.map(c => c.proposalId)).size;
    const totalCost = costs.reduce((sum, c) => sum + c.cost, 0);

    return {
      totalCost,
      totalProposals: uniqueProposals,
      averageCostPerProposal: uniqueProposals > 0 ? totalCost / uniqueProposals : 0,
      phase1Count: new Set(phase1Costs.map(c => c.proposalId)).size,
      phase2Count: new Set(phase2Costs.map(c => c.proposalId)).size,
      phase1TotalCost: phase1Costs.reduce((sum, c) => sum + c.cost, 0),
      phase2TotalCost: phase2Costs.reduce((sum, c) => sum + c.cost, 0),
      costByModel,
      costByOperation,
      timeRange: {
        start: startDate,
        end: endDate,
      },
    };
  }

  /**
   * Get detailed cost breakdown for a specific proposal
   */
  async getProposalCostBreakdown(proposalId: string) {
    const costs = await this.prisma.aICostLog.findMany({
      where: { proposalId },
      orderBy: { timestamp: 'asc' },
    });

    const totalCost = costs.reduce((sum, c) => sum + c.cost, 0);
    const totalTokens = costs.reduce((sum, c) => sum + c.totalTokens, 0);

    const byOperation: Record<string, { cost: number; tokens: number; count: number }> = {};
    costs.forEach(cost => {
      if (!byOperation[cost.operation]) {
        byOperation[cost.operation] = { cost: 0, tokens: 0, count: 0 };
      }
      byOperation[cost.operation].cost += cost.cost;
      byOperation[cost.operation].tokens += cost.totalTokens;
      byOperation[cost.operation].count += 1;
    });

    return {
      proposalId,
      totalCost,
      totalTokens,
      operationCount: costs.length,
      phase: costs[0]?.phase || 1,
      byOperation,
      timeline: costs.map(c => ({
        operation: c.operation,
        cost: c.cost,
        tokens: c.totalTokens,
        timestamp: c.timestamp,
      })),
    };
  }

  /**
   * Check if tenant is approaching or exceeding budget
   */
  private async checkBudget(tenantId: string, newCost: number): Promise<void> {
    // Get today's costs
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dailyCosts = await this.prisma.aICostLog.aggregate({
      where: {
        tenantId,
        timestamp: {
          gte: today,
          lt: tomorrow,
        },
      },
      _sum: {
        cost: true,
      },
    });

    const dailyTotal = (dailyCosts._sum.cost || 0) + newCost;

    // Get month's costs
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const monthlyCosts = await this.prisma.aICostLog.aggregate({
      where: {
        tenantId,
        timestamp: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      _sum: {
        cost: true,
      },
    });

    const monthlyTotal = (monthlyCosts._sum.cost || 0) + newCost;

    // Check against budgets (these would be stored in database in production)
    const DAILY_BUDGET = parseFloat(process.env.AI_DAILY_BUDGET || '100');
    const MONTHLY_BUDGET = parseFloat(process.env.AI_MONTHLY_BUDGET || '3000');
    const ALERT_THRESHOLD = parseFloat(process.env.AI_ALERT_THRESHOLD || '80');

    if (dailyTotal > DAILY_BUDGET) {
      this.logger.error(
        `🚨 BUDGET EXCEEDED: Daily AI costs ($${dailyTotal.toFixed(2)}) exceed budget ($${DAILY_BUDGET}) ` +
        `for tenant ${tenantId}`
      );
      // In production, send alert to admin/tenant
    } else if (dailyTotal > (DAILY_BUDGET * ALERT_THRESHOLD / 100)) {
      this.logger.warn(
        `⚠️  BUDGET WARNING: Daily AI costs ($${dailyTotal.toFixed(2)}) approaching budget ($${DAILY_BUDGET}) ` +
        `for tenant ${tenantId}`
      );
    }

    if (monthlyTotal > MONTHLY_BUDGET) {
      this.logger.error(
        `🚨 BUDGET EXCEEDED: Monthly AI costs ($${monthlyTotal.toFixed(2)}) exceed budget ($${MONTHLY_BUDGET}) ` +
        `for tenant ${tenantId}`
      );
    } else if (monthlyTotal > (MONTHLY_BUDGET * ALERT_THRESHOLD / 100)) {
      this.logger.warn(
        `⚠️  BUDGET WARNING: Monthly AI costs ($${monthlyTotal.toFixed(2)}) approaching budget ($${MONTHLY_BUDGET}) ` +
        `for tenant ${tenantId}`
      );
    }
  }

  /**
   * Get Phase 1 vs Phase 2 cost comparison
   */
  async getPhaseComparison(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const summary = await this.getCostSummary(tenantId, startDate, endDate);

    const phase1Avg = summary.phase1Count > 0
      ? summary.phase1TotalCost / summary.phase1Count
      : 0;

    const phase2Avg = summary.phase2Count > 0
      ? summary.phase2TotalCost / summary.phase2Count
      : 0;

    const costIncrease = phase1Avg > 0
      ? ((phase2Avg - phase1Avg) / phase1Avg) * 100
      : 0;

    return {
      phase1: {
        count: summary.phase1Count,
        totalCost: summary.phase1TotalCost,
        averageCost: phase1Avg,
      },
      phase2: {
        count: summary.phase2Count,
        totalCost: summary.phase2TotalCost,
        averageCost: phase2Avg,
      },
      comparison: {
        costIncrease: costIncrease,
        costIncreaseAbsolute: phase2Avg - phase1Avg,
        recommendation: this.getRecommendation(costIncrease),
      },
    };
  }

  private getRecommendation(costIncrease: number): string {
    if (costIncrease < 30) {
      return 'Excellent! Phase 2 provides significant quality improvement with minimal cost increase.';
    } else if (costIncrease < 50) {
      return 'Good! Phase 2 cost increase is within acceptable range given quality improvements.';
    } else if (costIncrease < 75) {
      return 'Moderate! Consider optimizing Phase 2 prompts or implementing selective usage.';
    } else {
      return 'High! Review Phase 2 usage patterns and consider cost optimization strategies.';
    }
  }

  /**
   * Get cost trends over time
   */
  async getCostTrends(
    tenantId: string,
    days: number = 30,
  ) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const costs = await this.prisma.aICostLog.findMany({
      where: {
        tenantId,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        timestamp: 'asc',
      },
    });

    // Group by day
    const dailyCosts: Record<string, { total: number; phase1: number; phase2: number; count: number }> = {};

    costs.forEach(cost => {
      const day = cost.timestamp.toISOString().split('T')[0];
      if (!dailyCosts[day]) {
        dailyCosts[day] = { total: 0, phase1: 0, phase2: 0, count: 0 };
      }
      dailyCosts[day].total += cost.cost;
      if (cost.phase === 1) {
        dailyCosts[day].phase1 += cost.cost;
      } else {
        dailyCosts[day].phase2 += cost.cost;
      }
      dailyCosts[day].count += 1;
    });

    return Object.entries(dailyCosts)
      .map(([date, data]) => ({
        date,
        total: data.total,
        phase1: data.phase1,
        phase2: data.phase2,
        operationCount: data.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}
