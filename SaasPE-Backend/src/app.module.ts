import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RequestLoggerMiddleware } from './shared/middleware/request-logger.middleware';
import { DatabaseModule } from './shared/database/database.module';
import { CacheModule } from './shared/cache/cache.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { UsersModule } from './modules/users/users.module';
import { ClientsModule } from './modules/clients/clients.module';
import { TranscriptionsModule } from './modules/transcriptions/transcriptions.module';
import { ProposalsModule } from './modules/proposals/proposals.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { WorkflowsModule } from './modules/workflows/workflows.module';
import { CollaborationModule } from './modules/collaboration/collaboration.module';
// import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module'; // TODO: Rewrite for token-based pricing
import { TokensModule } from './modules/tokens/tokens.module';
import { EmailCreditsModule } from './modules/email-credits/email-credits.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { WarmupModule } from './modules/warmup/warmup.module';
import { SupportModule } from './modules/support/support.module';
import { AdminModule } from './modules/admin/admin.module';
import { MailboxesModule } from './modules/mailboxes/mailboxes.module';
import { JourneyModule } from './modules/journey/journey.module';
import { CompanyProfileModule } from './modules/company-profile/company-profile.module';
import { PlaybooksModule } from './modules/playbooks/playbooks.module';
import { TenantBrandingModule } from './modules/tenant-branding/tenant-branding.module';
import { ESignatureConnectionsModule } from './modules/e-signature-connections/e-signature-connections.module';
import { HealthModule } from './shared/health/health.module';
import { PricingCatalogModule } from './modules/pricing-catalog/pricing-catalog.module';
import { SuppressionsModule } from './modules/suppressions/suppressions.module';
import { MailboxProvisioningModule } from './modules/mailbox-provisioning/mailbox-provisioning.module';
import { DomainsModule } from './modules/domains/domains.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Schedule Module (Cron jobs for automated tasks)
    ScheduleModule.forRoot(),
    // Bull Queue (Redis-backed background jobs)
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get('REDIS_HOST') || 'localhost',
          port: config.get('REDIS_PORT') || 6379,
          password: config.get('REDIS_PASSWORD'),
        },
      }),
    }),
    DatabaseModule,
    CacheModule,
    HealthModule,
    AuthModule,
    UsersModule,
    ClientsModule,
    TranscriptionsModule,
    ProposalsModule,
    CampaignsModule,
    AnalyticsModule,
    IntegrationsModule,
    WorkflowsModule,
    CollaborationModule,
    // SubscriptionsModule, // TODO: Rewrite for token-based pricing
    TokensModule,
    EmailCreditsModule,
    ContactsModule,
    WarmupModule,
    SupportModule,
    AdminModule,
    MailboxesModule,
    JourneyModule,
    CompanyProfileModule,
    PlaybooksModule,
    TenantBrandingModule,
    ESignatureConnectionsModule,
    PricingCatalogModule,
    DomainsModule,
    SuppressionsModule,
    MailboxProvisioningModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
