import { Module } from '@nestjs/common';
import { ESignatureConnectionsController } from './e-signature-connections.controller';
import { ESignatureConnectionsService } from './e-signature-connections.service';
import { ESignatureAnalyticsService } from './e-signature-analytics.service';
import { PrismaService } from '../../shared/database/prisma.service';

@Module({
  controllers: [ESignatureConnectionsController],
  providers: [
    ESignatureConnectionsService,
    ESignatureAnalyticsService,
    PrismaService,
  ],
  exports: [ESignatureConnectionsService, ESignatureAnalyticsService],
})
export class ESignatureConnectionsModule {}
