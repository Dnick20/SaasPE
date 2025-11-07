import { Logger } from '@nestjs/common';
import { QueueProvider, QueueJob, QueueJobResult, ProcessOptions } from './queue.types';
import { v4 as uuidv4 } from 'uuid';

/**
 * In-Memory Queue Provider
 * Simple queue implementation for development and testing
 * NOT suitable for production use
 */
export class InMemoryQueueProvider implements QueueProvider {
  private readonly logger = new Logger(InMemoryQueueProvider.name);
  private queues: Map<string, QueueJob[]> = new Map();
  private processing = false;
  private maxConcurrency = 3;

  constructor(concurrency?: number) {
    if (concurrency) {
      this.maxConcurrency = concurrency;
    }
    this.logger.log(`In-Memory Queue initialized with concurrency ${this.maxConcurrency}`);
  }

  async add<T>(jobName: string, data: T): Promise<string> {
    const jobId = uuidv4();
    const job: QueueJob<T> = {
      id: jobId,
      data,
      attempts: 0,
    };

    if (!this.queues.has(jobName)) {
      this.queues.set(jobName, []);
    }

    this.queues.get(jobName)!.push(job);
    this.logger.log(`Job ${jobId} added to queue '${jobName}'`);

    return jobId;
  }

  async process<T>(
    jobName: string,
    processor: (job: QueueJob<T>) => Promise<QueueJobResult>,
    options?: ProcessOptions,
  ): Promise<void> {
    if (this.processing) {
      this.logger.warn(`Queue '${jobName}' already being processed`);
      return;
    }

    this.processing = true;
    const concurrency = options?.concurrency || this.maxConcurrency;
    const maxRetries = options?.maxRetries || 3;

    this.logger.log(`Starting to process queue '${jobName}' with concurrency ${concurrency}`);

    // Simple polling loop (in real implementation, this would be event-driven)
    const processJobs = async () => {
      const queue = this.queues.get(jobName) || [];
      const activeJobs: Promise<void>[] = [];

      while (queue.length > 0 && activeJobs.length < concurrency) {
        const job = queue.shift();
        if (!job) continue;

        const jobPromise = this.processJob(job as QueueJob<T>, processor, maxRetries, jobName);
        activeJobs.push(jobPromise);
      }

      if (activeJobs.length > 0) {
        await Promise.all(activeJobs);
      }
    };

    // Process existing jobs
    await processJobs();

    this.processing = false;
    this.logger.log(`Finished processing queue '${jobName}'`);
  }

  private async processJob<T>(
    job: QueueJob<T>,
    processor: (job: QueueJob<T>) => Promise<QueueJobResult>,
    maxRetries: number,
    jobName: string,
  ): Promise<void> {
    try {
      job.attempts++;
      job.processedOn = Date.now();

      this.logger.log(`Processing job ${job.id} (attempt ${job.attempts}/${maxRetries})`);

      const result = await processor(job);

      if (result.success) {
        this.logger.log(`Job ${job.id} completed successfully`);
      } else {
        throw new Error(result.error || 'Job failed');
      }
    } catch (error) {
      job.failedReason = error.message;
      this.logger.error(`Job ${job.id} failed (attempt ${job.attempts}): ${error.message}`);

      // Retry logic
      if (job.attempts < maxRetries) {
        this.logger.log(`Retrying job ${job.id}`);
        const queue = this.queues.get(jobName);
        if (queue) {
          queue.push(job);
        }
      } else {
        this.logger.error(`Job ${job.id} exhausted retries, moving to DLQ`);
        // In a real implementation, move to DLQ
      }
    }
  }

  async getJob(jobId: string): Promise<QueueJob | null> {
    for (const queue of this.queues.values()) {
      const job = queue.find(j => j.id === jobId);
      if (job) return job;
    }
    return null;
  }

  async close(): Promise<void> {
    this.logger.log('Closing In-Memory Queue');
    this.queues.clear();
  }

  // Helper method to get queue stats
  getStats(jobName: string): { pending: number; total: number } {
    const queue = this.queues.get(jobName) || [];
    return {
      pending: queue.length,
      total: queue.length,
    };
  }
}
