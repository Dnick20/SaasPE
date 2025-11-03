import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../shared/database/prisma.service';
import { ESignatureConnectionsService } from './e-signature-connections.service';
import { AuditLogService } from '../../shared/services/audit-log.service';

@Injectable()
export class TokenRefreshCron {
  private readonly logger = new Logger(TokenRefreshCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly connectionsService: ESignatureConnectionsService,
    private readonly auditLog: AuditLogService,
  ) {}

  /**
   * Proactively refresh tokens that will expire in the next 24 hours
   * Runs every 6 hours
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async refreshExpiringTokens(): Promise<void> {
    this.logger.log('Starting proactive token refresh job...');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    try {
      // Find all active connections expiring within 24 hours
      const expiringConnections =
        await this.prisma.eSignatureConnection.findMany({
          where: {
            isActive: true,
            expiresAt: {
              lte: tomorrow,
              gte: new Date(), // Not already expired
            },
            refreshToken: {
              not: null,
            },
          },
        });

      this.logger.log(
        `Found ${expiringConnections.length} connections to refresh`,
      );

      let successCount = 0;
      let failureCount = 0;

      for (const connection of expiringConnections) {
        try {
          this.logger.log(
            `Refreshing token for ${connection.provider} (tenant: ${connection.tenantId})`,
          );

          await this.connectionsService.refreshToken(
            connection.tenantId,
            connection.provider,
          );

          successCount++;

          // Log success
          await this.auditLog.logTokenRefresh(
            connection.tenantId,
            connection.provider,
            true,
          );
        } catch (error) {
          failureCount++;

          this.logger.error(
            `Failed to refresh token for ${connection.provider} (tenant: ${connection.tenantId}):`,
            error,
          );

          // Log failure
          await this.auditLog.logTokenRefresh(
            connection.tenantId,
            connection.provider,
            false,
            error.message,
          );

          // Mark connection as inactive if refresh fails
          await this.prisma.eSignatureConnection.update({
            where: { id: connection.id },
            data: { isActive: false },
          });
        }
      }

      this.logger.log(
        `Token refresh job completed: ${successCount} successful, ${failureCount} failed`,
      );
    } catch (error) {
      this.logger.error('Token refresh job failed:', error);
    }
  }

  /**
   * Clean up expired and inactive connections
   * Runs daily at 2 AM
   */
  @Cron('0 2 * * *')
  async cleanupExpiredConnections(): Promise<void> {
    this.logger.log('Starting expired connections cleanup job...');

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Mark inactive connections that have been expired for 30+ days
      const result = await this.prisma.eSignatureConnection.updateMany({
        where: {
          isActive: false,
          expiresAt: {
            lte: thirtyDaysAgo,
          },
        },
        data: {
          // In production, you might delete these or archive them
          // For now, just ensure they're marked inactive
          isActive: false,
        },
      });

      this.logger.log(`Cleaned up ${result.count} expired connections`);
    } catch (error) {
      this.logger.error('Cleanup job failed:', error);
    }
  }

  /**
   * Send notification emails for pending signatures
   * Runs daily at 10 AM
   */
  @Cron('0 10 * * *')
  async sendPendingSignatureReminders(): Promise<void> {
    this.logger.log('Checking for pending signatures to remind...');

    try {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      // Find proposals sent for signature 3+ days ago, not yet signed
      const pendingProposals = await this.prisma.proposal.findMany({
        where: {
          docusignEnvelopeId: {
            not: null,
          },
          clientSignedAt: null,
          agencySignedAt: {
            lte: threeDaysAgo,
          },
        },
        include: {
          client: true,
          tenant: {
            include: {
              branding: true,
            },
          },
        },
      });

      this.logger.log(
        `Found ${pendingProposals.length} proposals pending signature for 3+ days`,
      );

      // TODO: Send reminder emails using EmailNotificationService

      for (const proposal of pendingProposals) {
        this.logger.log(
          `Would send reminder for proposal ${proposal.id} (client: ${proposal.client?.id || 'N/A'})`,
        );
        // TODO: await this.emailNotificationService.sendSignatureReminder({...});
      }
    } catch (error) {
      this.logger.error('Signature reminder job failed:', error);
    }
  }

  /**
   * Generate analytics report
   * Runs weekly on Monday at 9 AM
   */
  @Cron('0 9 * * 1')
  async generateWeeklyAnalyticsReport(): Promise<void> {
    this.logger.log('Generating weekly e-signature analytics report...');

    try {
      // Get all tenants with active connections
      const tenants = await this.prisma.eSignatureConnection.findMany({
        where: { isActive: true },
        distinct: ['tenantId'],
        select: { tenantId: true },
      });

      this.logger.log(`Generating reports for ${tenants.length} tenants`);

      for (const { tenantId } of tenants) {
        // TODO: Generate and email weekly analytics report
        this.logger.log(`Would generate weekly report for tenant ${tenantId}`);
      }
    } catch (error) {
      this.logger.error('Analytics report job failed:', error);
    }
  }
}
