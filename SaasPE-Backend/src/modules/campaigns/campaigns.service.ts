import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { PrismaService } from '../../shared/database/prisma.service';
import { EmailCreditsService } from '../email-credits/email-credits.service';
import { TemplateVariablesService } from './template-variables.service';
import { AIPersonalizationService } from './ai-personalization.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import {
  CampaignResponseDto,
  StartCampaignResponseDto,
  PauseCampaignResponseDto,
  CampaignEmailResponseDto,
  PaginatedCampaignsResponseDto,
  PaginatedCampaignEmailsResponseDto,
} from './dto/campaign-response.dto';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailCreditsService: EmailCreditsService,
    private readonly templateVariablesService: TemplateVariablesService,
    private readonly aiPersonalizationService: AIPersonalizationService,
    @InjectQueue('campaign') private readonly campaignQueue: Queue,
  ) {}

  /**
   * Create a new campaign
   */
  async create(
    tenantId: string,
    userId: string,
    dto: CreateCampaignDto,
  ): Promise<CampaignResponseDto> {
    // Verify mailbox exists and belongs to tenant
    const mailbox = await this.prisma.mailbox.findFirst({
      where: { id: dto.mailboxId, tenantId },
    });

    if (!mailbox) {
      throw new NotFoundException('Mailbox not found');
    }

    // Verify mailbox is active
    if (mailbox.status !== 'ACTIVE') {
      throw new BadRequestException(
        `Mailbox is ${mailbox.status}. Only active mailboxes can send campaigns.`,
      );
    }

    // Verify client exists if provided
    if (dto.clientId) {
      const client = await this.prisma.client.findFirst({
        where: { id: dto.clientId, tenantId },
      });

      if (!client) {
        throw new NotFoundException('Client not found');
      }
    }

    // Check contacts against Do-Not-Contact list
    const dncEmails = await this.prisma.doNotContact.findMany({
      where: {
        tenantId,
        email: { in: dto.contacts.map((c) => c.email) },
      },
      select: { email: true },
    });

    const dncSet = new Set(dncEmails.map((dnc) => dnc.email));
    const validContacts = dto.contacts.filter((c) => !dncSet.has(c.email));

    if (validContacts.length === 0) {
      throw new BadRequestException(
        'All contacts are on the Do-Not-Contact list',
      );
    }

    if (validContacts.length < dto.contacts.length) {
      this.logger.warn(
        `Filtered out ${dto.contacts.length - validContacts.length} contacts from DNC list`,
      );
    }

    // Create campaign
    const campaign = await this.prisma.campaign.create({
      data: {
        tenantId,
        userId,
        mailboxId: dto.mailboxId,
        clientId: dto.clientId,
        name: dto.name,
        status: 'draft',
        sequence: dto.sequence as any,
        schedule: dto.schedule as any,
        contacts: validContacts as any,
        totalContacts: validContacts.length,
      },
      include: {
        mailbox: {
          select: {
            id: true,
            email: true,
            type: true,
          },
        },
        client: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
    });

    return this.mapToDto(campaign);
  }

  /**
   * Start a campaign (begins sending emails)
   */
  async start(tenantId: string, id: string): Promise<StartCampaignResponseDto> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, tenantId },
      include: { mailbox: true },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.status !== 'draft' && campaign.status !== 'paused') {
      throw new BadRequestException(
        `Cannot start campaign with status: ${campaign.status}`,
      );
    }

    // Check email credits balance before starting
    const contacts = campaign.contacts as any[];
    const sequence = campaign.sequence as any[];
    const totalEmailsToSend = contacts.length * sequence.length;

    const balance = await this.emailCreditsService.getBalance(tenantId);

    if (balance.creditsRemaining < totalEmailsToSend) {
      throw new BadRequestException(
        `Insufficient email credits. Campaign requires ${totalEmailsToSend} credits, but only ${balance.creditsRemaining} available. Please upgrade your plan or purchase additional credits.`,
      );
    }

    this.logger.log(
      `Starting campaign ${id} - ${totalEmailsToSend} emails will consume ${totalEmailsToSend} credits. Current balance: ${balance.creditsRemaining}`,
    );

    const emailsToCreate: any[] = [];

    // Collect emails that need AI personalization
    const emailsNeedingAI: Array<{
      subject: string;
      body: string;
      contact: any;
      stepIndex: number;
    }> = [];

    for (const contact of contacts) {
      for (let i = 0; i < sequence.length; i++) {
        const step = sequence[i];

        // Apply template variable replacement first
        const { subject, body } = this.templateVariablesService.processTemplate(
          step.subject,
          step.body,
          contact,
        );

        if (step.aiPersonalization) {
          // Mark for AI personalization
          emailsNeedingAI.push({
            subject,
            body,
            contact,
            stepIndex: i,
          });
        }

        // Add to creation list (will be updated with AI content if needed)
        emailsToCreate.push({
          campaignId: campaign.id,
          recipientEmail: contact.email,
          recipientName: contact.firstName
            ? `${contact.firstName} ${contact.lastName || ''}`.trim()
            : undefined,
          sequenceStep: step.step,
          subject,
          body,
          status: 'pending',
        });
      }
    }

    // Apply AI personalization if needed
    if (emailsNeedingAI.length > 0) {
      this.logger.log(
        `Applying AI personalization to ${emailsNeedingAI.length} emails`,
      );

      try {
        const personalizedEmails =
          await this.aiPersonalizationService.batchPersonalize(
            emailsNeedingAI,
            5, // Max 5 concurrent AI requests
          );

        // Update emailsToCreate with personalized content
        let aiIndex = 0;
        let emailIndex = 0;

        for (const contact of contacts) {
          for (let i = 0; i < sequence.length; i++) {
            const step = sequence[i];

            if (step.aiPersonalization && aiIndex < personalizedEmails.length) {
              const personalized = personalizedEmails[aiIndex];
              emailsToCreate[emailIndex].subject = personalized.subject;
              emailsToCreate[emailIndex].body = personalized.body;
              aiIndex++;
            }

            emailIndex++;
          }
        }

        this.logger.log(
          `AI personalization completed for ${personalizedEmails.length} emails`,
        );
      } catch (aiError) {
        this.logger.error(
          'AI personalization failed, continuing with template content',
          aiError,
        );
        // Continue with template content on AI failure
      }
    }

    // Bulk insert all emails
    await this.prisma.campaignEmail.createMany({
      data: emailsToCreate,
    });

    // Update campaign status
    const updatedCampaign = await this.prisma.campaign.update({
      where: { id },
      data: {
        status: 'running',
        started: new Date(),
      },
    });

    // Queue background job to process emails
    await this.campaignQueue.add('process-emails', {
      campaignId: campaign.id,
      tenantId,
    });

    // Estimate completion (simplified calculation)
    const totalEmails = emailsToCreate.length;
    const dailySendLimit = campaign.mailbox.dailySendLimit;
    const estimatedDays = Math.ceil(totalEmails / dailySendLimit);
    const estimatedCompletion = new Date();
    estimatedCompletion.setDate(estimatedCompletion.getDate() + estimatedDays);

    return {
      id: updatedCampaign.id,
      status: 'running',
      started:
        updatedCampaign.started?.toISOString() ?? new Date().toISOString(),
      estimatedCompletion: estimatedCompletion.toISOString(),
    };
  }

  /**
   * Pause a running campaign
   */
  async pause(tenantId: string, id: string): Promise<PauseCampaignResponseDto> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, tenantId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.status !== 'running') {
      throw new BadRequestException(
        `Cannot pause campaign with status: ${campaign.status}`,
      );
    }

    const updatedCampaign = await this.prisma.campaign.update({
      where: { id },
      data: { status: 'paused' },
    });

    return {
      id: updatedCampaign.id,
      status: 'paused',
    };
  }

  /**
   * List all campaigns with pagination and filtering
   */
  async findAll(
    tenantId: string,
    page: number = 1,
    limit: number = 20,
    status?: string,
    mailboxId?: string,
  ): Promise<PaginatedCampaignsResponseDto> {
    const where: any = { tenantId };

    if (status) {
      where.status = status;
    }

    if (mailboxId) {
      where.mailboxId = mailboxId;
    }

    const [campaigns, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        include: {
          mailbox: {
            select: {
              id: true,
              email: true,
              type: true,
            },
          },
          client: {
            select: {
              id: true,
              companyName: true,
            },
          },
        },
        orderBy: { created: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return {
      data: campaigns.map((c) => this.mapToDto(c)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single campaign by ID
   */
  async findOne(tenantId: string, id: string): Promise<CampaignResponseDto> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, tenantId },
      include: {
        mailbox: {
          select: {
            id: true,
            email: true,
            type: true,
          },
        },
        client: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    return this.mapToDto(campaign);
  }

  /**
   * Get all emails for a campaign with filtering
   */
  async findCampaignEmails(
    tenantId: string,
    campaignId: string,
    page: number = 1,
    limit: number = 20,
    status?: string,
    sequenceStep?: number,
  ): Promise<PaginatedCampaignEmailsResponseDto> {
    // Verify campaign belongs to tenant
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, tenantId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const where: any = { campaignId };

    if (status) {
      where.status = status;
    }

    if (sequenceStep !== undefined) {
      where.sequenceStep = sequenceStep;
    }

    const [emails, total] = await Promise.all([
      this.prisma.campaignEmail.findMany({
        where,
        orderBy: { created: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.campaignEmail.count({ where }),
    ]);

    return {
      data: emails.map((e) => this.mapEmailToDto(e)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update campaign metrics (called by processor after sending emails)
   */
  async updateMetrics(campaignId: string): Promise<void> {
    const emails = await this.prisma.campaignEmail.findMany({
      where: { campaignId },
      select: { status: true },
    });

    const sentCount = emails.filter((e) => e.status !== 'pending').length;
    const openedCount = emails.filter(
      (e) =>
        e.status === 'opened' ||
        e.status === 'clicked' ||
        e.status === 'replied',
    ).length;
    const clickedCount = emails.filter(
      (e) => e.status === 'clicked' || e.status === 'replied',
    ).length;
    const repliedCount = emails.filter((e) => e.status === 'replied').length;
    const bouncedCount = emails.filter((e) => e.status === 'bounced').length;

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        sentCount,
        openedCount,
        clickedCount,
        repliedCount,
        bouncedCount,
      },
    });
  }

  /**
   * Mark campaign as completed
   */
  async markCompleted(campaignId: string): Promise<void> {
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'completed',
        completed: new Date(),
      },
    });
  }

  /**
   * Map database model to DTO
   */
  private mapToDto(campaign: any): CampaignResponseDto {
    return {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      totalContacts: campaign.totalContacts,
      sentCount: campaign.sentCount,
      openedCount: campaign.openedCount,
      clickedCount: campaign.clickedCount,
      repliedCount: campaign.repliedCount,
      bouncedCount: campaign.bouncedCount,
      unsubscribedCount: campaign.unsubscribedCount,
      started: campaign.started?.toISOString(),
      completed: campaign.completed?.toISOString(),
      created: campaign.created.toISOString(),
      updated: campaign.updated.toISOString(),
      mailbox: campaign.mailbox
        ? {
            id: campaign.mailbox.id,
            email: campaign.mailbox.email,
            type: campaign.mailbox.type,
          }
        : undefined,
      client: campaign.client
        ? {
            id: campaign.client.id,
            companyName: campaign.client.companyName,
          }
        : undefined,
    };
  }

  /**
   * Increment a specific campaign metric
   * Used by email tracking service
   */
  async incrementMetric(
    campaignId: string,
    metric:
      | 'emailsSent'
      | 'emailsOpened'
      | 'emailsClicked'
      | 'emailsReplied'
      | 'emailsBounced'
      | 'emailsUnsubscribed',
  ): Promise<void> {
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        [metric]: {
          increment: 1,
        },
      },
    });

    this.logger.log(`Incremented ${metric} for campaign ${campaignId}`);
  }

  /**
   * Map CampaignEmail to DTO
   */
  private mapEmailToDto(email: any): CampaignEmailResponseDto {
    return {
      id: email.id,
      recipientEmail: email.recipientEmail,
      recipientName: email.recipientName ?? undefined,
      sequenceStep: email.sequenceStep,
      subject: email.subject,
      status: email.status,
      sentAt: email.sentAt?.toISOString(),
      openedAt: email.openedAt?.toISOString(),
      clickedAt: email.clickedAt?.toISOString(),
      repliedAt: email.repliedAt?.toISOString(),
      replyBody: email.replyBody ?? undefined,
      replyClassification: email.replyClassification ?? undefined,
      error: email.error ?? undefined,
      created: email.created.toISOString(),
    };
  }
}
