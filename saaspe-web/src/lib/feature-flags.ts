/**
 * Feature Flags Configuration (Frontend)
 *
 * Centralized feature flag management for gradual rollout and A/B testing.
 * Flags are controlled via environment variables with sensible defaults.
 *
 * Usage:
 * ```typescript
 * import { featureFlags } from '@/lib/feature-flags';
 *
 * {featureFlags.ENABLE_OAUTH && <OAuthButton />}
 * ```
 */

export interface FeatureFlags {
  /**
   * Enable OAuth 2.0 authentication for Gmail/Outlook
   * Default: false (use SMTP/App Password instead)
   *
   * When disabled, OAuth options are hidden in UI
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
   * When enabled, shows "Sync to Notion" button after proposal signing
   */
  ENABLE_NOTION_SYNC: boolean;

  /**
   * Enable HubSpot CRM integration
   * Default: false (no CRM sync)
   *
   * When enabled, shows HubSpot sync options in client management
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
 * Set via .env.local file:
 * ```
 * NEXT_PUBLIC_ENABLE_OAUTH=true
 * NEXT_PUBLIC_ENABLE_AI_PRICING=false
 * ```
 *
 * Note: All flags must be prefixed with NEXT_PUBLIC_ to be available in browser
 */
export const featureFlags: FeatureFlags = {
  ENABLE_OAUTH: parseBooleanEnv(process.env.NEXT_PUBLIC_ENABLE_OAUTH, false),
  ENABLE_AI_PRICING: parseBooleanEnv(process.env.NEXT_PUBLIC_ENABLE_AI_PRICING, false),
  ENABLE_NOTION_SYNC: parseBooleanEnv(process.env.NEXT_PUBLIC_ENABLE_NOTION_SYNC, false),
  ENABLE_HUBSPOT: parseBooleanEnv(process.env.NEXT_PUBLIC_ENABLE_HUBSPOT, false),
  ENABLE_ADVANCED_ANALYTICS: parseBooleanEnv(process.env.NEXT_PUBLIC_ENABLE_ADVANCED_ANALYTICS, false),
  ENABLE_BETA_FEATURES: parseBooleanEnv(process.env.NEXT_PUBLIC_ENABLE_BETA_FEATURES, false),
};

/**
 * Check if a specific feature is enabled
 *
 * @param featureName - Name of the feature flag
 * @returns boolean indicating if feature is enabled
 */
export function isFeatureEnabled(featureName: keyof FeatureFlags): boolean {
  return featureFlags[featureName];
}

/**
 * Get all feature flags (useful for debugging)
 */
export function getAllFeatureFlags(): FeatureFlags {
  return { ...featureFlags };
}

/**
 * React hook for feature flag checking
 *
 * Usage:
 * ```typescript
 * const { ENABLE_OAUTH } = useFeatureFlags();
 *
 * if (ENABLE_OAUTH) {
 *   return <OAuthButton />;
 * }
 * ```
 */
export function useFeatureFlags() {
  return featureFlags;
}

/**
 * Feature availability badge component data
 */
export const FEATURE_STATUS_LABELS: Record<keyof FeatureFlags, string> = {
  ENABLE_OAUTH: 'OAuth 2.0',
  ENABLE_AI_PRICING: 'AI Pricing',
  ENABLE_NOTION_SYNC: 'Notion Sync',
  ENABLE_HUBSPOT: 'HubSpot CRM',
  ENABLE_ADVANCED_ANALYTICS: 'Advanced Analytics',
  ENABLE_BETA_FEATURES: 'Beta Features',
};

/**
 * Get user-friendly status message for disabled features
 */
export function getFeatureStatusMessage(featureName: keyof FeatureFlags): string {
  const label = FEATURE_STATUS_LABELS[featureName];

  if (featureFlags[featureName]) {
    return `${label} is enabled`;
  }

  switch (featureName) {
    case 'ENABLE_OAUTH':
      return 'OAuth authentication is currently disabled. Please use SMTP or App Password method.';
    case 'ENABLE_AI_PRICING':
      return 'AI pricing generation is coming soon. Use manual pricing or templates for now.';
    case 'ENABLE_NOTION_SYNC':
      return 'Notion sync is not yet available. Project plans will be stored locally.';
    case 'ENABLE_HUBSPOT':
      return 'HubSpot CRM integration is not enabled. Contact your administrator to enable it.';
    case 'ENABLE_ADVANCED_ANALYTICS':
      return 'Advanced analytics is available on Enterprise plans.';
    case 'ENABLE_BETA_FEATURES':
      return 'Beta features are disabled. Enable them to test experimental functionality.';
    default:
      return `${label} is currently disabled.`;
  }
}
