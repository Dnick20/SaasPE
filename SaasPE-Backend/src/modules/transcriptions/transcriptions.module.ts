import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { DatabaseModule } from '../../shared/database/database.module';
import { S3Service } from '../../shared/services/s3.service';
import { OpenAIService } from '../../shared/services/openai.service';
import { TranscriptionsController } from './transcriptions.controller';
import { TranscriptionsService } from './transcriptions.service';
import { TranscriptionProcessor } from './processors/transcription.processor';
import { TokensModule } from '../tokens/tokens.module';
import { ContactsModule } from '../contacts/contacts.module';

/**
 * Transcriptions Module
 *
 * Features:
 * - File upload to S3 (audio/video recordings)
 * - Background transcription with OpenAI Whisper
 * - AI analysis with GPT-4 (extract client data)
 * - Bull queue for async job processing
 *
 * Dependencies:
 * - Database (Prisma)
 * - S3 Service (AWS SDK)
 * - OpenAI Service (Whisper + GPT-4)
 * - Bull Queue (Redis-backed job queue)
 */
@Module({
  imports: [
    DatabaseModule,
    TokensModule,
    ContactsModule,
    BullModule.registerQueue({
      name: 'transcription',
    }),
    BullModule.registerQueue({
      name: 'proposal',
    }),
  ],
  controllers: [TranscriptionsController],
  providers: [
    TranscriptionsService,
    TranscriptionProcessor,
    S3Service,
    OpenAIService,
  ],
  exports: [TranscriptionsService],
})
export class TranscriptionsModule {}
