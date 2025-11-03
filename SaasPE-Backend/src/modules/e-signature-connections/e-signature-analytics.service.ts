import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';

export interface ESignatureAnalytics {
  totalConnections: number;
  activeConnections: number;
  connectionsByProvider: Record<string, number>;
  totalEnvelopesSent: number;
  totalEnvelopesSigned: number;
  signatureCompletionRate: number;
  averageSigningTime: number | null; // in hours
  recentActivity: Array<{
    date: string;
    envelopesSent: number;
    envelopesSigned: number;
  }>;
  topProviders: Array<{
    provider: string;
    count: number;
    percentage: number;
  }>;
}

@Injectable()
export class ESignatureAnalyticsService {
  private readonly logger = new Logger(ESignatureAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get comprehensive e-signature analytics
   */
  async getAnalytics(tenantId: string): Promise<ESignatureAnalytics> {
    this.logger.log(`Fetching e-signature analytics for tenant ${tenantId}`);

    const [connections, proposals] = await Promise.all([
      // Get all connections for this tenant
      this.prisma.eSignatureConnection.findMany({
        where: { tenantId },
      }),

      // Get all proposals with e-signatures for this tenant
      this.prisma.proposal.findMany({
        where: {
          tenantId,
          OR: [
            { agencySignedAt: { not: null } },
            { docusignEnvelopeId: { not: null } },
            { clientSignedAt: { not: null } },
          ],
        },
        select: {
          docusignEnvelopeId: true,
          agencySignedAt: true,
          clientSignedAt: true,
          created: true,
        },
      }),
    ]);

    // Count connections by provider
    const connectionsByProvider: Record<string, number> = {};
    connections.forEach((conn) => {
      connectionsByProvider[conn.provider] =
        (connectionsByProvider[conn.provider] || 0) + 1;
    });

    // Calculate active connections (not expired)
    const activeConnections = connections.filter((conn) => {
      return conn.isActive && (!conn.expiresAt || new Date() < conn.expiresAt);
    }).length;

    // Calculate envelope statistics
    const envelopesSent = proposals.filter(
      (p) => p.docusignEnvelopeId !== null,
    ).length;
    const envelopesSigned = proposals.filter(
      (p) => p.clientSignedAt !== null,
    ).length;
    const completionRate =
      envelopesSent > 0 ? (envelopesSigned / envelopesSent) * 100 : 0;

    // Calculate average signing time
    const signingTimes = proposals
      .filter((p) => p.agencySignedAt && p.clientSignedAt)
      .map((p) => {
        const start = new Date(p.agencySignedAt!).getTime();
        const end = new Date(p.clientSignedAt!).getTime();
        return (end - start) / (1000 * 60 * 60); // Convert to hours
      });

    const averageSigningTime =
      signingTimes.length > 0
        ? signingTimes.reduce((a, b) => a + b, 0) / signingTimes.length
        : null;

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentProposals = await this.prisma.proposal.findMany({
      where: {
        tenantId,
        created: { gte: sevenDaysAgo },
      },
      select: {
        docusignEnvelopeId: true,
        clientSignedAt: true,
        created: true,
      },
    });

    // Group by date
    const activityByDate: Record<string, { sent: number; signed: number }> = {};
    recentProposals.forEach((p) => {
      const date = p.created.toISOString().split('T')[0];
      if (!activityByDate[date]) {
        activityByDate[date] = { sent: 0, signed: 0 };
      }
      if (p.docusignEnvelopeId) activityByDate[date].sent++;
      if (p.clientSignedAt) activityByDate[date].signed++;
    });

    const recentActivity = Object.entries(activityByDate).map(
      ([date, data]) => ({
        date,
        envelopesSent: data.sent,
        envelopesSigned: data.signed,
      }),
    );

    // Calculate top providers
    const total = Object.values(connectionsByProvider).reduce(
      (a, b) => a + b,
      0,
    );
    const topProviders = Object.entries(connectionsByProvider)
      .map(([provider, count]) => ({
        provider,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      totalConnections: connections.length,
      activeConnections,
      connectionsByProvider,
      totalEnvelopesSent: envelopesSent,
      totalEnvelopesSigned: envelopesSigned,
      signatureCompletionRate: Math.round(completionRate * 10) / 10,
      averageSigningTime: averageSigningTime
        ? Math.round(averageSigningTime * 10) / 10
        : null,
      recentActivity,
      topProviders,
    };
  }

  /**
   * Log an e-signature event for monitoring
   */
  async logEvent(
    tenantId: string,
    event: string,
    provider: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    this.logger.log(
      `E-Signature Event [${event}] for tenant ${tenantId} via ${provider}`,
      metadata,
    );

    // In production, this would send to CloudWatch, DataDog, etc.
    // For now, we just log it
  }

  /**
   * Log a connection event
   */
  async logConnection(
    tenantId: string,
    provider: string,
    success: boolean,
    error?: string,
  ): Promise<void> {
    await this.logEvent(tenantId, 'oauth_connection', provider, {
      success,
      error,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log a token refresh event
   */
  async logTokenRefresh(
    tenantId: string,
    provider: string,
    success: boolean,
    error?: string,
  ): Promise<void> {
    await this.logEvent(tenantId, 'token_refresh', provider, {
      success,
      error,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log an envelope sent event
   */
  async logEnvelopeSent(
    tenantId: string,
    provider: string,
    envelopeId: string,
    proposalId: string,
  ): Promise<void> {
    await this.logEvent(tenantId, 'envelope_sent', provider, {
      envelopeId,
      proposalId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log an envelope completed event
   */
  async logEnvelopeCompleted(
    tenantId: string,
    provider: string,
    envelopeId: string,
    proposalId: string,
  ): Promise<void> {
    await this.logEvent(tenantId, 'envelope_completed', provider, {
      envelopeId,
      proposalId,
      timestamp: new Date().toISOString(),
    });
  }
}
