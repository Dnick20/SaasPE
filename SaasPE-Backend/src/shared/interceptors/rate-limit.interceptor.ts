import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

/**
 * Global rate limit interceptor
 * Adds rate limit headers to all responses
 */
@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse();

    // Add rate limit headers (would be populated from actual rate limit logic)
    response.setHeader('X-RateLimit-Limit', '100');
    response.setHeader('X-RateLimit-Remaining', '99');
    response.setHeader(
      'X-RateLimit-Reset',
      new Date(Date.now() + 60000).toISOString(),
    );

    return next.handle().pipe(
      catchError((error) => {
        // If rate limit error, add Retry-After header
        if (error.status === HttpStatus.TOO_MANY_REQUESTS) {
          response.setHeader('Retry-After', error.response?.retryAfter || 60);
        }
        return throwError(() => error);
      }),
    );
  }
}
