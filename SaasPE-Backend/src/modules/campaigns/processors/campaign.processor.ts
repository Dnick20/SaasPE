import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { SesService } from '../../../shared/services/ses.service';
import { ConfigService } from '@nestjs/config';
import { TokensService } from '../../tokens/tokens.service';
import { EmailCreditsService } from '../../email-credits/email-credits.service';
import { CampaignsService } from '../campaigns.service';

interface ProcessEmailsJobData {
  campaignId: string;
  tenantId: string;
}

interface SendEmailJobData {
  emailId: string;
  campaignId: string;
  tenantId: string;
}

@Processor('campaign')
export class CampaignProcessor {
  private readonly logger = new Logger(CampaignProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sesService: SesService,
    private readonly configService: ConfigService,
    private readonly tokensService: TokensService,
    private readonly emailCreditsService: EmailCreditsService,
    private readonly campaignsService: CampaignsService,
  ) {}

  /**
   * Process emails for a campaign
   * This job runs periodically to send emails according to the schedule
   */
  @Process('process-emails')
  async handleProcessEmails(job: Job<ProcessEmailsJobData>) {
    const { campaignId, tenantId } = job.data;

    this.logger.log(`Processing emails for campaign ${campaignId}`);

    try {
      // Get campaign details
      const campaign = await this.prisma.campaign.findFirst({
        where: { id: campaignId, tenantId },
        include: { mailbox: true },
      });

      if (!campaign) {
        this.logger.error(`Campaign ${campaignId} not found`);
        return;
      }

      if (campaign.status !== 'running') {
        this.logger.log(
          `Campaign ${campaignId} is ${campaign.status}, stopping processor`,
        );
        return;
      }

      const schedule = campaign.schedule as any;
      // Determine sending mailbox (support mailbox pool if present)
      let mailbox = campaign.mailbox;
      let candidateMailboxes: any[] = [];
      if (schedule?.mailboxPool && Array.isArray(schedule.mailboxPool) && schedule.mailboxPool.length > 0) {
        candidateMailboxes = await this.prisma.mailbox.findMany({
          where: { id: { in: schedule.mailboxPool }, tenantId, status: 'ACTIVE' },
        });
        if (candidateMailboxes.length === 0) {
          this.logger.warn(`Mailbox pool is empty or inactive for campaign ${campaignId}. Falling back to campaign mailbox.`);
        }
      }

      // Check if we're within send window
      if (!this.isWithinSendWindow(schedule)) {
        this.logger.log(
          `Campaign ${campaignId} is outside send window, will retry later`,
        );
        // Reschedule for next check (1 hour)
        await job.queue.add(
          'process-emails',
          { campaignId, tenantId },
          { delay: 3600000 },
        );
        return;
      }

      // Compute send allowance helper
      const computeAllowance = async (mbx: any) => {
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);

        const [sentLastHourMailbox, sentTodayMailbox] = await Promise.all([
          this.prisma.campaignEmail.count({
            where: { mailboxId: mbx.id, sentAt: { gte: oneHourAgo }, status: { not: 'pending' } },
          }),
          this.prisma.campaignEmail.count({
            where: { mailboxId: mbx.id, sentAt: { gte: startOfDay }, status: { not: 'pending' } },
          }),
        ]);

        const sentTodayDomain = mbx.domainId
          ? await this.prisma.campaignEmail.count({
              where: { mailbox: { domainId: mbx.domainId }, sentAt: { gte: startOfDay }, status: { not: 'pending' } },
            })
          : 0;

        const hourlyLimit = mbx.hourlyLimit || Math.max(10, Math.floor((mbx.dailySendLimit || 10) / 8));
        const dailyLimit = mbx.dailySendLimit || 10;
        const warmupCap = Math.min(mbx.warmupCurrentLimit || 10, dailyLimit);

        const remainingHourlyMailbox = Math.max(0, hourlyLimit - sentLastHourMailbox);
        const remainingDailyMailbox = Math.max(0, warmupCap - sentTodayMailbox);

        const domainDailyCap = mbx.domainId ? Math.max(dailyLimit * 2, 50) : Infinity;
        const remainingDailyDomain = Math.max(0, domainDailyCap - sentTodayDomain);

        const allowed = Math.max(0, Math.min(remainingHourlyMailbox, remainingDailyMailbox, remainingDailyDomain));
        return { allowed, hourlyLimit, warmupCap };
      };

      let allowance = await computeAllowance(mailbox);

      // If mailbox pool exists, pick the mailbox with the highest allowance
      if (candidateMailboxes.length > 0) {
        let bestMailbox = mailbox;
        let bestAllowance = allowance;
        for (const mbx of candidateMailboxes) {
          const a = await computeAllowance(mbx);
          if (a.allowed > bestAllowance.allowed) {
            bestAllowance = a;
            bestMailbox = mbx;
          }
        }
        mailbox = bestMailbox;
        allowance = bestAllowance;
      }

      const allowedToSend = allowance.allowed;

      if (allowedToSend <= 0) {
        this.logger.log(
          `No allowance left for mailbox ${mailbox.email}. Will retry later`,
        );
        await job.queue.add('process-emails', { campaignId, tenantId }, { delay: 60 * 60 * 1000 });
        return;
      }

      // Get pending emails for step 1 (initial outreach)
      const pendingEmails = await this.prisma.campaignEmail.findMany({
        where: {
          campaignId,
          sequenceStep: 1,
          status: 'pending',
        },
        take: allowedToSend,
      });

      // Get follow-up emails that are ready to send (based on delay)
      const followUpEmails = await this.getFollowUpEmailsReady(campaignId);

      const emailsToSend = [...pendingEmails, ...followUpEmails].slice(0, allowedToSend);

      this.logger.log(
        `Sending ${emailsToSend.length} emails for campaign ${campaignId}`,
      );

      // Send emails
      for (const email of emailsToSend) {
        await this.sendEmail(email, campaign, mailbox);

        // Jitter between sends (1-3 seconds) to mimic human sending
        const jitterMs = 1000 + Math.floor(Math.random() * 2000);
        await this.sleep(jitterMs);
      }

      // Update campaign metrics
      await this.campaignsService.updateMetrics(campaignId);

      // Check if campaign is complete
      const remainingPending = await this.prisma.campaignEmail.count({
        where: {
          campaignId,
          status: 'pending',
        },
      });

      if (remainingPending === 0) {
        this.logger.log(`Campaign ${campaignId} completed`);
        await this.campaignsService.markCompleted(campaignId);
      } else {
        // Reschedule for next batch (24 hours)
        await job.queue.add(
          'process-emails',
          { campaignId, tenantId },
          { delay: 86400000 },
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to process emails for campaign ${campaignId}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Send a single email
   */
  private async sendEmail(email: any, campaign: any, mailbox: any) {
    try {
      this.logger.log(
        `Sending email ${email.id} to ${email.recipientEmail} (step ${email.sequenceStep})`,
      );

      // Check and consume email credits (1 credit per email)
      try {
        await this.emailCreditsService.consumeCredits(campaign.tenantId, {
          credits: 1,
          actionType: 'campaign_email',
          metadata: {
            campaignId: campaign.id,
            emailId: email.id,
            recipientEmail: email.recipientEmail,
            sequenceStep: email.sequenceStep,
          },
        });
      } catch (creditError) {
        // If insufficient credits, mark email as failed and skip
        await this.prisma.campaignEmail.update({
          where: { id: email.id },
          data: {
            status: 'failed',
            error: `Insufficient email credits: ${creditError.message}`,
          },
        });
        this.logger.error(
          `Insufficient email credits for email ${email.id}. Campaign may need to be paused.`,
        );
        return;
      }

      const trackingBaseUrl = this.configService.get<string>(
        'APP_URL',
        'http://localhost:3000',
      );

      // Send via SES with tracking
      // Build compliance headers (List-Unsubscribe + One-Click per RFC 8058)
      const unsubscribeBase = `${trackingBaseUrl}/unsubscribe`;
      const oneClickUrl = `${unsubscribeBase}/one-click/${email.id}`;
      const mailto = `mailto:unsubscribe@${campaign.mailbox.email.split('@')[1]}?subject=unsubscribe`;

      const result = await this.sesService.sendEmailWithTracking(
        {
          from: mailbox.email,
          to: [email.recipientEmail],
          subject: email.subject,
          htmlBody: email.body,
          customHeaders: {
            'List-Unsubscribe': `<${oneClickUrl}>, <${mailto}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
          replyTo: mailbox.email,
          tags: {
            campaignId: campaign.id,
            emailId: email.id,
            tenantId: campaign.tenantId,
          },
        },
        email.id,
        trackingBaseUrl,
      );

      if (result.success) {
        // Update email status
        await this.prisma.campaignEmail.update({
          where: { id: email.id },
          data: {
            status: 'sent',
            sentAt: new Date(),
            mailboxId: mailbox.id,
            sesMessageId: result.messageId,
          },
        });

        this.logger.log(
          `Email ${email.id} sent successfully. MessageId: ${result.messageId}`,
        );
      } else {
        // Mark as failed
        await this.prisma.campaignEmail.update({
          where: { id: email.id },
          data: {
            status: 'failed',
            error: result.error,
          },
        });

        this.logger.error(`Failed to send email ${email.id}: ${result.error}`);
      }
    } catch (error) {
      this.logger.error(`Exception sending email ${email.id}`, error.stack);

      await this.prisma.campaignEmail.update({
        where: { id: email.id },
        data: {
          status: 'failed',
          error: error.message,
        },
      });
    }
  }

  /**
   * Get follow-up emails that are ready to send
   * (based on delay from previous step)
   */
  private async getFollowUpEmailsReady(campaignId: string): Promise<any[]> {
    // Get campaign sequence to know delays
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { sequence: true },
    });

    if (!campaign) {
      return [];
    }

    const sequence = campaign.sequence as any[];
    const followUps: any[] = [];

    // For each sequence step > 1, check if delay has passed
    for (const step of sequence) {
      if (step.step === 1) continue;

      const delayMs = step.delayDays * 24 * 60 * 60 * 1000;

      // Find emails where previous step was sent >= delayDays ago
      const readyEmails = await this.prisma.$queryRaw`
        SELECT ce2.*
        FROM "CampaignEmail" ce2
        WHERE ce2."campaignId" = ${campaignId}
          AND ce2."sequenceStep" = ${step.step}
          AND ce2.status = 'pending'
          AND EXISTS (
            SELECT 1
            FROM "CampaignEmail" ce1
            WHERE ce1."campaignId" = ce2."campaignId"
              AND ce1."recipientEmail" = ce2."recipientEmail"
              AND ce1."sequenceStep" = ${step.step - 1}
              AND ce1.status = 'sent'
              AND ce1."sentAt" <= NOW() - INTERVAL '${step.delayDays} days'
          )
        LIMIT 100
      `;

      followUps.push(...(readyEmails as any[]));
    }

    return followUps;
  }

  /**
   * Check if current time is within the campaign's send window
   */
  private isWithinSendWindow(schedule: any): boolean {
    const now = new Date();

    // Get current day name
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const currentDay = dayNames[now.getDay()];

    // Check if today is a send day
    if (!schedule.sendDays.includes(currentDay)) {
      return false;
    }

    // Parse send time window
    const [startHour, startMinute] = schedule.sendTimeStart
      .split(':')
      .map(Number);
    const [endHour, endMinute] = schedule.sendTimeEnd.split(':').map(Number);

    // Convert current time to campaign timezone
    // TODO: Implement proper timezone conversion using schedule.timezone
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const currentTimeMinutes = currentHour * 60 + currentMinute;
    const startTimeMinutes = startHour * 60 + startMinute;
    const endTimeMinutes = endHour * 60 + endMinute;

    return (
      currentTimeMinutes >= startTimeMinutes &&
      currentTimeMinutes <= endTimeMinutes
    );
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
