import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';

export interface ConsumeTokensParams {
  tenantId: string;
  actionType: string;
  actionId?: string;
  metadata?: any;
  description?: string;
}

export interface RefillTokensParams {
  tenantId: string;
  tokens: number;
  type: 'refill' | 'allocation' | 'bonus';
  description: string;
  metadata?: any;
}

@Injectable()
export class TokensService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if tenant has sufficient token balance
   */
  async checkBalance(
    tenantId: string,
    requiredTokens: number,
  ): Promise<boolean> {
    const subscription = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId },
    });

    if (!subscription) {
      throw new BadRequestException('No active subscription found');
    }

    return subscription.tokenBalance >= requiredTokens;
  }

  /**
   * Get current token balance for tenant
   */
  async getBalance(tenantId: string) {
    const subscription = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId },
      include: {
        plan: {
          select: {
            name: true,
            displayName: true,
            monthlyTokens: true,
            overageTokenCost: true,
          },
        },
      },
    });

    if (!subscription) {
      throw new BadRequestException('No active subscription found');
    }

    // Calculate usage percentage
    const usagePercentage =
      (subscription.tokensUsedThisPeriod / subscription.monthlyAllocation) *
      100;

    // Calculate days until next refill
    const now = new Date();
    const periodEnd = new Date(subscription.currentPeriodEnd);
    const daysUntilRefill = Math.ceil(
      (periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Determine if in overage
    const isInOverage =
      subscription.tokensUsedThisPeriod > subscription.monthlyAllocation;
    const overageTokens = isInOverage
      ? subscription.tokensUsedThisPeriod - subscription.monthlyAllocation
      : 0;
    const overageCost = overageTokens * subscription.overageTokenCost;

    return {
      tokenBalance: subscription.tokenBalance,
      monthlyAllocation: subscription.monthlyAllocation,
      tokensUsedThisPeriod: subscription.tokensUsedThisPeriod,
      lifetimeTokensUsed: subscription.lifetimeTokensUsed,
      usagePercentage: Math.round(usagePercentage * 100) / 100,
      daysUntilRefill,
      isInOverage,
      overageTokens,
      overageCost: Math.round(overageCost * 100) / 100,
      plan: subscription.plan,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
    };
  }

  /**
   * Consume tokens for an action
   */
  async consumeTokens(params: ConsumeTokensParams): Promise<void> {
    const { tenantId, actionType, actionId, metadata, description } = params;

    // Get token pricing for this action
    const pricing = await this.prisma.tokenPricing.findUnique({
      where: { actionType },
    });

    if (!pricing) {
      throw new BadRequestException(
        `No pricing found for action type: ${actionType}`,
      );
    }

    if (!pricing.isActive) {
      throw new BadRequestException(`Action type ${actionType} is not active`);
    }

    const tokenCost = pricing.tokenCost;

    // Get tenant subscription
    const subscription = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId },
    });

    if (!subscription) {
      throw new BadRequestException('No active subscription found');
    }

    // Allow both 'active' and 'trial' subscriptions to consume tokens
    if (subscription.status !== 'active' && subscription.status !== 'trial') {
      throw new ForbiddenException(
        `Subscription is ${subscription.status}. Cannot consume tokens.`,
      );
    }

    // Check if sufficient balance
    if (subscription.tokenBalance < tokenCost) {
      throw new ForbiddenException(
        `Insufficient token balance. Required: ${tokenCost}, Available: ${subscription.tokenBalance}`,
      );
    }

    // Perform transaction in a single database transaction
    await this.prisma.$transaction(async (tx) => {
      // Update subscription balance
      await tx.tenantSubscription.update({
        where: { tenantId },
        data: {
          tokenBalance: subscription.tokenBalance - tokenCost,
          tokensUsedThisPeriod: subscription.tokensUsedThisPeriod + tokenCost,
          lifetimeTokensUsed: subscription.lifetimeTokensUsed + tokenCost,
        },
      });

      // Record transaction
      await tx.tokenTransaction.create({
        data: {
          tenantId,
          subscriptionId: subscription.id,
          type: 'consume',
          tokens: -tokenCost,
          balanceBefore: subscription.tokenBalance,
          balanceAfter: subscription.tokenBalance - tokenCost,
          actionType,
          actionId,
          pricingId: pricing.id,
          description:
            description ||
            `Consumed ${tokenCost} tokens for ${pricing.displayName}`,
          metadata: metadata || {},
        },
      });
    });
  }

  /**
   * Refill tokens (for purchases, monthly allocations, bonuses)
   */
  async refillTokens(params: RefillTokensParams): Promise<void> {
    const { tenantId, tokens, type, description, metadata } = params;

    if (tokens <= 0) {
      throw new BadRequestException('Token amount must be positive');
    }

    const subscription = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId },
    });

    if (!subscription) {
      throw new BadRequestException('No active subscription found');
    }

    // Perform transaction
    await this.prisma.$transaction(async (tx) => {
      // Update subscription balance
      await tx.tenantSubscription.update({
        where: { tenantId },
        data: {
          tokenBalance: subscription.tokenBalance + tokens,
        },
      });

      // Record transaction
      await tx.tokenTransaction.create({
        data: {
          tenantId,
          subscriptionId: subscription.id,
          type,
          tokens: tokens,
          balanceBefore: subscription.tokenBalance,
          balanceAfter: subscription.tokenBalance + tokens,
          description,
          metadata: metadata || {},
        },
      });
    });
  }

  /**
   * Get token transaction history
   */
  async getTransactionHistory(
    tenantId: string,
    options?: {
      limit?: number;
      offset?: number;
      type?: string;
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    const { limit = 50, offset = 0, type, startDate, endDate } = options || {};

    const where: any = { tenantId };

    if (type) {
      where.type = type;
    }

    if (startDate || endDate) {
      where.created = {};
      if (startDate) where.created.gte = startDate;
      if (endDate) where.created.lte = endDate;
    }

    const [transactions, total] = await Promise.all([
      this.prisma.tokenTransaction.findMany({
        where,
        orderBy: { created: 'desc' },
        take: limit,
        skip: offset,
        include: {
          tokenPricing: {
            select: {
              displayName: true,
              category: true,
            },
          },
        },
      }),
      this.prisma.tokenTransaction.count({ where }),
    ]);

    return {
      transactions,
      total,
      limit,
      offset,
      hasMore: offset + transactions.length < total,
    };
  }

  /**
   * Get token usage analytics
   */
  async getUsageAnalytics(
    tenantId: string,
    period: 'day' | 'week' | 'month' = 'month',
  ) {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    const transactions = await this.prisma.tokenTransaction.findMany({
      where: {
        tenantId,
        type: 'consume',
        created: {
          gte: startDate,
        },
      },
      include: {
        tokenPricing: {
          select: {
            category: true,
            displayName: true,
          },
        },
      },
    });

    // Aggregate by category
    const byCategory: Record<string, { tokens: number; count: number }> = {};
    let totalTokens = 0;

    for (const tx of transactions) {
      const category = tx.tokenPricing?.category || 'other';
      const tokens = Math.abs(tx.tokens);

      if (!byCategory[category]) {
        byCategory[category] = { tokens: 0, count: 0 };
      }

      byCategory[category].tokens += tokens;
      byCategory[category].count++;
      totalTokens += tokens;
    }

    // Convert to array and sort by usage
    const categoryBreakdown = Object.entries(byCategory)
      .map(([category, data]) => ({
        category,
        tokens: data.tokens,
        count: data.count,
        percentage: Math.round((data.tokens / totalTokens) * 10000) / 100,
      }))
      .sort((a, b) => b.tokens - a.tokens);

    return {
      period,
      startDate,
      endDate: now,
      totalTokensConsumed: totalTokens,
      totalTransactions: transactions.length,
      categoryBreakdown,
    };
  }

  /**
   * Get token pricing catalog
   */
  async getPricingCatalog(category?: string) {
    const where: any = {};

    if (category) {
      where.category = category;
    }

    const pricing = await this.prisma.tokenPricing.findMany({
      where,
      orderBy: [{ category: 'asc' }, { tokenCost: 'asc' }],
    });

    return pricing;
  }

  /**
   * Check if action is allowed (has sufficient tokens)
   */
  async canPerformAction(
    tenantId: string,
    actionType: string,
  ): Promise<boolean> {
    const pricing = await this.prisma.tokenPricing.findUnique({
      where: { actionType },
    });

    if (!pricing || !pricing.isActive) {
      return false;
    }

    return this.checkBalance(tenantId, pricing.tokenCost);
  }

  /**
   * Get estimated token cost for action
   */
  async getActionCost(actionType: string): Promise<number> {
    const pricing = await this.prisma.tokenPricing.findUnique({
      where: { actionType },
    });

    if (!pricing) {
      throw new BadRequestException(
        `No pricing found for action type: ${actionType}`,
      );
    }

    return pricing.tokenCost;
  }

  /**
   * Purchase additional tokens (for overage)
   */
  async purchaseTokens(
    tenantId: string,
    tokenAmount: number,
    paymentInfo?: any,
  ) {
    if (tokenAmount <= 0) {
      throw new BadRequestException('Token amount must be positive');
    }

    const subscription = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId },
    });

    if (!subscription) {
      throw new BadRequestException('No active subscription found');
    }

    // Calculate cost based on overage rate
    const cost = tokenAmount * subscription.overageTokenCost;

    // In a real system, you would:
    // 1. Charge the payment method on file
    // 2. Process payment via Stripe/PayPal
    // 3. Only complete transaction if payment succeeds
    // For now, we'll just add the tokens

    const previousBalance = subscription.tokenBalance;
    const newBalance = previousBalance + tokenAmount;

    // Update subscription and record transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.tenantSubscription.update({
        where: { tenantId },
        data: {
          tokenBalance: newBalance,
        },
      });

      await tx.tokenTransaction.create({
        data: {
          tenantId,
          subscriptionId: subscription.id,
          type: 'allocation',
          tokens: tokenAmount,
          balanceBefore: previousBalance,
          balanceAfter: newBalance,
          description: `Purchased ${tokenAmount.toLocaleString()} tokens`,
          metadata: {
            tokenAmount,
            cost,
            overageRate: subscription.overageTokenCost,
            paymentInfo: paymentInfo || {},
          },
        },
      });
    });

    return {
      tokenAmount,
      cost,
      previousBalance,
      newBalance,
      overageRate: subscription.overageTokenCost,
      message: `Successfully purchased ${tokenAmount.toLocaleString()} tokens for $${cost.toFixed(2)}`,
    };
  }

  /**
   * Change subscription plan (upgrade or downgrade)
   */
  async changeSubscriptionPlan(tenantId: string, newPlanName: string) {
    // Get current subscription
    const subscription = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId },
    });

    if (!subscription) {
      throw new BadRequestException('No active subscription found');
    }

    // Prevent changing to the same plan
    if (subscription.planId === newPlanName) {
      throw new BadRequestException(
        `Already subscribed to ${newPlanName} plan`,
      );
    }

    // Define plan configurations (matching what we have in the system)
    const planConfigs: Record<
      string,
      { monthlyTokens: number; monthlyPrice: number; displayName: string }
    > = {
      professional: {
        monthlyTokens: 50000,
        monthlyPrice: 500,
        displayName: 'Professional',
      },
      advanced: {
        monthlyTokens: 125000,
        monthlyPrice: 1200,
        displayName: 'Advanced',
      },
      enterprise: {
        monthlyTokens: 300000,
        monthlyPrice: 2500,
        displayName: 'Enterprise',
      },
      ultimate: {
        monthlyTokens: 750000,
        monthlyPrice: 5000,
        displayName: 'Ultimate',
      },
    };

    const previousPlanConfig = planConfigs[subscription.planId];
    const newPlanConfig = planConfigs[newPlanName];

    if (!previousPlanConfig || !newPlanConfig) {
      throw new BadRequestException('Invalid plan specified');
    }

    // Calculate days remaining in current period
    const now = new Date();
    const periodEnd = new Date(subscription.currentPeriodEnd);
    const periodStart = new Date(subscription.currentPeriodStart);
    const totalDaysInPeriod = Math.ceil(
      (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24),
    );
    const daysRemaining = Math.ceil(
      (periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    const daysElapsed = totalDaysInPeriod - daysRemaining;

    // Calculate pro-rated token adjustment
    // Give them the full new monthly allocation minus what they've already used as a percentage of time elapsed
    const percentElapsed = daysElapsed / totalDaysInPeriod;
    const tokenAdjustment =
      newPlanConfig.monthlyTokens - subscription.tokensUsedThisPeriod;

    // Calculate pro-rated price difference
    const previousDailyCost = previousPlanConfig.monthlyPrice / 30;
    const newDailyCost = newPlanConfig.monthlyPrice / 30;
    const proRatedPriceDifference =
      Math.round((newDailyCost - previousDailyCost) * daysRemaining * 100) /
      100;

    const previousTokenBalance = subscription.tokenBalance;
    const newTokenBalance = subscription.tokenBalance + tokenAdjustment;

    // Update subscription in transaction
    await this.prisma.$transaction(async (tx) => {
      // Update subscription
      await tx.tenantSubscription.update({
        where: { tenantId },
        data: {
          planId: newPlanName,
          monthlyAllocation: newPlanConfig.monthlyTokens,
          tokenBalance: newTokenBalance,
        },
      });

      // Record transaction for plan change
      await tx.tokenTransaction.create({
        data: {
          tenantId,
          subscriptionId: subscription.id,
          type: 'allocation',
          tokens: tokenAdjustment,
          balanceBefore: previousTokenBalance,
          balanceAfter: newTokenBalance,
          description: `Plan changed from ${previousPlanConfig.displayName} to ${newPlanConfig.displayName}`,
          metadata: {
            previousPlan: subscription.planId,
            newPlan: newPlanName,
            previousMonthlyAllocation: subscription.monthlyAllocation,
            newMonthlyAllocation: newPlanConfig.monthlyTokens,
            daysRemainingInPeriod: daysRemaining,
            proRatedPriceDifference,
          },
        },
      });
    });

    const isUpgrade =
      newPlanConfig.monthlyPrice > previousPlanConfig.monthlyPrice;
    const message = isUpgrade
      ? `Your plan has been upgraded to ${newPlanConfig.displayName}. You received ${tokenAdjustment} tokens. Your next billing cycle starts on ${periodEnd.toISOString().split('T')[0]}.`
      : `Your plan has been changed to ${newPlanConfig.displayName}. Your token balance has been adjusted by ${tokenAdjustment}. Your next billing cycle starts on ${periodEnd.toISOString().split('T')[0]}.`;

    return {
      previousPlan: subscription.planId,
      newPlan: newPlanName,
      previousTokenBalance,
      newTokenBalance,
      tokenAdjustment,
      newMonthlyAllocation: newPlanConfig.monthlyTokens,
      previousMonthlyPrice: previousPlanConfig.monthlyPrice,
      newMonthlyPrice: newPlanConfig.monthlyPrice,
      proRatedPriceDifference,
      daysRemainingInPeriod: daysRemaining,
      effectiveDate: now.toISOString(),
      message,
    };
  }
}
