import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../shared/database/prisma.service';

@Injectable()
export class WarmupService {
  private readonly logger = new Logger(WarmupService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Cron job that runs daily to progress email warmup
   * Runs at 9 AM every day
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async dailyWarmupProgress() {
    this.logger.log('Starting daily warmup progress check...');

    try {
      // Find all mailboxes in warmup status
      const warmingMailboxes = await this.prisma.mailbox.findMany({
        where: {
          warmupStatus: 'WARMING',
        },
        include: {
          tenant: {
            include: {
              subscription: {
                include: {
                  plan: true,
                },
              },
            },
          },
        },
      });

      this.logger.log(`Found ${warmingMailboxes.length} mailboxes in warmup`);

      for (const mailbox of warmingMailboxes) {
        await this.progressWarmup(mailbox.id);
      }

      this.logger.log('Daily warmup progress completed');
    } catch (error) {
      this.logger.error('Error in daily warmup progress:', error);
    }
  }

  /**
   * Progress a mailbox's warmup schedule
   */
  async progressWarmup(mailboxId: string) {
    const mailbox = await this.prisma.mailbox.findUnique({
      where: { id: mailboxId },
      include: {
        tenant: {
          include: {
            subscription: {
              include: {
                plan: true,
              },
            },
          },
        },
      },
    });

    if (!mailbox) {
      this.logger.warn(`Mailbox ${mailboxId} not found`);
      return;
    }

    // Check if tenant has unlimited warmup feature
    if (!mailbox.tenant.subscription?.plan.unlimitedWarmup) {
      this.logger.warn(
        `Mailbox ${mailbox.email} tenant doesn't have unlimited warmup`,
      );
      return;
    }

    const now = new Date();
    const warmupStartDate = mailbox.warmupStartedAt || now;
    const daysActive = Math.floor(
      (now.getTime() - warmupStartDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Warmup strategy: Start at 5 emails/day, increase by 5 every 3 days
    // Until reaching target limit of 50/day over ~30 days
    const currentLimit = Math.min(
      5 + Math.floor(daysActive / 3) * 5,
      mailbox.warmupTargetLimit,
    );

    // Check if warmup is complete
    if (currentLimit >= mailbox.warmupTargetLimit) {
      await this.prisma.mailbox.update({
        where: { id: mailboxId },
        data: {
          warmupStatus: 'ACTIVE',
          warmupCurrentLimit: mailbox.warmupTargetLimit,
          warmupDaysActive: daysActive,
        },
      });

      this.logger.log(
        `Mailbox ${mailbox.email} warmup completed! Reached ${mailbox.warmupTargetLimit} emails/day`,
      );
      return;
    }

    // Update warmup progress
    await this.prisma.mailbox.update({
      where: { id: mailboxId },
      data: {
        warmupCurrentLimit: currentLimit,
        warmupDaysActive: daysActive,
        warmupEmailsSentToday: 0, // Reset daily counter
      },
    });

    this.logger.log(
      `Mailbox ${mailbox.email}: Day ${daysActive}, Limit ${currentLimit}/${mailbox.warmupTargetLimit}`,
    );
  }

  /**
   * Start warmup for a mailbox
   */
  async startWarmup(mailboxId: string, targetLimit: number = 50) {
    const mailbox = await this.prisma.mailbox.findUnique({
      where: { id: mailboxId },
      include: {
        tenant: {
          include: {
            subscription: {
              include: {
                plan: true,
              },
            },
          },
        },
      },
    });

    if (!mailbox) {
      throw new Error('Mailbox not found');
    }

    // Check if tenant has unlimited warmup feature
    if (!mailbox.tenant.subscription?.plan.unlimitedWarmup) {
      throw new Error(
        'Your plan does not include unlimited email warmup. Please upgrade.',
      );
    }

    await this.prisma.mailbox.update({
      where: { id: mailboxId },
      data: {
        warmupStatus: 'WARMING',
        warmupStartedAt: new Date(),
        warmupCurrentLimit: 5, // Start with 5 emails/day
        warmupTargetLimit: targetLimit,
        warmupDaysActive: 0,
        warmupEmailsSentToday: 0,
      },
    });

    this.logger.log(
      `Started warmup for ${mailbox.email} with target ${targetLimit} emails/day`,
    );

    return {
      success: true,
      message: `Warmup started for ${mailbox.email}. Starting at 5 emails/day, gradually increasing to ${targetLimit} emails/day over ~30 days.`,
    };
  }

  /**
   * Pause warmup for a mailbox
   */
  async pauseWarmup(mailboxId: string) {
    await this.prisma.mailbox.update({
      where: { id: mailboxId },
      data: {
        warmupStatus: 'PAUSED',
      },
    });

    this.logger.log(`Paused warmup for mailbox ${mailboxId}`);

    return {
      success: true,
      message: 'Warmup paused',
    };
  }

  /**
   * Resume warmup for a mailbox
   */
  async resumeWarmup(mailboxId: string) {
    await this.prisma.mailbox.update({
      where: { id: mailboxId },
      data: {
        warmupStatus: 'WARMING',
      },
    });

    this.logger.log(`Resumed warmup for mailbox ${mailboxId}`);

    return {
      success: true,
      message: 'Warmup resumed',
    };
  }

  /**
   * Stop warmup and mark as complete
   */
  async stopWarmup(mailboxId: string) {
    await this.prisma.mailbox.update({
      where: { id: mailboxId },
      data: {
        warmupStatus: 'ACTIVE',
      },
    });

    this.logger.log(`Stopped warmup for mailbox ${mailboxId}`);

    return {
      success: true,
      message: 'Warmup stopped. Mailbox marked as active.',
    };
  }

  /**
   * Get warmup status for a mailbox
   */
  async getWarmupStatus(mailboxId: string) {
    const mailbox = await this.prisma.mailbox.findUnique({
      where: { id: mailboxId },
      select: {
        email: true,
        warmupStatus: true,
        warmupStartedAt: true,
        warmupCurrentLimit: true,
        warmupTargetLimit: true,
        warmupDaysActive: true,
        warmupEmailsSentToday: true,
        lastWarmupEmailSent: true,
      },
    });

    if (!mailbox) {
      throw new Error('Mailbox not found');
    }

    const progress =
      mailbox.warmupTargetLimit > 0
        ? Math.round(
            (mailbox.warmupCurrentLimit / mailbox.warmupTargetLimit) * 100,
          )
        : 0;

    const estimatedDaysRemaining =
      mailbox.warmupTargetLimit > mailbox.warmupCurrentLimit
        ? Math.ceil(
            ((mailbox.warmupTargetLimit - mailbox.warmupCurrentLimit) / 5) * 3,
          )
        : 0;

    return {
      email: mailbox.email,
      status: mailbox.warmupStatus,
      startedAt: mailbox.warmupStartedAt,
      daysActive: mailbox.warmupDaysActive,
      currentLimit: mailbox.warmupCurrentLimit,
      targetLimit: mailbox.warmupTargetLimit,
      emailsSentToday: mailbox.warmupEmailsSentToday,
      lastEmailSent: mailbox.lastWarmupEmailSent,
      progress: `${progress}%`,
      estimatedDaysRemaining,
    };
  }

  /**
   * Record that a warmup email was sent
   */
  async recordWarmupEmail(mailboxId: string) {
    await this.prisma.mailbox.update({
      where: { id: mailboxId },
      data: {
        warmupEmailsSentToday: {
          increment: 1,
        },
        lastWarmupEmailSent: new Date(),
      },
    });
  }

  /**
   * Check if mailbox can send a warmup email today
   */
  async canSendWarmupEmail(mailboxId: string): Promise<boolean> {
    const mailbox = await this.prisma.mailbox.findUnique({
      where: { id: mailboxId },
      select: {
        warmupStatus: true,
        warmupCurrentLimit: true,
        warmupEmailsSentToday: true,
      },
    });

    if (!mailbox || mailbox.warmupStatus !== 'WARMING') {
      return false;
    }

    return mailbox.warmupEmailsSentToday < mailbox.warmupCurrentLimit;
  }

  /**
   * Get aggregate warmup statistics for a tenant
   */
  async getTenantWarmupStats(tenantId: string) {
    const mailboxes = await this.prisma.mailbox.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        warmupStatus: true,
        warmupStartedAt: true,
        warmupCurrentLimit: true,
        warmupTargetLimit: true,
        warmupDaysActive: true,
        warmupEmailsSentToday: true,
        lastWarmupEmailSent: true,
      },
    });

    const total = mailboxes.length;
    const byStatus = {
      warming: mailboxes.filter((m) => m.warmupStatus === 'WARMING').length,
      paused: mailboxes.filter((m) => m.warmupStatus === 'PAUSED').length,
      active: mailboxes.filter((m) => m.warmupStatus === 'ACTIVE').length,
      idle: mailboxes.filter((m) => m.warmupStatus === 'IDLE').length,
    };

    const warmingMailboxes = mailboxes.filter(
      (m) => m.warmupStatus === 'WARMING',
    );

    // Calculate average progress for warming mailboxes
    let avgProgress = 0;
    if (warmingMailboxes.length > 0) {
      const totalProgress = warmingMailboxes.reduce((sum, m) => {
        const progress =
          m.warmupTargetLimit > 0
            ? (m.warmupCurrentLimit / m.warmupTargetLimit) * 100
            : 0;
        return sum + progress;
      }, 0);
      avgProgress = Math.round(totalProgress / warmingMailboxes.length);
    }

    // Calculate total emails sent today
    const totalEmailsSentToday = mailboxes.reduce(
      (sum, m) => sum + m.warmupEmailsSentToday,
      0,
    );

    // Calculate average days active for warming mailboxes
    let avgDaysActive = 0;
    if (warmingMailboxes.length > 0) {
      const totalDays = warmingMailboxes.reduce(
        (sum, m) => sum + m.warmupDaysActive,
        0,
      );
      avgDaysActive = Math.round(totalDays / warmingMailboxes.length);
    }

    return {
      total,
      byStatus,
      warming: {
        count: byStatus.warming,
        avgProgress: `${avgProgress}%`,
        avgDaysActive,
        totalEmailsSentToday,
      },
      mailboxes: mailboxes.map((m) => {
        const progress =
          m.warmupTargetLimit > 0
            ? Math.round((m.warmupCurrentLimit / m.warmupTargetLimit) * 100)
            : 0;

        const estimatedDaysRemaining =
          m.warmupTargetLimit > m.warmupCurrentLimit
            ? Math.ceil(((m.warmupTargetLimit - m.warmupCurrentLimit) / 5) * 3)
            : 0;

        return {
          id: m.id,
          email: m.email,
          status: m.warmupStatus,
          startedAt: m.warmupStartedAt,
          daysActive: m.warmupDaysActive,
          currentLimit: m.warmupCurrentLimit,
          targetLimit: m.warmupTargetLimit,
          emailsSentToday: m.warmupEmailsSentToday,
          lastEmailSent: m.lastWarmupEmailSent,
          progress: `${progress}%`,
          estimatedDaysRemaining,
        };
      }),
    };
  }
}
