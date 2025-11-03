import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || '';
    const startTime = Date.now();

    // Get user context from request (if authenticated)
    const user = (req as any).user;
    const userId = user?.id || 'anonymous';
    const tenantId = user?.tenantId || 'unknown';

    // Skip health checks and static assets
    if (
      originalUrl.includes('/health') ||
      originalUrl.includes('/metrics') ||
      originalUrl.includes('/favicon.ico')
    ) {
      return next();
    }

    // Log incoming request
    this.logger.log(
      `[${method}] ${originalUrl} - User: ${userId} - Tenant: ${tenantId} - IP: ${ip}`,
    );

    // Capture response
    res.on('finish', () => {
      const { statusCode } = res;
      const responseTime = Date.now() - startTime;
      const contentLength = res.get('content-length') || 0;

      // Log format with color coding based on status code
      const logMessage = `[${method}] ${originalUrl} ${statusCode} ${responseTime}ms ${contentLength}bytes - User: ${userId} - Tenant: ${tenantId}`;

      if (statusCode >= 500) {
        this.logger.error(logMessage);
      } else if (statusCode >= 400) {
        this.logger.warn(logMessage);
      } else {
        this.logger.log(logMessage);
      }
    });

    next();
  }
}
