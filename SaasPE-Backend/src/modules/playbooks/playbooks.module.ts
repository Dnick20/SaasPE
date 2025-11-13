import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../shared/database/database.module';
import { ServicesModule } from '../../shared/services/services.module';
import { PlaybooksController } from './playbooks.controller';
import { PlaybooksService } from './playbooks.service';

/**
 * Playbooks Module
 *
 * Features:
 * - Create and manage playbooks for clients
 * - Store ICP data, scripts (email/LinkedIn/cold call), and campaign strategies
 * - AI-generated content for outreach campaigns
 * - Export playbooks to Google Docs and PDF
 * - Link playbooks to clients and proposals
 *
 * Dependencies:
 * - Database (Prisma)
 * - OpenAI Service for script generation (via ServicesModule)
 */
@Module({
  imports: [DatabaseModule, ServicesModule],
  controllers: [PlaybooksController],
  providers: [PlaybooksService],
  exports: [PlaybooksService],
})
export class PlaybooksModule {}
