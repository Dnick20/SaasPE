import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

// Store for tracking requests (in production, use Redis)
const requestStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Rate limiting decorator
 */
export const RateLimit = (maxRequests: number, windowMs: number = 60000) =>
  Reflect.metadata('rateLimit', { maxRequests, windowMs });

/**
 * Rate limiting guard
 * Limits the number of requests per IP address and tenant
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rateLimitConfig = this.reflector.get<RateLimitConfig>(
      'rateLimit',
      context.getHandler(),
    );

    // If no rate limit configured for this endpoint, allow
    if (!rateLimitConfig) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const ipAddress = this.getClientIp(request);
    const tenantId = request.user?.tenantId || 'anonymous';
    const endpoint = request.route?.path || request.url;

    // Create unique key for this client + endpoint combination
    const key = `${tenantId}:${ipAddress}:${endpoint}`;

    const now = Date.now();
    const record = requestStore.get(key);

    if (!record || now > record.resetTime) {
      // New window - initialize
      requestStore.set(key, {
        count: 1,
        resetTime: now + rateLimitConfig.windowMs,
      });
      return true;
    }

    if (record.count >= rateLimitConfig.maxRequests) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests. Please try again later.',
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Increment request count
    record.count++;
    return true;
  }

  private getClientIp(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0] ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      'unknown'
    );
  }
}

/**
 * Cleanup old entries periodically
 * In production, this would be handled by Redis TTL
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of requestStore.entries()) {
    if (now > record.resetTime) {
      requestStore.delete(key);
    }
  }
}, 60000); // Cleanup every minute
