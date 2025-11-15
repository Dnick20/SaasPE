import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export enum AuditAction {
  // OAuth Actions
  OAUTH_CONNECTION_INITIATED = 'oauth_connection_initiated',
  OAUTH_CONNECTION_SUCCESS = 'oauth_connection_success',
  OAUTH_CONNECTION_FAILED = 'oauth_connection_failed',
  OAUTH_TOKEN_REFRESHED = 'oauth_token_refreshed',
  OAUTH_DISCONNECTION = 'oauth_disconnection',

  // E-Signature Actions
  ENVELOPE_CREATED = 'envelope_created',
  ENVELOPE_SENT = 'envelope_sent',
  ENVELOPE_VIEWED = 'envelope_viewed',
  ENVELOPE_SIGNED = 'envelope_signed',
  ENVELOPE_COMPLETED = 'envelope_completed',
  ENVELOPE_VOIDED = 'envelope_voided',

  // Provider Actions
  PROVIDER_DEFAULT_CHANGED = 'provider_default_changed',
  WEBHOOK_REGISTERED = 'webhook_registered',
  WEBHOOK_UNREGISTERED = 'webhook_unregistered',

  // Security Actions
  WEBHOOK_VALIDATION_FAILED = 'webhook_validation_failed',
  TOKEN_EXPIRED = 'token_expired',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
}

export interface AuditLogEntry {
  tenantId: string;
  userId?: string;
  action: AuditAction;
  resourceType: string; // 'proposal', 'connection', 'envelope', etc.
  resourceId?: string;
  provider?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  success: boolean;
  errorMessage?: string;
  timestamp: Date;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create an audit log entry
   */
  async log(entry: Omit<AuditLogEntry, 'timestamp'>): Promise<void> {
    const logEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date(),
    };

    this.logger.log(
      `[AUDIT] ${entry.action} - Tenant: ${entry.tenantId} - Success: ${entry.success}`,
    );

    // In production, this would write to a dedicated audit log table or service
    // For now, we'll use a separate Prisma table for audit logs

    try {
      // Example: Store in database
      // await this.prisma.auditLog.create({
      //   data: {
      //     tenantId: logEntry.tenantId,
      //     userId: logEntry.userId,
      //     action: logEntry.action,
      //     resourceType: logEntry.resourceType,
      //     resourceId: logEntry.resourceId,
      //     provider: logEntry.provider,
      //     ipAddress: logEntry.ipAddress,
      //     userAgent: logEntry.userAgent,
      //     metadata: logEntry.metadata,
      //     success: logEntry.success,
      //     errorMessage: logEntry.errorMessage,
      //     timestamp: logEntry.timestamp,
      //   },
      // });

      // For now, just log to console (in production, send to CloudWatch, DataDog, etc.)
      console.log('[AUDIT LOG]', JSON.stringify(logEntry, null, 2));
    } catch (error) {
      this.logger.error('Failed to write audit log:', error);
    }
  }

  /**
   * Log OAuth connection attempt
   */
  async logOAuthConnection(
    tenantId: string,
    userId: string,
    provider: string,
    success: boolean,
    errorMessage?: string,
    ipAddress?: string,
  ): Promise<void> {
    await this.log({
      tenantId,
      userId,
      action: success
        ? AuditAction.OAUTH_CONNECTION_SUCCESS
        : AuditAction.OAUTH_CONNECTION_FAILED,
      resourceType: 'connection',
      provider,
      success,
      errorMessage,
      ipAddress,
    });
  }

  /**
   * Log envelope creation
   */
  async logEnvelopeCreated(
    tenantId: string,
    userId: string,
    proposalId: string,
    envelopeId: string,
    provider: string,
  ): Promise<void> {
    await this.log({
      tenantId,
      userId,
      action: AuditAction.ENVELOPE_CREATED,
      resourceType: 'envelope',
      resourceId: envelopeId,
      provider,
      success: true,
      metadata: {
        proposalId,
      },
    });
  }

  /**
   * Log envelope signed
   */
  async logEnvelopeSigned(
    tenantId: string,
    proposalId: string,
    envelopeId: string,
    provider: string,
    signerEmail: string,
  ): Promise<void> {
    await this.log({
      tenantId,
      action: AuditAction.ENVELOPE_SIGNED,
      resourceType: 'envelope',
      resourceId: envelopeId,
      provider,
      success: true,
      metadata: {
        proposalId,
        signerEmail,
      },
    });
  }

  /**
   * Log webhook validation failure (security event)
   */
  async logWebhookValidationFailure(
    provider: string,
    ipAddress?: string,
  ): Promise<void> {
    await this.log({
      tenantId: 'system', // System-level security event
      action: AuditAction.WEBHOOK_VALIDATION_FAILED,
      resourceType: 'webhook',
      provider,
      success: false,
      ipAddress,
      errorMessage: 'Webhook signature validation failed',
    });
  }

  /**
   * Log token refresh
   */
  async logTokenRefresh(
    tenantId: string,
    provider: string,
    success: boolean,
    errorMessage?: string,
  ): Promise<void> {
    await this.log({
      tenantId,
      action: AuditAction.OAUTH_TOKEN_REFRESHED,
      resourceType: 'connection',
      provider,
      success,
      errorMessage,
    });
  }

  /**
   * Log disconnection
   */
  async logDisconnection(
    tenantId: string,
    userId: string,
    provider: string,
  ): Promise<void> {
    await this.log({
      tenantId,
      userId,
      action: AuditAction.OAUTH_DISCONNECTION,
      resourceType: 'connection',
      provider,
      success: true,
    });
  }

  /**
   * Query audit logs for a tenant
   */
  async getAuditLogs(
    tenantId: string,
    filters?: {
      action?: AuditAction;
      resourceType?: string;
      provider?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    },
  ): Promise<AuditLogEntry[]> {
    // In production, query from audit log table
    // For now, return empty array
    this.logger.log(`Querying audit logs for tenant ${tenantId}`);
    return [];
  }

  /**
   * Export audit logs for compliance (CSV format)
   */
  async exportAuditLogs(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<string> {
    const logs = await this.getAuditLogs(tenantId, { startDate, endDate });

    // Generate CSV
    const headers =
      'Timestamp,Action,Resource Type,Resource ID,Provider,Success,Error\n';
    const rows = logs
      .map((log) =>
        [
          log.timestamp.toISOString(),
          log.action,
          log.resourceType,
          log.resourceId || '',
          log.provider || '',
          log.success,
          log.errorMessage || '',
        ].join(','),
      )
      .join('\n');

    return headers + rows;
  }
}
