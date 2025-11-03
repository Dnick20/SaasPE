import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { RepliesService } from '../replies.service';
import { PrismaService } from '../../../shared/database/prisma.service';
import { OpenAIService } from '../../../shared/services/openai.service';

describe('RepliesService', () => {
  let service: RepliesService;
  let prisma: PrismaService;
  let openAIService: OpenAIService;

  const mockPrismaService = {
    campaignEmail: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      groupBy: jest.fn(),
    },
    doNotContact: {
      upsert: jest.fn(),
    },
  };

  const mockOpenAIService = {
    client: {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    },
  };

  const tenantId = 'tenant-123';
  const emailId = 'email-123';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RepliesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OpenAIService, useValue: mockOpenAIService },
      ],
    }).compile();

    service = module.get<RepliesService>(RepliesService);
    prisma = module.get<PrismaService>(PrismaService);
    openAIService = module.get<OpenAIService>(OpenAIService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    const mockReplies = [
      {
        id: 'email-1',
        recipientEmail: 'john@example.com',
        recipientName: 'John Doe',
        subject: 'Re: Partnership',
        replyBody: 'Interested in learning more',
        replyClassification: 'interested',
        repliedAt: new Date(),
        campaign: { id: 'campaign-1', name: 'Q4 Outreach', status: 'running' },
        mailbox: { id: 'mailbox-1', email: 'sales@agency.com' },
        Contact: {
          id: 'contact-1',
          firstName: 'John',
          lastName: 'Doe',
          company: 'Acme Inc',
        },
      },
    ];

    it('should return paginated replies', async () => {
      mockPrismaService.campaignEmail.findMany.mockResolvedValue(mockReplies);
      mockPrismaService.campaignEmail.count.mockResolvedValue(1);

      const result = await service.findAll(tenantId, 1, 20);

      expect(result.data).toEqual(mockReplies);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
      expect(mockPrismaService.campaignEmail.findMany).toHaveBeenCalledWith({
        where: {
          campaign: { tenantId },
          status: 'replied',
          replyBody: { not: null },
        },
        skip: 0,
        take: 20,
        orderBy: { repliedAt: 'desc' },
        include: expect.any(Object),
      });
    });

    it('should filter by classification', async () => {
      mockPrismaService.campaignEmail.findMany.mockResolvedValue([]);
      mockPrismaService.campaignEmail.count.mockResolvedValue(0);

      await service.findAll(tenantId, 1, 20, { classification: 'interested' });

      expect(mockPrismaService.campaignEmail.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            replyClassification: 'interested',
          }),
        }),
      );
    });

    it('should filter by campaignId', async () => {
      mockPrismaService.campaignEmail.findMany.mockResolvedValue([]);
      mockPrismaService.campaignEmail.count.mockResolvedValue(0);

      await service.findAll(tenantId, 1, 20, { campaignId: 'campaign-123' });

      expect(mockPrismaService.campaignEmail.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            campaignId: 'campaign-123',
          }),
        }),
      );
    });

    it('should handle pagination correctly', async () => {
      mockPrismaService.campaignEmail.findMany.mockResolvedValue([]);
      mockPrismaService.campaignEmail.count.mockResolvedValue(50);

      const result = await service.findAll(tenantId, 3, 20);

      expect(result.pagination).toEqual({
        page: 3,
        limit: 20,
        total: 50,
        totalPages: 3,
      });
      expect(mockPrismaService.campaignEmail.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 40, // (page 3 - 1) * 20
          take: 20,
        }),
      );
    });
  });

  describe('findOne', () => {
    const mockReply = {
      id: emailId,
      recipientEmail: 'john@example.com',
      recipientName: 'John Doe',
      subject: 'Re: Partnership',
      replyBody: 'Interested in learning more',
      replyClassification: 'interested',
      repliedAt: new Date(),
      campaign: { id: 'campaign-1', name: 'Q4 Outreach', status: 'running' },
      mailbox: { id: 'mailbox-1', email: 'sales@agency.com' },
      Contact: {
        id: 'contact-1',
        firstName: 'John',
        lastName: 'Doe',
        company: 'Acme Inc',
        email: 'john@example.com',
        linkedinUrl: 'https://linkedin.com/in/johndoe',
      },
    };

    it('should return a single reply by ID', async () => {
      mockPrismaService.campaignEmail.findFirst.mockResolvedValue(mockReply);

      const result = await service.findOne(tenantId, emailId);

      expect(result).toEqual(mockReply);
      expect(mockPrismaService.campaignEmail.findFirst).toHaveBeenCalledWith({
        where: {
          id: emailId,
          campaign: { tenantId },
          status: 'replied',
        },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if reply not found', async () => {
      mockPrismaService.campaignEmail.findFirst.mockResolvedValue(null);

      await expect(service.findOne(tenantId, emailId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne(tenantId, emailId)).rejects.toThrow(
        'Reply not found',
      );
    });
  });

  describe('classifyReply', () => {
    const replyBody =
      'Yes, I would love to schedule a call to discuss this further!';

    it('should classify reply as interested using AI', async () => {
      const mockAIResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                classification: 'interested',
                confidence: 0.95,
                reasoning: 'Positive response with call request',
              }),
            },
          },
        ],
      };

      mockOpenAIService.client.chat.completions.create.mockResolvedValue(
        mockAIResponse,
      );

      const result = await service.classifyReply(emailId, replyBody);

      expect(result).toBe('interested');
      expect(
        mockOpenAIService.client.chat.completions.create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-3.5-turbo',
          response_format: { type: 'json_object' },
          temperature: 0.1,
        }),
      );
    });

    it('should classify reply as not_interested', async () => {
      const mockAIResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                classification: 'not_interested',
                confidence: 0.9,
                reasoning: 'Polite decline',
              }),
            },
          },
        ],
      };

      mockOpenAIService.client.chat.completions.create.mockResolvedValue(
        mockAIResponse,
      );

      const result = await service.classifyReply(
        emailId,
        'No thank you, not interested.',
      );

      expect(result).toBe('not_interested');
    });

    it('should classify reply as out_of_office', async () => {
      const mockAIResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                classification: 'out_of_office',
                confidence: 1.0,
                reasoning: 'Auto-reply detected',
              }),
            },
          },
        ],
      };

      mockOpenAIService.client.chat.completions.create.mockResolvedValue(
        mockAIResponse,
      );

      const result = await service.classifyReply(
        emailId,
        'I am currently out of office until next week.',
      );

      expect(result).toBe('out_of_office');
    });

    it('should classify reply as unsubscribe', async () => {
      const mockAIResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                classification: 'unsubscribe',
                confidence: 1.0,
                reasoning: 'Unsubscribe request',
              }),
            },
          },
        ],
      };

      mockOpenAIService.client.chat.completions.create.mockResolvedValue(
        mockAIResponse,
      );

      const result = await service.classifyReply(
        emailId,
        'Please remove me from your list.',
      );

      expect(result).toBe('unsubscribe');
    });

    it('should default to interested on AI error', async () => {
      mockOpenAIService.client.chat.completions.create.mockRejectedValue(
        new Error('OpenAI API error'),
      );

      const result = await service.classifyReply(emailId, replyBody);

      expect(result).toBe('interested');
    });

    it('should handle empty AI response', async () => {
      const mockAIResponse = {
        choices: [{ message: { content: null } }],
      };

      mockOpenAIService.client.chat.completions.create.mockResolvedValue(
        mockAIResponse,
      );

      const result = await service.classifyReply(emailId, replyBody);

      expect(result).toBe('interested');
    });
  });

  describe('updateClassification', () => {
    const mockReply = {
      id: emailId,
      recipientEmail: 'john@example.com',
      replyClassification: 'interested',
      campaign: { id: 'campaign-1', tenantId },
    };

    it('should update classification manually', async () => {
      mockPrismaService.campaignEmail.findFirst.mockResolvedValue(mockReply);
      mockPrismaService.campaignEmail.update.mockResolvedValue({
        ...mockReply,
        replyClassification: 'not_interested',
      });

      const result = await service.updateClassification(
        tenantId,
        emailId,
        'not_interested',
      );

      expect(result.replyClassification).toBe('not_interested');
      expect(mockPrismaService.campaignEmail.update).toHaveBeenCalledWith({
        where: { id: emailId },
        data: { replyClassification: 'not_interested' },
      });
    });

    it('should add to DNC list when classification is unsubscribe', async () => {
      mockPrismaService.campaignEmail.findFirst.mockResolvedValue(mockReply);
      mockPrismaService.campaignEmail.update.mockResolvedValue({
        ...mockReply,
        replyClassification: 'unsubscribe',
      });
      mockPrismaService.doNotContact.upsert.mockResolvedValue({});

      await service.updateClassification(tenantId, emailId, 'unsubscribe');

      expect(mockPrismaService.doNotContact.upsert).toHaveBeenCalledWith({
        where: {
          tenantId_email: {
            tenantId,
            email: mockReply.recipientEmail.toLowerCase(),
          },
        },
        create: {
          tenantId,
          email: mockReply.recipientEmail.toLowerCase(),
          reason: 'unsubscribe',
          source: 'Manual classification from reply inbox',
        },
        update: {
          reason: 'unsubscribe',
          source: 'Manual classification from reply inbox',
        },
      });
    });

    it('should not add to DNC list for other classifications', async () => {
      mockPrismaService.campaignEmail.findFirst.mockResolvedValue(mockReply);
      mockPrismaService.campaignEmail.update.mockResolvedValue({
        ...mockReply,
        replyClassification: 'interested',
      });

      await service.updateClassification(tenantId, emailId, 'interested');

      expect(mockPrismaService.doNotContact.upsert).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if reply not found', async () => {
      mockPrismaService.campaignEmail.findFirst.mockResolvedValue(null);

      await expect(
        service.updateClassification(tenantId, emailId, 'interested'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStats', () => {
    it('should return reply statistics', async () => {
      mockPrismaService.campaignEmail.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(30) // interested
        .mockResolvedValueOnce(40) // not_interested
        .mockResolvedValueOnce(10) // out_of_office
        .mockResolvedValueOnce(5) // unsubscribe
        .mockResolvedValueOnce(15); // unclassified

      const result = await service.getStats(tenantId);

      expect(result).toEqual({
        total: 100,
        interested: 30,
        notInterested: 40,
        outOfOffice: 10,
        unsubscribe: 5,
        unclassified: 15,
        interestedRate: '30.0',
      });
    });

    it('should handle zero total replies', async () => {
      mockPrismaService.campaignEmail.count
        .mockResolvedValueOnce(0) // total
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await service.getStats(tenantId);

      expect(result.interestedRate).toBe('0.0');
    });

    it('should filter by campaignId', async () => {
      mockPrismaService.campaignEmail.count.mockResolvedValue(10);

      await service.getStats(tenantId, 'campaign-123');

      expect(mockPrismaService.campaignEmail.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            campaignId: 'campaign-123',
          }),
        }),
      );
    });
  });

  describe('generateResponse', () => {
    const mockReply = {
      id: emailId,
      recipientEmail: 'john@example.com',
      recipientName: 'John Doe',
      subject: 'Re: Partnership',
      replyBody: 'Yes, I would love to schedule a call!',
      replyClassification: 'interested',
      campaign: { id: 'campaign-1', name: 'Q4 Outreach', status: 'running' },
      mailbox: { id: 'mailbox-1', email: 'sales@agency.com' },
      Contact: {
        id: 'contact-1',
        firstName: 'John',
        lastName: 'Doe',
        company: 'Acme Inc',
        email: 'john@example.com',
        linkedinUrl: 'https://linkedin.com/in/johndoe',
      },
    };

    it('should generate AI response suggestion', async () => {
      mockPrismaService.campaignEmail.findFirst.mockResolvedValue(mockReply);

      const mockAIResponse = {
        choices: [
          {
            message: {
              content:
                'Great to hear, John! I have availability next week on Tuesday or Thursday. Which works better for you?',
            },
          },
        ],
        usage: { total_tokens: 150 },
      };

      mockOpenAIService.client.chat.completions.create.mockResolvedValue(
        mockAIResponse,
      );

      const result = await service.generateResponse(tenantId, emailId);

      expect(result.suggestedResponse).toContain('Great to hear');
      expect(
        mockOpenAIService.client.chat.completions.create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4-turbo-preview',
          temperature: 0.7,
        }),
      );
    });

    it('should throw NotFoundException if reply has no body', async () => {
      mockPrismaService.campaignEmail.findFirst.mockResolvedValue({
        ...mockReply,
        replyBody: null,
      });

      await expect(service.generateResponse(tenantId, emailId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.generateResponse(tenantId, emailId)).rejects.toThrow(
        'No reply body found',
      );
    });

    it('should handle AI generation errors', async () => {
      mockPrismaService.campaignEmail.findFirst.mockResolvedValue(mockReply);
      mockOpenAIService.client.chat.completions.create.mockRejectedValue(
        new Error('OpenAI API error'),
      );

      await expect(service.generateResponse(tenantId, emailId)).rejects.toThrow(
        'OpenAI API error',
      );
    });

    it('should throw error if AI returns no content', async () => {
      mockPrismaService.campaignEmail.findFirst.mockResolvedValue(mockReply);
      mockOpenAIService.client.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: null } }],
      });

      await expect(service.generateResponse(tenantId, emailId)).rejects.toThrow(
        'No response generated from AI',
      );
    });
  });

  describe('batchClassifyReplies', () => {
    const mockUnclassifiedReplies = [
      { id: 'email-1', replyBody: 'Yes, interested!' },
      { id: 'email-2', replyBody: 'No thanks' },
      { id: 'email-3', replyBody: 'Out of office' },
    ];

    it('should batch classify unclassified replies', async () => {
      mockPrismaService.campaignEmail.findMany.mockResolvedValue(
        mockUnclassifiedReplies,
      );

      const mockAIResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                classification: 'interested',
                confidence: 0.9,
              }),
            },
          },
        ],
      };

      mockOpenAIService.client.chat.completions.create.mockResolvedValue(
        mockAIResponse,
      );
      mockPrismaService.campaignEmail.update.mockResolvedValue({});

      const result = await service.batchClassifyReplies(tenantId, 50);

      expect(result.classified).toBe(3);
      expect(result.skipped).toBe(0);
      expect(mockPrismaService.campaignEmail.update).toHaveBeenCalledTimes(3);
    });

    it('should skip replies without body', async () => {
      mockPrismaService.campaignEmail.findMany.mockResolvedValue([
        { id: 'email-1', replyBody: null },
        { id: 'email-2', replyBody: 'Thanks!' },
      ]);

      const mockAIResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({ classification: 'interested' }),
            },
          },
        ],
      };

      mockOpenAIService.client.chat.completions.create.mockResolvedValue(
        mockAIResponse,
      );
      mockPrismaService.campaignEmail.update.mockResolvedValue({});

      const result = await service.batchClassifyReplies(tenantId, 50);

      expect(result.classified).toBe(1);
      expect(result.skipped).toBe(1);
    });

    it('should handle classification errors gracefully', async () => {
      mockPrismaService.campaignEmail.findMany.mockResolvedValue([
        { id: 'email-1', replyBody: 'Test' },
      ]);

      // Clear any previous mock behavior
      mockOpenAIService.client.chat.completions.create.mockReset();
      mockOpenAIService.client.chat.completions.create.mockRejectedValue(
        new Error('API error'),
      );
      mockPrismaService.campaignEmail.update.mockResolvedValue({});

      const result = await service.batchClassifyReplies(tenantId, 50);

      // Even with AI errors, classifyReply returns 'interested' as fallback
      // so it still gets classified, not skipped
      expect(result.classified).toBe(1);
      expect(result.skipped).toBe(0);
      expect(mockPrismaService.campaignEmail.update).toHaveBeenCalledWith({
        where: { id: 'email-1' },
        data: { replyClassification: 'interested' },
      });
    });

    it('should respect limit parameter', async () => {
      mockPrismaService.campaignEmail.findMany.mockResolvedValue([]);

      await service.batchClassifyReplies(tenantId, 25);

      expect(mockPrismaService.campaignEmail.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 25,
        }),
      );
    });
  });
});
