import { Module } from '@nestjs/common';
import { EncryptionService } from './encryption.service';
import { CloudWatchService } from './cloudwatch.service';
import { SecretsManagerService } from './secrets-manager.service';
import { OpenAIService } from './openai.service';
import { WebsiteScraperService } from './website-scraper.service';
import { PrismaService } from '../database/prisma.service';
import { CloudflareDNSService } from './cloudflare.service';
import { RegistrarService } from './registrar.service';
import { SesManagementService } from './ses-management.service';
import { WordExporterService } from './word-exporter.service';

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
    WebsiteScraperService,
    PrismaService,
    CloudflareDNSService,
    RegistrarService,
    SesManagementService,
    WordExporterService,
  ],
  exports: [
    EncryptionService,
    CloudWatchService,
    SecretsManagerService,
    OpenAIService,
    WebsiteScraperService,
    CloudflareDNSService,
    RegistrarService,
    SesManagementService,
    WordExporterService,
  ],
})
export class ServicesModule {}
