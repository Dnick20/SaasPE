import {
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleOAuthService } from '../../shared/services/google/google-oauth.service';

/**
 * Google OAuth Controller
 *
 * Handles Google OAuth authentication flow:
 * - GET /auth/google/authorize - Redirect user to Google consent screen
 * - GET /auth/google/callback - Handle OAuth callback from Google
 * - POST /auth/google/revoke - Revoke Google access tokens
 * - GET /auth/google/status - Check if user has connected Google
 */
@Controller('auth/google')
@UseGuards(JwtAuthGuard)
export class GoogleAuthController {
  private readonly logger = new Logger(GoogleAuthController.name);

  constructor(private googleOAuthService: GoogleOAuthService) {}

  /**
   * Initiate Google OAuth flow
   * Redirects user to Google consent screen
   *
   * GET /api/v1/auth/google/authorize
   */
  @Get('authorize')
  async authorize(@Req() req: any, @Res() res: Response) {
    try {
      const userId = req.user.userId;

      this.logger.log(`Initiating Google OAuth for user ${userId}`);

      const authUrl = this.googleOAuthService.getAuthorizationUrl(userId);

      // Redirect to Google's consent screen
      return res.redirect(authUrl);
    } catch (error) {
      this.logger.error(
        `Failed to initiate Google OAuth: ${error.message}`,
        error.stack,
      );
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to initiate Google authorization',
        error: error.message,
      });
    }
  }

  /**
   * Handle OAuth callback from Google
   * Exchanges authorization code for access/refresh tokens
   *
   * GET /api/v1/auth/google/callback?code=...&state=userId
   */
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') userId: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    try {
      // Handle OAuth errors (user denied access, etc.)
      if (error) {
        this.logger.warn(`Google OAuth error for user ${userId}: ${error}`);
        // Redirect to frontend with error
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return res.redirect(
          `${frontendUrl}/dashboard/integrations?google_auth=error&message=${encodeURIComponent(error)}`,
        );
      }

      if (!code || !userId) {
        this.logger.error('Missing code or userId in OAuth callback');
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return res.redirect(
          `${frontendUrl}/dashboard/integrations?google_auth=error&message=missing_parameters`,
        );
      }

      this.logger.log(`Processing Google OAuth callback for user ${userId}`);

      // Exchange code for tokens
      await this.googleOAuthService.exchangeCodeForTokens(code, userId);

      this.logger.log(`Google OAuth successful for user ${userId}`);

      // Redirect to frontend with success
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(
        `${frontendUrl}/dashboard/integrations?google_auth=success`,
      );
    } catch (error) {
      this.logger.error(
        `Google OAuth callback failed: ${error.message}`,
        error.stack,
      );
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(
        `${frontendUrl}/dashboard/integrations?google_auth=error&message=${encodeURIComponent(error.message)}`,
      );
    }
  }

  /**
   * Revoke Google access tokens
   * Removes stored tokens and revokes access on Google's side
   *
   * POST /api/v1/auth/google/revoke
   */
  @Post('revoke')
  async revoke(@Req() req: any) {
    try {
      const userId = req.user.userId;

      this.logger.log(`Revoking Google access for user ${userId}`);

      await this.googleOAuthService.revokeAccess(userId);

      return {
        statusCode: HttpStatus.OK,
        message: 'Google access revoked successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to revoke Google access: ${error.message}`,
        error.stack,
      );
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to revoke Google access',
        error: error.message,
      };
    }
  }

  /**
   * Check Google connection status
   * Returns whether user has connected their Google account
   *
   * GET /api/v1/auth/google/status
   */
  @Get('status')
  async status(@Req() req: any) {
    try {
      const userId = req.user.userId;

      const isConnected = await this.googleOAuthService.isConnected(userId);

      return {
        statusCode: HttpStatus.OK,
        data: {
          connected: isConnected,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to check Google connection status: ${error.message}`,
        error.stack,
      );
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to check Google connection status',
        error: error.message,
      };
    }
  }
}
