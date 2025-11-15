/**
 * React Query Error Handling Hooks
 *
 * Automatic error handling and reporting for React Query operations
 */

import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { reportError } from '@/lib/services/errorReporting';
import { ErrorCategory, ErrorSeverity } from '@/lib/sentry';
import { toast } from 'sonner';
import { AxiosError } from 'axios';

/**
 * Options for error handling in queries
 */
interface ErrorHandlingOptions {
  component?: string;
  action?: string;
  severity?: ErrorSeverity;
  category?: ErrorCategory;
  showToast?: boolean;
  toastMessage?: string;
  onError?: (error: Error) => void;
}

/**
 * Extract error message from various error types
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    return error.response?.data?.message || error.message || 'An error occurred';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unknown error occurred';
}

/**
 * Enhanced useQuery with automatic error handling
 */
export function useQueryWithError<TData = unknown, TError = Error>(
  options: UseQueryOptions<TData, TError> & ErrorHandlingOptions
) {
  const {
    component,
    action,
    severity = 'error',
    category = 'api',
    showToast = true,
    toastMessage,
    onError: customOnError,
    ...queryOptions
  } = options;

  const query = useQuery<TData, TError>({
    ...queryOptions,
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors
      if (error instanceof AxiosError) {
        const status = error.response?.status;
        if (status && status >= 400 && status < 500) {
          return false;
        }
      }
      // Default retry: 3 times
      return failureCount < 3;
    },
  });

  // Handle errors in useEffect to avoid calling hooks conditionally
  const error = query.error;

  if (error && error instanceof Error) {
    // Report to Sentry
    reportError(error, {
      severity,
      category,
      component,
      action: action || 'fetchData',
      extra: {
        queryKey: options.queryKey,
      },
    });

    // Show toast
    if (showToast) {
      const message = toastMessage || getErrorMessage(error);
      toast.error(message);
    }

    // Call custom error handler
    if (customOnError) {
      customOnError(error);
    }
  }

  return query;
}

/**
 * Enhanced useMutation with automatic error handling
 */
export function useMutationWithError<TData = unknown, TError = Error, TVariables = void, TContext = unknown>(
  options: UseMutationOptions<TData, TError, TVariables, TContext> & ErrorHandlingOptions
) {
  const {
    component,
    action,
    severity = 'error',
    category = 'api',
    showToast = true,
    toastMessage,
    onError: customOnError,
    ...mutationOptions
  } = options;

  const handleError = (error: TError, variables: TVariables, _context: TContext | undefined) => {
    if (error instanceof Error) {
      // Report to Sentry
      reportError(error, {
        severity,
        category,
        component,
        action: action || 'mutateData',
        extra: {
          variables,
        },
      });

      // Show toast
      if (showToast) {
        const message = toastMessage || getErrorMessage(error);
        toast.error(message);
      }
    }

    // Call custom error handler
    if (customOnError && error instanceof Error) {
      customOnError(error);
    }
  };

  return useMutation<TData, TError, TVariables, TContext>({
    ...mutationOptions,
    onError: handleError,
  });
}

/**
 * Hook for creating query error handlers
 */
export function useQueryErrorHandler(component: string) {
  return {
    /**
     * Create onError handler for queries
     */
    createQueryErrorHandler: (options?: {
      action?: string;
      severity?: ErrorSeverity;
      category?: ErrorCategory;
      showToast?: boolean;
      toastMessage?: string;
    }) => {
      return (error: Error) => {
        const {
          action,
          severity = 'error',
          category = 'api',
          showToast = true,
          toastMessage,
        } = options || {};

        reportError(error, {
          severity,
          category,
          component,
          action: action || 'query',
        });

        if (showToast) {
          const message = toastMessage || getErrorMessage(error);
          toast.error(message);
        }
      };
    },

    /**
     * Create onError handler for mutations
     */
    createMutationErrorHandler: (options?: {
      action?: string;
      severity?: ErrorSeverity;
      category?: ErrorCategory;
      showToast?: boolean;
      toastMessage?: string;
      successMessage?: string;
    }) => {
      return {
        onError: (error: Error) => {
          const {
            action,
            severity = 'error',
            category = 'api',
            showToast = true,
            toastMessage,
          } = options || {};

          reportError(error, {
            severity,
            category,
            component,
            action: action || 'mutation',
          });

          if (showToast) {
            const message = toastMessage || getErrorMessage(error);
            toast.error(message);
          }
        },
        onSuccess: () => {
          if (options?.successMessage) {
            toast.success(options.successMessage);
          }
        },
      };
    },
  };
}

/**
 * Hook for safe query data access with error handling
 */
export function useSafeQuery<TData = unknown, TError = Error>(
  options: UseQueryOptions<TData, TError> & ErrorHandlingOptions & {
    fallbackData?: TData;
  }
) {
  const { fallbackData, ...queryOptions } = options;
  const query = useQueryWithError<TData, TError>(queryOptions);

  return {
    ...query,
    data: query.data ?? fallbackData,
    isError: query.isError,
    error: query.error,
  };
}
