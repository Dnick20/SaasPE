import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { CreateErrorLogDto, GetErrorLogsDto } from './dto';

@Injectable()
export class ErrorsService {
  private readonly logger = new Logger(ErrorsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Log an error to the database
   * This is called by the exception filter or error reporting endpoints
   */
  async logError(tenantId: string, dto: CreateErrorLogDto) {
    try {
      // Check if this error already exists (based on errorId)
      const existingError = await this.prisma.errorLog.findUnique({
        where: { errorId: dto.errorId },
      });

      if (existingError) {
        // Update occurrence count and last seen time
        return await this.prisma.errorLog.update({
          where: { errorId: dto.errorId },
          data: {
            occurrenceCount: existingError.occurrenceCount + 1,
            affectedUsers: dto.userId
              ? existingError.affectedUsers + 1
              : existingError.affectedUsers,
            updated: new Date(),
          },
        });
      }

      // Create new error log
      return await this.prisma.errorLog.create({
        data: {
          tenantId,
          userId: dto.userId,
          errorId: dto.errorId,
          sentryId: dto.sentryId,
          severity: dto.severity,
          category: dto.category,
          source: dto.source,
          message: dto.message,
          stackTrace: dto.stackTrace,
          errorType: dto.errorType,
          context: dto.context,
          endpoint: dto.endpoint,
          method: dto.method,
          statusCode: dto.statusCode,
          ipAddress: dto.ipAddress,
          userAgent: dto.userAgent,
          userEmail: dto.userEmail,
        },
      });
    } catch (error) {
      this.logger.error('Failed to log error to database', error);
      // Don't throw - logging errors should not break the app
      return null;
    }
  }

  /**
   * Get paginated list of error logs with filters
   */
  async getErrors(tenantId: string, filters: GetErrorLogsDto) {
    const {
      severity,
      source,
      resolved,
      category,
      search,
      page = 1,
      limit = 20,
    } = filters;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = { tenantId };

    if (severity) {
      where.severity = severity;
    }

    if (source) {
      where.source = source;
    }

    if (resolved !== undefined) {
      where.resolved = resolved;
    }

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { message: { contains: search, mode: 'insensitive' } },
        { errorType: { contains: search, mode: 'insensitive' } },
        { userEmail: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count
    const total = await this.prisma.errorLog.count({ where });

    // Get paginated results
    const errors = await this.prisma.errorLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created: 'desc' },
      select: {
        id: true,
        errorId: true,
        sentryId: true,
        severity: true,
        category: true,
        source: true,
        message: true,
        errorType: true,
        endpoint: true,
        method: true,
        statusCode: true,
        userEmail: true,
        affectedUsers: true,
        occurrenceCount: true,
        resolved: true,
        resolvedAt: true,
        notificationSent: true,
        created: true,
        updated: true,
      },
    });

    return {
      data: errors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single error log by ID
   */
  async getError(tenantId: string, errorId: string) {
    const error = await this.prisma.errorLog.findFirst({
      where: {
        id: errorId,
        tenantId,
      },
    });

    if (!error) {
      throw new NotFoundException('Error log not found');
    }

    return error;
  }

  /**
   * Mark an error as resolved
   */
  async resolveError(
    tenantId: string,
    errorId: string,
    userId: string,
    resolution?: string,
  ) {
    const error = await this.prisma.errorLog.findFirst({
      where: {
        id: errorId,
        tenantId,
      },
    });

    if (!error) {
      throw new NotFoundException('Error log not found');
    }

    return await this.prisma.errorLog.update({
      where: { id: errorId },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy: userId,
        resolution,
      },
    });
  }

  /**
   * Mark an error as unresolved
   */
  async unresolveError(tenantId: string, errorId: string) {
    const error = await this.prisma.errorLog.findFirst({
      where: {
        id: errorId,
        tenantId,
      },
    });

    if (!error) {
      throw new NotFoundException('Error log not found');
    }

    return await this.prisma.errorLog.update({
      where: { id: errorId },
      data: {
        resolved: false,
        resolvedAt: null,
        resolvedBy: null,
        resolution: null,
      },
    });
  }

  /**
   * Get unread error count for admin notifications
   */
  async getUnreadErrorCount(tenantId: string) {
    const criticalCount = await this.prisma.errorLog.count({
      where: {
        tenantId,
        severity: 'CRITICAL',
        resolved: false,
        notificationSent: false,
      },
    });

    const highCount = await this.prisma.errorLog.count({
      where: {
        tenantId,
        severity: 'HIGH',
        resolved: false,
        notificationSent: false,
      },
    });

    const total = await this.prisma.errorLog.count({
      where: {
        tenantId,
        resolved: false,
        notificationSent: false,
      },
    });

    return {
      critical: criticalCount,
      high: highCount,
      total,
    };
  }

  /**
   * Mark errors as notified
   */
  async markAsNotified(errorIds: string[]) {
    await this.prisma.errorLog.updateMany({
      where: {
        id: { in: errorIds },
      },
      data: {
        notificationSent: true,
        notifiedAt: new Date(),
      },
    });
  }

  /**
   * Get error statistics for dashboard
   */
  async getErrorStats(tenantId: string, days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const errors = await this.prisma.errorLog.findMany({
      where: {
        tenantId,
        created: {
          gte: startDate,
        },
      },
      select: {
        severity: true,
        source: true,
        category: true,
        created: true,
      },
    });

    // Group by severity
    const bySeverity = errors.reduce(
      (acc, err) => {
        acc[err.severity] = (acc[err.severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Group by source
    const bySource = errors.reduce(
      (acc, err) => {
        acc[err.source] = (acc[err.source] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Group by category
    const byCategory = errors.reduce(
      (acc, err) => {
        if (err.category) {
          acc[err.category] = (acc[err.category] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      total: errors.length,
      bySeverity,
      bySource,
      byCategory,
      period: `${days} days`,
    };
  }

  /**
   * Delete old resolved errors (cleanup job)
   */
  async cleanupOldErrors(daysToKeep: number = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.errorLog.deleteMany({
      where: {
        resolved: true,
        resolvedAt: {
          lt: cutoffDate,
        },
      },
    });

    this.logger.log(`Cleaned up ${result.count} old resolved errors`);
    return result.count;
  }
}
