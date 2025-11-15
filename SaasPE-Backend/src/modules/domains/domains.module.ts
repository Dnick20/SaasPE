import { Module } from '@nestjs/common';
import { DomainsController } from './domains.controller';
import { DomainsService } from './domains.service';
import { ServicesModule } from '../../shared/services/services.module';
import { PrismaService } from '../../shared/database/prisma.service';

@Module({
  imports: [ServicesModule],
  controllers: [DomainsController],
  providers: [DomainsService, PrismaService],
  exports: [DomainsService],
})
export class DomainsModule {}


