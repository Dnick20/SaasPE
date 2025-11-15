/**
 * Feature Flags Configuration
 *
 * Centralized feature flag management for gradual rollout and A/B testing.
 * Flags are controlled via environment variables with sensible defaults.
 *
 * Usage:
 * ```typescript
 * import { FEATURE_FLAGS } from '@/shared/config/feature-flags';
 *
 * if (FEATURE_FLAGS.ENABLE_OAUTH) {
 *   // OAuth-specific logic
 * }
 * ```
 */

export interface FeatureFlags {
  /**
   * Enable OAuth 2.0 authentication for Gmail/Outlook
   * Default: false (use SMTP/App Password instead)
   *
   * When disabled, OAuth options are hidden in UI and OAuth endpoints return 501 Not Implemented
   */
  ENABLE_OAUTH: boolean;

  /**
   * Enable AI-powered pricing generation (Pricing V3)
   * Default: false (manual pricing entry only)
   *
   * When enabled, shows "AI Generate" tab in pricing configuration
   */
  ENABLE_AI_PRICING: boolean;

  /**
   * Enable Notion workspace sync for project plans
   * Default: false (project plans stored in DB only)
   *
   * When enabled, creates Notion pages for signed proposals
   */
  ENABLE_NOTION_SYNC: boolean;

  /**
   * Enable HubSpot CRM integration
   * Default: false (no CRM sync)
   *
   * When enabled, syncs clients, proposals, and deals with HubSpot
   */
  ENABLE_HUBSPOT: boolean;

  /**
   * Enable advanced analytics dashboard
   * Default: false (basic metrics only)
   *
   * When enabled, shows detailed analytics with cohort analysis
   */
  ENABLE_ADVANCED_ANALYTICS: boolean;

  /**
   * Enable beta features for testing
   * Default: false (production-ready features only)
   *
   * When enabled, shows experimental features with "Beta" badges
   */
  ENABLE_BETA_FEATURES: boolean;
}

/**
 * Parse boolean from environment variable
 * Accepts: "true", "1", "yes" (case-insensitive) as true
 */
function parseBooleanEnv(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }
  return ['true', '1', 'yes'].includes(value.toLowerCase());
}

/**
 * Feature flags loaded from environment variables
 *
 * Set via .env file or environment:
 * ```
 * ENABLE_OAUTH=true
 * ENABLE_AI_PRICING=false
 * ```
 */
export const FEATURE_FLAGS: FeatureFlags = {
  ENABLE_OAUTH: parseBooleanEnv(process.env.ENABLE_OAUTH, false),
  ENABLE_AI_PRICING: parseBooleanEnv(process.env.ENABLE_AI_PRICING, false),
  ENABLE_NOTION_SYNC: parseBooleanEnv(process.env.ENABLE_NOTION_SYNC, false),
  ENABLE_HUBSPOT: parseBooleanEnv(process.env.ENABLE_HUBSPOT, false),
  ENABLE_ADVANCED_ANALYTICS: parseBooleanEnv(process.env.ENABLE_ADVANCED_ANALYTICS, false),
  ENABLE_BETA_FEATURES: parseBooleanEnv(process.env.ENABLE_BETA_FEATURES, false),
};

/**
 * Get feature flag status (useful for API responses)
 */
export function getFeatureFlagStatus(): FeatureFlags {
  return { ...FEATURE_FLAGS };
}

/**
 * Check if a specific feature is enabled
 *
 * @param featureName - Name of the feature flag
 * @returns boolean indicating if feature is enabled
 */
export function isFeatureEnabled(featureName: keyof FeatureFlags): boolean {
  return FEATURE_FLAGS[featureName];
}

/**
 * Guard decorator for controller methods requiring feature flag
 *
 * Usage:
 * ```typescript
 * @RequireFeature('ENABLE_OAUTH')
 * @Get('/oauth/google')
 * googleOAuth() {
 *   // ... OAuth logic
 * }
 * ```
 */
export function RequireFeature(featureName: keyof FeatureFlags) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      if (!FEATURE_FLAGS[featureName]) {
        throw new Error(`Feature '${featureName}' is not enabled`);
      }
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
