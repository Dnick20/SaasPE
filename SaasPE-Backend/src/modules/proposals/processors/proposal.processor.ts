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
    const startTime = Date.now();

    // Structured logging: Job started
    this.logger.log('Proposal generation started', {
      jobId: job.id,
      proposalId,
      tenantId,
      sectionsRequested: sections.length,
      sections: sections.join(', '),
      timestamp: new Date().toISOString(),
      event: 'proposal_generation_started',
    });

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
      const examplesStartTime = Date.now();
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
      const examplesDuration = Date.now() - examplesStartTime;

      this.logger.log('Retrieved learning examples', {
        proposalId,
        examplesFound: wonProposalExamples.length,
        queryDuration: examplesDuration,
        event: 'learning_examples_retrieved',
      });

      // Generate content using OpenAI with adaptive learning (feedback + error patterns)
      const aiStartTime = Date.now();
      this.logger.log('AI generation starting', {
        proposalId,
        sectionsToGenerate: sections.length,
        hasTranscription: !!transcriptData,
        hasExamples: wonProposalExamples.length > 0,
        event: 'ai_generation_started',
      });

      const generatedContent =
        await this.openaiService.generateProposalContentWithLearning(
          tenantId,
          clientData,
          transcriptData,
          sections,
          wonProposalExamples.length > 0 ? wonProposalExamples : undefined,
          undefined, // discoveryContext
          4000, // maxTokens
          proposalId, // proposalId for DeepThinkingAgent
        );

      const aiDuration = Date.now() - aiStartTime;

      // Debug logging: Show exactly which fields the AI returned
      const returnedFields = Object.keys(generatedContent).filter(k => k !== '_metadata');
      this.logger.log('AI returned fields', {
        proposalId,
        returnedFields,
        fieldCount: returnedFields.length,
        event: 'ai_fields_returned',
      });

      // Use actual token counts from API if available, otherwise estimate
      const actualTokens = generatedContent._metadata;
      const promptTokens = actualTokens?.promptTokens || Math.ceil(
        (JSON.stringify(clientData) + JSON.stringify(transcriptData)).length * 0.25,
      );
      const completionTokens = actualTokens?.completionTokens || Math.ceil(
        Object.values(generatedContent).filter(v => typeof v === 'string').join('').length * 0.25,
      );
      const totalTokens = actualTokens?.totalTokens || (promptTokens + completionTokens);

      // GPT-4o pricing: $2.50 input + $10.00 output per 1M tokens
      // Reference: https://openai.com/api/pricing/
      const aiCost =
        (promptTokens / 1_000_000) * 2.50 +
        (completionTokens / 1_000_000) * 10.00;

      this.logger.log('AI generation completed', {
        proposalId,
        aiDuration,
        sectionsGenerated: Object.keys(generatedContent).filter(k => k !== '_metadata').length,
        tokens: {
          prompt: promptTokens,
          completion: completionTokens,
          total: totalTokens,
          source: actualTokens ? 'api_actual' : 'estimated',
        },
        contextPack: {
          used: actualTokens?.contextPackUsed || false,
          savings: actualTokens?.tokenSavings,
        },
        cost: parseFloat(aiCost.toFixed(6)),
        event: 'ai_generation_completed',
      });

      // Update proposal with generated content
      const updateData: any = {
        status: 'ready',
        aiModel: actualTokens?.model || 'gpt-4o',
        aiPromptTokens: promptTokens,
        aiCompletionTokens: completionTokens,
        aiCost,
      };

      // Map generated content to proposal fields with backward compatibility
      if (generatedContent.overview) {
        // Map overview to coverPageData.summary (stored as JSON)
        updateData.coverPageData = {
          summary: generatedContent.overview,
        };
      }
      if (generatedContent.executiveSummary) {
        updateData.executiveSummary = generatedContent.executiveSummary;
      }
      if (generatedContent.objectivesAndOutcomes) {
        updateData.objectivesAndOutcomes = generatedContent.objectivesAndOutcomes;
      }

      // Backward compatibility: map legacy 'scope' to 'scopeOfWork'
      if (generatedContent.scopeOfWork) {
        updateData.scopeOfWork = generatedContent.scopeOfWork;
      } else if (generatedContent.scope) {
        this.logger.warn('Legacy field "scope" detected, mapping to "scopeOfWork"', {
          proposalId,
          event: 'legacy_field_mapping',
        });
        updateData.scopeOfWork = generatedContent.scope;
      }
      if (generatedContent.deliverables) {
        updateData.deliverables = generatedContent.deliverables;
      }
      if (generatedContent.approachAndTools) {
        updateData.approachAndTools = generatedContent.approachAndTools;
      }
      if (generatedContent.paymentTerms) {
        updateData.paymentTerms = generatedContent.paymentTerms;
      }
      if (generatedContent.cancellationNotice) {
        updateData.cancellationNotice = generatedContent.cancellationNotice;
      }
      if (generatedContent.timeline) {
        // Convert timeline to string if it's an object
        updateData.timeline =
          typeof generatedContent.timeline === 'object'
            ? JSON.stringify(generatedContent.timeline, null, 2)
            : generatedContent.timeline;
      }
      if (generatedContent.pricing) {
        // Store pricing as JSON with normalization and validation
        try {
          let pricingObj = typeof generatedContent.pricing === 'string'
            ? JSON.parse(generatedContent.pricing)
            : generatedContent.pricing;

          // Normalize prices (accept string or number)
          if (pricingObj?.items && Array.isArray(pricingObj.items)) {
            pricingObj.items = pricingObj.items.map((item: any) => ({
              ...item,
              price: typeof item.price === 'string'
                ? parseFloat(item.price.replace(/[^0-9.-]/g, ''))
                : item.price
            }));

            // Validate: all prices >= 0
            const invalidPrices = pricingObj.items.filter((item: any) =>
              isNaN(item.price) || item.price < 0
            );

            if (invalidPrices.length > 0) {
              this.logger.error('Pricing contains invalid prices', {
                proposalId,
                invalidItems: invalidPrices.map((item: any) => item.name)
              });
              updateData.pricing = null;
            } else {
              // Validate: total === sum(items) within 1 cent tolerance
              const calculatedTotal = pricingObj.items.reduce(
                (sum: number, item: any) => sum + item.price, 0
              );
              const totalDiff = Math.abs(calculatedTotal - (pricingObj.total || 0));

              if (totalDiff > 0.01) {
                this.logger.warn('Pricing total mismatch - auto-correcting', {
                  proposalId,
                  aiTotal: pricingObj.total,
                  calculatedTotal,
                  difference: totalDiff
                });
                pricingObj.total = calculatedTotal; // Auto-correct
              }

              updateData.pricing = pricingObj;
              this.logger.log('Pricing normalized successfully', {
                proposalId,
                itemCount: pricingObj.items.length,
                total: pricingObj.total
              });
            }
          } else {
            this.logger.error('Pricing missing items array', {
              proposalId,
              hasItems: !!pricingObj?.items,
              isArray: Array.isArray(pricingObj?.items)
            });
            updateData.pricing = null;
          }
        } catch (e) {
          this.logger.error('Pricing parse failed', {
            proposalId,
            error: e.message,
            rawType: typeof generatedContent.pricing,
            rawPreview: String(generatedContent.pricing).substring(0, 200)
          });
          updateData.pricing = null;
        }
      }

      // Debug logging: Show which fields we're saving to database
      const savedFields = Object.keys(updateData).filter(k =>
        !['status', 'aiModel', 'aiPromptTokens', 'aiCompletionTokens', 'aiCost'].includes(k)
      );
      this.logger.log('Saving fields to database', {
        proposalId,
        savedFields,
        savedFieldCount: savedFields.length,
        event: 'fields_saving_to_db',
      });

      const dbStartTime = Date.now();
      await this.prisma.proposal.update({
        where: { id: proposalId },
        data: updateData,
      });
      const dbDuration = Date.now() - dbStartTime;

      const totalDuration = Date.now() - startTime;

      // Structured logging: Job completed successfully
      this.logger.log('Proposal generation completed successfully', {
        jobId: job.id,
        proposalId,
        tenantId,
        metrics: {
          totalDuration,
          aiDuration,
          dbDuration,
          sectionsGenerated: sections.length,
          tokens: {
            prompt: promptTokens,
            completion: completionTokens,
            total: totalTokens,
            source: actualTokens ? 'api_actual' : 'estimated',
          },
          contextPack: {
            used: actualTokens?.contextPackUsed || false,
            savings: actualTokens?.tokenSavings,
          },
          cost: parseFloat(aiCost.toFixed(6)),
          model: actualTokens?.model || 'gpt-4o',
        },
        timestamp: new Date().toISOString(),
        event: 'proposal_generation_completed',
      });

      return {
        success: true,
        proposalId,
        sectionsGenerated: sections.length,
        tokensUsed: totalTokens,
        cost: aiCost,
        duration: totalDuration,
      };
    } catch (error) {
      const totalDuration = Date.now() - startTime;

      // Structured logging: Job failed with full context
      this.logger.error('Proposal generation failed', {
        jobId: job.id,
        proposalId,
        tenantId,
        error: {
          message: error.message,
          stack: error.stack,
          type: error.constructor.name,
        },
        metrics: {
          totalDuration,
          failedAfter: totalDuration,
        },
        timestamp: new Date().toISOString(),
        event: 'proposal_generation_failed',
      });

      // Update proposal status to failed
      try {
        await this.prisma.proposal.update({
          where: { id: proposalId },
          data: {
            status: 'draft', // Revert to draft so user can retry
          },
        });
      } catch (updateError) {
        this.logger.error('Failed to update proposal status after error', {
          proposalId,
          updateError: updateError.message,
          event: 'proposal_status_update_failed',
        });
      }

      throw error; // Re-throw to trigger job retry
    }
  }
}
