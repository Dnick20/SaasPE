import { Logger } from '@nestjs/common';

/**
 * Circuit breaker states
 */
export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Failing, reject requests
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening circuit
  successThreshold: number; // Number of successes before closing circuit from half-open
  timeout: number; // Time in ms before attempting to close circuit from open
  monitoringPeriod: number; // Time window in ms to track failures
}

/**
 * Circuit breaker implementation for protecting against cascading failures
 *
 * Usage:
 * ```typescript
 * const breaker = new CircuitBreaker('docusign-api', {
 *   failureThreshold: 5,
 *   successThreshold: 2,
 *   timeout: 60000,
 *   monitoringPeriod: 120000,
 * });
 *
 * try {
 *   const result = await breaker.execute(() => docusignApi.createEnvelope(...));
 * } catch (error) {
 *   // Handle error or fallback
 * }
 * ```
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private nextAttempt: number = Date.now();
  private failures: number[] = []; // Timestamps of recent failures
  private readonly logger: Logger;

  constructor(
    private readonly name: string,
    private readonly config: CircuitBreakerConfig,
  ) {
    this.logger = new Logger(`CircuitBreaker:${name}`);
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        throw new Error(
          `Circuit breaker is OPEN for ${this.name}. Service temporarily unavailable. Retry after ${new Date(this.nextAttempt).toISOString()}`,
        );
      }

      // Transition to half-open to test if service recovered
      this.state = CircuitState.HALF_OPEN;
      this.logger.log(
        `Circuit breaker transitioning to HALF_OPEN for ${this.name}`,
      );
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;

      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
        this.failures = [];
        this.logger.log(
          `Circuit breaker CLOSED for ${this.name} - service recovered`,
        );
      }
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    const now = Date.now();
    this.failures.push(now);

    // Remove failures outside monitoring period
    this.failures = this.failures.filter(
      (timestamp) => now - timestamp < this.config.monitoringPeriod,
    );

    this.failureCount = this.failures.length;

    if (this.state === CircuitState.HALF_OPEN) {
      // Failed in half-open state, return to open
      this.state = CircuitState.OPEN;
      this.successCount = 0;
      this.nextAttempt = now + this.config.timeout;
      this.logger.warn(
        `Circuit breaker OPEN for ${this.name} - failed recovery attempt. Next retry at ${new Date(this.nextAttempt).toISOString()}`,
      );
    } else if (this.failureCount >= this.config.failureThreshold) {
      // Too many failures, open circuit
      this.state = CircuitState.OPEN;
      this.nextAttempt = now + this.config.timeout;
      this.logger.error(
        `Circuit breaker OPEN for ${this.name} - ${this.failureCount} failures in ${this.config.monitoringPeriod}ms. Next retry at ${new Date(this.nextAttempt).toISOString()}`,
      );
    }
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get circuit statistics
   */
  getStats(): {
    state: CircuitState;
    failureCount: number;
    successCount: number;
    nextAttempt: string | null;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      nextAttempt:
        this.state === CircuitState.OPEN
          ? new Date(this.nextAttempt).toISOString()
          : null,
    };
  }

  /**
   * Manually reset circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.failures = [];
    this.nextAttempt = Date.now();
    this.logger.log(`Circuit breaker manually reset for ${this.name}`);
  }
}

/**
 * Registry to manage circuit breakers across the application
 */
export class CircuitBreakerRegistry {
  private static breakers = new Map<string, CircuitBreaker>();

  /**
   * Get or create a circuit breaker for a service
   */
  static getBreaker(
    name: string,
    config?: CircuitBreakerConfig,
  ): CircuitBreaker {
    if (!this.breakers.has(name)) {
      const defaultConfig: CircuitBreakerConfig = {
        failureThreshold: 5,
        successThreshold: 2,
        timeout: 60000, // 1 minute
        monitoringPeriod: 120000, // 2 minutes
      };

      this.breakers.set(
        name,
        new CircuitBreaker(name, config || defaultConfig),
      );
    }

    return this.breakers.get(name)!;
  }

  /**
   * Get all circuit breakers
   */
  static getAllBreakers(): Map<string, CircuitBreaker> {
    return this.breakers;
  }

  /**
   * Get stats for all circuit breakers
   */
  static getAllStats(): Record<string, ReturnType<CircuitBreaker['getStats']>> {
    const stats: Record<string, ReturnType<CircuitBreaker['getStats']>> = {};
    for (const [name, breaker] of this.breakers.entries()) {
      stats[name] = breaker.getStats();
    }
    return stats;
  }

  /**
   * Reset all circuit breakers
   */
  static resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }
}
