/**
 * Email Accounts Analytics
 *
 * PostHog tracking for email account management feature
 *
 * Events tracked:
 * - wizard_opened: User opens email wizard
 * - provider_selected: User selects email provider
 * - oauth_started: User starts OAuth flow
 * - oauth_completed: OAuth flow completed
 * - smtp_configured: SMTP credentials entered
 * - mailbox_created: Email account successfully added
 * - mailbox_creation_failed: Failed to add email account
 * - mailbox_deleted: Email account deleted
 * - connection_tested: User tests mailbox connection
 *
 * Usage:
 * ```ts
 * import { trackEmailWizardEvent } from '@/lib/analytics/email-accounts';
 *
 * trackEmailWizardEvent('provider_selected', { provider: 'GMAIL' });
 * ```
 */

interface PostHogClient {
  capture: (event: string, properties?: Record<string, any>) => void;
  identify: (userId: string, properties?: Record<string, any>) => void;
}

// PostHog client (will be initialized in provider)
let posthog: PostHogClient | null = null;

/**
 * Initialize PostHog client reference
 */
export function setPostHogClient(client: PostHogClient) {
  posthog = client;
}

/**
 * Track email wizard event
 */
export function trackEmailWizardEvent(
  event: string,
  properties?: Record<string, any>
) {
  if (!posthog) {
    console.warn('[Analytics] PostHog not initialized');
    return;
  }

  posthog.capture(`email_wizard_${event}`, {
    ...properties,
    feature: 'email_accounts',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Email Wizard - Opened
 */
export function trackWizardOpened() {
  trackEmailWizardEvent('opened');
}

/**
 * Email Wizard - Provider Selected
 */
export function trackProviderSelected(provider: string) {
  trackEmailWizardEvent('provider_selected', { provider });
}

/**
 * Email Wizard - OAuth Started
 */
export function trackOAuthStarted(provider: string, email: string) {
  trackEmailWizardEvent('oauth_started', {
    provider,
    email_domain: email.split('@')[1],
  });
}

/**
 * Email Wizard - OAuth Completed
 */
export function trackOAuthCompleted(provider: string, email: string) {
  trackEmailWizardEvent('oauth_completed', {
    provider,
    email_domain: email.split('@')[1],
  });
}

/**
 * Email Wizard - SMTP Configured
 */
export function trackSMTPConfigured(smtpHost: string, port: number, useSsl: boolean) {
  trackEmailWizardEvent('smtp_configured', {
    smtp_host: smtpHost,
    smtp_port: port,
    use_ssl: useSsl,
  });
}

/**
 * Mailbox - Created Successfully
 */
export function trackMailboxCreated(
  provider: string,
  authType: 'oauth' | 'smtp'
) {
  trackEmailWizardEvent('mailbox_created', {
    provider,
    auth_type: authType,
    success: true,
  });
}

/**
 * Mailbox - Creation Failed
 */
export function trackMailboxCreationFailed(
  provider: string,
  error: string
) {
  trackEmailWizardEvent('mailbox_creation_failed', {
    provider,
    error_message: error,
    success: false,
  });
}

/**
 * Mailbox - Deleted
 */
export function trackMailboxDeleted(provider: string, daysActive: number) {
  trackEmailWizardEvent('mailbox_deleted', {
    provider,
    days_active: daysActive,
  });
}

/**
 * Mailbox - Connection Tested
 */
export function trackConnectionTested(
  provider: string,
  success: boolean
) {
  trackEmailWizardEvent('connection_tested', {
    provider,
    test_success: success,
  });
}

/**
 * Track tier limit reached
 */
export function trackTierLimitReached(currentCount: number, limit: number) {
  trackEmailWizardEvent('tier_limit_reached', {
    current_mailbox_count: currentCount,
    tier_limit: limit,
  });
}

/**
 * Track upgrade prompt shown
 */
export function trackUpgradePromptShown(reason: string) {
  trackEmailWizardEvent('upgrade_prompt_shown', {
    reason,
  });
}
