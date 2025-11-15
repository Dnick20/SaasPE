/**
 * Error Reporting Service
 *
 * Centralized error reporting with context tracking, breadcrumbs,
 * and automatic categorization for the SaasPE web application.
 */

import * as Sentry from '@sentry/nextjs';
import {
  captureException,
  addNavigationBreadcrumb,
  addUserActionBreadcrumb,
  addAPIBreadcrumb,
  ErrorCategory,
  ErrorSeverity,
} from '../sentry';
import { apiClient } from '../api/client';

/**
 * Navigation History Entry
 */
interface NavigationEntry {
  path: string;
  timestamp: number;
  params?: Record<string, unknown>;
}

/**
 * API Call History Entry
 */
interface APICallEntry {
  method: string;
  endpoint: string;
  status?: number;
  timestamp: number;
  error?: boolean;
}

/**
 * User Action Entry
 */
interface UserActionEntry {
  action: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

/**
 * App State Snapshot
 */
interface AppState {
  route: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

/**
 * Error Context
 */
interface ErrorContext {
  navigationHistory: NavigationEntry[];
  apiCallHistory: APICallEntry[];
  userActionHistory: UserActionEntry[];
  appState: AppState | null;
  userAgent: string;
  screenSize?: {
    width: number;
    height: number;
  };
  viewport?: {
    width: number;
    height: number;
  };
}

/**
 * Error Reporting Context
 */
class ErrorReportingService {
  private navigationHistory: NavigationEntry[] = [];
  private apiCallHistory: APICallEntry[] = [];
  private userActionHistory: UserActionEntry[] = [];
  private appState: AppState | null = null;
  private maxHistorySize = 20;

  /**
   * Track navigation
   */
  trackNavigation(path: string, params?: Record<string, unknown>) {
    const entry: NavigationEntry = {
      path,
      timestamp: Date.now(),
      params,
    };

    this.navigationHistory.push(entry);
    if (this.navigationHistory.length > this.maxHistorySize) {
      this.navigationHistory.shift();
    }

    addNavigationBreadcrumb(path, params);
  }

  /**
   * Track API call
   */
  trackAPICall(method: string, endpoint: string, status?: number, error?: boolean) {
    const entry: APICallEntry = {
      method,
      endpoint,
      status,
      timestamp: Date.now(),
      error,
    };

    this.apiCallHistory.push(entry);
    if (this.apiCallHistory.length > this.maxHistorySize) {
      this.apiCallHistory.shift();
    }

    addAPIBreadcrumb(method, endpoint, status);
  }

  /**
   * Track user action
   */
  trackUserAction(action: string, data?: Record<string, unknown>) {
    const entry: UserActionEntry = {
      action,
      timestamp: Date.now(),
      data,
    };

    this.userActionHistory.push(entry);
    if (this.userActionHistory.length > this.maxHistorySize) {
      this.userActionHistory.shift();
    }

    addUserActionBreadcrumb(action, data);
  }

  /**
   * Update app state
   */
  updateAppState(route: string, data?: Record<string, unknown>) {
    this.appState = {
      route,
      timestamp: Date.now(),
      data,
    };
  }

  /**
   * Get current context for error reporting
   */
  private getContext() {
    return {
      navigationHistory: this.navigationHistory,
      apiCallHistory: this.apiCallHistory,
      userActionHistory: this.userActionHistory,
      appState: this.appState,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
      screenSize:
        typeof window !== 'undefined'
          ? {
              width: window.screen.width,
              height: window.screen.height,
            }
          : undefined,
      viewport:
        typeof window !== 'undefined'
          ? {
              width: window.innerWidth,
              height: window.innerHeight,
            }
          : undefined,
    };
  }

  /**
   * Automatically categorize error based on error message and context
   */
  private categorizeError(error: Error, context?: { component?: string }): ErrorCategory {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    // API errors
    if (message.includes('api') || message.includes('request') || message.includes('response')) {
      return 'api';
    }

    // Auth errors
    if (
      message.includes('auth') ||
      message.includes('unauthorized') ||
      message.includes('login') ||
      message.includes('token')
    ) {
      return 'auth';
    }

    // Validation errors
    if (
      message.includes('validation') ||
      message.includes('invalid') ||
      name.includes('validation')
    ) {
      return 'data_validation';
    }

    // Navigation errors
    if (message.includes('navigation') || message.includes('route')) {
      return 'navigation';
    }

    // UI/Component errors
    if (context?.component || message.includes('render') || message.includes('component')) {
      return 'ui';
    }

    // External service errors
    if (
      message.includes('openai') ||
      message.includes('docusign') ||
      message.includes('aws') ||
      message.includes('stripe')
    ) {
      return 'external_service';
    }

    return 'unknown';
  }

  /**
   * Determine error severity based on error type and context
   */
  private determineSeverity(
    error: Error,
    category: ErrorCategory,
    providedSeverity?: ErrorSeverity
  ): ErrorSeverity {
    if (providedSeverity) {
      return providedSeverity;
    }

    // Fatal errors
    if (
      category === 'auth' ||
      error.message.includes('critical') ||
      error.message.includes('fatal')
    ) {
      return 'fatal';
    }

    // High priority errors
    if (category === 'api' || category === 'external_service' || category === 'data_processing') {
      return 'error';
    }

    // Medium priority
    if (category === 'data_validation' || category === 'navigation') {
      return 'warning';
    }

    return 'error';
  }

  /**
   * Report error with full context
   */
  reportError(
    error: Error,
    options?: {
      severity?: ErrorSeverity;
      category?: ErrorCategory;
      component?: string;
      action?: string;
      extra?: Record<string, unknown>;
      tags?: Record<string, string>;
      sendToBackend?: boolean;
    }
  ) {
    const { component, action, extra, tags, sendToBackend = true } = options || {};

    // Auto-categorize if not provided
    const category = options?.category || this.categorizeError(error, { component });

    // Auto-determine severity if not provided
    const severity = this.determineSeverity(error, category, options?.severity);

    // Get full context
    const context = this.getContext();

    // Report to Sentry
    captureException(error, {
      severity,
      category,
      component,
      action,
      extra: {
        ...extra,
        ...context,
      },
      tags,
    });

    // Report to backend for CRITICAL and HIGH severity errors
    if (sendToBackend && (severity === 'fatal' || severity === 'error')) {
      this.sendErrorToBackend(error, {
        severity,
        category,
        component,
        action,
        context,
      }).catch((backendError) => {
        // Don't throw if backend logging fails
        console.error('Failed to send error to backend:', backendError);
      });
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error reported:', {
        error,
        severity,
        category,
        component,
        action,
        context,
      });
    }
  }

  /**
   * Map Sentry severity to backend severity enum
   */
  private mapSeverityToBackend(severity: ErrorSeverity): string {
    const mapping: Record<ErrorSeverity, string> = {
      fatal: 'CRITICAL',
      error: 'HIGH',
      warning: 'MEDIUM',
      info: 'INFO',
      debug: 'LOW',
    };
    return mapping[severity] || 'MEDIUM';
  }

  /**
   * Send error to backend API
   */
  private async sendErrorToBackend(
    error: Error,
    context: {
      severity: ErrorSeverity;
      category: ErrorCategory;
      component?: string;
      action?: string;
      context: ErrorContext;
    }
  ) {
    try {
      // Get Sentry event ID for linking
      const sentryId = Sentry.lastEventId();

      await apiClient.post('/api/v1/admin/errors', {
        errorId: `web-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        sentryId,
        severity: this.mapSeverityToBackend(context.severity),
        category: context.category,
        source: 'frontend',
        message: error.message,
        stackTrace: error.stack,
        errorType: error.name,
        context: {
          component: context.component,
          action: context.action,
          navigationHistory: context.context.navigationHistory,
          apiCallHistory: context.context.apiCallHistory,
          userActionHistory: context.context.userActionHistory,
          appState: context.context.appState,
          userAgent: context.context.userAgent,
          screenSize: context.context.screenSize,
          viewport: context.context.viewport,
        },
      });
    } catch (err) {
      // Silently fail - we don't want error logging to break the app
      console.error('Failed to send error to backend:', err);
    }
  }

  /**
   * Clear all history
   */
  clearHistory() {
    this.navigationHistory = [];
    this.apiCallHistory = [];
    this.userActionHistory = [];
    this.appState = null;
  }
}

// Singleton instance
export const errorReportingService = new ErrorReportingService();

// Convenience exports - using arrow functions to preserve context
export const trackNavigation = (path: string, params?: Record<string, unknown>) =>
  errorReportingService.trackNavigation(path, params);
export const trackAPICall = (method: string, endpoint: string, status?: number, error?: boolean) =>
  errorReportingService.trackAPICall(method, endpoint, status, error);
export const trackUserAction = (action: string, data?: Record<string, unknown>) =>
  errorReportingService.trackUserAction(action, data);
export const updateAppState = (route: string, data?: Record<string, unknown>) =>
  errorReportingService.updateAppState(route, data);
export const reportError = (
  error: Error,
  options?: {
    severity?: ErrorSeverity;
    category?: ErrorCategory;
    component?: string;
    action?: string;
    extra?: Record<string, unknown>;
    tags?: Record<string, string>;
    sendToBackend?: boolean;
  }
) => errorReportingService.reportError(error, options);
export const clearErrorHistory = () => errorReportingService.clearHistory();
