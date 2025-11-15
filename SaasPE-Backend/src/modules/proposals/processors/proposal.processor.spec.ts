import { Test, TestingModule } from '@nestjs/testing';
import { ProposalProcessor } from './proposal.processor';
import { PrismaService } from '../../../shared/database/prisma.service';
import { OpenAIService } from '../../../shared/services/openai.service';
import {
  PROPOSAL_GENERATE_JOB,
  PROPOSAL_GENERATE_FROM_TRANSCRIPTION_JOB,
  PROPOSAL_JOB_NAMES,
} from '../constants/job-names';

describe('ProposalProcessor', () => {
  let processor: ProposalProcessor;
  let prismaService: PrismaService;
  let openaiService: OpenAIService;

  // Mock job data
  const mockJobData = {
    proposalId: 'test-proposal-id',
    tenantId: 'test-tenant-id',
    sections: ['executiveSummary', 'problemStatement', 'proposedSolution'],
  };

  // Mock proposal data
  const mockProposal = {
    id: 'test-proposal-id',
    tenantId: 'test-tenant-id',
    userId: 'test-user-id',
    clientId: 'test-client-id',
    title: 'Test Proposal',
    status: 'generating',
    client: {
      companyName: 'Test Company',
      industry: 'Technology',
      problemStatement: 'Need automation',
      budget: '$50,000',
      timeline: '3 months',
      currentTools: ['Excel', 'Manual processes'],
    },
    transcription: {
      transcript: 'Test transcript content about client needs...',
      extractedData: {
        problemStatement: 'Manual processes causing delays',
        budget: '$50,000',
      },
    },
  };

  // Mock generated content
  const mockGeneratedContent = {
    executiveSummary: 'This proposal outlines...',
    problemStatement: 'Test Company faces challenges with...',
    proposedSolution: 'We propose to implement...',
  };

  beforeEach(async () => {
    // Create mock services
    const mockPrismaService = {
      proposal: {
        findFirst: jest.fn().mockResolvedValue(mockProposal),
        findMany: jest.fn().mockResolvedValue([]), // For won proposals
        update: jest.fn().mockResolvedValue({
          ...mockProposal,
          status: 'ready',
          ...mockGeneratedContent,
        }),
      },
    };

    const mockOpenAIService = {
      generateProposalContentWithLearning: jest
        .fn()
        .mockResolvedValue(mockGeneratedContent),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProposalProcessor,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: OpenAIService,
          useValue: mockOpenAIService,
        },
      ],
    }).compile();

    processor = module.get<ProposalProcessor>(ProposalProcessor);
    prismaService = module.get<PrismaService>(PrismaService);
    openaiService = module.get<OpenAIService>(OpenAIService);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('handleGenerate', () => {
    it('should successfully generate proposal content', async () => {
      const mockJob = {
        id: 123,
        data: mockJobData,
      } as any;

      const result = await processor.handleGenerate(mockJob);

      expect(result).toEqual({
        success: true,
        proposalId: mockJobData.proposalId,
        sectionsGenerated: mockJobData.sections.length,
        tokensUsed: expect.any(Number),
        cost: expect.any(Number),
      });

      // Verify Prisma was called correctly
      expect(prismaService.proposal.findFirst).toHaveBeenCalledWith({
        where: { id: mockJobData.proposalId, tenantId: mockJobData.tenantId },
        include: {
          client: true,
          transcription: {
            select: {
              transcript: true,
              extractedData: true,
            },
          },
        },
      });

      // Verify OpenAI was called
      expect(
        openaiService.generateProposalContentWithLearning,
      ).toHaveBeenCalled();

      // Verify proposal was updated
      expect(prismaService.proposal.update).toHaveBeenCalledWith({
        where: { id: mockJobData.proposalId },
        data: expect.objectContaining({
          status: 'ready',
          executiveSummary: mockGeneratedContent.executiveSummary,
          problemStatement: mockGeneratedContent.problemStatement,
          proposedSolution: mockGeneratedContent.proposedSolution,
        }),
      });
    });

    it('should handle proposal not found error', async () => {
      (prismaService.proposal.findFirst as jest.Mock).mockResolvedValue(null);

      const mockJob = {
        id: 123,
        data: mockJobData,
      } as any;

      await expect(processor.handleGenerate(mockJob)).rejects.toThrow(
        'Proposal test-proposal-id not found',
      );

      // Note: The error is thrown before we reach the status update logic
      // so the update may or may not be called depending on error handling
    });

    it('should revert status to draft on generation failure', async () => {
      const error = new Error('OpenAI API error');
      (
        openaiService.generateProposalContentWithLearning as jest.Mock
      ).mockRejectedValue(error);

      const mockJob = {
        id: 123,
        data: mockJobData,
      } as any;

      await expect(processor.handleGenerate(mockJob)).rejects.toThrow(error);

      // Verify proposal status was reverted to draft
      expect(prismaService.proposal.update).toHaveBeenCalledWith({
        where: { id: mockJobData.proposalId },
        data: {
          status: 'draft',
        },
      });
    });
  });

  describe('handleGenerateFromTranscription', () => {
    it('should call handleGenerate with job data', async () => {
      const mockJob = {
        id: 123,
        data: mockJobData,
      } as any;

      // Spy on handleGenerate
      const handleGenerateSpy = jest.spyOn(processor, 'handleGenerate');

      await processor.handleGenerateFromTranscription(mockJob);

      // Verify handleGenerate was called with the job
      expect(handleGenerateSpy).toHaveBeenCalledWith(mockJob);
    });

    it('should successfully generate proposal from transcription', async () => {
      const mockJob = {
        id: 123,
        data: mockJobData,
      } as any;

      const result = await processor.handleGenerateFromTranscription(mockJob);

      expect(result).toEqual({
        success: true,
        proposalId: mockJobData.proposalId,
        sectionsGenerated: mockJobData.sections.length,
        tokensUsed: expect.any(Number),
        cost: expect.any(Number),
      });
    });
  });

  describe('Job Handler Registration (CRITICAL)', () => {
    /**
     * CRITICAL TEST: Ensures all job names defined in constants have handlers
     * This test will FAIL if you add a new job name but forget to add a @Process handler
     *
     * HOW IT WORKS:
     * 1. Gets all job names from PROPOSAL_JOB_NAMES constant
     * 2. Checks that each job has a corresponding handler method
     * 3. Fails with helpful error if any are missing
     *
     * WHY THIS MATTERS:
     * - Prevents jobs from being enqueued but never processed
     * - Catches configuration errors at test time, not production
     * - Ensures job name constants match actual handlers
     */
    it('should have @Process handlers for all defined job names', () => {
      const processorPrototype = Object.getPrototypeOf(processor);
      const methodNames = Object.getOwnPropertyNames(processorPrototype);

      // Map of job names to their expected handler methods
      const expectedHandlers = {
        [PROPOSAL_GENERATE_JOB]: 'handleGenerate',
        [PROPOSAL_GENERATE_FROM_TRANSCRIPTION_JOB]:
          'handleGenerateFromTranscription',
      };

      const missingHandlers: string[] = [];

      for (const jobName of PROPOSAL_JOB_NAMES) {
        const expectedMethod = expectedHandlers[jobName];

        if (!expectedMethod) {
          missingHandlers.push(
            `${jobName} (no expected handler defined in test)`,
          );
          continue;
        }

        if (!methodNames.includes(expectedMethod)) {
          missingHandlers.push(
            `${jobName} (expected method: ${expectedMethod})`,
          );
        }

        const method = processorPrototype[expectedMethod];
        if (typeof method !== 'function') {
          missingHandlers.push(
            `${jobName} (${expectedMethod} is not a function)`,
          );
        }
      }

      if (missingHandlers.length > 0) {
        fail(
          `\n\n❌ CRITICAL: Missing @Process handlers!\n\n` +
            `The following job names are defined in constants but have no handlers:\n` +
            missingHandlers.map((h) => `  - ${h}`).join('\n') +
            `\n\nFIX:\n` +
            `1. Add a @Process('${PROPOSAL_JOB_NAMES[0]}') method in ProposalProcessor\n` +
            `2. Or remove the job name from PROPOSAL_JOB_NAMES constant\n` +
            `3. Update the expectedHandlers map in this test\n\n` +
            `Jobs without handlers will be enqueued but NEVER processed!\n`,
        );
      }

      expect(missingHandlers).toHaveLength(0);
    });

    it('should have handler for PROPOSAL_GENERATE_JOB', () => {
      expect(typeof processor.handleGenerate).toBe('function');
      expect(processor.handleGenerate).toBeDefined();
    });

    it('should have handler for PROPOSAL_GENERATE_FROM_TRANSCRIPTION_JOB (legacy)', () => {
      expect(typeof processor.handleGenerateFromTranscription).toBe('function');
      expect(processor.handleGenerateFromTranscription).toBeDefined();
    });

    it('legacy handler should delegate to main handler', async () => {
      const mockJob = { id: 123, data: mockJobData } as any;
      const handleGenerateSpy = jest.spyOn(processor, 'handleGenerate');

      await processor.handleGenerateFromTranscription(mockJob);

      expect(handleGenerateSpy).toHaveBeenCalledWith(mockJob);
    });
  });
});
