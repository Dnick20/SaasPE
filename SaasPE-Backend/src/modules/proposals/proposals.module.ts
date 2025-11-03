import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { DatabaseModule } from '../../shared/database/database.module';
import { TokensModule } from '../tokens/tokens.module';
import { AuthModule } from '../auth/auth.module';
import { S3Service } from '../../shared/services/s3.service';
import { OpenAIService } from '../../shared/services/openai.service';
import { PdfService } from '../../shared/services/pdf.service';
import { DocuSignService } from '../../shared/services/docusign.service';
import { AdobeSignService } from '../../shared/services/adobe-sign.service';
import { SignNowService } from '../../shared/services/signnow.service';
import { GoogleWorkspaceSignatureService } from '../../shared/services/google-workspace-signature.service';
import { GoogleOAuthService } from '../../shared/services/google/google-oauth.service';
import { GDocsExporterService } from '../../shared/services/google/gdocs-exporter.service';
import { WordExporterService } from '../../shared/services/word-exporter.service';
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

/**
 * Proposals Module
 *
 * Features:
 * - CRUD operations for proposals
 * - AI content generation with GPT-4
 * - PDF export with Puppeteer
 * - DocuSign e-signature integration
 * - Bull queue for async processing
 * - Token-based pricing for AI/AWS features
 *
 * Dependencies:
 * - Database (Prisma)
 * - Tokens Module (usage tracking)
 * - S3 Service (AWS SDK)
 * - OpenAI Service (GPT-4)
 * - PDF Service (Puppeteer)
 * - DocuSign Service (eSignature)
 * - Bull Queue (Redis-backed job queue)
 */
@Module({
  imports: [
    DatabaseModule,
    TokensModule,
    AuthModule,
    BullModule.registerQueue({
      name: 'proposal',
    }),
  ],
  controllers: [ProposalsController],
  providers: [
    ProposalsService,
    ProposalProcessor,
    PdfRendererService,
    ProposalComposerService,
    ProposalContextBuilderService,
    ProposalAutofillService,
    PricingTemplateService,
    S3Service,
    OpenAIService,
    PdfService,
    DocuSignService,
    AdobeSignService,
    SignNowService,
    GoogleWorkspaceSignatureService,
    GoogleOAuthService,
    GDocsExporterService,
    WordExporterService,
    ESignatureProviderFactory,
    ESignatureConnectionsService,
  ],
  exports: [ProposalsService],
})
export class ProposalsModule {}
