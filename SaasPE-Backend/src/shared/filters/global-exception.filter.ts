import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * Enhanced error response with more context
 */
interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string;
  error?: string;
  details?: any;
  requestId?: string;
}

/**
 * Global exception filter for consistent error handling
 * Provides user-friendly error messages and logging
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected error occurred';
    let error = 'Internal Server Error';
    let details: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || message;
        error = (exceptionResponse as any).error || error;
        details = (exceptionResponse as any).details;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;

      // Log stack trace for unexpected errors
      this.logger.error('Unexpected error:', exception.stack);
    }

    // Generate request ID for tracking
    const requestId = this.generateRequestId();

    // Build error response
    const errorResponse: ErrorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: this.getUserFriendlyMessage(status, message),
      error,
      requestId,
    };

    if (details) {
      errorResponse.details = details;
    }

    // Log error details
    const logContext = {
      requestId,
      method: request.method,
      path: request.url,
      status,
      userId: request.user?.id,
      tenantId: request.user?.tenantId,
      ip: request.ip,
    };

    if (status >= 500) {
      this.logger.error(`Server Error: ${message}`, logContext);
    } else if (status >= 400) {
      this.logger.warn(`Client Error: ${message}`, logContext);
    }

    // Send response
    response.status(status).json(errorResponse);
  }

  /**
   * Get user-friendly error message
   */
  private getUserFriendlyMessage(status: number, message: string): string {
    // Keep original message for client errors (4xx)
    if (status >= 400 && status < 500) {
      return message;
    }

    // Generic message for server errors (5xx) to avoid exposing internals
    if (status >= 500) {
      return 'We encountered an issue processing your request. Our team has been notified. Please try again later.';
    }

    return message;
  }

  /**
   * Generate unique request ID for error tracking
   */
  private generateRequestId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
}
