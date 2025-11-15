import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../shared/database/prisma.service';

/**
 * Subscription Scheduler Service
 *
 * Handles automated subscription-related tasks:
 * - Monthly token refills at billing period end
 * - Trial expiration checks
 * - Subscription status updates
 */
@Injectable()
export class SubscriptionSchedulerService {
  private readonly logger = new Logger(SubscriptionSchedulerService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Monthly Token Refill Job
   * Runs daily at midnight UTC to check for subscriptions that need refilling
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleMonthlyTokenRefill() {
    this.logger.log('Running monthly token refill check...');

    try {
      const now = new Date();

      // Find all subscriptions where current period has ended
      const subscriptionsToRefill =
        await this.prisma.tenantSubscription.findMany({
          where: {
            currentPeriodEnd: {
              lte: now,
            },
            status: {
              in: ['active', 'trialing'],
            },
          },
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

      this.logger.log(
        `Found ${subscriptionsToRefill.length} subscriptions to refill`,
      );

      for (const subscription of subscriptionsToRefill) {
        await this.refillSubscriptionTokens(subscription);
      }

      this.logger.log('Monthly token refill check completed');
    } catch (error) {
      this.logger.error('Failed to process monthly token refill', error.stack);
    }
  }

  /**
   * Trial Expiration Check Job
   * Runs daily at 1 AM UTC to check for expired trials
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handleTrialExpiration() {
    this.logger.log('Running trial expiration check...');

    try {
      const now = new Date();

      // Find all trialing subscriptions where trial has ended
      const expiredTrials = await this.prisma.tenantSubscription.findMany({
        where: {
          status: 'trialing',
          trialEndsAt: {
            lte: now,
          },
        },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      this.logger.log(`Found ${expiredTrials.length} expired trials`);

      for (const subscription of expiredTrials) {
        await this.handleExpiredTrial(subscription);
      }

      this.logger.log('Trial expiration check completed');
    } catch (error) {
      this.logger.error('Failed to process trial expiration', error.stack);
    }
  }

  /**
   * Refill tokens for a subscription
   */
  private async refillSubscriptionTokens(subscription: any) {
    try {
      this.logger.log(
        `Refilling tokens for tenant ${subscription.tenant.name} (${subscription.tenantId})`,
      );

      const oldBalance = subscription.tokenBalance;
      const refillAmount = subscription.monthlyAllocation;

      // Calculate new billing period (1 month forward)
      const newPeriodStart = new Date(subscription.currentPeriodEnd);
      const newPeriodEnd = new Date(newPeriodStart);
      newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

      // Update subscription
      await this.prisma.tenantSubscription.update({
        where: { id: subscription.id },
        data: {
          tokenBalance: refillAmount,
          tokensUsedThisPeriod: 0,
          currentPeriodStart: newPeriodStart,
          currentPeriodEnd: newPeriodEnd,
        },
      });

      // Record refill transaction
      await this.prisma.tokenTransaction.create({
        data: {
          tenantId: subscription.tenantId,
          subscriptionId: subscription.id,
          type: 'refill',
          tokens: refillAmount,
          balanceBefore: oldBalance,
          balanceAfter: refillAmount,
          description: `Monthly token refill - ${subscription.planId} plan`,
          metadata: {
            plan: subscription.planId,
            previousPeriodStart: subscription.currentPeriodStart.toISOString(),
            previousPeriodEnd: subscription.currentPeriodEnd.toISOString(),
            newPeriodStart: newPeriodStart.toISOString(),
            newPeriodEnd: newPeriodEnd.toISOString(),
          },
        },
      });

      this.logger.log(
        `Tokens refilled for ${subscription.tenant.name}: ${oldBalance} → ${refillAmount}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to refill tokens for subscription ${subscription.id}`,
        error.stack,
      );
    }
  }

  /**
   * Handle expired trial
   */
  private async handleExpiredTrial(subscription: any) {
    try {
      this.logger.log(
        `Trial expired for tenant ${subscription.tenant.name} (${subscription.tenantId})`,
      );

      // Update subscription status to active
      // In a real system, you might want to:
      // 1. Check if payment method is on file
      // 2. Attempt to charge the customer
      // 3. If payment fails, set status to 'past_due' or 'canceled'
      // For now, we'll just move to 'active' status

      await this.prisma.tenantSubscription.update({
        where: { id: subscription.id },
        data: {
          status: 'active',
          trialEndsAt: null,
        },
      });

      this.logger.log(
        `Trial converted to active subscription for ${subscription.tenant.name}`,
      );

      // TODO: Send email notification about trial ending
      // TODO: Trigger payment processing if payment method on file
    } catch (error) {
      this.logger.error(
        `Failed to handle expired trial for subscription ${subscription.id}`,
        error.stack,
      );
    }
  }

  /**
   * Manual token refill (for testing or admin use)
   */
  async manualRefill(tenantId: string): Promise<void> {
    const subscription = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!subscription) {
      throw new Error(`Subscription not found for tenant ${tenantId}`);
    }

    await this.refillSubscriptionTokens(subscription);
  }
}
