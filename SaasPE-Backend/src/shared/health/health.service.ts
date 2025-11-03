import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { getProviderConfigStatus } from '../config/env-validation';
import {
  HealthCheckResponse,
  DatabaseHealth,
  ProviderHealth,
  TokenHealth,
} from './interfaces/health-check.interface';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Get detailed health information for all system components
   */
  async getDetailedHealth(): Promise<HealthCheckResponse> {
    const startTime = Date.now();

    const [database, providers, tokens] = await Promise.all([
      this.checkDatabaseHealth(),
      this.checkProviderHealth(),
      this.checkTokenHealth(),
    ]);

    const responseTime = Date.now() - startTime;
    const isHealthy = database.connected && !tokens.criticalIssues;

    return {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      responseTime,
      database,
      providers,
      tokens,
    };
  }

  /**
   * Check if application is ready to accept traffic
   */
  async isReady(): Promise<boolean> {
    try {
      // Check database connectivity
      await this.prisma.$queryRaw`SELECT 1`;

      // Check at least one provider is configured
      const providerConfig = getProviderConfigStatus();
      const hasProvider = Object.values(providerConfig).some((v) => v);

      return hasProvider;
    } catch (error) {
      this.logger.error('Readiness check failed:', error);
      return false;
    }
  }

  /**
   * Check database connectivity and performance
   */
  private async checkDatabaseHealth(): Promise<DatabaseHealth> {
    try {
      const startTime = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - startTime;

      // Get connection pool stats (if available)
      const activeConnections = await this.getActiveConnections();

      return {
        connected: true,
        responseTime,
        activeConnections,
      };
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return {
        connected: false,
        responseTime: 0,
        activeConnections: 0,
        error: error.message,
      };
    }
  }

  /**
   * Check which e-signature providers are configured
   */
  private async checkProviderHealth(): Promise<ProviderHealth> {
    const providerConfig = getProviderConfigStatus();

    // Count active connections per provider
    const activeConnections = await this.prisma.eSignatureConnection.groupBy({
      by: ['provider'],
      where: {
        isActive: true,
      },
      _count: {
        id: true,
      },
    });

    const connectionsByProvider = activeConnections.reduce(
      (acc, item) => {
        acc[item.provider] = item._count.id;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      configured: providerConfig,
      activeConnections: connectionsByProvider,
    };
  }

  /**
   * Check token health (expiring/expired tokens)
   */
  private async checkTokenHealth(): Promise<TokenHealth> {
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [total, active, expired, expiringSoon, expiringThisWeek] =
      await Promise.all([
        // Total connections
        this.prisma.eSignatureConnection.count(),

        // Active connections
        this.prisma.eSignatureConnection.count({
          where: {
            isActive: true,
            expiresAt: {
              gte: now,
            },
          },
        }),

        // Expired tokens
        this.prisma.eSignatureConnection.count({
          where: {
            expiresAt: {
              lt: now,
            },
          },
        }),

        // Expiring in next 24 hours (critical)
        this.prisma.eSignatureConnection.count({
          where: {
            isActive: true,
            expiresAt: {
              gte: now,
              lte: in24Hours,
            },
          },
        }),

        // Expiring in next 7 days (warning)
        this.prisma.eSignatureConnection.count({
          where: {
            isActive: true,
            expiresAt: {
              gte: in24Hours,
              lte: in7Days,
            },
          },
        }),
      ]);

    return {
      total,
      active,
      expired,
      expiringSoon,
      expiringThisWeek,
      criticalIssues: expiringSoon > 0,
    };
  }

  /**
   * Get number of active database connections
   * Note: This is a simple count - in production you might query pg_stat_activity
   */
  private async getActiveConnections(): Promise<number> {
    try {
      // For Prisma, we can check the connection pool
      // This is a simplified version - actual implementation depends on your setup
      return 1; // Prisma maintains a connection pool internally
    } catch {
      return 0;
    }
  }
}
