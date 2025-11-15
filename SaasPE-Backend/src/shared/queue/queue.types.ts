/**
 * Queue abstraction interfaces
 * Provides a provider-agnostic interface for job queues
 * Implementations: SQS (production), In-Memory (dev/test)
 */

export interface QueueJob<T = any> {
  id: string;
  data: T;
  attempts: number;
  processedOn?: number;
  failedReason?: string;
}

export interface QueueJobResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface QueueProvider {
  /**
   * Add a job to the queue
   * @param jobName - Name/type of the job
   * @param data - Job payload
   * @returns Job ID
   */
  add<T>(jobName: string, data: T): Promise<string>;

  /**
   * Process jobs from the queue
   * @param jobName - Name/type of job to process
   * @param processor - Function to process the job
   * @param options - Processing options
   */
  process<T>(
    jobName: string,
    processor: (job: QueueJob<T>) => Promise<QueueJobResult>,
    options?: ProcessOptions,
  ): Promise<void>;

  /**
   * Get job status
   * @param jobId - Job ID
   */
  getJob(jobId: string): Promise<QueueJob | null>;

  /**
   * Close/cleanup the queue provider
   */
  close(): Promise<void>;
}

export interface ProcessOptions {
  concurrency?: number;
  visibilityTimeout?: number; // seconds
  waitTimeSeconds?: number; // long polling
  maxRetries?: number;
}

export interface QueueConfig {
  provider: 'sqs' | 'memory';
  sqs?: {
    queueUrl: string;
    dlqUrl?: string;
    region?: string;
    waitTimeSeconds?: number;
    maxMessages?: number;
    visibilityTimeout?: number;
  };
  memory?: {
    concurrency?: number;
  };
}
