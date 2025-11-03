import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../shared/database/database.module';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';

/**
 * Clients Module
 *
 * Features:
 * - Create and manage clients
 * - Store client information (company, contacts, business details)
 * - Support AI-extracted client data from transcriptions
 * - HubSpot CRM integration via hubspotDealId
 * - Link clients to transcriptions and proposals
 *
 * Dependencies:
 * - Database (Prisma)
 */
@Module({
  imports: [DatabaseModule],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
