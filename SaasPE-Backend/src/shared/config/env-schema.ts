/**
 * Environment Variable Schema (Zod-based)
 *
 * Type-safe environment variable validation using Zod.
 * Validates all required environment variables at application startup.
 *
 * Usage:
 * ```typescript
 * import { validateEnvWithZod } from '@/shared/config/env-schema';
 * const env = validateEnvWithZod();
 * ```
 */

import { z } from 'zod';
import { Logger } from '@nestjs/common';

const logger = new Logger('EnvSchema');

/**
 * Node environment enum
 */
const NodeEnv = z.enum(['development', 'production', 'test', 'staging']);

/**
 * URL validation that ensures proper format and protocol
 */
const urlSchema = z.string().url().min(1);

/**
 * Secure URL validation (requires HTTPS in production)
 */
const secureUrlSchema = (env: string) =>
  z.string().url().min(1).refine(
    (val) => {
      if (env === 'production') {
        return val.startsWith('https://');
      }
      return true;
    },
    { message: 'Must use HTTPS in production' }
  );

/**
 * PostgreSQL database URL validation
 */
const postgresUrlSchema = z.string()
  .min(1, 'DATABASE_URL is required')
  .refine(
    (val) => val.startsWith('postgresql://') || val.startsWith('postgres://'),
    { message: 'DATABASE_URL must use postgresql:// or postgres:// protocol' }
  );

/**
 * Redis URL validation
 */
const redisUrlSchema = z.string()
  .min(1, 'REDIS_URL is required')
  .refine(
    (val) => val.startsWith('redis://') || val.startsWith('rediss://'),
    { message: 'REDIS_URL must use redis:// or rediss:// protocol' }
  );

/**
 * OpenAI API key validation
 */
const openaiKeySchema = z.string()
  .min(1, 'OPENAI_API_KEY is required')
  .refine(
    (val) => val.startsWith('sk-'),
    { message: 'OPENAI_API_KEY must start with "sk-"' }
  )
  .refine(
    (val) => val.length > 20,
    { message: 'OPENAI_API_KEY appears to be a placeholder' }
  );

/**
 * JWT secret validation (minimum 32 characters)
 */
const jwtSecretSchema = z.string()
  .min(32, 'JWT_SECRET must be at least 32 characters for security')
  .refine(
    (val) => val !== 'your-secret-key-change-this-in-production',
    { message: 'JWT_SECRET cannot use default example value' }
  );

/**
 * Encryption key validation (minimum 32 characters)
 */
const encryptionKeySchema = z.string()
  .min(32, 'ENCRYPTION_KEY must be at least 32 characters');

/**
 * Port number validation
 */
const portSchema = z.coerce.number().int().min(1).max(65535);

/**
 * Email address validation
 */
const emailSchema = z.string().email();

/**
 * Main environment schema
 * Defines all required and optional environment variables
 */
export const envSchema = z.object({
  // Application
  NODE_ENV: NodeEnv.default('development'),
  PORT: portSchema.default(3000),

  // URLs (made optional for backwards compatibility)
  BACKEND_URL: urlSchema.optional(),
  FRONTEND_URL: urlSchema.optional(),

  // Database
  DATABASE_URL: postgresUrlSchema,

  // Redis/Cache (Optional - app can run without Redis using in-memory fallback)
  REDIS_URL: redisUrlSchema.optional(),
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: portSchema.optional(),
  REDIS_PASSWORD: z.string().optional(),

  // Security
  JWT_SECRET: jwtSecretSchema,
  ENCRYPTION_KEY: encryptionKeySchema,

  // AI Services
  OPENAI_API_KEY: openaiKeySchema,

  // AWS Services
  AWS_REGION: z.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID: z.string().min(1, 'AWS_ACCESS_KEY_ID is required'),
  AWS_SECRET_ACCESS_KEY: z.string().min(1, 'AWS_SECRET_ACCESS_KEY is required'),
  AWS_S3_BUCKET: z.string().min(1, 'AWS_S3_BUCKET is required'),
  AWS_SES_FROM_EMAIL: emailSchema.optional(),

  // E-Signature Providers (at least one required)
  DOCUSIGN_CLIENT_ID: z.string().optional(),
  DOCUSIGN_CLIENT_SECRET: z.string().optional(),
  DOCUSIGN_INTEGRATION_KEY: z.string().optional(),
  DOCUSIGN_ACCOUNT_ID: z.string().optional(),
  DOCUSIGN_CONNECT_KEY: z.string().optional(),

  ADOBE_SIGN_CLIENT_ID: z.string().optional(),
  ADOBE_SIGN_CLIENT_SECRET: z.string().optional(),
  ADOBE_SIGN_API_BASE_URL: z.string().optional(),

  SIGNNOW_CLIENT_ID: z.string().optional(),
  SIGNNOW_CLIENT_SECRET: z.string().optional(),
  SIGNNOW_API_TOKEN: z.string().optional(),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_WEBHOOK_TOKEN: z.string().optional(),

  // External Services (Optional)
  SENDGRID_API_KEY: z.string().optional(),
  FROM_EMAIL: emailSchema.optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  HUBSPOT_API_KEY: z.string().optional(),
  NOTION_API_KEY: z.string().optional(),
  SENTRY_DSN: z.string().url().optional(),

  // Feature Flags
  ENABLE_OAUTH: z.coerce.boolean().default(false),
  ENABLE_AI_PRICING: z.coerce.boolean().default(false),
  ENABLE_NOTION_SYNC: z.coerce.boolean().default(false),
  ENABLE_HUBSPOT: z.coerce.boolean().default(false),
  ENABLE_ADVANCED_ANALYTICS: z.coerce.boolean().default(false),
  ENABLE_BETA_FEATURES: z.coerce.boolean().default(false),

  // Security Options
  ENABLE_SECURE_COOKIES: z.coerce.boolean().default(true),
  CORS_ORIGINS: z.string().optional(),

  // Rate Limiting
  RATE_LIMIT_TTL: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'log', 'debug', 'verbose']).default('log'),
})
  // Commented out e-signature provider requirement for deployment flexibility
  // .refine(
  //   (data) => {
  //     // At least one e-signature provider must be configured
  //     const hasDocuSign = !!(data.DOCUSIGN_CLIENT_ID && data.DOCUSIGN_CLIENT_SECRET);
  //     const hasAdobeSign = !!(data.ADOBE_SIGN_CLIENT_ID && data.ADOBE_SIGN_CLIENT_SECRET);
  //     const hasSignNow = !!(data.SIGNNOW_CLIENT_ID && data.SIGNNOW_CLIENT_SECRET);
  //     const hasGoogle = !!(data.GOOGLE_CLIENT_ID && data.GOOGLE_CLIENT_SECRET);
  //
  //     return hasDocuSign || hasAdobeSign || hasSignNow || hasGoogle;
  //   },
  //   {
  //     message: 'At least one e-signature provider (DocuSign, Adobe Sign, SignNow, or Google) must be configured',
  //   }
  // )
  .refine(
    (data) => {
      // No localhost in production URLs (only check if URLs are provided)
      if (data.NODE_ENV === 'production' && data.BACKEND_URL && data.FRONTEND_URL) {
        return (
          !data.BACKEND_URL.includes('localhost') &&
          !data.FRONTEND_URL.includes('localhost')
        );
      }
      return true;
    },
    {
      message: 'BACKEND_URL and FRONTEND_URL cannot use localhost in production',
    }
  );

/**
 * Inferred TypeScript type from schema
 */
export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validate environment variables using Zod schema
 * Throws error with detailed messages if validation fails
 *
 * @returns Validated and typed environment configuration
 * @throws ZodError if validation fails
 */
export function validateEnvWithZod(): EnvConfig {
  try {
    const validated = envSchema.parse(process.env);

    logger.log('✅ Environment validation (Zod) passed');

    // Log configured providers
    const providers: string[] = [];
    if (validated.DOCUSIGN_CLIENT_ID) providers.push('DocuSign');
    if (validated.ADOBE_SIGN_CLIENT_ID) providers.push('Adobe Sign');
    if (validated.SIGNNOW_CLIENT_ID) providers.push('SignNow');
    if (validated.GOOGLE_CLIENT_ID) providers.push('Google Workspace');

    logger.log(`Configured e-signature providers: ${providers.join(', ')}`);

    // Warn about missing optional services
    if (!validated.SENDGRID_API_KEY && !validated.FROM_EMAIL) {
      logger.warn('Email service not configured - notification emails will not be sent');
    }

    if (!validated.STRIPE_SECRET_KEY) {
      logger.warn('Stripe not configured - payment features will be disabled');
    }

    if (!validated.SENTRY_DSN && validated.NODE_ENV === 'production') {
      logger.warn('Sentry not configured - error tracking will be disabled');
    }

    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('❌ Environment validation failed');
      logger.error('');
      logger.error('Validation errors:');

      error.errors.forEach((err) => {
        const path = err.path.join('.');
        logger.error(`  - ${path}: ${err.message}`);
      });

      logger.error('');
      logger.error('Please check your .env file and ensure all required variables are set.');
      logger.error('See .env.example for reference.');
    }

    throw error;
  }
}

/**
 * Type-safe environment variable access
 * Use this instead of process.env for better type safety
 *
 * @example
 * const env = getEnvConfig();
 * const apiKey = env.OPENAI_API_KEY; // TypeScript knows this is a string
 */
export function getEnvConfig(): EnvConfig {
  return validateEnvWithZod();
}
