import { Module } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { HubSpotController } from './hubspot.controller';
import { HubSpotService } from '../../shared/services/hubspot.service';
import { ZapierController } from './zapier.controller';
import { ZapierService } from './zapier.service';
import { PrismaService } from '../../shared/database/prisma.service';

@Module({
  imports: [],
  controllers: [IntegrationsController, HubSpotController, ZapierController],
  providers: [HubSpotService, ZapierService, PrismaService],
  exports: [HubSpotService, ZapierService],
})
export class IntegrationsModule {}
