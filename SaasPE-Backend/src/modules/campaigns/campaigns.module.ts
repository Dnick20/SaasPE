import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TokensModule } from '../tokens/tokens.module';
import { EmailCreditsModule } from '../email-credits/email-credits.module';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { CampaignProcessor } from './processors/campaign.processor';
import { ABTestingController } from './ab-testing.controller';
import { ABTestingService } from './ab-testing.service';
import { EmailTrackingController } from './email-tracking.controller';
import { EmailTrackingService } from './email-tracking.service';
import { TemplateVariablesService } from './template-variables.service';
import { AIPersonalizationService } from './ai-personalization.service';
import { RepliesController } from './replies.controller';
import { RepliesService } from './replies.service';
import { PrismaService } from '../../shared/database/prisma.service';
import { SesService } from '../../shared/services/ses.service';
import { ServicesModule } from '../../shared/services/services.module';

@Module({
  imports: [
    TokensModule,
    EmailCreditsModule,
    ServicesModule,
    BullModule.registerQueue({
      name: 'campaign',
    }),
  ],
  controllers: [
    CampaignsController,
    ABTestingController,
    EmailTrackingController,
    RepliesController,
  ],
  providers: [
    CampaignsService,
    CampaignProcessor,
    ABTestingService,
    EmailTrackingService,
    TemplateVariablesService,
    AIPersonalizationService,
    RepliesService,
    PrismaService,
    SesService,
  ],
  exports: [
    CampaignsService,
    ABTestingService,
    EmailTrackingService,
    TemplateVariablesService,
    AIPersonalizationService,
    RepliesService,
  ],
})
export class CampaignsModule {}
