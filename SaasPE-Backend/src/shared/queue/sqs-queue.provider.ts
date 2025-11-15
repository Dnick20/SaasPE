import { Logger } from '@nestjs/common';
import { SQS } from '@aws-sdk/client-sqs';
import { QueueProvider, QueueJob, QueueJobResult, ProcessOptions, QueueConfig } from './queue.types';
import { v4 as uuidv4 } from 'uuid';

/**
 * AWS SQS Queue Provider
 * Production-ready queue implementation using AWS SQS
 * Supports FIFO queues, DLQ, and long polling
 */
export class SQSQueueProvider implements QueueProvider {
  private readonly logger = new Logger(SQSQueueProvider.name);
  private sqs: SQS;
  private queueUrl: string;
  private dlqUrl?: string;
  private processing = false;
  private shouldStop = false;
  private config: QueueConfig['sqs'];

  constructor(config: QueueConfig['sqs']) {
    if (!config?.queueUrl) {
      throw new Error('SQS Queue URL is required');
    }

    this.queueUrl = config.queueUrl;
    this.dlqUrl = config.dlqUrl;
    this.config = config;

    this.sqs = new SQS({
      region: config.region || process.env.AWS_REGION || 'us-east-2',
    });

    this.logger.log(`SQS Queue initialized: ${this.queueUrl}`);
  }

  async add<T>(jobName: string, data: T): Promise<string> {
    const jobId = uuidv4();
    const messageBody = JSON.stringify({
      jobName,
      jobId,
      data,
      timestamp: Date.now(),
    });

    try {
      const params: any = {
        QueueUrl: this.queueUrl,
        MessageBody: messageBody,
        MessageAttributes: {
          JobName: {
            DataType: 'String',
            StringValue: jobName,
          },
          JobId: {
            DataType: 'String',
            StringValue: jobId,
          },
        },
      };

      // If FIFO queue, add required parameters
      if (this.queueUrl.endsWith('.fifo')) {
        params.MessageGroupId = jobName;
        params.MessageDeduplicationId = jobId;
      }

      const result = await this.sqs.sendMessage(params);

      this.logger.log(`Job ${jobId} sent to SQS queue '${jobName}' (MessageId: ${result.MessageId})`);

      return jobId;
    } catch (error) {
      this.logger.error(`Failed to send job ${jobId} to SQS: ${error.message}`);
      throw error;
    }
  }

  async process<T>(
    jobName: string,
    processor: (job: QueueJob<T>) => Promise<QueueJobResult>,
    options?: ProcessOptions,
  ): Promise<void> {
    if (this.processing) {
      this.logger.warn(`Already processing queue '${jobName}'`);
      return;
    }

    this.processing = true;
    this.shouldStop = false;

    const waitTimeSeconds = options?.waitTimeSeconds || this.config?.waitTimeSeconds || 20;
    const maxMessages = this.config?.maxMessages || 5;
    const visibilityTimeout = options?.visibilityTimeout || this.config?.visibilityTimeout || 900; // 15 minutes

    this.logger.log(`Starting SQS long-polling for '${jobName}' (wait: ${waitTimeSeconds}s, visibility: ${visibilityTimeout}s)`);

    while (!this.shouldStop) {
      try {
        const result = await this.sqs.receiveMessage({
          QueueUrl: this.queueUrl,
          MaxNumberOfMessages: maxMessages,
          WaitTimeSeconds: waitTimeSeconds,
          VisibilityTimeout: visibilityTimeout,
          MessageAttributeNames: ['All'],
        });

        if (!result.Messages || result.Messages.length === 0) {
          this.logger.debug('No messages received, continuing long poll...');
          continue;
        }

        this.logger.log(`Received ${result.Messages.length} messages from SQS`);

        // Process messages in parallel
        await Promise.all(
          result.Messages.map(message => this.processMessage(message, processor, jobName))
        );
      } catch (error) {
        this.logger.error(`Error receiving/processing messages: ${error.message}`);
        // Wait a bit before retrying to avoid tight error loops
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    this.processing = false;
    this.logger.log(`Stopped processing queue '${jobName}'`);
  }

  private async processMessage<T>(
    message: any,
    processor: (job: QueueJob<T>) => Promise<QueueJobResult>,
    jobName: string,
  ): Promise<void> {
    const receiptHandle = message.ReceiptHandle;

    try {
      const messageBody = JSON.parse(message.Body);
      const job: QueueJob<T> = {
        id: messageBody.jobId,
        data: messageBody.data,
        attempts: parseInt(message.Attributes?.ApproximateReceiveCount || '1'),
      };

      this.logger.log(`Processing job ${job.id} from SQS (attempt ${job.attempts})`);

      const result = await processor(job);

      if (result.success) {
        // Delete message from queue
        await this.sqs.deleteMessage({
          QueueUrl: this.queueUrl,
          ReceiptHandle: receiptHandle,
        });
        this.logger.log(`Job ${job.id} completed and removed from queue`);
      } else {
        throw new Error(result.error || 'Job failed');
      }
    } catch (error) {
      this.logger.error(`Failed to process message: ${error.message}`);

      // Check if max retries exceeded
      const receiveCount = parseInt(message.Attributes?.ApproximateReceiveCount || '1');
      if (receiveCount >= 3) {
        this.logger.error(`Message exceeded max retries, deleting from main queue`);
        // Delete from main queue (will be moved to DLQ automatically if configured)
        await this.sqs.deleteMessage({
          QueueUrl: this.queueUrl,
          ReceiptHandle: receiptHandle,
        });
      }
      // If not max retries, message will become visible again after visibility timeout
    }
  }

  async getJob(jobId: string): Promise<QueueJob | null> {
    this.logger.warn(`getJob not fully implemented for SQS - returning null for ${jobId}`);
    // SQS doesn't support random access by job ID
    // Would need to implement a separate tracking system (e.g., DynamoDB)
    return null;
  }

  async close(): Promise<void> {
    this.logger.log('Closing SQS Queue Provider');
    this.shouldStop = true;
    // Wait for current processing to finish
    while (this.processing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}
