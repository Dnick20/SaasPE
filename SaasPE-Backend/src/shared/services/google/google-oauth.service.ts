import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { google } from 'googleapis';

/**
 * Google OAuth Service
 *
 * Handles OAuth2 authentication flow for Google APIs:
 * - Generate authorization URLs
 * - Exchange auth codes for tokens
 * - Refresh expired access tokens
 * - Store and retrieve user tokens
 */
@Injectable()
export class GoogleOAuthService {
  private readonly logger = new Logger(GoogleOAuthService.name);
  private oauth2Client: any;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    const clientId = this.config.get('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get('GOOGLE_CLIENT_SECRET');
    const redirectUri = this.config.get('GOOGLE_REDIRECT_URI');

    if (!clientId || !clientSecret || !redirectUri) {
      this.logger.warn(
        'Google OAuth credentials not configured. Google Drive features will not work.',
      );
    }

    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri,
    );

    this.logger.log('Google OAuth Service initialized');
  }

  /**
   * Generate Google OAuth authorization URL
   * User will be redirected to this URL to grant permissions
   */
  getAuthorizationUrl(userId: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/drive.file', // Create and manage Google Drive files
      'https://www.googleapis.com/auth/docs', // Create and manage Google Docs
      'https://www.googleapis.com/auth/userinfo.email', // Get user email
      'https://www.googleapis.com/auth/userinfo.profile', // Get user profile
    ];

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline', // Get refresh token
      scope: scopes,
      state: userId, // Pass userId to retrieve after redirect
      prompt: 'consent', // Force consent screen to get refresh token
    });

    this.logger.log(`Generated auth URL for user ${userId}`);

    return authUrl;
  }

  /**
   * Exchange authorization code for access and refresh tokens
   * Called after user grants permissions and is redirected back
   */
  async exchangeCodeForTokens(
    code: string,
    userId: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiryDate: number;
  }> {
    try {
      this.logger.log(`Exchanging auth code for tokens (user: ${userId})`);

      const { tokens } = await this.oauth2Client.getToken(code);

      if (!tokens.access_token) {
        throw new Error('No access token received from Google');
      }

      // Store tokens in database
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          googleAccessToken: tokens.access_token,
          googleRefreshToken: tokens.refresh_token || undefined,
        },
      });

      this.logger.log(`Tokens stored successfully for user ${userId}`);

      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || '',
        expiryDate: tokens.expiry_date || Date.now() + 3600000, // Default to 1 hour
      };
    } catch (error) {
      this.logger.error(
        `Failed to exchange code for tokens: ${error.message}`,
        error.stack,
      );
      throw new Error(`OAuth token exchange failed: ${error.message}`);
    }
  }

  /**
   * Refresh expired access token using refresh token
   */
  async refreshAccessToken(userId: string): Promise<string> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          googleAccessToken: true,
          googleRefreshToken: true,
        },
      });

      if (!user?.googleRefreshToken) {
        throw new Error(
          'No refresh token found. User must re-authorize Google access.',
        );
      }

      this.logger.log(`Refreshing access token for user ${userId}`);

      // Set refresh token
      this.oauth2Client.setCredentials({
        refresh_token: user.googleRefreshToken,
      });

      // Refresh the access token
      const { credentials } = await this.oauth2Client.refreshAccessToken();

      if (!credentials.access_token) {
        throw new Error('No access token received during refresh');
      }

      // Update database with new access token
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          googleAccessToken: credentials.access_token,
        },
      });

      this.logger.log(`Access token refreshed successfully for user ${userId}`);

      return credentials.access_token;
    } catch (error) {
      this.logger.error(
        `Failed to refresh access token: ${error.message}`,
        error.stack,
      );
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  /**
   * Get valid access token for a user
   * Automatically refreshes if expired
   */
  async getValidAccessToken(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        googleAccessToken: true,
        googleRefreshToken: true,
      },
    });

    if (!user?.googleAccessToken) {
      throw new Error(
        'User has not authorized Google access. Please connect Google account first.',
      );
    }

    // Set credentials to check expiry
    this.oauth2Client.setCredentials({
      access_token: user.googleAccessToken,
      refresh_token: user.googleRefreshToken,
    });

    // Check if token is expired or about to expire (within 5 minutes)
    const expiryDate = this.oauth2Client.credentials.expiry_date || 0;
    const isExpiring = expiryDate < Date.now() + 300000; // 5 minutes buffer

    if (isExpiring && user.googleRefreshToken) {
      this.logger.log(
        `Access token is expiring for user ${userId}, refreshing...`,
      );
      return await this.refreshAccessToken(userId);
    }

    return user.googleAccessToken;
  }

  /**
   * Revoke Google access for a user
   * Removes all stored tokens and revokes access on Google's side
   */
  async revokeAccess(userId: string): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          googleAccessToken: true,
        },
      });

      if (user?.googleAccessToken) {
        // Revoke token on Google's side
        try {
          this.oauth2Client.setCredentials({
            access_token: user.googleAccessToken,
          });
          await this.oauth2Client.revokeCredentials();
        } catch (revokeError) {
          // Continue even if revoke fails (token might already be invalid)
          this.logger.warn(
            `Failed to revoke token on Google side: ${revokeError.message}`,
          );
        }
      }

      // Remove tokens from database
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          googleId: null,
          googleAccessToken: null,
          googleRefreshToken: null,
        },
      });

      this.logger.log(`Google access revoked for user ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to revoke Google access: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to revoke Google access: ${error.message}`);
    }
  }

  /**
   * Check if user has connected Google account
   */
  async isConnected(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        googleAccessToken: true,
      },
    });

    return !!user?.googleAccessToken;
  }

  /**
   * Get OAuth2 client with user's credentials
   * Used internally by other Google services
   */
  async getAuthenticatedClient(userId: string) {
    const accessToken = await this.getValidAccessToken(userId);

    this.oauth2Client.setCredentials({
      access_token: accessToken,
    });

    return this.oauth2Client;
  }
}
