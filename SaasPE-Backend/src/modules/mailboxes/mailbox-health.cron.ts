import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../shared/database/prisma.service';

@Injectable()
export class MailboxHealthCron {
  private readonly logger = new Logger(MailboxHealthCron.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async computeHourlyHealth(): Promise<void> {
    this.logger.log('Computing mailbox health metrics');

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const mailboxes = await this.prisma.mailbox.findMany({});

    for (const m of mailboxes) {
      const [totalSent, totalBounced, totalComplaints] = await Promise.all([
        this.prisma.campaignEmail.count({
          where: { mailboxId: m.id, sentAt: { gte: thirtyDaysAgo } },
        }),
        this.prisma.campaignEmail.count({
          where: { mailboxId: m.id, status: 'bounced', sentAt: { gte: thirtyDaysAgo } },
        }),
        this.prisma.suppression.count({
          where: { type: 'complaint', created: { gte: thirtyDaysAgo } },
        }),
      ]);

      // Simple health scoring: start 100, subtract weighted penalties
      const bounceRate = totalSent > 0 ? totalBounced / totalSent : 0;
      const complaintRate = totalSent > 0 ? totalComplaints / totalSent : 0;

      let health = 100;
      health -= Math.min(50, Math.round(bounceRate * 200)); // up to -50 for 25% bounce
      health -= Math.min(40, Math.round(complaintRate * 400)); // up to -40 for 10% complaints

      // Clamp 0..100
      health = Math.max(0, Math.min(100, health));

      await this.prisma.mailbox.update({
        where: { id: m.id },
        data: {
          healthScore: health,
          bounceRate: Math.round(bounceRate * 10000) / 10000,
          complaintRate: Math.round(complaintRate * 10000) / 10000,
          lastHealthCheck: now,
        },
      });

      // Auto-pause guardrails
      if (complaintRate > 0.003 || bounceRate > 0.05) {
        await this.prisma.campaign.updateMany({
          where: { mailboxId: m.id, status: 'running' },
          data: { status: 'paused' },
        });
      }
    }
  }
}


