import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DeepThinkingAgentService } from './deep-thinking-agent.service';
import { PrismaService } from '../database/prisma.service';

/**
 * Unit tests for DeepThinkingAgent Service
 *
 * Tests cover:
 * - Failure analysis and insights generation
 * - Database logging of learnings
 * - Past learnings retrieval
 * - Enhanced prompt generation
 */
describe('DeepThinkingAgentService', () => {
  let service: DeepThinkingAgentService;
  let prismaService: PrismaService;
  let mockOpenAI: any;

  beforeEach(async () => {
    // Mock OpenAI client
    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'OPENAI_API_KEY') return 'test-api-key';
        return null;
      }),
    };

    const mockPrismaService = {
      proposalLearningLog: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeepThinkingAgentService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<DeepThinkingAgentService>(DeepThinkingAgentService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Inject mock OpenAI client
    (service as any).openai = mockOpenAI;
  });

  describe('analyzeFailure', () => {
    it('should analyze validation errors and return structured insights', async () => {
      const mockAnalysisResponse = {
        rootCause: 'Missing estimatedHours in proposedProjectPhases',
        missingFields: ['proposedProjectPhases[0].estimatedHours'],
        malformedFields: [],
        recommendations: [
          'Ensure all phases include estimatedHours with perMonth and perWeek',
          'Validate numeric types for hour estimates',
        ],
        suggestedPromptAdjustments: [
          'Add explicit instruction: Each phase MUST include estimatedHours: {perMonth: number, perWeek: number}',
        ],
        confidenceScore: 85,
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAnalysisResponse),
            },
          },
        ],
      });

      (prismaService.proposalLearningLog.create as jest.Mock).mockResolvedValue({
        id: 'test-log-id',
        proposalId: 'proposal-123',
        tenantId: 'tenant-456',
        attemptCount: 2,
        ...mockAnalysisResponse,
      });

      const context = {
        proposalId: 'proposal-123',
        tenantId: 'tenant-456',
        attemptCount: 2,
        previousErrors: [
          {
            field: 'proposedProjectPhases[0].estimatedHours',
            issue: 'Missing or invalid estimatedHours',
            expectedFormat: '{ perMonth: number, perWeek: number }',
            receivedValue: undefined,
          },
        ],
        transcriptionText: 'Client discussion about project timeline...',
        clientContext: { companyName: 'Acme Corp' },
        companyProfile: null,
        lastGeneratedProposal: {
          proposedProjectPhases: [
            {
              phase: 'Phase 1',
              commitment: '3-Month',
              window: 'Months 1-3',
              focus: 'Launch',
              bullets: ['B1', 'B2'],
              // Missing estimatedHours
            },
          ],
        },
      };

      const result = await service.analyzeFailure(context);

      expect(result).toEqual(mockAnalysisResponse);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o',
          temperature: 0.3,
          response_format: { type: 'json_object' },
        }),
      );
      expect(prismaService.proposalLearningLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          proposalId: 'proposal-123',
          tenantId: 'tenant-456',
          attemptCount: 2,
          rootCause: mockAnalysisResponse.rootCause,
          confidenceScore: 85,
        }),
      });
    });

    it('should return fallback insights when analysis fails', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('OpenAI API error'));

      const context = {
        proposalId: 'proposal-123',
        tenantId: 'tenant-456',
        attemptCount: 2,
        previousErrors: [
          {
            field: 'scopeOfWork',
            issue: 'Must be an array',
            expectedFormat: 'Array<ScopeOfWorkItem>',
            receivedValue: 'string',
          },
        ],
        transcriptionText: '',
        clientContext: {},
        companyProfile: null,
        lastGeneratedProposal: {},
      };

      const result = await service.analyzeFailure(context);

      expect(result.rootCause).toContain('Analysis failed');
      expect(result.missingFields).toEqual(['scopeOfWork']);
      expect(result.recommendations).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Ensure all required fields'),
        ]),
      );
      expect(result.confidenceScore).toBe(20);
    });

    it('should handle empty errors gracefully', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                rootCause: 'No specific errors identified',
                missingFields: [],
                malformedFields: [],
                recommendations: ['Review overall structure'],
                suggestedPromptAdjustments: [],
                confidenceScore: 50,
              }),
            },
          },
        ],
      });

      (prismaService.proposalLearningLog.create as jest.Mock).mockResolvedValue({});

      const context = {
        proposalId: 'proposal-123',
        tenantId: 'tenant-456',
        attemptCount: 1,
        previousErrors: [],
        transcriptionText: '',
        clientContext: {},
        companyProfile: null,
        lastGeneratedProposal: {},
      };

      const result = await service.analyzeFailure(context);

      expect(result.confidenceScore).toBe(50);
      expect(result.missingFields).toHaveLength(0);
    });
  });

  describe('getPastLearnings', () => {
    it('should retrieve past learning logs for a tenant', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          proposalId: 'prop-1',
          tenantId: 'tenant-123',
          attemptCount: 2,
          rootCause: 'Missing phases',
          missingFields: ['proposedProjectPhases'],
          malformedFields: [],
          recommendations: ['Add phases'],
          promptAdjustments: [],
          confidenceScore: 80,
          created: new Date(),
        },
        {
          id: 'log-2',
          proposalId: 'prop-2',
          tenantId: 'tenant-123',
          attemptCount: 3,
          rootCause: 'Invalid hours',
          missingFields: [],
          malformedFields: ['estimatedHours'],
          recommendations: ['Use numeric values'],
          promptAdjustments: [],
          confidenceScore: 90,
          created: new Date(),
        },
      ];

      (prismaService.proposalLearningLog.findMany as jest.Mock).mockResolvedValue(mockLogs);

      const result = await service.getPastLearnings('tenant-123', 10);

      expect(result).toEqual(mockLogs);
      expect(prismaService.proposalLearningLog.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-123' },
        orderBy: { created: 'desc' },
        take: 10,
      });
    });

    it('should return empty array when query fails', async () => {
      (prismaService.proposalLearningLog.findMany as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      const result = await service.getPastLearnings('tenant-123');

      expect(result).toEqual([]);
    });
  });

  describe('generateEnhancedPromptInstructions', () => {
    it('should generate formatted prompt instructions from insights', () => {
      const insights = {
        rootCause: 'Missing required fields in phases',
        missingFields: ['proposedProjectPhases[0].estimatedHours', 'scopeOfWork[2].keyActivities'],
        malformedFields: ['timeline.workItems'],
        recommendations: [
          'Ensure all phases have estimatedHours',
          'Add at least 3 key activities per work item',
        ],
        suggestedPromptAdjustments: [
          'Add explicit schema validation examples',
          'Include numeric type hints for estimatedHours',
        ],
        confidenceScore: 85,
      };

      const result = service.generateEnhancedPromptInstructions(insights);

      expect(result).toContain('=== CRITICAL VALIDATION REQUIREMENTS ===');
      expect(result).toContain('YOU MUST include these fields:');
      expect(result).toContain('proposedProjectPhases[0].estimatedHours');
      expect(result).toContain('scopeOfWork[2].keyActivities');
      expect(result).toContain('Fix formatting for these fields:');
      expect(result).toContain('timeline.workItems');
      expect(result).toContain('Follow these recommendations:');
      expect(result).toContain('Ensure all phases have estimatedHours');
      expect(result).toContain('Prompt adjustments:');
      expect(result).toContain('Add explicit schema validation examples');
      expect(result).toContain('=== END VALIDATION REQUIREMENTS ===');
    });

    it('should handle empty insights gracefully', () => {
      const insights = {
        rootCause: 'Unknown',
        missingFields: [],
        malformedFields: [],
        recommendations: [],
        suggestedPromptAdjustments: [],
        confidenceScore: 20,
      };

      const result = service.generateEnhancedPromptInstructions(insights);

      expect(result).toContain('=== CRITICAL VALIDATION REQUIREMENTS ===');
      expect(result).toContain('=== END VALIDATION REQUIREMENTS ===');
      expect(result).not.toContain('YOU MUST include these fields:');
      expect(result).not.toContain('Fix formatting for these fields:');
    });

    it('should format recommendations with numbering', () => {
      const insights = {
        rootCause: 'Test',
        missingFields: [],
        malformedFields: [],
        recommendations: ['Recommendation 1', 'Recommendation 2', 'Recommendation 3'],
        suggestedPromptAdjustments: [],
        confidenceScore: 70,
      };

      const result = service.generateEnhancedPromptInstructions(insights);

      expect(result).toContain('1. Recommendation 1');
      expect(result).toContain('2. Recommendation 2');
      expect(result).toContain('3. Recommendation 3');
    });
  });
});
