import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import {
  httpIntegration,
  nativeNodeFetchIntegration,
  prismaIntegration,
} from '@sentry/node';

export function initSentry() {
  if (!process.env.SENTRY_DSN) {
    console.log('Sentry DSN not configured, skipping initialization');
    return;
  }

  const environment =
    process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development';
  const release =
    process.env.GIT_COMMIT_SHA || process.env.npm_package_version || 'unknown';

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment,
    release: `saaspe-backend@${release}`,

    // Performance Monitoring
    tracesSampleRate: parseFloat(
      process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1',
    ),
    profilesSampleRate: parseFloat(
      process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1',
    ),

    // Integrations (v10+ pattern)
    integrations: [
      // HTTP instrumentation for all HTTP requests
      httpIntegration(),
      // Native fetch instrumentation
      nativeNodeFetchIntegration(),
      // Prisma ORM instrumentation
      prismaIntegration(),
      // Profiling integration
      nodeProfilingIntegration(),
    ],

    beforeSend(event, hint) {
      // Filter out sensitive data from request
      if (event.request) {
        delete event.request.cookies;
        if (event.request.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
          delete event.request.headers['x-api-key'];
        }

        // Sanitize query parameters
        if (
          event.request.query_string &&
          typeof event.request.query_string === 'string'
        ) {
          const sanitized = event.request.query_string.replace(
            /(token|key|password|secret)=[^&]*/gi,
            '$1=[REDACTED]',
          );
          event.request.query_string = sanitized;
        }
      }

      // Filter out sensitive data from extra context
      if (event.extra) {
        const sensitiveKeys = [
          'password',
          'passwordHash',
          'token',
          'apiKey',
          'secret',
          'accessToken',
          'refreshToken',
        ];
        Object.keys(event.extra).forEach((key) => {
          if (
            sensitiveKeys.some((sensitiveKey) =>
              key.toLowerCase().includes(sensitiveKey),
            )
          ) {
            event.extra![key] = '[REDACTED]';
          }
        });
      }

      // Add global tags
      if (!event.tags) {
        event.tags = {};
      }
      event.tags.node_version = process.version;
      event.tags.platform = process.platform;

      return event;
    },

    beforeBreadcrumb(breadcrumb, hint) {
      // Filter sensitive data from breadcrumbs
      if (breadcrumb.category === 'http') {
        if (breadcrumb.data?.url) {
          breadcrumb.data.url = breadcrumb.data.url.replace(
            /(token|key|password|secret)=[^&]*/gi,
            '$1=[REDACTED]',
          );
        }
      }
      return breadcrumb;
    },
  });

  console.log(
    `Sentry initialized for environment: ${environment}, release: ${release}`,
  );
}

/**
 * Helper to set user context in Sentry
 */
export function setSentryUser(user: {
  id: string;
  email: string;
  tenantId: string;
  role?: string;
}) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    tenant_id: user.tenantId,
    role: user.role,
  });
}

/**
 * Helper to clear user context (e.g., on logout)
 */
export function clearSentryUser() {
  Sentry.setUser(null);
}

/**
 * Helper to add breadcrumb for database operations
 */
export function addDatabaseBreadcrumb(
  operation: string,
  table: string,
  data?: any,
) {
  Sentry.addBreadcrumb({
    category: 'database',
    message: `${operation} on ${table}`,
    level: 'info',
    data,
  });
}

/**
 * Helper to add breadcrumb for external API calls
 */
export function addExternalAPIBreadcrumb(
  service: string,
  endpoint: string,
  status?: number,
) {
  Sentry.addBreadcrumb({
    category: 'external_api',
    message: `${service}: ${endpoint}`,
    level: status && status >= 400 ? 'error' : 'info',
    data: { service, endpoint, status },
  });
}

/**
 * Helper to capture exception with additional context
 */
export function captureExceptionWithContext(
  error: Error,
  context: {
    tenantId?: string;
    userId?: string;
    endpoint?: string;
    method?: string;
    extra?: Record<string, any>;
  },
) {
  Sentry.withScope((scope) => {
    if (context.tenantId) {
      scope.setTag('tenant_id', context.tenantId);
    }
    if (context.userId) {
      scope.setTag('user_id', context.userId);
    }
    if (context.endpoint) {
      scope.setTag('endpoint', context.endpoint);
    }
    if (context.method) {
      scope.setTag('http_method', context.method);
    }
    if (context.extra) {
      scope.setContext('additional', context.extra);
    }
    Sentry.captureException(error);
  });
}

export { Sentry };
