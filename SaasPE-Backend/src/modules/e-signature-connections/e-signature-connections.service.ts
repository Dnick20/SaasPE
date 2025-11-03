import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  retryWithBackoff,
  isRetryableError,
} from '../../shared/utils/retry.util';
import {
  OAuthTokenRefreshError,
  OAuthConnectionError,
} from './exceptions/oauth-error.exception';

/**
 * E-Signature Connections Service
 *
 * Manages OAuth connections to e-signature providers
 * - Stores encrypted access/refresh tokens
 * - Checks connection status
 * - Handles token refresh
 */
@Injectable()
export class ESignatureConnectionsService {
  private readonly logger = new Logger(ESignatureConnectionsService.name);
  private readonly encryptionKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    // Use a secure encryption key from environment
    this.encryptionKey =
      this.config.get('ENCRYPTION_KEY') || 'default-key-change-in-production';
  }

  /**
   * Encrypt sensitive data (tokens)
   */
  private encrypt(text: string): string {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(this.encryptionKey.padEnd(32, '0').slice(0, 32));
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return `${iv.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt sensitive data (tokens)
   */
  private decrypt(text: string): string {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(this.encryptionKey.padEnd(32, '0').slice(0, 32));

    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Save or update provider connection
   */
  async upsertConnection(
    tenantId: string,
    provider: string,
    data: {
      accessToken: string;
      refreshToken?: string;
      expiresAt?: Date;
      accountId?: string;
      email?: string;
      scopes: string[];
    },
  ) {
    this.logger.log(`Upserting ${provider} connection for tenant ${tenantId}`);

    // Encrypt tokens
    const encryptedAccessToken = this.encrypt(data.accessToken);
    const encryptedRefreshToken = data.refreshToken
      ? this.encrypt(data.refreshToken)
      : null;

    const connection = await this.prisma.eSignatureConnection.upsert({
      where: {
        tenantId_provider: {
          tenantId,
          provider,
        },
      },
      create: {
        tenantId,
        provider,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: data.expiresAt,
        accountId: data.accountId,
        email: data.email,
        scopes: data.scopes,
        isActive: true,
      },
      update: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: data.expiresAt,
        accountId: data.accountId,
        email: data.email,
        scopes: data.scopes,
        isActive: true,
        lastSynced: new Date(),
      },
    });

    this.logger.log(`${provider} connection saved for tenant ${tenantId}`);

    return connection;
  }

  /**
   * Get connection for a provider
   */
  async getConnection(tenantId: string, provider: string) {
    const connection = await this.prisma.eSignatureConnection.findUnique({
      where: {
        tenantId_provider: {
          tenantId,
          provider,
        },
      },
    });

    return connection;
  }

  /**
   * Get decrypted access token (with automatic refresh)
   */
  async getAccessToken(
    tenantId: string,
    provider: string,
  ): Promise<string | null> {
    const connection = await this.getConnection(tenantId, provider);

    if (!connection || !connection.accessToken) {
      return null;
    }

    // Check if token is expired or will expire in next 5 minutes
    const now = new Date();
    const expiresAt = connection.expiresAt;
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    if (expiresAt && expiresAt < fiveMinutesFromNow) {
      this.logger.log(
        `Access token expired or expiring soon for ${provider} (tenant: ${tenantId}), attempting refresh`,
      );

      // Attempt to refresh the token
      const refreshed = await this.refreshToken(tenantId, provider);
      if (refreshed) {
        return refreshed.accessToken;
      }

      this.logger.error(
        `Failed to refresh token for ${provider} (tenant: ${tenantId})`,
      );
      return null;
    }

    return this.decrypt(connection.accessToken);
  }

  /**
   * Get decrypted refresh token
   */
  async getRefreshToken(
    tenantId: string,
    provider: string,
  ): Promise<string | null> {
    const connection = await this.getConnection(tenantId, provider);

    if (!connection || !connection.refreshToken) {
      return null;
    }

    return this.decrypt(connection.refreshToken);
  }

  /**
   * Check if provider is connected and active
   */
  async isConnected(tenantId: string, provider: string): Promise<boolean> {
    const connection = await this.getConnection(tenantId, provider);

    if (!connection || !connection.isActive) {
      return false;
    }

    // Check if token is expired
    if (connection.expiresAt && new Date() > connection.expiresAt) {
      return false;
    }

    return true;
  }

  /**
   * Get display name for provider
   */
  private getProviderDisplayName(provider: string): string {
    const displayNames = {
      docusign: 'DocuSign',
      adobe_sign: 'Adobe Acrobat Sign',
      signnow: 'SignNow',
      google_workspace: 'Google Workspace',
    };
    return displayNames[provider] || provider;
  }

  /**
   * Get connection status for all providers
   */
  async getAllConnectionStatuses(tenantId: string) {
    const providers = ['docusign', 'adobe_sign', 'signnow', 'google_workspace'];

    const statuses = await Promise.all(
      providers.map(async (provider) => {
        const connection = await this.getConnection(tenantId, provider);

        return {
          provider,
          displayName: this.getProviderDisplayName(provider),
          isConnected: connection?.isActive || false,
          connectedEmail: connection?.email || null,
          connectedAt: connection?.created?.toISOString() || null,
          expiresAt: connection?.expiresAt?.toISOString() || null,
          accountId: connection?.accountId || null,
          scopes: connection?.scopes || [],
        };
      }),
    );

    return statuses;
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(
    tenantId: string,
    provider: string,
  ): Promise<{ accessToken: string; expiresAt: Date } | null> {
    const connection = await this.getConnection(tenantId, provider);

    if (!connection || !connection.refreshToken) {
      this.logger.warn(
        `No refresh token available for ${provider} (tenant: ${tenantId})`,
      );
      return null;
    }

    const refreshToken = this.decrypt(connection.refreshToken);

    try {
      let tokenData: { access_token: string; expires_in: number };

      switch (provider) {
        case 'docusign':
          tokenData = await this.refreshDocuSignToken(refreshToken);
          break;
        case 'adobe_sign':
          tokenData = await this.refreshAdobeSignToken(refreshToken);
          break;
        case 'signnow':
          tokenData = await this.refreshSignNowToken(refreshToken);
          break;
        case 'google_workspace':
          tokenData = await this.refreshGoogleToken(refreshToken);
          break;
        default:
          this.logger.error(`Unknown provider: ${provider}`);
          return null;
      }

      // Update the connection with new access token
      const newAccessToken = this.encrypt(tokenData.access_token);
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

      await this.prisma.eSignatureConnection.update({
        where: {
          tenantId_provider: {
            tenantId,
            provider,
          },
        },
        data: {
          accessToken: newAccessToken,
          expiresAt,
          lastSynced: new Date(),
        },
      });

      this.logger.log(
        `Successfully refreshed token for ${provider} (tenant: ${tenantId})`,
      );

      return {
        accessToken: tokenData.access_token,
        expiresAt,
      };
    } catch (error) {
      this.logger.error(
        `Failed to refresh token for ${provider}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Refresh DocuSign access token
   */
  private async refreshDocuSignToken(
    refreshToken: string,
  ): Promise<{ access_token: string; expires_in: number }> {
    return retryWithBackoff(
      async () => {
        const clientId = this.config.get('DOCUSIGN_CLIENT_ID');
        const clientSecret = this.config.get('DOCUSIGN_CLIENT_SECRET');
        const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
          'base64',
        );

        const response = await fetch(
          'https://account-d.docusign.com/oauth/token',
          {
            method: 'POST',
            headers: {
              Authorization: `Basic ${credentials}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              grant_type: 'refresh_token',
              refresh_token: refreshToken,
            }),
          },
        );

        if (!response.ok) {
          const error: any = new Error(
            `DocuSign token refresh failed: ${response.statusText}`,
          );
          error.status = response.status;
          throw error;
        }

        return response.json();
      },
      {
        maxRetries: 3,
        initialDelay: 1000,
        shouldRetry: isRetryableError,
      },
    );
  }

  /**
   * Refresh Adobe Sign access token
   */
  private async refreshAdobeSignToken(
    refreshToken: string,
  ): Promise<{ access_token: string; expires_in: number }> {
    return retryWithBackoff(
      async () => {
        const clientId = this.config.get('ADOBE_SIGN_CLIENT_ID');
        const clientSecret = this.config.get('ADOBE_SIGN_CLIENT_SECRET');

        const response = await fetch(
          'https://api.na1.adobesign.com/oauth/token',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              grant_type: 'refresh_token',
              refresh_token: refreshToken,
              client_id: clientId,
              client_secret: clientSecret,
            }),
          },
        );

        if (!response.ok) {
          const error: any = new Error(
            `Adobe Sign token refresh failed: ${response.statusText}`,
          );
          error.status = response.status;
          throw error;
        }

        return response.json();
      },
      { maxRetries: 3, shouldRetry: isRetryableError },
    );
  }

  /**
   * Refresh SignNow access token
   */
  private async refreshSignNowToken(
    refreshToken: string,
  ): Promise<{ access_token: string; expires_in: number }> {
    return retryWithBackoff(
      async () => {
        const clientId = this.config.get('SIGNNOW_CLIENT_ID');
        const clientSecret = this.config.get('SIGNNOW_CLIENT_SECRET');

        const response = await fetch('https://api.signnow.com/oauth2/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: clientId,
            client_secret: clientSecret,
          }),
        });

        if (!response.ok) {
          const error: any = new Error(
            `SignNow token refresh failed: ${response.statusText}`,
          );
          error.status = response.status;
          throw error;
        }

        return response.json();
      },
      { maxRetries: 3, shouldRetry: isRetryableError },
    );
  }

  /**
   * Refresh Google access token
   */
  private async refreshGoogleToken(
    refreshToken: string,
  ): Promise<{ access_token: string; expires_in: number }> {
    return retryWithBackoff(
      async () => {
        const clientId = this.config.get('GOOGLE_CLIENT_ID');
        const clientSecret = this.config.get('GOOGLE_CLIENT_SECRET');

        const response = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: clientId,
            client_secret: clientSecret,
          }),
        });

        if (!response.ok) {
          const error: any = new Error(
            `Google token refresh failed: ${response.statusText}`,
          );
          error.status = response.status;
          throw error;
        }

        return response.json();
      },
      { maxRetries: 3, shouldRetry: isRetryableError },
    );
  }

  /**
   * Disconnect a provider
   */
  async disconnectProvider(tenantId: string, provider: string) {
    this.logger.log(`Disconnecting ${provider} for tenant ${tenantId}`);

    const connection = await this.getConnection(tenantId, provider);

    if (!connection) {
      throw new NotFoundException(
        `No ${provider} connection found for this tenant`,
      );
    }

    // Delete the connection
    await this.prisma.eSignatureConnection.delete({
      where: {
        id: connection.id,
      },
    });

    this.logger.log(`${provider} disconnected for tenant ${tenantId}`);
  }
}
