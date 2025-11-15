import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
import type { QueueProvider, QueueJob, QueueJobResult } from '../../../shared/queue/queue.types';
import { ProposalProcessor } from '../processors/proposal.processor';
import { PROPOSAL_GENERATE_JOB, type GenerateProposalJobData } from '../constants/job-names';

/**
 * Queue Worker Service
 *
 * Processes proposal generation jobs from the queue in the background.
 * - Starts processing on module init
 * - Gracefully shuts down on module destroy
 * - Delegates job processing to ProposalProcessor
 * - Works with both SQS and in-memory queue providers
 */
@Injectable()
export class QueueWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueWorkerService.name);
  private isProcessing = false;

  constructor(
    @Inject('QueueProvider') private queueProvider: QueueProvider,
    private proposalProcessor: ProposalProcessor,
  ) {}

  /**
   * Start processing jobs when module initializes
   */
  async onModuleInit() {
    // Only start worker if not already processing
    if (this.isProcessing) {
      this.logger.warn('Worker already processing, skipping initialization');
      return;
    }

    const queueProviderType = process.env.QUEUE_PROVIDER || 'memory';
    this.logger.log(`Starting queue worker with provider: ${queueProviderType}`);

    // Start processing jobs in background
    this.startProcessing();
  }

  /**
   * Stop processing jobs when module is destroyed
   */
  async onModuleDestroy() {
    this.logger.log('Shutting down queue worker...');
    await this.queueProvider.close();
    this.logger.log('Queue worker shut down successfully');
  }

  /**
   * Start processing jobs from the queue
   * This runs continuously in the background
   */
  private startProcessing() {
    this.isProcessing = true;

    // Process jobs for PROPOSAL_GENERATE_JOB
    this.queueProvider.process<GenerateProposalJobData>(
      PROPOSAL_GENERATE_JOB,
      async (job: QueueJob<GenerateProposalJobData>): Promise<QueueJobResult> => {
        const { proposalId, tenantId, sections, templateId, customInstructions } = job.data;

        this.logger.log(
          `Processing proposal generation job ${job.id} for proposal ${proposalId} (attempt ${job.attempts})`,
        );

        try {
          // Delegate to ProposalProcessor
          await this.proposalProcessor.handleGenerate({
            id: job.id,
            data: {
              proposalId,
              tenantId,
              sections,
              templateId,
              customInstructions,
            },
          } as any);

          this.logger.log(`Job ${job.id} completed successfully for proposal ${proposalId}`);

          return {
            success: true,
            data: { proposalId, completedAt: new Date().toISOString() },
          };
        } catch (error) {
          this.logger.error(
            `Job ${job.id} failed for proposal ${proposalId}: ${error.message}`,
            error.stack,
          );

          return {
            success: false,
            error: error.message || 'Unknown error',
          };
        }
      },
      {
        concurrency: 3,
        maxRetries: 3,
        visibilityTimeout: 900, // 15 minutes
        waitTimeSeconds: 20, // Long polling
      },
    );

    this.logger.log('Queue worker started processing jobs');
  }
}
