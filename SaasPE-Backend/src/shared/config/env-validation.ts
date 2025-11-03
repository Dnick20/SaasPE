import { Logger } from '@nestjs/common';

const logger = new Logger('EnvironmentValidation');

export interface EnvValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  missingOptional: string[];
}

/**
 * Validate environment variables at application startup
 */
export function validateEnvironment(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const missingOptional: string[] = [];

  // Required variables
  const required = [
    'DATABASE_URL',
    'BACKEND_URL',
    'FRONTEND_URL',
    'ENCRYPTION_KEY',
    'OPENAI_API_KEY',
    'JWT_SECRET',
  ];

  // Provider-specific variables (at least one provider required)
  const providers = {
    docusign: ['DOCUSIGN_CLIENT_ID', 'DOCUSIGN_CLIENT_SECRET'],
    adobe_sign: ['ADOBE_SIGN_CLIENT_ID', 'ADOBE_SIGN_CLIENT_SECRET'],
    signnow: ['SIGNNOW_CLIENT_ID', 'SIGNNOW_CLIENT_SECRET'],
    google_workspace: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
  };

  // Optional but recommended
  const optional = [
    'SENDGRID_API_KEY',
    'FROM_EMAIL',
    'REDIS_URL',
    'REDIS_HOST',
    'REDIS_PORT',
    'SENTRY_DSN',
  ];

  // Check required variables
  for (const varName of required) {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  }

  // Validate OpenAI API key format (must not be placeholder)
  if (process.env.OPENAI_API_KEY) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey.startsWith('sk-proj-') && apiKey.length < 20) {
      errors.push(
        'OPENAI_API_KEY appears to be a placeholder value. Please set a valid OpenAI API key from https://platform.openai.com/api-keys',
      );
    } else if (!apiKey.startsWith('sk-')) {
      errors.push('OPENAI_API_KEY has invalid format. Must start with "sk-"');
    }
  }

  // Validate JWT_SECRET strength
  if (process.env.JWT_SECRET) {
    if (process.env.JWT_SECRET.length < 32) {
      errors.push(
        'JWT_SECRET must be at least 32 characters long for security',
      );
    }
    if (
      process.env.JWT_SECRET === 'your-secret-key-change-this-in-production'
    ) {
      errors.push(
        'JWT_SECRET is using the default example value. Please generate a secure random secret',
      );
    }
  }

  // Validate DATABASE_URL format
  if (
    process.env.DATABASE_URL &&
    !process.env.DATABASE_URL.startsWith('postgresql://')
  ) {
    warnings.push('DATABASE_URL should use postgresql:// protocol');
  }

  // Validate REDIS_URL format
  if (process.env.REDIS_URL && !process.env.REDIS_URL.startsWith('redis://')) {
    warnings.push('REDIS_URL should use redis:// protocol');
  }

  // Validate ENCRYPTION_KEY length
  if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length < 32) {
    errors.push('ENCRYPTION_KEY must be at least 32 characters long');
  }

  // Check at least one provider is configured
  let hasProvider = false;
  const configuredProviders: string[] = [];

  for (const [providerName, vars] of Object.entries(providers)) {
    const allVarsPresent = vars.every((v) => process.env[v]);
    if (allVarsPresent) {
      hasProvider = true;
      configuredProviders.push(providerName);
    }
  }

  if (!hasProvider) {
    errors.push(
      'At least one e-signature provider must be configured (DocuSign, Adobe Sign, SignNow, or Google Workspace)',
    );
  } else {
    logger.log(`Configured providers: ${configuredProviders.join(', ')}`);
  }

  // Check optional variables
  for (const varName of optional) {
    if (!process.env[varName]) {
      missingOptional.push(varName);
    }
  }

  // Validate URL formats
  const urlVars = ['BACKEND_URL', 'FRONTEND_URL'];
  for (const varName of urlVars) {
    const value = process.env[varName];
    if (value && !isValidUrl(value)) {
      errors.push(`${varName} is not a valid URL: ${value}`);
    }
  }

  // Check for localhost in production
  if (process.env.NODE_ENV === 'production') {
    if (process.env.BACKEND_URL?.includes('localhost')) {
      errors.push('BACKEND_URL cannot use localhost in production');
    }
    if (process.env.FRONTEND_URL?.includes('localhost')) {
      errors.push('FRONTEND_URL cannot use localhost in production');
    }
    if (!process.env.BACKEND_URL?.startsWith('https://')) {
      warnings.push(
        'BACKEND_URL should use HTTPS in production (required for OAuth)',
      );
    }
  }

  // Check Redis configuration for production
  if (process.env.NODE_ENV === 'production' && !process.env.REDIS_HOST) {
    warnings.push(
      'Redis not configured - rate limiting will use in-memory store (not recommended for production)',
    );
  }

  // Check email configuration
  if (!process.env.SENDGRID_API_KEY && !process.env.FROM_EMAIL) {
    warnings.push(
      'Email notifications not configured - signature notification emails will not be sent',
    );
  }

  // Check webhook signing keys
  const webhookKeys = {
    docusign: 'DOCUSIGN_CONNECT_KEY',
    signnow: 'SIGNNOW_API_TOKEN',
    google: 'GOOGLE_WEBHOOK_TOKEN',
  };

  for (const [provider, keyVar] of Object.entries(webhookKeys)) {
    if (configuredProviders.includes(provider) && !process.env[keyVar]) {
      warnings.push(
        `${keyVar} not set - webhook validation for ${provider} will be disabled`,
      );
    }
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    errors,
    warnings,
    missingOptional,
  };
}

/**
 * Log validation results
 */
export function logValidationResults(result: EnvValidationResult): void {
  if (result.isValid) {
    logger.log('✅ Environment validation passed');
  } else {
    logger.error('❌ Environment validation failed');
  }

  if (result.errors.length > 0) {
    logger.error('ERRORS:');
    result.errors.forEach((error) => logger.error(`  - ${error}`));
  }

  if (result.warnings.length > 0) {
    logger.warn('WARNINGS:');
    result.warnings.forEach((warning) => logger.warn(`  - ${warning}`));
  }

  if (result.missingOptional.length > 0) {
    logger.log('Missing optional variables:');
    result.missingOptional.forEach((missing) => logger.log(`  - ${missing}`));
  }

  if (!result.isValid) {
    logger.error('');
    logger.error(
      'Please check your .env file and ensure all required variables are set.',
    );
    logger.error('See .env.e-signature.example for reference.');
    throw new Error('Environment validation failed - cannot start application');
  }
}

/**
 * Validate URL format
 */
function isValidUrl(urlString: string): boolean {
  try {
    new URL(urlString);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get provider configuration status
 */
export function getProviderConfigStatus(): Record<string, boolean> {
  return {
    docusign:
      !!process.env.DOCUSIGN_CLIENT_ID && !!process.env.DOCUSIGN_CLIENT_SECRET,
    adobe_sign:
      !!process.env.ADOBE_SIGN_CLIENT_ID &&
      !!process.env.ADOBE_SIGN_CLIENT_SECRET,
    signnow:
      !!process.env.SIGNNOW_CLIENT_ID && !!process.env.SIGNNOW_CLIENT_SECRET,
    google_workspace:
      !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET,
  };
}

/**
 * Get configuration status for all critical services
 * Returns masked status (configured/not configured) without exposing values
 */
export function getConfigStatus(): Record<string, string> {
  const maskValue = (value: string | undefined): string => {
    if (!value) return 'not_configured';
    if (
      value.includes('your-') ||
      value.includes('change-this') ||
      value.includes('example')
    ) {
      return 'placeholder';
    }
    return 'configured';
  };

  return {
    // Core Services
    openai: maskValue(process.env.OPENAI_API_KEY),
    database: maskValue(process.env.DATABASE_URL),
    redis: maskValue(process.env.REDIS_URL),
    jwt: maskValue(process.env.JWT_SECRET),

    // AWS Services
    aws_s3: maskValue(process.env.AWS_ACCESS_KEY_ID),
    aws_ses: maskValue(process.env.AWS_SES_FROM_EMAIL),

    // External Integrations
    stripe: maskValue(process.env.STRIPE_SECRET_KEY),
    hubspot: maskValue(process.env.HUBSPOT_API_KEY),
    sentry: maskValue(process.env.SENTRY_DSN),

    // E-Signature Providers
    docusign: getProviderConfigStatus().docusign
      ? 'configured'
      : 'not_configured',
    adobe_sign: getProviderConfigStatus().adobe_sign
      ? 'configured'
      : 'not_configured',
    signnow: getProviderConfigStatus().signnow
      ? 'configured'
      : 'not_configured',
    google_workspace: getProviderConfigStatus().google_workspace
      ? 'configured'
      : 'not_configured',
  };
}
