import { Injectable, Logger } from '@nestjs/common';
import {
  CircuitBreaker,
  CircuitBreakerRegistry,
} from '../utils/circuit-breaker.util';
import { retryWithBackoff } from '../utils/retry.util';

export interface ErrorRecoveryOptions {
  /**
   * Service name for circuit breaker tracking
   */
  serviceName: string;

  /**
   * Enable retry logic
   */
  enableRetry?: boolean;

  /**
   * Max retry attempts
   */
  maxRetries?: number;

  /**
   * Enable circuit breaker
   */
  enableCircuitBreaker?: boolean;

  /**
   * Fallback function when operation fails
   */
  fallback?: () => Promise<any> | any;

  /**
   * Custom error handler
   */
  onError?: (error: Error) => void;
}

/**
 * Service providing graceful error recovery mechanisms
 * - Automatic retries with exponential backoff
 * - Circuit breaker pattern to prevent cascading failures
 * - Fallback mechanisms for degraded functionality
 * - Comprehensive error logging
 */
@Injectable()
export class ErrorRecoveryService {
  private readonly logger = new Logger(ErrorRecoveryService.name);

  /**
   * Execute an operation with full error recovery support
   */
  async executeWithRecovery<T>(
    operation: () => Promise<T>,
    options: ErrorRecoveryOptions,
  ): Promise<T> {
    const {
      serviceName,
      enableRetry = true,
      maxRetries = 3,
      enableCircuitBreaker = true,
      fallback,
      onError,
    } = options;

    try {
      // Wrap operation with circuit breaker if enabled
      const wrappedOperation = enableCircuitBreaker
        ? () => this.executeWithCircuitBreaker(serviceName, operation)
        : operation;

      // Wrap with retry logic if enabled
      if (enableRetry) {
        return await retryWithBackoff(wrappedOperation, {
          maxRetries,
          initialDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2,
          shouldRetry: (error) => this.shouldRetry(error),
        });
      }

      return await wrappedOperation();
    } catch (error) {
      this.logger.error(
        `Operation failed for ${serviceName} after all recovery attempts:`,
        error,
      );

      // Call custom error handler if provided
      if (onError) {
        onError(error as Error);
      }

      // Attempt fallback if provided
      if (fallback) {
        this.logger.warn(`Using fallback for ${serviceName}`);
        try {
          return await fallback();
        } catch (fallbackError) {
          this.logger.error(
            `Fallback also failed for ${serviceName}:`,
            fallbackError,
          );
          throw error; // Throw original error
        }
      }

      throw error;
    }
  }

  /**
   * Execute operation with circuit breaker protection
   */
  private async executeWithCircuitBreaker<T>(
    serviceName: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    const breaker = CircuitBreakerRegistry.getBreaker(serviceName);
    return breaker.execute(operation);
  }

  /**
   * Determine if an error is retryable
   */
  private shouldRetry(error: any): boolean {
    // Don't retry 4xx client errors (except 429 rate limit)
    if (error.status >= 400 && error.status < 500 && error.status !== 429) {
      return false;
    }

    // Don't retry authorization errors
    if (
      error.message?.includes('Unauthorized') ||
      error.message?.includes('Forbidden')
    ) {
      return false;
    }

    // Don't retry validation errors
    if (
      error.message?.includes('validation') ||
      error.message?.includes('invalid')
    ) {
      return false;
    }

    // Retry network errors, 5xx errors, timeouts, and rate limits
    return true;
  }

  /**
   * Get circuit breaker statistics for all services
   */
  getCircuitBreakerStats(): Record<string, any> {
    return CircuitBreakerRegistry.getAllStats();
  }

  /**
   * Reset all circuit breakers (admin operation)
   */
  resetAllCircuitBreakers(): void {
    this.logger.warn('Manually resetting all circuit breakers');
    CircuitBreakerRegistry.resetAll();
  }

  /**
   * Execute operation with timeout
   */
  async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    timeoutMessage = 'Operation timed out',
  ): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs),
      ),
    ]);
  }

  /**
   * Safe execution that never throws - returns null on error
   */
  async executeSafely<T>(
    operation: () => Promise<T>,
    defaultValue: T | null = null,
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      this.logger.warn(
        'Safe execution failed, returning default value:',
        error.message,
      );
      return defaultValue;
    }
  }

  /**
   * Execute multiple operations in parallel with individual error recovery
   * Returns results for successful operations and nulls for failed ones
   */
  async executeAllWithRecovery<T>(
    operations: Array<{ name: string; operation: () => Promise<T> }>,
  ): Promise<Array<T | null>> {
    const promises = operations.map(({ name, operation }) =>
      this.executeSafely(operation).catch((error) => {
        this.logger.error(`Operation ${name} failed:`, error);
        return null;
      }),
    );

    return Promise.all(promises);
  }

  /**
   * Graceful degradation helper
   * Try primary operation, fallback to secondary, then to default
   */
  async degradeGracefully<T>(
    primary: () => Promise<T>,
    secondary?: () => Promise<T>,
    defaultValue?: T,
  ): Promise<T | undefined> {
    // Try primary
    try {
      return await primary();
    } catch (primaryError) {
      this.logger.warn(
        'Primary operation failed, trying secondary:',
        primaryError.message,
      );

      // Try secondary if provided
      if (secondary) {
        try {
          return await secondary();
        } catch (secondaryError) {
          this.logger.warn(
            'Secondary operation failed:',
            secondaryError.message,
          );
        }
      }

      // Return default value
      if (defaultValue !== undefined) {
        this.logger.warn('Returning default value after degradation');
        return defaultValue;
      }

      throw primaryError;
    }
  }
}
