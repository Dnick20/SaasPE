import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

// Use relative URLs when NEXT_PUBLIC_API_URL is not set (proxied via nginx)
// Otherwise use the specified API URL (for direct backend access)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

/**
 * Safe API tracking - lazy load to avoid circular dependencies
 */
function safeTrackAPICall(method: string, endpoint: string, status?: number, error?: boolean) {
  try {
    // Lazy import to avoid initialization issues
    import('@/lib/services/errorReporting').then(({ trackAPICall }) => {
      trackAPICall(method, endpoint, status, error);
    }).catch(() => {
      // Silently fail if error reporting isn't ready
    });
  } catch {
    // Silently fail if error reporting isn't available
  }
}

/**
 * Retry Configuration
 */
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  retryableStatuses: number[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascade failures by stopping requests when backend is down
 */
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private readonly threshold = 5; // Open after 5 failures
  private readonly timeout = 60000; // 1 minute timeout
  private readonly resetTimeout = 30000; // Reset after 30 seconds

  canRequest(): boolean {
    if (this.state === 'CLOSED') {
      return true;
    }

    if (this.state === 'OPEN') {
      const now = Date.now();
      if (now - this.lastFailureTime >= this.resetTimeout) {
        this.state = 'HALF_OPEN';
        return true;
      }
      return false;
    }

    // HALF_OPEN state - allow one request to test
    return true;
  }

  recordSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  recordFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      console.warn('Circuit breaker OPEN - blocking requests');
    }
  }

  getState() {
    return this.state;
  }
}

const circuitBreaker = new CircuitBreaker();

/**
 * Calculate exponential backoff delay
 */
function getRetryDelay(retryCount: number, config: RetryConfig): number {
  const delay = Math.min(config.baseDelay * Math.pow(2, retryCount), config.maxDelay);
  // Add jitter to prevent thundering herd
  return delay + Math.random() * 1000;
}

/**
 * Check if error should be retried
 */
function shouldRetry(error: AxiosError, config: RetryConfig, retryCount: number): boolean {
  if (retryCount >= config.maxRetries) {
    return false;
  }

  // Don't retry if no response (network error)
  if (!error.response) {
    return false;
  }

  // Check if status is retryable
  return config.retryableStatuses.includes(error.response.status);
}

/**
 * Sleep function for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Axios instance with authentication interceptor
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
  withCredentials: true, // Important: Send cookies with requests
});

/**
 * Request interceptor
 * Check circuit breaker before making requests
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Check circuit breaker
    if (!circuitBreaker.canRequest()) {
      throw new Error('Circuit breaker is OPEN - service unavailable. Please try again later.');
    }

    // If sending FormData, remove Content-Type header to let axios set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    // Cookies are automatically sent via withCredentials: true
    // No manual token handling needed
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor to handle 401 errors, token refresh, circuit breaker, and retries
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Track successful API call
    if (response.config.url) {
      safeTrackAPICall(
        response.config.method?.toUpperCase() || 'GET',
        response.config.url,
        response.status,
        false
      );
    }

    // Record success in circuit breaker
    circuitBreaker.recordSuccess();
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
      _retryCount?: number;
    };

    // Track failed API call
    if (originalRequest.url) {
      safeTrackAPICall(
        originalRequest.method?.toUpperCase() || 'GET',
        originalRequest.url,
        error.response?.status,
        true
      );
    }

    // Record failure in circuit breaker for 5xx errors
    if (error.response?.status && error.response.status >= 500) {
      circuitBreaker.recordFailure();
    } else {
      // Don't count 4xx errors as circuit breaker failures
      circuitBreaker.recordSuccess();
    }

    // Initialize retry count
    if (!originalRequest._retryCount) {
      originalRequest._retryCount = 0;
    }

    // If 401 and we haven't retried yet, attempt token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Attempt to refresh the token using cookies
        // Backend will read refreshToken and userId from cookies
        const _response = await axios.post(
          `${API_BASE_URL}/api/v1/auth/refresh`,
          {}, // Empty body - backend reads from cookies
          { withCredentials: true } // Send cookies
        );

        // New tokens are automatically set as httpOnly cookies by backend
        // No need to manually store them

        // Retry the original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        // Cookies will be cleared by backend or browser
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    // Retry logic for transient errors
    if (shouldRetry(error, DEFAULT_RETRY_CONFIG, originalRequest._retryCount)) {
      originalRequest._retryCount++;

      const delay = getRetryDelay(originalRequest._retryCount - 1, DEFAULT_RETRY_CONFIG);

      if (process.env.NODE_ENV === 'development') {
        console.log(
          `Retrying request (${originalRequest._retryCount}/${DEFAULT_RETRY_CONFIG.maxRetries}) after ${Math.round(delay)}ms:`,
          originalRequest.url
        );
      }

      await sleep(delay);

      // Retry the request
      return apiClient(originalRequest);
    }

    return Promise.reject(error);
  }
);

/**
 * Export circuit breaker state for debugging
 */
export const getCircuitBreakerState = () => circuitBreaker.getState();

/**
 * API error handler
 */
export function handleApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string }>;

    // Check for circuit breaker error
    if (axiosError.message?.includes('Circuit breaker is OPEN')) {
      return 'Service temporarily unavailable. Please try again in a moment.';
    }

    if (axiosError.response?.data?.message) {
      return axiosError.response.data.message;
    }

    if (axiosError.response?.status === 401) {
      return 'Unauthorized. Please log in again.';
    }

    if (axiosError.response?.status === 403) {
      return 'Access forbidden. You don\'t have permission to perform this action.';
    }

    if (axiosError.response?.status === 404) {
      return 'Resource not found.';
    }

    if (axiosError.response?.status === 500) {
      return 'Internal server error. Please try again later.';
    }

    return axiosError.message || 'An unexpected error occurred.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred.';
}
