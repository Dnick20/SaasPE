import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { OpenAIService } from '../../shared/services/openai.service';

export interface ReplyListFilters {
  classification?:
    | 'interested'
    | 'not_interested'
    | 'out_of_office'
    | 'unsubscribe';
  campaignId?: string;
  unread?: boolean;
}

export interface PaginatedRepliesResponse {
  data: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Replies Service
 * Manages email replies, classifications, and inbox functionality
 */
@Injectable()
export class RepliesService {
  private readonly logger = new Logger(RepliesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly openAIService: OpenAIService,
  ) {}

  /**
   * Get paginated list of replies with filtering
   */
  async findAll(
    tenantId: string,
    page: number = 1,
    limit: number = 20,
    filters?: ReplyListFilters,
  ): Promise<PaginatedRepliesResponse> {
    const skip = (page - 1) * limit;

    const where: any = {
      campaign: {
        tenantId,
      },
      status: 'replied',
      replyBody: {
        not: null,
      },
    };

    if (filters?.classification) {
      where.replyClassification = filters.classification;
    }

    if (filters?.campaignId) {
      where.campaignId = filters.campaignId;
    }

    const [replies, total] = await Promise.all([
      this.prisma.campaignEmail.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          repliedAt: 'desc',
        },
        include: {
          campaign: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
          mailbox: {
            select: {
              id: true,
              email: true,
            },
          },
          Contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              company: true,
              linkedinUrl: true,
            },
          },
        },
      }),
      this.prisma.campaignEmail.count({ where }),
    ]);

    return {
      data: replies,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single reply by ID
   */
  async findOne(tenantId: string, emailId: string) {
    const reply = await this.prisma.campaignEmail.findFirst({
      where: {
        id: emailId,
        campaign: {
          tenantId,
        },
        status: 'replied',
      },
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        mailbox: {
          select: {
            id: true,
            email: true,
          },
        },
        Contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true,
            email: true,
            linkedinUrl: true,
          },
        },
      },
    });

    if (!reply) {
      throw new NotFoundException('Reply not found');
    }

    return reply;
  }

  /**
   * Classify reply using AI
   * Categories: interested, not_interested, out_of_office, unsubscribe
   */
  async classifyReply(emailId: string, replyBody: string): Promise<string> {
    try {
      this.logger.log(`Classifying reply for email ${emailId}`);

      const systemPrompt = `You are an expert email reply classifier for sales and outreach campaigns.
Classify email replies into one of these categories:

1. "interested" - Positive response, wants to learn more, asking questions, requesting a call/meeting
2. "not_interested" - Polite decline, not a fit, already have a solution, not interested
3. "out_of_office" - Auto-reply, out of office, vacation responder
4. "unsubscribe" - Unsubscribe request, stop emailing me, remove from list

Return ONLY a JSON object with:
- classification: one of the 4 categories above
- confidence: number between 0-1
- reasoning: brief explanation of classification`;

      const userPrompt = `Classify this email reply:

${replyBody}

Return classification as JSON.`;

      const response = await this.openAIService[
        'client'
      ].chat.completions.create({
        model: 'gpt-3.5-turbo', // Cheaper model for simple classification
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1, // Low temperature for consistent classification
        max_tokens: 200,
      });

      const resultText = response.choices[0].message.content;

      if (!resultText) {
        throw new Error('No classification received from AI');
      }

      const result = JSON.parse(resultText);

      this.logger.log(
        `Reply classified as: ${result.classification} (confidence: ${result.confidence})`,
      );

      return result.classification;
    } catch (error) {
      this.logger.error(
        `Failed to classify reply for email ${emailId}:`,
        error,
      );
      // Fallback to default classification
      return 'interested'; // Default to interested to avoid missing opportunities
    }
  }

  /**
   * Update reply classification manually
   */
  async updateClassification(
    tenantId: string,
    emailId: string,
    classification:
      | 'interested'
      | 'not_interested'
      | 'out_of_office'
      | 'unsubscribe',
  ) {
    const reply = await this.prisma.campaignEmail.findFirst({
      where: {
        id: emailId,
        campaign: {
          tenantId,
        },
      },
      include: {
        campaign: true,
      },
    });

    if (!reply) {
      throw new NotFoundException('Reply not found');
    }

    const updated = await this.prisma.campaignEmail.update({
      where: { id: emailId },
      data: {
        replyClassification: classification,
      },
    });

    this.logger.log(
      `Updated classification for email ${emailId} to ${classification}`,
    );

    // If unsubscribe, add to DNC list
    if (classification === 'unsubscribe') {
      await this.prisma.doNotContact.upsert({
        where: {
          tenantId_email: {
            tenantId,
            email: reply.recipientEmail.toLowerCase(),
          },
        },
        create: {
          tenantId,
          email: reply.recipientEmail.toLowerCase(),
          reason: 'unsubscribe',
          source: 'Manual classification from reply inbox',
        },
        update: {
          reason: 'unsubscribe',
          source: 'Manual classification from reply inbox',
        },
      });

      this.logger.log(
        `Added ${reply.recipientEmail} to DNC list (unsubscribe)`,
      );
    }

    return updated;
  }

  /**
   * Get reply statistics
   */
  async getStats(tenantId: string, campaignId?: string) {
    const where: any = {
      campaign: {
        tenantId,
      },
      status: 'replied',
    };

    if (campaignId) {
      where.campaignId = campaignId;
    }

    const [
      total,
      interested,
      notInterested,
      outOfOffice,
      unsubscribe,
      unclassified,
    ] = await Promise.all([
      this.prisma.campaignEmail.count({ where }),
      this.prisma.campaignEmail.count({
        where: { ...where, replyClassification: 'interested' },
      }),
      this.prisma.campaignEmail.count({
        where: { ...where, replyClassification: 'not_interested' },
      }),
      this.prisma.campaignEmail.count({
        where: { ...where, replyClassification: 'out_of_office' },
      }),
      this.prisma.campaignEmail.count({
        where: { ...where, replyClassification: 'unsubscribe' },
      }),
      this.prisma.campaignEmail.count({
        where: { ...where, replyClassification: null },
      }),
    ]);

    return {
      total,
      interested,
      notInterested,
      outOfOffice,
      unsubscribe,
      unclassified,
      interestedRate:
        total > 0 ? ((interested / total) * 100).toFixed(1) : '0.0',
    };
  }

  /**
   * Generate AI-suggested response to a reply
   */
  async generateResponse(
    tenantId: string,
    emailId: string,
  ): Promise<{ suggestedResponse: string }> {
    const reply = await this.findOne(tenantId, emailId);

    if (!reply.replyBody) {
      throw new NotFoundException('No reply body found');
    }

    try {
      this.logger.log(`Generating response suggestion for email ${emailId}`);

      const systemPrompt = `You are an expert sales professional writing follow-up responses to email replies.
Your responses should:
- Be personalized and reference specific points from their reply
- Add value and move the conversation forward
- Be concise (100-150 words)
- Include a clear call-to-action
- Match a professional yet friendly tone
- Address their specific questions or concerns

Write responses that build relationships and progress deals.`;

      const userPrompt = `Generate a response to this email reply.

Original Email Subject: ${reply.subject}

Their Reply:
${reply.replyBody}

Contact Information:
- Name: ${reply.recipientName || 'Contact'}
- Company: ${reply.Contact?.company || 'Their company'}
${reply.Contact?.linkedinUrl ? `- LinkedIn: ${reply.Contact.linkedinUrl}` : ''}

Classification: ${reply.replyClassification || 'Not classified'}

Write a compelling follow-up response.`;

      const response = await this.openAIService[
        'client'
      ].chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 400,
      });

      const suggestedResponse = response.choices[0].message.content;

      if (!suggestedResponse) {
        throw new Error('No response generated from AI');
      }

      this.logger.log(
        `Generated response suggestion. Tokens used: ${response.usage?.total_tokens}`,
      );

      return { suggestedResponse };
    } catch (error) {
      this.logger.error(
        `Failed to generate response for email ${emailId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Batch classify unclassified replies
   */
  async batchClassifyReplies(
    tenantId: string,
    limit: number = 50,
  ): Promise<{
    classified: number;
    skipped: number;
  }> {
    this.logger.log(`Starting batch classification (limit: ${limit})`);

    const unclassifiedReplies = await this.prisma.campaignEmail.findMany({
      where: {
        campaign: {
          tenantId,
        },
        status: 'replied',
        replyBody: {
          not: null,
        },
        replyClassification: null,
      },
      take: limit,
      select: {
        id: true,
        replyBody: true,
      },
    });

    let classified = 0;
    let skipped = 0;

    for (const reply of unclassifiedReplies) {
      try {
        if (!reply.replyBody) {
          skipped++;
          continue;
        }

        const classification = await this.classifyReply(
          reply.id,
          reply.replyBody,
        );

        await this.prisma.campaignEmail.update({
          where: { id: reply.id },
          data: { replyClassification: classification },
        });

        classified++;

        // Rate limiting: delay between classifications
        await this.sleep(500);
      } catch (error) {
        this.logger.error(`Failed to classify reply ${reply.id}:`, error);
        skipped++;
      }
    }

    this.logger.log(
      `Batch classification completed: ${classified} classified, ${skipped} skipped`,
    );

    return { classified, skipped };
  }

  /**
   * Sleep utility for rate limiting
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
