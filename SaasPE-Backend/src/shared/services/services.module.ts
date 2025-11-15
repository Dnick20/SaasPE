import { Module } from '@nestjs/common';
import { EncryptionService } from './encryption.service';
import { CloudWatchService } from './cloudwatch.service';
import { SecretsManagerService } from './secrets-manager.service';
import { OpenAIService } from './openai.service';
import { S3Service } from './s3.service';
import { PdfService } from './pdf.service';
import { WebsiteScraperService } from './website-scraper.service';
import { PrismaService } from '../database/prisma.service';
import { CloudflareDNSService } from './cloudflare.service';
import { RegistrarService } from './registrar.service';
import { SesManagementService } from './ses-management.service';
import { WordExporterService } from './word-exporter.service';
import { ConfidenceScoringService } from './confidence-scoring.service';
import { MultiPassExtractionService } from './multi-pass-extraction.service';
import { DeepThinkingAgentService } from './deep-thinking-agent.service';
import { EditTrackingService } from './edit-tracking.service';
import { FeedbackValidationService } from './feedback-validation.service';
import { PatternExtractionService } from './pattern-extraction.service';
import { DocuSignService } from './docusign.service';
import { AdobeSignService } from './adobe-sign.service';
import { SignNowService } from './signnow.service';
import { GoogleWorkspaceSignatureService } from './google-workspace-signature.service';

/**
 * Shared Services Module
 *
 * Provides common services used across the application:
 * - EncryptionService: AES-256-GCM encryption for sensitive data
 * - CloudWatchService: AWS CloudWatch metrics tracking
 * - SecretsManagerService: AWS Secrets Manager integration
 * - OpenAIService: OpenAI API integration for AI features
 * - WebsiteScraperService: Website scraping and analysis
 *
 * Usage:
 * ```ts
 * @Module({
 *   imports: [ServicesModule],
 *   // ...
 * })
 * export class YourModule {}
 * ```
 */
@Module({
  providers: [
    EncryptionService,
    CloudWatchService,
    SecretsManagerService,
    OpenAIService,
    S3Service,
    PdfService,
    WebsiteScraperService,
    PrismaService,
    CloudflareDNSService,
    RegistrarService,
    SesManagementService,
    WordExporterService,
    ConfidenceScoringService,
    MultiPassExtractionService,
    DeepThinkingAgentService,
    EditTrackingService,
    FeedbackValidationService,
    PatternExtractionService,
    DocuSignService,
    AdobeSignService,
    SignNowService,
    GoogleWorkspaceSignatureService,
  ],
  exports: [
    EncryptionService,
    CloudWatchService,
    SecretsManagerService,
    OpenAIService,
    S3Service,
    PdfService,
    WebsiteScraperService,
    CloudflareDNSService,
    RegistrarService,
    SesManagementService,
    WordExporterService,
    ConfidenceScoringService,
    MultiPassExtractionService,
    DeepThinkingAgentService,
    EditTrackingService,
    FeedbackValidationService,
    PatternExtractionService,
    DocuSignService,
    AdobeSignService,
    SignNowService,
    GoogleWorkspaceSignatureService,
  ],
})
export class ServicesModule {}
