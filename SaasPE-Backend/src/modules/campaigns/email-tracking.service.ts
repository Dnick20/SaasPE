import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { CampaignsService } from './campaigns.service';
import { RepliesService } from './replies.service';
import axios from 'axios';

/**
 * Email tracking service
 * Handles open/click tracking and SES webhook processing
 */
@Injectable()
export class EmailTrackingService {
  private readonly logger = new Logger(EmailTrackingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly campaignsService: CampaignsService,
    private readonly repliesService: RepliesService,
  ) {}

  /**
   * Record email open
   */
  async recordOpen(trackingId: string): Promise<void> {
    try {
      // Find campaign email by tracking ID (messageId used as tracking ID)
      const campaignEmail = await this.prisma.campaignEmail.findFirst({
        where: {
          sesMessageId: trackingId,
        },
        include: {
          campaign: true,
        },
      });

      if (!campaignEmail) {
        this.logger.warn(
          `Campaign email not found for tracking ID: ${trackingId}`,
        );
        return;
      }

      // Only record first open
      if (campaignEmail.openedAt) {
        this.logger.debug(`Email already opened: ${trackingId}`);
        return;
      }

      // Update campaign email
      await this.prisma.campaignEmail.update({
        where: { id: campaignEmail.id },
        data: {
          status: 'opened',
          openedAt: new Date(),
        },
      });

      // Update campaign metrics
      await this.campaignsService.incrementMetric(
        campaignEmail.campaignId,
        'emailsOpened',
      );

      this.logger.log(
        `Email opened: ${campaignEmail.recipientEmail} (Campaign ID: ${campaignEmail.campaignId})`,
      );
    } catch (error) {
      this.logger.error('Error recording email open:', error);
      throw error;
    }
  }

  /**
   * Record email click
   */
  async recordClick(trackingId: string, url: string): Promise<void> {
    try {
      // Find campaign email by tracking ID
      const campaignEmail = await this.prisma.campaignEmail.findFirst({
        where: {
          sesMessageId: trackingId,
        },
        include: {
          campaign: true,
        },
      });

      if (!campaignEmail) {
        this.logger.warn(
          `Campaign email not found for tracking ID: ${trackingId}`,
        );
        return;
      }

      // Only record first click
      if (campaignEmail.clickedAt) {
        this.logger.debug(`Email already clicked: ${trackingId}`);
        return;
      }

      // Update campaign email
      await this.prisma.campaignEmail.update({
        where: { id: campaignEmail.id },
        data: {
          status: 'clicked',
          clickedAt: new Date(),
        },
      });

      // Update campaign metrics
      await this.campaignsService.incrementMetric(
        campaignEmail.campaignId,
        'emailsClicked',
      );

      this.logger.log(
        `Email clicked: ${campaignEmail.recipientEmail} → ${url} (Campaign ID: ${campaignEmail.campaignId})`,
      );
    } catch (error) {
      this.logger.error('Error recording email click:', error);
      throw error;
    }
  }

  /**
   * Handle SES bounce notification
   */
  async handleBounce(message: any): Promise<void> {
    try {
      const { bounce, mail } = message;

      for (const bouncedRecipient of bounce.bouncedRecipients) {
        const email = bouncedRecipient.emailAddress;

        this.logger.warn(`Email bounced: ${email} (${bounce.bounceType})`);

        // Find campaign email by recipient
        const campaignEmail = await this.prisma.campaignEmail.findFirst({
          where: {
            recipientEmail: email,
            sesMessageId: mail.messageId,
          },
          include: {
            campaign: true,
            mailbox: true,
          },
        });

        if (campaignEmail) {
          // Update campaign email status
          await this.prisma.campaignEmail.update({
            where: { id: campaignEmail.id },
            data: {
              status: 'bounced',
            },
          });

          // Update campaign metrics
          await this.campaignsService.incrementMetric(
            campaignEmail.campaignId,
            'emailsBounced',
          );

          // Increment mailbox bounce counter and consider auto-suspend
          if (campaignEmail.mailboxId) {
            const mailbox = await this.prisma.mailbox.update({
              where: { id: campaignEmail.mailboxId },
              data: { bounces30d: { increment: 1 } },
            });

            if (mailbox.bounces30d > 50) {
              await this.prisma.mailbox.update({
                where: { id: mailbox.id },
                data: { status: 'SUSPENDED' },
              });

              await this.prisma.campaign.updateMany({
                where: { mailboxId: mailbox.id, status: 'running' },
                data: { status: 'paused' },
              });
            }
          }
        }

        // Add to DNC list if permanent bounce
        if (bounce.bounceType === 'Permanent') {
          await this.addToDncList(
            email,
            campaignEmail?.campaign.tenantId,
            'bounce',
            `SES Bounce: ${bouncedRecipient.diagnosticCode || 'Unknown'}`,
          );
        }
      }
    } catch (error) {
      this.logger.error('Error handling bounce:', error);
      throw error;
    }
  }

  /**
   * Handle SES complaint notification
   */
  async handleComplaint(message: any): Promise<void> {
    try {
      const { complaint, mail } = message;

      for (const complainedRecipient of complaint.complainedRecipients) {
        const email = complainedRecipient.emailAddress;

        this.logger.warn(
          `Email complaint: ${email} (${complaint.complaintFeedbackType})`,
        );

        // Find campaign email by recipient
        const campaignEmail = await this.prisma.campaignEmail.findFirst({
          where: {
            recipientEmail: email,
            sesMessageId: mail.messageId,
          },
          include: {
            campaign: true,
            mailbox: true,
          },
        });

        if (campaignEmail) {
          // Update campaign metrics
          await this.campaignsService.incrementMetric(
            campaignEmail.campaignId,
            'emailsUnsubscribed', // Count complaints as unsubscribes
          );
        }

        // Add to DNC list
        await this.addToDncList(
          email,
          campaignEmail?.campaign.tenantId,
          'complaint',
          `SES Complaint: ${complaint.complaintFeedbackType || 'Unknown'}`,
        );

        // Increment mailbox complaint counter and consider auto-suspend
        if (campaignEmail?.mailboxId) {
          const mailbox = await this.prisma.mailbox.update({
            where: { id: campaignEmail.mailboxId },
            data: { complaints30d: { increment: 1 } },
          });

          if (mailbox.complaints30d > 10) {
            await this.prisma.mailbox.update({
              where: { id: mailbox.id },
              data: { status: 'SUSPENDED' },
            });

            await this.prisma.campaign.updateMany({
              where: { mailboxId: mailbox.id, status: 'running' },
              data: { status: 'paused' },
            });
          }
        }
      }
    } catch (error) {
      this.logger.error('Error handling complaint:', error);
      throw error;
    }
  }

  /**
   * Handle SES delivery notification
   */
  async handleDelivery(message: any): Promise<void> {
    try {
      const { delivery, mail } = message;

      for (const recipient of delivery.recipients) {
        // Find campaign email by recipient
        const campaignEmail = await this.prisma.campaignEmail.findFirst({
          where: {
            recipientEmail: recipient,
            sesMessageId: mail.messageId,
          },
        });

        if (campaignEmail && campaignEmail.status === 'sent') {
          // Update to delivered status
          await this.prisma.campaignEmail.update({
            where: { id: campaignEmail.id },
            data: {
              status: 'delivered',
            },
          });

          this.logger.log(`Email delivered: ${recipient}`);
        }
      }
    } catch (error) {
      this.logger.error('Error handling delivery:', error);
      throw error;
    }
  }

  /**
   * Confirm SNS subscription (for webhook setup)
   */
  async confirmSnsSubscription(subscribeUrl: string): Promise<void> {
    try {
      this.logger.log(`Confirming SNS subscription: ${subscribeUrl}`);
      await axios.get(subscribeUrl);
      this.logger.log('SNS subscription confirmed');
    } catch (error) {
      this.logger.error('Error confirming SNS subscription:', error);
      throw error;
    }
  }

  /**
   * Add email to DNC list
   */
  private async addToDncList(
    email: string,
    tenantId: string | undefined,
    reason: 'bounce' | 'complaint' | 'unsubscribe',
    source: string,
  ): Promise<void> {
    if (!tenantId) {
      this.logger.warn(`Cannot add to DNC - no tenantId for ${email}`);
      return;
    }

    try {
      await this.prisma.doNotContact.upsert({
        where: {
          tenantId_email: {
            tenantId,
            email: email.toLowerCase(),
          },
        },
        create: {
          tenantId,
          email: email.toLowerCase(),
          reason,
          source,
        },
        update: {
          reason,
          source,
        },
      });

      this.logger.log(`Added to DNC list: ${email} (${reason})`);
    } catch (error) {
      this.logger.error(`Error adding to DNC list: ${email}`, error);
    }
  }

  /**
   * Handle inbound email reply payload
   */
  async handleInbound(payload: any): Promise<void> {
    try {
      const headers: Record<string, string> = payload.headers || {};
      const inReplyTo = headers['In-Reply-To'] || headers['in-reply-to'] || headers['References'] || headers['references'];
      const subject: string = payload.subject || '';
      const from: string = payload.from || '';
      const text: string = payload.text || payload.html || '';

      if (!inReplyTo) {
        this.logger.warn('Inbound email without In-Reply-To/References header');
        return;
      }

      // Extract SES MessageId between angle brackets if present
      const match = /<([^>]+)>/.exec(inReplyTo);
      const messageId = match ? match[1] : inReplyTo.trim();

      const campaignEmail = await this.prisma.campaignEmail.findFirst({
        where: { sesMessageId: messageId },
        include: { campaign: true, mailbox: true },
      });

      if (!campaignEmail) {
        this.logger.warn(`Inbound: no campaign email found for Message-Id ${messageId}`);
        return;
      }

      // Update reply content and status
      await this.prisma.campaignEmail.update({
        where: { id: campaignEmail.id },
        data: { status: 'replied', repliedAt: new Date(), replyBody: text },
      });

      // Classify reply
      const classification = await this.repliesService.classifyReply(campaignEmail.id, text);
      await this.prisma.campaignEmail.update({
        where: { id: campaignEmail.id },
        data: { replyClassification: classification },
      });

      // Stop sequence implicitly by marking replied; metrics
      await this.campaignsService.incrementMetric(campaignEmail.campaignId, 'emailsReplied');

      this.logger.log(
        `Inbound reply attached to ${campaignEmail.id} from ${from}, classification: ${classification}`,
      );
    } catch (error) {
      this.logger.error('Error handling inbound email:', error);
      throw error;
    }
  }

  /**
   * One-Click Unsubscribe (RFC 8058)
   */
  async unsubscribeOneClick(campaignEmailId: string): Promise<void> {
    try {
      const email = await this.prisma.campaignEmail.findUnique({
        where: { id: campaignEmailId },
        include: { campaign: true },
      });

      if (!email || !email.campaign) {
        this.logger.warn(`unsubscribeOneClick: campaign email not found (${campaignEmailId})`);
        return;
      }

      const tenantId = email.campaign.tenantId;
      const recipient = email.recipientEmail.toLowerCase();

      // Add to DNC list
      await this.addToDncList(recipient, tenantId, 'unsubscribe', 'one_click_unsubscribe');

      // Record suppression in unified table
      await this.prisma.suppression.create({
        data: {
          tenantId,
          email: recipient,
          type: 'unsubscribe',
          source: 'one_click_unsubscribe',
          reason: 'User clicked one-click unsubscribe link',
        },
      });

      // Increment campaign metric
      await this.campaignsService.incrementMetric(email.campaignId, 'emailsUnsubscribed');

      this.logger.log(`Unsubscribed via one-click: ${recipient}`);
    } catch (error) {
      this.logger.error('Error handling one-click unsubscribe:', error);
      throw error;
    }
  }

  /**
   * Get tracking statistics for a campaign email
   */
  async getTrackingStats(campaignEmailId: string) {
    const email = await this.prisma.campaignEmail.findUnique({
      where: { id: campaignEmailId },
      select: {
        status: true,
        sentAt: true,
        deliveredAt: true,
        openedAt: true,
        clickedAt: true,
        repliedAt: true,
        replyClassification: true,
        sesMessageId: true,
      },
    });

    if (!email) {
      return null;
    }

    return {
      ...email,
      events: [
        email.sentAt && { type: 'sent', timestamp: email.sentAt },
        email.deliveredAt && {
          type: 'delivered',
          timestamp: email.deliveredAt,
        },
        email.openedAt && { type: 'opened', timestamp: email.openedAt },
        email.clickedAt && { type: 'clicked', timestamp: email.clickedAt },
        email.repliedAt && { type: 'replied', timestamp: email.repliedAt },
      ].filter(Boolean),
    };
  }
}
