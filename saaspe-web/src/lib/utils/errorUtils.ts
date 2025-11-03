/**
 * Error Utility Functions
 *
 * Common error handling utilities for the SaasPE web application
 */

import { toast } from 'sonner';
import { reportError } from '@/lib/services/errorReporting';
import { ErrorCategory, ErrorSeverity } from '@/lib/sentry';
import { AxiosError } from 'axios';

/**
 * Handle API errors with toast notifications and reporting
 */
export function handleAPIError(
  error: unknown,
  options?: {
    component?: string;
    action?: string;
    showToast?: boolean;
    toastMessage?: string;
    severity?: ErrorSeverity;
  }
) {
  const { component, action, showToast = true, toastMessage, severity = 'error' } = options || {};

  let message = 'An unexpected error occurred';

  if (error instanceof AxiosError) {
    if (error.response?.data?.message) {
      message = error.response.data.message;
    } else if (error.message) {
      message = error.message;
    }
  } else if (error instanceof Error) {
    message = error.message;
  }

  // Show toast notification
  if (showToast) {
    toast.error(toastMessage || message);
  }

  // Report error
  if (error instanceof Error) {
    reportError(error, {
      severity,
      category: 'api',
      component,
      action,
      extra: {
        errorMessage: message,
      },
    });
  }

  return message;
}

/**
 * Handle validation errors
 */
export function handleValidationError(
  error: unknown,
  options?: {
    component?: string;
    showToast?: boolean;
  }
) {
  const { component, showToast = true } = options || {};

  let message = 'Validation failed';

  if (error instanceof Error) {
    message = error.message;

    reportError(error, {
      severity: 'warning',
      category: 'data_validation',
      component,
    });
  }

  if (showToast) {
    toast.error(message);
  }

  return message;
}

/**
 * Handle network errors
 */
export function handleNetworkError(
  error: unknown,
  options?: {
    component?: string;
    action?: string;
    showToast?: boolean;
  }
) {
  const { component, action, showToast = true } = options || {};

  const message = 'Network error. Please check your connection.';

  if (showToast) {
    toast.error(message);
  }

  if (error instanceof Error) {
    reportError(error, {
      severity: 'error',
      category: 'api',
      component,
      action,
      extra: {
        errorType: 'network',
      },
    });
  }

  return message;
}

/**
 * Handle authentication errors
 */
export function handleAuthError(
  error: unknown,
  options?: {
    component?: string;
    redirectToLogin?: boolean;
  }
) {
  const { component, redirectToLogin = true } = options || {};

  const message = 'Authentication failed. Please log in again.';

  toast.error(message);

  if (error instanceof Error) {
    reportError(error, {
      severity: 'error',
      category: 'auth',
      component,
    });
  }

  if (redirectToLogin && typeof window !== 'undefined') {
    setTimeout(() => {
      window.location.href = '/login';
    }, 2000);
  }

  return message;
}

/**
 * Handle permission errors
 */
export function handlePermissionError(
  error: unknown,
  options?: {
    component?: string;
    showToast?: boolean;
  }
) {
  const { component, showToast = true } = options || {};

  const message = "You don't have permission to perform this action.";

  if (showToast) {
    toast.error(message);
  }

  if (error instanceof Error) {
    reportError(error, {
      severity: 'warning',
      category: 'auth',
      component,
    });
  }

  return message;
}

/**
 * Handle external service errors (OpenAI, DocuSign, etc.)
 */
export function handleExternalServiceError(
  error: unknown,
  serviceName: string,
  options?: {
    component?: string;
    action?: string;
    showToast?: boolean;
  }
) {
  const { component, action, showToast = true } = options || {};

  const message = `${serviceName} service is currently unavailable. Please try again later.`;

  if (showToast) {
    toast.error(message);
  }

  if (error instanceof Error) {
    reportError(error, {
      severity: 'error',
      category: 'external_service',
      component,
      action,
      extra: {
        service: serviceName,
      },
      tags: {
        externalService: serviceName,
      },
    });
  }

  return message;
}

/**
 * Handle form submission errors
 */
export function handleFormError(
  error: unknown,
  options?: {
    component?: string;
    formName?: string;
    showToast?: boolean;
  }
) {
  const { component, formName, showToast = true } = options || {};

  let message = 'Failed to submit form. Please try again.';

  if (error instanceof AxiosError) {
    if (error.response?.data?.message) {
      message = error.response.data.message;
    }
  } else if (error instanceof Error) {
    message = error.message;
  }

  if (showToast) {
    toast.error(message);
  }

  if (error instanceof Error) {
    reportError(error, {
      severity: 'error',
      category: 'data_validation',
      component,
      action: 'submitForm',
      extra: {
        formName,
      },
    });
  }

  return message;
}

/**
 * Create error handler for specific error types
 */
export function createErrorHandler(
  component: string,
  defaultCategory: ErrorCategory = 'unknown'
) {
  return {
    handleError: (
      error: unknown,
      options?: {
        action?: string;
        severity?: ErrorSeverity;
        category?: ErrorCategory;
        showToast?: boolean;
        toastMessage?: string;
      }
    ) => {
      const { action, severity = 'error', category = defaultCategory, showToast = true, toastMessage } = options || {};

      let message = 'An error occurred';

      if (error instanceof Error) {
        message = error.message;

        reportError(error, {
          severity,
          category,
          component,
          action,
        });
      }

      if (showToast) {
        toast.error(toastMessage || message);
      }

      return message;
    },

    handleAPIError: (error: unknown, action?: string) =>
      handleAPIError(error, { component, action }),

    handleValidationError: (error: unknown) =>
      handleValidationError(error, { component }),

    handleNetworkError: (error: unknown, action?: string) =>
      handleNetworkError(error, { component, action }),

    handleAuthError: (error: unknown) =>
      handleAuthError(error, { component }),

    handlePermissionError: (error: unknown) =>
      handlePermissionError(error, { component }),

    handleFormError: (error: unknown, formName?: string) =>
      handleFormError(error, { component, formName }),
  };
}

/**
 * Async operation wrapper with automatic error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  options?: {
    component?: string;
    action?: string;
    onError?: (error: Error) => void;
    showToast?: boolean;
    toastMessage?: string;
    category?: ErrorCategory;
    severity?: ErrorSeverity;
  }
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    const {
      component,
      action,
      onError,
      showToast = true,
      toastMessage,
      category = 'unknown',
      severity = 'error',
    } = options || {};

    let message = 'An error occurred';

    if (error instanceof Error) {
      message = error.message;

      reportError(error, {
        severity,
        category,
        component,
        action,
      });

      if (onError) {
        onError(error);
      }
    }

    if (showToast) {
      toast.error(toastMessage || message);
    }

    return null;
  }
}

/**
 * Check if error is a specific type
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    return !error.response && error.message.includes('network');
  }
  return false;
}

export function isAuthError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    return error.response?.status === 401;
  }
  return false;
}

export function isPermissionError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    return error.response?.status === 403;
  }
  return false;
}

export function isValidationError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    return error.response?.status === 400;
  }
  return false;
}

export function isServerError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    return error.response?.status !== undefined && error.response.status >= 500;
  }
  return false;
}
