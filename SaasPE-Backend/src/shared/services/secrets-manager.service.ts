import { Injectable, Logger } from '@nestjs/common';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
  PutSecretValueCommand,
  DeleteSecretCommand,
  CreateSecretCommand,
  UpdateSecretCommand,
} from '@aws-sdk/client-secrets-manager';

/**
 * AWS Secrets Manager Service
 *
 * Manages secure storage and retrieval of secrets in AWS Secrets Manager:
 * - Encryption keys
 * - OAuth tokens
 * - API keys
 * - Database credentials
 *
 * Security Benefits:
 * - Automatic encryption at rest (AES-256)
 * - Access logging via AWS CloudTrail
 * - IAM-based access control
 * - Automatic rotation support
 * - Versioning of secrets
 */
@Injectable()
export class SecretsManagerService {
  private readonly logger = new Logger(SecretsManagerService.name);
  private readonly client: SecretsManagerClient;
  private readonly cache = new Map<
    string,
    { value: string; expiresAt: number }
  >();
  private readonly cacheTTL = 3600000; // 1 hour

  constructor() {
    const region = process.env.AWS_REGION || 'us-east-1';

    this.client = new SecretsManagerClient({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });

    this.logger.log(`SecretsManagerService initialized (region: ${region})`);
  }

  /**
   * Get a secret value from AWS Secrets Manager
   *
   * @param secretName - Name/ARN of the secret (e.g., "saaspe/encryption-key")
   * @param useCache - Whether to use in-memory cache (default: true)
   * @returns Secret value as string
   *
   * Example:
   * ```ts
   * const encryptionKey = await secretsManager.getSecret('saaspe/encryption-key');
   * ```
   */
  async getSecret(secretName: string, useCache = true): Promise<string> {
    try {
      // Check cache first
      if (useCache) {
        const cached = this.cache.get(secretName);
        if (cached && cached.expiresAt > Date.now()) {
          this.logger.debug(`Retrieved secret from cache: ${secretName}`);
          return cached.value;
        }
      }

      // Fetch from AWS
      const command = new GetSecretValueCommand({ SecretId: secretName });
      const response = await this.client.send(command);

      if (!response.SecretString) {
        throw new Error(`Secret ${secretName} has no value`);
      }

      // Cache the value
      if (useCache) {
        this.cache.set(secretName, {
          value: response.SecretString,
          expiresAt: Date.now() + this.cacheTTL,
        });
      }

      this.logger.log(`Retrieved secret: ${secretName}`);
      return response.SecretString;
    } catch (error) {
      this.logger.error(
        `Failed to get secret ${secretName}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to retrieve secret: ${secretName}`);
    }
  }

  /**
   * Store a new secret in AWS Secrets Manager
   *
   * @param secretName - Name of the secret
   * @param secretValue - Value to store
   * @param description - Optional description
   * @returns Secret ARN
   *
   * Example:
   * ```ts
   * await secretsManager.createSecret(
   *   'saaspe/oauth/mailbox-123',
   *   encryptedToken,
   *   'OAuth refresh token for mailbox 123'
   * );
   * ```
   */
  async createSecret(
    secretName: string,
    secretValue: string,
    description?: string,
  ): Promise<string> {
    try {
      const command = new CreateSecretCommand({
        Name: secretName,
        SecretString: secretValue,
        Description: description,
      });

      const response = await this.client.send(command);
      this.logger.log(`Created secret: ${secretName}`);

      // Invalidate cache
      this.cache.delete(secretName);

      return response.ARN || '';
    } catch (error) {
      this.logger.error(
        `Failed to create secret ${secretName}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to create secret: ${secretName}`);
    }
  }

  /**
   * Update an existing secret value
   *
   * @param secretName - Name of the secret
   * @param secretValue - New value
   * @returns Secret ARN
   *
   * Example:
   * ```ts
   * await secretsManager.updateSecret('saaspe/oauth/mailbox-123', newToken);
   * ```
   */
  async updateSecret(secretName: string, secretValue: string): Promise<string> {
    try {
      const command = new PutSecretValueCommand({
        SecretId: secretName,
        SecretString: secretValue,
      });

      const response = await this.client.send(command);
      this.logger.log(`Updated secret: ${secretName}`);

      // Invalidate cache
      this.cache.delete(secretName);

      return response.ARN || '';
    } catch (error) {
      this.logger.error(
        `Failed to update secret ${secretName}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to update secret: ${secretName}`);
    }
  }

  /**
   * Delete a secret from AWS Secrets Manager
   *
   * @param secretName - Name of the secret
   * @param forceDelete - Skip 30-day recovery window (default: false)
   *
   * Example:
   * ```ts
   * await secretsManager.deleteSecret('saaspe/oauth/mailbox-123');
   * ```
   */
  async deleteSecret(secretName: string, forceDelete = false): Promise<void> {
    try {
      const command = new DeleteSecretCommand({
        SecretId: secretName,
        ForceDeleteWithoutRecovery: forceDelete,
      });

      await this.client.send(command);
      this.logger.log(`Deleted secret: ${secretName} (force: ${forceDelete})`);

      // Invalidate cache
      this.cache.delete(secretName);
    } catch (error) {
      this.logger.error(
        `Failed to delete secret ${secretName}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to delete secret: ${secretName}`);
    }
  }

  /**
   * Clear the in-memory cache
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.log('Secrets cache cleared');
  }

  /**
   * Get encryption key from AWS Secrets Manager
   *
   * Convenience method for getting the main encryption key
   *
   * @returns Encryption key as hex string
   */
  async getEncryptionKey(): Promise<string> {
    const secretName = process.env.AWS_SECRET_NAME || 'saaspe/encryption-key';
    return this.getSecret(secretName);
  }

  /**
   * Store OAuth token in AWS Secrets Manager
   *
   * @param mailboxId - Mailbox ID
   * @param token - Encrypted OAuth token
   * @returns Secret ARN
   */
  async storeOAuthToken(mailboxId: string, token: string): Promise<string> {
    const secretName = `saaspe/oauth/${mailboxId}`;
    const description = `OAuth refresh token for mailbox ${mailboxId}`;

    try {
      // Try to update first (secret might already exist)
      return await this.updateSecret(secretName, token);
    } catch (error) {
      // If not found, create new
      if (error.name === 'ResourceNotFoundException') {
        return await this.createSecret(secretName, token, description);
      }
      throw error;
    }
  }

  /**
   * Retrieve OAuth token from AWS Secrets Manager
   *
   * @param mailboxId - Mailbox ID
   * @returns Encrypted OAuth token
   */
  async getOAuthToken(mailboxId: string): Promise<string> {
    const secretName = `saaspe/oauth/${mailboxId}`;
    return this.getSecret(secretName);
  }

  /**
   * Delete OAuth token from AWS Secrets Manager
   *
   * @param mailboxId - Mailbox ID
   */
  async deleteOAuthToken(mailboxId: string): Promise<void> {
    const secretName = `saaspe/oauth/${mailboxId}`;
    await this.deleteSecret(secretName, true); // Force delete for cleanup
  }
}
