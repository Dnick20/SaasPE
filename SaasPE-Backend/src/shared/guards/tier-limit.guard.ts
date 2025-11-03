import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../database/prisma.service';

/**
 * TierLimitGuard
 *
 * Enforces subscription tier limits on mailbox creation.
 *
 * Usage:
 * ```ts
 * @UseGuards(TierLimitGuard)
 * @SetMetadata('limitType', 'mailboxes')
 * @Post()
 * async create(@Body() dto: CreateMailboxDto) {
 *   // Will only execute if under mailbox limit
 * }
 * ```
 *
 * Limits:
 * - Starter: 100 mailboxes (unlimitedMailboxes = false)
 * - Pro/Enterprise: Unlimited (unlimitedMailboxes = true)
 */
@Injectable()
export class TierLimitGuard implements CanActivate {
  private readonly logger = new Logger(TierLimitGuard.name);
  private readonly DEFAULT_MAILBOX_LIMIT = 100;

  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.user?.tenantId;

    if (!tenantId) {
      throw new ForbiddenException('Tenant ID not found in request');
    }

    // Get the limit type from metadata (e.g., 'mailboxes', 'contacts')
    const limitType = this.reflector.get<string>(
      'limitType',
      context.getHandler(),
    );

    if (!limitType) {
      // If no limit type specified, allow request
      return true;
    }

    if (limitType === 'mailboxes') {
      return await this.checkMailboxLimit(tenantId);
    }

    // Add other limit types here as needed
    // e.g., if (limitType === 'contacts') return await this.checkContactLimit(tenantId);

    return true;
  }

  /**
   * Check if tenant can create more mailboxes
   */
  private async checkMailboxLimit(tenantId: string): Promise<boolean> {
    try {
      // Load tenant subscription with plan
      const subscription = await this.prisma.tenantSubscription.findUnique({
        where: { tenantId },
        include: {
          plan: true,
        },
      });

      if (!subscription) {
        throw new ForbiddenException(
          'No active subscription found. Please subscribe to a plan to add mailboxes.',
        );
      }

      // Check if plan has unlimited mailboxes
      if (subscription.plan.unlimitedMailboxes) {
        this.logger.log(`Tenant ${tenantId} has unlimited mailboxes`);
        return true;
      }

      // Count current mailboxes
      const currentCount = await this.prisma.mailbox.count({
        where: { tenantId },
      });

      this.logger.log(
        `Tenant ${tenantId} has ${currentCount}/${this.DEFAULT_MAILBOX_LIMIT} mailboxes`,
      );

      // Check if under limit
      if (currentCount >= this.DEFAULT_MAILBOX_LIMIT) {
        throw new ForbiddenException(
          `Mailbox limit reached (${this.DEFAULT_MAILBOX_LIMIT}). ` +
            `Upgrade to Pro or Enterprise for unlimited mailboxes.`,
        );
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error(
        `Failed to check mailbox limit: ${error.message}`,
        error.stack,
      );
      throw new ForbiddenException('Failed to verify subscription limits');
    }
  }

  /**
   * Check if tenant can add more contacts (for future use)
   */
  private async checkContactLimit(tenantId: string): Promise<boolean> {
    try {
      const subscription = await this.prisma.tenantSubscription.findUnique({
        where: { tenantId },
        include: {
          plan: true,
        },
      });

      if (!subscription) {
        throw new ForbiddenException(
          'No active subscription found. Please subscribe to a plan.',
        );
      }

      const contactLimit = subscription.plan.contactLimit;

      if (contactLimit === 0) {
        // 0 means unlimited
        return true;
      }

      const currentCount = await this.prisma.client.count({
        where: { tenantId },
      });

      if (currentCount >= contactLimit) {
        throw new ForbiddenException(
          `Contact limit reached (${contactLimit}). ` +
            `Upgrade your plan for more contacts.`,
        );
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error(
        `Failed to check contact limit: ${error.message}`,
        error.stack,
      );
      throw new ForbiddenException('Failed to verify subscription limits');
    }
  }
}
