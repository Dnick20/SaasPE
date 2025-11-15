import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { DatabaseModule } from '../../shared/database/database.module';
import { ServicesModule } from '../../shared/services/services.module';
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
 * - S3 Service, OpenAI Service (via ServicesModule)
 * - Bull Queue (Redis-backed job queue)
 */
@Module({
  imports: [
    DatabaseModule,
    ServicesModule,
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
  ],
  exports: [TranscriptionsService],
})
export class TranscriptionsModule {}
