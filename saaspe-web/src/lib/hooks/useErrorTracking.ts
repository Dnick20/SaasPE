/**
 * Error Tracking Hooks
 *
 * React hooks for easy error tracking and reporting
 */

import { useCallback } from 'react';
import {
  reportError,
  trackUserAction,
  trackAPICall,
} from '@/lib/services/errorReporting';
import { ErrorCategory, ErrorSeverity } from '@/lib/sentry';

/**
 * Hook for reporting errors with automatic component context
 */
export function useErrorReporter(componentName: string) {
  const report = useCallback(
    (
      error: Error,
      options?: {
        severity?: ErrorSeverity;
        category?: ErrorCategory;
        action?: string;
        extra?: Record<string, unknown>;
      }
    ) => {
      reportError(error, {
        ...options,
        component: componentName,
      });
    },
    [componentName]
  );

  return { reportError: report };
}

/**
 * Hook for tracking user actions
 */
export function useActionTracker(componentName: string) {
  const track = useCallback(
    (action: string, data?: Record<string, unknown>) => {
      trackUserAction(`${componentName}: ${action}`, data);
    },
    [componentName]
  );

  return { trackAction: track };
}

/**
 * Hook for wrapping async operations with error handling
 */
export function useAsyncErrorHandler(componentName: string) {
  const { reportError } = useErrorReporter(componentName);

  const wrapAsync = useCallback(
    <T>(
      asyncFn: () => Promise<T>,
      options?: {
        action?: string;
        onError?: (error: Error) => void;
        severity?: ErrorSeverity;
        category?: ErrorCategory;
      }
    ): Promise<T | undefined> => {
      return asyncFn().catch((error) => {
        reportError(error, {
          severity: options?.severity,
          category: options?.category,
          action: options?.action,
        });

        if (options?.onError) {
          options.onError(error);
        }

        return undefined;
      });
    },
    [reportError]
  );

  return { wrapAsync };
}

/**
 * Hook for tracking API calls
 */
export function useAPITracker() {
  const track = useCallback(
    (method: string, endpoint: string, status?: number, error?: boolean) => {
      trackAPICall(method, endpoint, status, error);
    },
    []
  );

  return { trackAPICall: track };
}
