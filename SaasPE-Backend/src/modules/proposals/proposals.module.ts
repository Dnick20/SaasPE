import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { DatabaseModule } from '../../shared/database/database.module';
import { ServicesModule } from '../../shared/services/services.module';
import { TokensModule } from '../tokens/tokens.module';
import { AuthModule } from '../auth/auth.module';
import { ClientsModule } from '../clients/clients.module';
import { TranscriptionsModule } from '../transcriptions/transcriptions.module';
import { ESignatureProviderFactory } from '../../shared/services/e-signature-provider.factory';
import { ESignatureConnectionsService } from '../e-signature-connections/e-signature-connections.service';
import { ProposalsController } from './proposals.controller';
import { ProposalsService } from './proposals.service';
import { ProposalProcessor } from './processors/proposal.processor';
import { PdfRendererService } from './services/pdf-renderer.service';
import { ProposalComposerService } from './services/proposal-composer.service';
import { ProposalContextBuilderService } from './services/proposal-context-builder.service';
import { PricingTemplateService } from './services/pricing-template.service';
import { ProposalAutofillService } from './services/proposal-autofill.service';
import { QueueWorkerService } from './services/queue-worker.service';

// Queue Abstraction
import { QueueProvider } from '../../shared/queue/queue.types';
import { SQSQueueProvider } from '../../shared/queue/sqs-queue.provider';
import { InMemoryQueueProvider } from '../../shared/queue/inmemory-queue.provider';

/**
 * Proposals Module
 *
 * Features:
 * - CRUD operations for proposals
 * - AI content generation with GPT-4
 * - PDF export with Puppeteer
 * - DocuSign e-signature integration
 * - Queue abstraction (SQS in production, in-memory in dev)
 * - Token-based pricing for AI/AWS features
 *
 * Dependencies:
 * - Database (Prisma)
 * - Tokens Module (usage tracking)
 * - S3 Service (AWS SDK)
 * - OpenAI Service (GPT-4)
 * - PDF Service (Puppeteer)
 * - DocuSign Service (eSignature)
 * - Queue Provider (SQS/InMemory based on QUEUE_PROVIDER env)
 */
@Module({
  imports: [
    DatabaseModule,
    ServicesModule,
    TokensModule,
    AuthModule,
    ClientsModule,
    TranscriptionsModule,
    BullModule.registerQueue({
      name: 'proposal',
    }),
  ],
  controllers: [ProposalsController],
  providers: [
    // Queue Provider Factory
    {
      provide: 'QueueProvider',
      useFactory: () => {
        const queueProvider = process.env.QUEUE_PROVIDER || 'memory';

        if (queueProvider === 'sqs') {
          const queueUrl = process.env.SQS_QUEUE_URL;
          const dlqUrl = process.env.SQS_DLQ_URL;
          const region = process.env.AWS_REGION || 'us-east-2';

          if (!queueUrl) {
            throw new Error('SQS_QUEUE_URL is required when QUEUE_PROVIDER=sqs');
          }

          return new SQSQueueProvider({
            queueUrl,
            dlqUrl,
            region,
            waitTimeSeconds: 20,
            maxMessages: 5,
            visibilityTimeout: 900, // 15 minutes
          });
        } else {
          // Default to in-memory queue for dev/test
          return new InMemoryQueueProvider(3); // concurrency of 3
        }
      },
    },
    ProposalsService,
    ProposalProcessor,
    QueueWorkerService,
    PdfRendererService,
    ProposalComposerService,
    ProposalContextBuilderService,
    ProposalAutofillService,
    PricingTemplateService,
    ESignatureProviderFactory,
    ESignatureConnectionsService,
  ],
  exports: [ProposalsService],
})
export class ProposalsModule {}
