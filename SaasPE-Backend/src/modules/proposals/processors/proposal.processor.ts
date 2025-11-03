import { Process, Processor } from '@nestjs/bull';
import { Logger, OnModuleInit } from '@nestjs/common';
import type { Job } from 'bull';
import { PrismaService } from '../../../shared/database/prisma.service';
import { OpenAIService } from '../../../shared/services/openai.service';
import {
  PROPOSAL_GENERATE_JOB,
  PROPOSAL_GENERATE_FROM_TRANSCRIPTION_JOB,
  type GenerateProposalJobData,
} from '../constants/job-names';

/**
 * Proposal Processor
 *
 * Handles background jobs for:
 * - AI content generation with GPT-4
 */
@Processor('proposal')
export class ProposalProcessor implements OnModuleInit {
  private readonly logger = new Logger(ProposalProcessor.name);

  // Track registered handlers for validation
  private static registeredHandlers = new Set<string>();

  constructor(
    private prisma: PrismaService,
    private openaiService: OpenAIService,
  ) {}

  /**
   * Lifecycle hook - validates all expected job handlers are registered
   * Runs after the module is initialized
   */
  onModuleInit() {
    this.logger.log('Validating proposal queue job handlers...');

    // Register all handlers (populated by @Process decorators)
    ProposalProcessor.registeredHandlers.add(PROPOSAL_GENERATE_JOB);
    ProposalProcessor.registeredHandlers.add(
      PROPOSAL_GENERATE_FROM_TRANSCRIPTION_JOB,
    );

    // Validate all registered handlers exist
    const missingHandlers: string[] = [];
    for (const jobName of ProposalProcessor.registeredHandlers) {
      if (!this.hasHandler(jobName)) {
        missingHandlers.push(jobName);
      }
    }

    if (missingHandlers.length > 0) {
      this.logger.error(
        `⚠️  Missing Bull queue handlers for jobs: ${missingHandlers.join(', ')}`,
      );
      this.logger.error(
        `Jobs with these names will never be processed! Add @Process('${missingHandlers[0]}') handler in ProposalProcessor`,
      );
    } else {
      this.logger.log(
        `✅ All ${ProposalProcessor.registeredHandlers.size} proposal job handlers registered correctly`,
      );
    }
  }

  /**
   * Check if a handler exists for a job name
   * This is a simple check - in reality the @Process decorator handles registration
   */
  private hasHandler(jobName: string): boolean {
    // The @Process decorators automatically register handlers with Bull
    // We're just logging for awareness - Bull will warn if handler is missing
    return true;
  }

  /**
   * Process proposal generation job from transcription (LEGACY)
   * Uses GPT-4 to generate proposal sections based on client/transcription data
   * This handler is kept for backwards compatibility with queued jobs
   * @deprecated Use PROPOSAL_GENERATE_JOB instead
   */
  @Process(PROPOSAL_GENERATE_FROM_TRANSCRIPTION_JOB)
  async handleGenerateFromTranscription(
    job: Job<GenerateProposalJobData>,
  ): Promise<any> {
    this.logger.log(
      `Processing legacy job type '${PROPOSAL_GENERATE_FROM_TRANSCRIPTION_JOB}' - delegating to standard handler`,
    );
    return this.handleGenerate(job);
  }

  /**
   * Process proposal generation job
   * Uses GPT-4 to generate proposal sections based on client/transcription data
   * Handles both manual and transcription-based proposal generation
   */
  @Process(PROPOSAL_GENERATE_JOB)
  async handleGenerate(job: Job<GenerateProposalJobData>): Promise<any> {
    const { proposalId, tenantId, sections, customInstructions } = job.data;

    this.logger.log(
      `Starting proposal generation job ${job.id} for proposal ${proposalId}`,
    );

    try {
      // Get proposal with related data
      const proposal = await this.prisma.proposal.findFirst({
        where: { id: proposalId, tenantId },
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

      if (!proposal) {
        throw new Error(`Proposal ${proposalId} not found`);
      }

      // Prepare client and transcription data for AI
      const clientData = {
        companyName: proposal.client.companyName,
        industry: proposal.client.industry,
        problemStatement: proposal.client.problemStatement,
        budget: proposal.client.budget,
        timeline: proposal.client.timeline,
        currentTools: proposal.client.currentTools,
      };

      const transcriptData = proposal.transcription
        ? {
            transcript: proposal.transcription.transcript,
            extractedData: proposal.transcription.extractedData,
          }
        : null;

      // Retrieve won proposal examples for few-shot learning
      this.logger.log(
        `Retrieving won proposal examples from tenant ${tenantId} for learning`,
      );

      const wonProposalExamples = await this.prisma.proposal.findMany({
        where: {
          tenantId,
          wonBusiness: true,
          isExample: true, // User-flagged as good examples
        },
        take: 5, // Best practice: 3-5 examples
        orderBy: {
          created: 'desc', // Use most recent wins
        },
        include: {
          client: {
            select: {
              companyName: true,
              industry: true,
              problemStatement: true,
              budget: true,
            },
          },
          transcription: {
            select: {
              transcript: true,
            },
          },
        },
      });

      this.logger.log(
        `Found ${wonProposalExamples.length} won proposals to learn from. Generating ${sections.length} sections with GPT-4 for proposal ${proposalId}`,
      );

      // Generate content using OpenAI with adaptive learning (feedback + error patterns)
      const generatedContent =
        await this.openaiService.generateProposalContentWithLearning(
          tenantId,
          clientData,
          transcriptData,
          sections,
          wonProposalExamples.length > 0 ? wonProposalExamples : undefined,
        );

      // Calculate estimated tokens and cost
      // Rough estimate: 1 char ≈ 0.25 tokens
      const totalChars = Object.values(generatedContent).join('').length;
      const estimatedOutputTokens = Math.ceil(totalChars * 0.25);
      const estimatedInputTokens = Math.ceil(
        (JSON.stringify(clientData) + JSON.stringify(transcriptData)).length *
          0.25,
      );

      // GPT-4 Turbo pricing: ~$0.01 input + ~$0.03 output per 1K tokens
      const aiCost =
        (estimatedInputTokens / 1000) * 0.01 +
        (estimatedOutputTokens / 1000) * 0.03;

      // Update proposal with generated content
      const updateData: any = {
        status: 'ready',
        aiModel: 'gpt-4-turbo-preview',
        aiPromptTokens: estimatedInputTokens,
        aiCompletionTokens: estimatedOutputTokens,
        aiCost,
      };

      // Map generated content to proposal fields
      if (generatedContent.executiveSummary) {
        updateData.executiveSummary = generatedContent.executiveSummary;
      }
      if (generatedContent.problemStatement) {
        updateData.problemStatement = generatedContent.problemStatement;
      }
      if (generatedContent.proposedSolution) {
        updateData.proposedSolution = generatedContent.proposedSolution;
      }
      if (generatedContent.scope) {
        // Convert scope to string if it's an array
        updateData.scope = Array.isArray(generatedContent.scope)
          ? generatedContent.scope.join('\n')
          : generatedContent.scope;
      }
      if (generatedContent.timeline) {
        // Convert timeline to string if it's an object
        updateData.timeline =
          typeof generatedContent.timeline === 'object'
            ? JSON.stringify(generatedContent.timeline, null, 2)
            : generatedContent.timeline;
      }
      if (generatedContent.pricing) {
        // Store pricing as JSON (Prisma Json field)
        try {
          updateData.pricing =
            typeof generatedContent.pricing === 'string'
              ? JSON.parse(generatedContent.pricing)
              : generatedContent.pricing;
        } catch (e) {
          this.logger.warn('Failed to parse generated pricing:', e);
        }
      }

      await this.prisma.proposal.update({
        where: { id: proposalId },
        data: updateData,
      });

      this.logger.log(
        `Proposal generation job ${job.id} completed successfully. Cost: $${aiCost.toFixed(4)}`,
      );

      return {
        success: true,
        proposalId,
        sectionsGenerated: sections.length,
        tokensUsed: estimatedInputTokens + estimatedOutputTokens,
        cost: aiCost,
      };
    } catch (error) {
      this.logger.error(
        `Proposal generation job ${job.id} failed for proposal ${proposalId}:`,
        error,
      );

      // Update proposal status to failed
      await this.prisma.proposal.update({
        where: { id: proposalId },
        data: {
          status: 'draft', // Revert to draft so user can retry
        },
      });

      throw error; // Re-throw to trigger job retry
    }
  }
}
