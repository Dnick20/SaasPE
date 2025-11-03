import { Test, TestingModule } from '@nestjs/testing';
import { AIPersonalizationService } from '../ai-personalization.service';
import { OpenAIService } from '../../../shared/services/openai.service';

describe('AIPersonalizationService', () => {
  let service: AIPersonalizationService;
  let openAIService: OpenAIService;

  const mockOpenAIService = {
    client: {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    },
  };

  const mockContact = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    company: 'Acme Inc',
    linkedinUrl: 'https://linkedin.com/in/johndoe',
    customFields: {
      industry: 'Technology',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIPersonalizationService,
        { provide: OpenAIService, useValue: mockOpenAIService },
      ],
    }).compile();

    service = module.get<AIPersonalizationService>(AIPersonalizationService);
    openAIService = module.get<OpenAIService>(OpenAIService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('personalizeEmail', () => {
    const subject = 'Partnership opportunity';
    const body = 'Hi there, I noticed your company is growing rapidly...';

    it('should personalize email using AI', async () => {
      const mockAIResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                subject: 'Partnership opportunity for Acme Inc',
                body: 'Hi John, I noticed Acme Inc is growing rapidly in the Technology sector...',
              }),
            },
          },
        ],
        usage: { total_tokens: 250 },
      };

      mockOpenAIService.client.chat.completions.create.mockResolvedValue(
        mockAIResponse,
      );

      const result = await service.personalizeEmail(subject, body, mockContact);

      expect(result.subject).toBe('Partnership opportunity for Acme Inc');
      expect(result.body).toContain('Hi John');
      expect(result.body).toContain('Acme Inc');
      expect(
        mockOpenAIService.client.chat.completions.create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4-turbo-preview',
          response_format: { type: 'json_object' },
          temperature: 0.7,
        }),
      );
    });

    it('should handle contact with minimal information', async () => {
      const minimalContact = { email: 'contact@example.com' };

      const mockAIResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                subject: 'Quick question',
                body: 'Hello, I wanted to reach out...',
              }),
            },
          },
        ],
        usage: { total_tokens: 200 },
      };

      mockOpenAIService.client.chat.completions.create.mockResolvedValue(
        mockAIResponse,
      );

      const result = await service.personalizeEmail(
        subject,
        body,
        minimalContact,
      );

      expect(result.subject).toBe('Quick question');
      expect(result.body).toBe('Hello, I wanted to reach out...');
    });

    it('should fall back to template on empty AI response', async () => {
      const mockAIResponse = {
        choices: [{ message: { content: null } }],
      };

      mockOpenAIService.client.chat.completions.create.mockResolvedValue(
        mockAIResponse,
      );

      const result = await service.personalizeEmail(subject, body, mockContact);

      expect(result.subject).toBe(subject);
      expect(result.body).toBe(body);
    });

    it('should fall back to template on AI error', async () => {
      mockOpenAIService.client.chat.completions.create.mockRejectedValue(
        new Error('OpenAI API error'),
      );

      const result = await service.personalizeEmail(subject, body, mockContact);

      expect(result.subject).toBe(subject);
      expect(result.body).toBe(body);
    });

    it('should fall back to template on JSON parse error', async () => {
      const mockAIResponse = {
        choices: [{ message: { content: 'Invalid JSON' } }],
        usage: { total_tokens: 100 },
      };

      mockOpenAIService.client.chat.completions.create.mockResolvedValue(
        mockAIResponse,
      );

      const result = await service.personalizeEmail(subject, body, mockContact);

      expect(result.subject).toBe(subject);
      expect(result.body).toBe(body);
    });

    it('should use template values if AI returns empty fields', async () => {
      const mockAIResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                subject: '',
                body: '',
              }),
            },
          },
        ],
        usage: { total_tokens: 50 },
      };

      mockOpenAIService.client.chat.completions.create.mockResolvedValue(
        mockAIResponse,
      );

      const result = await service.personalizeEmail(subject, body, mockContact);

      expect(result.subject).toBe(subject);
      expect(result.body).toBe(body);
    });

    it('should include contact custom fields in prompt', async () => {
      mockOpenAIService.client.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({ subject: 'Test', body: 'Test body' }),
            },
          },
        ],
        usage: { total_tokens: 100 },
      });

      await service.personalizeEmail(subject, body, mockContact);

      const callArgs =
        mockOpenAIService.client.chat.completions.create.mock.calls[0][0];
      const userMessage = callArgs.messages.find((m: any) => m.role === 'user');

      expect(userMessage.content).toContain('industry');
      expect(userMessage.content).toContain('Technology');
    });
  });

  describe('batchPersonalize', () => {
    const emails = [
      {
        subject: 'Subject 1',
        body: 'Body 1',
        contact: { email: 'contact1@example.com', firstName: 'Alice' },
      },
      {
        subject: 'Subject 2',
        body: 'Body 2',
        contact: { email: 'contact2@example.com', firstName: 'Bob' },
      },
      {
        subject: 'Subject 3',
        body: 'Body 3',
        contact: { email: 'contact3@example.com', firstName: 'Charlie' },
      },
    ];

    it('should batch personalize multiple emails', async () => {
      mockOpenAIService.client.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                subject: 'Personalized subject',
                body: 'Personalized body',
              }),
            },
          },
        ],
        usage: { total_tokens: 200 },
      });

      const result = await service.batchPersonalize(emails, 2);

      expect(result).toHaveLength(3);
      expect(result[0].subject).toBe('Personalized subject');
      expect(result[0].contact.email).toBe('contact1@example.com');
      expect(result[1].contact.email).toBe('contact2@example.com');
      expect(result[2].contact.email).toBe('contact3@example.com');
    });

    it('should process emails in batches', async () => {
      let callCount = 0;
      mockOpenAIService.client.chat.completions.create.mockImplementation(
        () => {
          callCount++;
          return Promise.resolve({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    subject: `Subject ${callCount}`,
                    body: `Body ${callCount}`,
                  }),
                },
              },
            ],
            usage: { total_tokens: 200 },
          });
        },
      );

      const result = await service.batchPersonalize(emails, 2);

      expect(callCount).toBe(3);
      expect(result).toHaveLength(3);
    });

    it('should handle empty emails array', async () => {
      const result = await service.batchPersonalize([], 5);

      expect(result).toHaveLength(0);
      expect(
        mockOpenAIService.client.chat.completions.create,
      ).not.toHaveBeenCalled();
    });

    it('should use default maxConcurrent of 5', async () => {
      const manyEmails = Array(12)
        .fill(null)
        .map((_, i) => ({
          subject: `Subject ${i}`,
          body: `Body ${i}`,
          contact: { email: `contact${i}@example.com` },
        }));

      mockOpenAIService.client.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({ subject: 'Test', body: 'Test' }),
            },
          },
        ],
        usage: { total_tokens: 200 },
      });

      const result = await service.batchPersonalize(manyEmails);

      expect(result).toHaveLength(12);
    });

    it('should preserve contact data in results', async () => {
      mockOpenAIService.client.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                subject: 'Personalized',
                body: 'Personalized',
              }),
            },
          },
        ],
        usage: { total_tokens: 200 },
      });

      const result = await service.batchPersonalize(emails, 5);

      result.forEach((item, index) => {
        expect(item.contact).toEqual(emails[index].contact);
      });
    });
  });

  describe('generateFollowUp', () => {
    const previousEmail = {
      subject: 'Partnership opportunity',
      body: 'Hi John, I noticed your company...',
      status: 'sent',
    };

    it('should generate follow-up email', async () => {
      const mockAIResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                subject: 'Following up - Partnership opportunity',
                body: 'Hi John, I wanted to follow up on my previous email about partnering with Acme Inc...',
              }),
            },
          },
        ],
        usage: { total_tokens: 300 },
      };

      mockOpenAIService.client.chat.completions.create.mockResolvedValue(
        mockAIResponse,
      );

      const result = await service.generateFollowUp(
        previousEmail,
        mockContact,
        1,
      );

      expect(result.subject).toContain('Following up');
      expect(result.body).toContain('follow up');
      expect(
        mockOpenAIService.client.chat.completions.create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4-turbo-preview',
          temperature: 0.8,
        }),
      );
    });

    it('should handle opened email status', async () => {
      const openedEmail = {
        ...previousEmail,
        status: 'opened',
        openedAt: new Date(),
      };

      mockOpenAIService.client.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                subject: 'Quick follow-up',
                body: 'I saw you opened my email...',
              }),
            },
          },
        ],
        usage: { total_tokens: 250 },
      });

      const result = await service.generateFollowUp(
        openedEmail,
        mockContact,
        1,
      );

      expect(result).toHaveProperty('subject');
      expect(result).toHaveProperty('body');
    });

    it('should handle clicked email status', async () => {
      const clickedEmail = {
        ...previousEmail,
        status: 'clicked',
        openedAt: new Date(),
        clickedAt: new Date(),
      };

      mockOpenAIService.client.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                subject: 'Quick follow-up',
                body: 'I noticed you clicked the link...',
              }),
            },
          },
        ],
        usage: { total_tokens: 250 },
      });

      const result = await service.generateFollowUp(
        clickedEmail,
        mockContact,
        2,
      );

      expect(result).toHaveProperty('subject');
      expect(result).toHaveProperty('body');
    });

    it('should throw error on empty AI response', async () => {
      mockOpenAIService.client.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: null } }],
      });

      await expect(
        service.generateFollowUp(previousEmail, mockContact, 1),
      ).rejects.toThrow('No content received from AI');
    });

    it('should throw error on AI failure', async () => {
      mockOpenAIService.client.chat.completions.create.mockRejectedValue(
        new Error('OpenAI API error'),
      );

      await expect(
        service.generateFollowUp(previousEmail, mockContact, 1),
      ).rejects.toThrow('OpenAI API error');
    });

    it('should include follow-up number in prompt', async () => {
      mockOpenAIService.client.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                subject: 'Final follow-up',
                body: 'This is my last attempt...',
              }),
            },
          },
        ],
        usage: { total_tokens: 200 },
      });

      await service.generateFollowUp(previousEmail, mockContact, 3);

      const callArgs =
        mockOpenAIService.client.chat.completions.create.mock.calls[0][0];
      const userMessage = callArgs.messages.find((m: any) => m.role === 'user');

      expect(userMessage.content).toContain('follow-up email #3');
    });
  });

  describe('analyzeEmailPerformance', () => {
    const email = {
      subject: 'Partnership opportunity',
      body: 'Hi there, I noticed your company is growing...',
      sent: 100,
      opened: 25,
      clicked: 5,
      replied: 3,
    };

    it('should analyze email performance', async () => {
      const mockAIResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                openRateAnalysis: 'Your 25% open rate is above average...',
                clickRateAnalysis: 'Click rate of 20% is excellent...',
                suggestions: [
                  'Try a more specific subject line',
                  'Add social proof in the first paragraph',
                  'Include a clearer call-to-action',
                ],
                improvedSubject: 'Quick question about [specific problem]',
                improvedBody: 'Improved email body...',
              }),
            },
          },
        ],
        usage: { total_tokens: 500 },
      };

      mockOpenAIService.client.chat.completions.create.mockResolvedValue(
        mockAIResponse,
      );

      const result = await service.analyzeEmailPerformance(email);

      expect(result.openRateAnalysis).toContain('25%');
      expect(result.clickRateAnalysis).toContain('20%');
      expect(result.suggestions).toHaveLength(3);
      expect(result.improvedSubject).toBeDefined();
      expect(result.improvedBody).toBeDefined();
    });

    it('should calculate metrics correctly', async () => {
      mockOpenAIService.client.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                openRateAnalysis: 'Analysis',
                clickRateAnalysis: 'Analysis',
                suggestions: ['Tip 1'],
                improvedSubject: 'Subject',
                improvedBody: 'Body',
              }),
            },
          },
        ],
        usage: { total_tokens: 400 },
      });

      await service.analyzeEmailPerformance(email);

      const callArgs =
        mockOpenAIService.client.chat.completions.create.mock.calls[0][0];
      const userMessage = callArgs.messages.find((m: any) => m.role === 'user');

      expect(userMessage.content).toContain('Open Rate: 25.0%');
      expect(userMessage.content).toContain('Click Rate: 20.0%');
      expect(userMessage.content).toContain('Reply Rate: 3.0%');
    });

    it('should handle zero metrics', async () => {
      const zeroEmail = {
        ...email,
        sent: 0,
        opened: 0,
        clicked: 0,
        replied: 0,
      };

      mockOpenAIService.client.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                openRateAnalysis: 'No data yet',
                clickRateAnalysis: 'No data yet',
                suggestions: ['Send the campaign first'],
                improvedSubject: 'Test',
                improvedBody: 'Test',
              }),
            },
          },
        ],
        usage: { total_tokens: 200 },
      });

      const result = await service.analyzeEmailPerformance(zeroEmail);

      expect(result).toHaveProperty('openRateAnalysis');
      expect(result).toHaveProperty('clickRateAnalysis');
    });

    it('should throw error on empty AI response', async () => {
      mockOpenAIService.client.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: null } }],
      });

      await expect(service.analyzeEmailPerformance(email)).rejects.toThrow(
        'No analysis received from AI',
      );
    });

    it('should throw error on AI failure', async () => {
      mockOpenAIService.client.chat.completions.create.mockRejectedValue(
        new Error('OpenAI API error'),
      );

      await expect(service.analyzeEmailPerformance(email)).rejects.toThrow(
        'OpenAI API error',
      );
    });

    it('should use correct model and temperature', async () => {
      mockOpenAIService.client.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                openRateAnalysis: 'Test',
                clickRateAnalysis: 'Test',
                suggestions: ['Test'],
                improvedSubject: 'Test',
                improvedBody: 'Test',
              }),
            },
          },
        ],
        usage: { total_tokens: 200 },
      });

      await service.analyzeEmailPerformance(email);

      expect(
        mockOpenAIService.client.chat.completions.create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4-turbo-preview',
          temperature: 0.6,
          max_tokens: 1200,
        }),
      );
    });
  });
});
