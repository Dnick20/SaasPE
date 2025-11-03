import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { CreateConversationDto, SendMessageDto } from './dto';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);
  private openai: OpenAI;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.config.get('OPENAI_API_KEY'),
    });
  }

  /**
   * Create a new support conversation
   */
  async createConversation(
    tenantId: string,
    userId: string,
    dto: CreateConversationDto,
  ) {
    const conversation = await this.prisma.supportConversation.create({
      data: {
        tenantId,
        userId,
        category: dto.subject, // Map subject from DTO to category in database
        status: 'open',
      },
    });

    // If initial message provided, add it and get AI response
    if (dto.initialMessage) {
      await this.sendMessage(conversation.id, userId, {
        content: dto.initialMessage,
      });
    }

    return conversation;
  }

  /**
   * Get all conversations for a tenant
   */
  async getConversations(
    tenantId: string,
    options?: {
      status?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (options?.status) {
      where.status = options.status;
    }

    const [conversations, total] = await Promise.all([
      this.prisma.supportConversation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: {
              messages: true,
            },
          },
        },
      }),
      this.prisma.supportConversation.count({ where }),
    ]);

    return {
      data: conversations,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single conversation with messages
   */
  async getConversation(conversationId: string, tenantId: string) {
    const conversation = await this.prisma.supportConversation.findFirst({
      where: {
        id: conversationId,
        tenantId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        messages: {
          orderBy: { created: 'asc' },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  /**
   * Send a message in a conversation and get AI response
   */
  async sendMessage(
    conversationId: string,
    userId: string,
    dto: SendMessageDto,
  ) {
    // Get conversation to verify access and get context
    const conversation = await this.prisma.supportConversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { created: 'asc' },
          take: 20, // Last 20 messages for context
        },
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

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Create user message
    const userMessage = await this.prisma.supportMessage.create({
      data: {
        conversationId,
        content: dto.content,
        role: 'user',
      },
    });

    // Generate AI response
    const aiResponse = await this.generateAIResponse(conversation, dto.content);

    // Create AI message
    const aiMessage = await this.prisma.supportMessage.create({
      data: {
        conversationId,
        content: aiResponse,
        role: 'ai',
        aiModel: 'gpt-4',
      },
    });

    return {
      userMessage,
      aiMessage,
    };
  }

  /**
   * Generate AI response using OpenAI
   */
  private async generateAIResponse(
    conversation: any,
    userMessage: string,
  ): Promise<string> {
    try {
      // Build conversation history for context
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: this.getSystemPrompt(conversation.tenant),
        },
      ];

      // Add conversation history (last 20 messages)
      for (const msg of conversation.messages) {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        });
      }

      // Add current user message
      messages.push({
        role: 'user',
        content: userMessage,
      });

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages,
        temperature: 0.7,
        max_tokens: 500,
      });

      return (
        response.choices[0]?.message?.content ||
        'I apologize, but I encountered an error. Please try again.'
      );
    } catch (error) {
      this.logger.error('AI response generation failed:', error);
      return 'I apologize, but I encountered an error generating a response. A support team member will assist you shortly.';
    }
  }

  /**
   * Get system prompt for AI chatbot
   */
  private getSystemPrompt(tenant: any): string {
    const planName = tenant.subscription?.plan?.name || 'Free';
    const planFeatures = this.getPlanFeatures(planName);

    return `You are a helpful AI assistant for SaasPE, an agency automation platform. You help users with:
- Understanding features and capabilities
- Troubleshooting issues
- Billing and subscription questions
- Best practices for using the platform

Current user's plan: ${planName}
Available features for this plan:
${planFeatures}

Be friendly, professional, and concise. If you don't know something, acknowledge it and suggest contacting human support.
Focus on helping users get the most value from SaasPE.

Key platform features:
- AI-powered proposal generation from call transcriptions
- Email campaign management with A/B testing
- Client relationship management (CRM)
- Analytics and reporting
- Integrations (HubSpot, Zapier, DocuSign)
- Email warmup and unlimited mailboxes
- Contact management with deduplication
- Token-based pricing for AI features

If asked about pricing or upgrading, explain the token-based system:
- Tokens are consumed for AI operations
- Each plan includes baseline tokens
- Additional tokens can be purchased
- Email credits are separate and reset monthly`;
  }

  /**
   * Get plan features description
   */
  private getPlanFeatures(planName: string): string {
    const features: Record<string, string> = {
      Starter:
        '- 5,000 tokens/month\n- 5,000 email credits\n- Up to 5 email accounts\n- 1,000 contacts\n- No warmup',
      Growth:
        '- 50,000 tokens/month\n- 100,000 email credits\n- Up to 50 email accounts\n- 10,000 contacts\n- Unlimited email warmup',
      Professional:
        '- 200,000 tokens/month\n- 500,000 email credits\n- Up to 200 email accounts\n- 50,000 contacts\n- Unlimited email warmup\n- Priority support',
      Enterprise:
        '- 1,000,000 tokens/month\n- 1,000,000 email credits\n- Unlimited email accounts\n- Unlimited contacts\n- Unlimited email warmup\n- Dedicated support',
    };

    return features[planName] || 'Standard features';
  }

  /**
   * Resolve a conversation
   */
  async resolveConversation(conversationId: string, tenantId: string) {
    const conversation = await this.prisma.supportConversation.findFirst({
      where: {
        id: conversationId,
        tenantId,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    await this.prisma.supportConversation.update({
      where: { id: conversationId },
      data: {
        status: 'resolved',
      },
    });

    return { success: true, message: 'Conversation marked as resolved' };
  }

  /**
   * Reopen a conversation
   */
  async reopenConversation(conversationId: string, tenantId: string) {
    const conversation = await this.prisma.supportConversation.findFirst({
      where: {
        id: conversationId,
        tenantId,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    await this.prisma.supportConversation.update({
      where: { id: conversationId },
      data: {
        status: 'open',
      },
    });

    return { success: true, message: 'Conversation reopened' };
  }
}
