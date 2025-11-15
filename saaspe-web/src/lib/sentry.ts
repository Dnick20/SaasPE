/**
 * Sentry Configuration and Helpers for Next.js
 *
 * Provides centralized error tracking, breadcrumb management,
 * and context enrichment for the SaasPE web application.
 */

import {
  setUser,
  addBreadcrumb,
  withScope,
  setTag as sentrySetTag,
  captureException as sentryCaptureException,
  captureMessage as sentryCaptureMessage,
  startSpan as sentryStartSpan,
  setContext as sentrySetContext,
} from '@sentry/nextjs';

/**
 * Error Severity Levels
 */
export type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

/**
 * Error Category Types
 */
export type ErrorCategory =
  | 'api'
  | 'auth'
  | 'data_validation'
  | 'data_processing'
  | 'ui'
  | 'navigation'
  | 'external_service'
  | 'unknown';

/**
 * Set user context for error tracking
 */
export function setUserContext(user: {
  id: string;
  email?: string;
  tenantId?: string;
  role?: string;
}) {
  setUser({
    id: user.id,
    email: user.email,
    username: user.email,
    ...{
      tenantId: user.tenantId,
      role: user.role,
    },
  });
}

/**
 * Clear user context (on logout)
 */
export function clearUserContext() {
  setUser(null);
}

/**
 * Add navigation breadcrumb
 */
export function addNavigationBreadcrumb(path: string, params?: Record<string, unknown>) {
  addBreadcrumb({
    category: 'navigation',
    message: `Navigated to ${path}`,
    level: 'info',
    data: params,
  });
}

/**
 * Add user action breadcrumb
 */
export function addUserActionBreadcrumb(action: string, data?: Record<string, unknown>) {
  addBreadcrumb({
    category: 'user-action',
    message: action,
    level: 'info',
    data,
  });
}

/**
 * Add API request breadcrumb
 */
export function addAPIBreadcrumb(
  method: string,
  endpoint: string,
  status?: number,
  data?: Record<string, unknown>
) {
  addBreadcrumb({
    category: 'api',
    message: `${method} ${endpoint}`,
    level: status && status >= 400 ? 'error' : 'info',
    data: {
      status,
      ...data,
    },
  });
}

/**
 * Add external service breadcrumb
 */
export function addExternalServiceBreadcrumb(
  service: string,
  action: string,
  status?: 'success' | 'error',
  data?: Record<string, unknown>
) {
  addBreadcrumb({
    category: 'external-service',
    message: `${service}: ${action}`,
    level: status === 'error' ? 'error' : 'info',
    data,
  });
}

/**
 * Add UI event breadcrumb
 */
export function addUIBreadcrumb(component: string, event: string, data?: Record<string, unknown>) {
  addBreadcrumb({
    category: 'ui',
    message: `${component}: ${event}`,
    level: 'info',
    data,
  });
}

/**
 * Capture exception with enhanced context
 */
export function captureException(
  error: Error,
  context?: {
    severity?: ErrorSeverity;
    category?: ErrorCategory;
    component?: string;
    action?: string;
    extra?: Record<string, unknown>;
    tags?: Record<string, string>;
  }
) {
  const { severity = 'error', category = 'unknown', component, action, extra, tags } = context || {};

  withScope((scope) => {
    // Set severity
    scope.setLevel(severity);

    // Set tags
    scope.setTag('category', category);
    if (component) scope.setTag('component', component);
    if (action) scope.setTag('action', action);
    if (tags) {
      Object.entries(tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }

    // Set extra context
    if (extra) {
      Object.entries(extra).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }

    // Capture the exception
    sentryCaptureException(error);
  });
}

/**
 * Capture a custom message
 */
export function captureMessage(
  message: string,
  severity: ErrorSeverity = 'info',
  context?: {
    category?: ErrorCategory;
    extra?: Record<string, unknown>;
    tags?: Record<string, string>;
  }
) {
  const { category = 'unknown', extra, tags } = context || {};

  withScope((scope) => {
    scope.setLevel(severity);
    scope.setTag('category', category);

    if (tags) {
      Object.entries(tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }

    if (extra) {
      Object.entries(extra).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }

    sentryCaptureMessage(message, severity);
  });
}

/**
 * Start a performance span for modern performance tracking
 */
export function startSpan<T>(name: string, op: string, callback: () => T): T {
  return sentryStartSpan(
    {
      name,
      op,
    },
    callback
  );
}

/**
 * Set context for the current scope
 */
export function setContext(key: string, context: Record<string, unknown>) {
  sentrySetContext(key, context);
}

/**
 * Set a tag for the current scope
 */
export function setTag(key: string, value: string) {
  sentrySetTag(key, value);
}

/**
 * Initialize Sentry with user data from auth state
 */
export function initializeUserTracking(user: {
  id: string;
  email?: string;
  tenantId?: string;
  role?: string;
} | null) {
  if (user) {
    setUserContext(user);
  } else {
    clearUserContext();
  }
}
