import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { captureExceptionWithContext } from '../../config/sentry';
import {
  ErrorSeverity,
  ErrorSource,
} from '../../modules/admin/dto/error-log.dto';

/**
 * Global exception filter that formats all errors into a standard API response format
 * Follows the specification from api-specification.md
 * Now enhanced with error logging to database and Sentry
 */
@Catch()
@Injectable()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  // Note: We can't inject services directly into exception filters that are instantiated globally
  // Instead, we'll use a static service reference or call the service directly when needed

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = this.getHttpStatus(exception);
    const errorResponse = this.formatErrorResponse(exception, request);
    const severity = this.classifyErrorSeverity(exception, status);

    // Get user context from request (if authenticated)
    const user = (request as any).user;
    const tenantId = user?.tenantId;
    const userId = user?.id;
    const userEmail = user?.email;

    // Log error with appropriate level
    const logMessage = `[${severity}] ${request.method} ${request.url} - ${status} - ${this.getErrorMessage(exception)}`;

    if (
      severity === ErrorSeverity.CRITICAL ||
      severity === ErrorSeverity.HIGH
    ) {
      this.logger.error(logMessage);
    } else if (severity === ErrorSeverity.MEDIUM) {
      this.logger.warn(logMessage);
    } else {
      this.logger.log(logMessage);
    }

    // Send to Sentry with enriched context
    if (
      severity === ErrorSeverity.CRITICAL ||
      severity === ErrorSeverity.HIGH
    ) {
      try {
        const error =
          exception instanceof Error
            ? exception
            : new Error(this.getErrorMessage(exception));
        captureExceptionWithContext(error, {
          tenantId,
          userId,
          endpoint: request.url,
          method: request.method,
          extra: {
            statusCode: status,
            requestId: errorResponse.error.requestId,
            severity,
            userAgent: request.get('user-agent'),
            ip: request.ip,
            body: this.sanitizeRequestBody(request.body),
            query: request.query,
          },
        });
      } catch (sentryError) {
        this.logger.error('Failed to send error to Sentry', sentryError);
      }
    }

    // Log to database for critical/high errors (asynchronously, don't block response)
    if (
      (severity === ErrorSeverity.CRITICAL ||
        severity === ErrorSeverity.HIGH) &&
      tenantId
    ) {
      this.logErrorToDatabase(
        exception,
        request,
        status,
        severity,
        tenantId,
        userId,
        userEmail,
        errorResponse.error.requestId,
      ).catch((dbError) => {
        this.logger.error('Failed to log error to database', dbError);
      });
    }

    response.status(status).json(errorResponse);
  }

  /**
   * Determine the appropriate HTTP status code based on the exception type
   */
  private getHttpStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Map Prisma errors to HTTP status codes
      switch (exception.code) {
        case 'P2002': // Unique constraint violation
          return HttpStatus.CONFLICT;
        case 'P2025': // Record not found
          return HttpStatus.NOT_FOUND;
        case 'P2003': // Foreign key constraint violation
          return HttpStatus.BAD_REQUEST;
        default:
          return HttpStatus.INTERNAL_SERVER_ERROR;
      }
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  /**
   * Format the error response according to API specification
   */
  private formatErrorResponse(
    exception: unknown,
    request: Request,
  ): {
    error: {
      code: string;
      message: string;
      details?: any;
      requestId?: string;
    };
  } {
    const requestId = uuidv4();

    // Handle HTTP exceptions
    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      const message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message || exception.message;

      return {
        error: {
          code: this.getErrorCode(exception),
          message: Array.isArray(message) ? message.join(', ') : message,
          details:
            typeof exceptionResponse === 'object'
              ? (exceptionResponse as any).error
              : undefined,
          requestId,
        },
      };
    }

    // Handle Prisma errors
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return {
        error: {
          code: 'DATABASE_ERROR',
          message: this.getPrismaErrorMessage(exception),
          details: {
            prismaCode: exception.code,
            meta: exception.meta,
          },
          requestId,
        },
      };
    }

    // Handle Prisma validation errors
    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid data provided',
          requestId,
        },
      };
    }

    // Handle generic errors
    const error = exception as Error;
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message:
          process.env.NODE_ENV === 'production'
            ? 'An unexpected error occurred'
            : error.message,
        requestId,
      },
    };
  }

  /**
   * Get error code from HTTP exception
   */
  private getErrorCode(exception: HttpException): string {
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // Check if response has a custom error code
    if (
      typeof exceptionResponse === 'object' &&
      (exceptionResponse as any).code
    ) {
      return (exceptionResponse as any).code;
    }

    // Map HTTP status to error codes
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'VALIDATION_ERROR';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'RATE_LIMIT_EXCEEDED';
      default:
        return 'INTERNAL_ERROR';
    }
  }

  /**
   * Get user-friendly message for Prisma errors
   */
  private getPrismaErrorMessage(
    error: Prisma.PrismaClientKnownRequestError,
  ): string {
    switch (error.code) {
      case 'P2002':
        return `A record with this ${(error.meta?.target as string[])?.join(', ')} already exists`;
      case 'P2025':
        return 'Record not found';
      case 'P2003':
        return 'Invalid reference to related record';
      case 'P2014':
        return 'The change you are trying to make would violate a required relation';
      default:
        return 'A database error occurred';
    }
  }

  /**
   * Classify error severity based on exception type and status code
   */
  private classifyErrorSeverity(
    exception: unknown,
    status: number,
  ): ErrorSeverity {
    // 500-level errors are CRITICAL
    if (status >= 500) {
      return ErrorSeverity.CRITICAL;
    }

    // Database errors are HIGH severity
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return ErrorSeverity.HIGH;
    }

    // Authentication/Authorization errors are HIGH
    if (status === HttpStatus.UNAUTHORIZED || status === HttpStatus.FORBIDDEN) {
      return ErrorSeverity.HIGH;
    }

    // 400-level errors are MEDIUM
    if (status >= 400) {
      return ErrorSeverity.MEDIUM;
    }

    // Everything else is LOW
    return ErrorSeverity.LOW;
  }

  /**
   * Get error message from exception
   */
  private getErrorMessage(exception: unknown): string {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'string') {
        return response;
      }
      return (response as any).message || exception.message;
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.getPrismaErrorMessage(exception);
    }

    if (exception instanceof Error) {
      return exception.message;
    }

    return 'Unknown error occurred';
  }

  /**
   * Sanitize request body to remove sensitive data
   */
  private sanitizeRequestBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sanitized = { ...body };
    const sensitiveKeys = [
      'password',
      'passwordHash',
      'token',
      'apiKey',
      'secret',
      'accessToken',
      'refreshToken',
      'creditCard',
    ];

    for (const key of Object.keys(sanitized)) {
      if (
        sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive))
      ) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Log error to database asynchronously
   */
  private async logErrorToDatabase(
    exception: unknown,
    request: Request,
    status: number,
    severity: ErrorSeverity,
    tenantId: string,
    userId?: string,
    userEmail?: string,
    requestId?: string,
  ): Promise<void> {
    try {
      // Dynamically import PrismaService to avoid circular dependencies
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();

      const error =
        exception instanceof Error
          ? exception
          : new Error(this.getErrorMessage(exception));
      const errorId = this.generateErrorFingerprint(error, request.url, status);

      await prisma.errorLog.upsert({
        where: { errorId },
        create: {
          tenantId,
          userId,
          errorId,
          severity,
          category: this.categorizeError(exception),
          source: ErrorSource.BACKEND,
          message: this.getErrorMessage(exception),
          stackTrace: error.stack,
          errorType: error.name,
          context: {
            url: request.url,
            method: request.method,
            headers: this.sanitizeHeaders(request.headers),
            body: this.sanitizeRequestBody(request.body),
            query: request.query,
          },
          endpoint: request.url,
          method: request.method,
          statusCode: status,
          ipAddress: request.ip,
          userAgent: request.get('user-agent'),
          userEmail,
        },
        update: {
          occurrenceCount: {
            increment: 1,
          },
          updated: new Date(),
        },
      });

      await prisma.$disconnect();
    } catch (error) {
      // Don't throw - logging should not break the app
      this.logger.error('Failed to log error to database', error);
    }
  }

  /**
   * Generate a unique fingerprint for the error (for deduplication)
   */
  private generateErrorFingerprint(
    error: Error,
    endpoint: string,
    status: number,
  ): string {
    const crypto = require('crypto');
    const fingerprint = `${error.name}-${endpoint}-${status}-${error.message.substring(0, 100)}`;
    return crypto.createHash('md5').update(fingerprint).digest('hex');
  }

  /**
   * Categorize error for better organization
   */
  private categorizeError(exception: unknown): string {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      if (status === 401 || status === 403) return 'authentication';
      if (status === 404) return 'not_found';
      if (status === 400) return 'validation';
      return 'api';
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return 'database';
    }

    return 'unknown';
  }

  /**
   * Sanitize headers to remove sensitive data
   */
  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];

    for (const key of Object.keys(sanitized)) {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
