import { Module } from '@nestjs/common';
import { PricingCatalogService } from './pricing-catalog.service';
import { PricingCatalogController } from './pricing-catalog.controller';
import { PrismaService } from '../../shared/database/prisma.service';

@Module({
  controllers: [PricingCatalogController],
  providers: [PricingCatalogService, PrismaService],
})
export class PricingCatalogModule {}


