import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Param,
  UseGuards,
  Request,
  Redirect,
  BadRequestException,
  Logger,
  Body,
  Headers,
  UnauthorizedException,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ESignatureConnectionsService } from './e-signature-connections.service';
import { ESignatureAnalyticsService } from './e-signature-analytics.service';
import {
  ConnectionStatusDto,
  ESignatureConnectionResponseDto,
} from './dto/connection-response.dto';
import { ConfigService } from '@nestjs/config';
import {
  validateDocuSignWebhook,
  validateAdobeSignWebhook,
  validateSignNowWebhook,
  validateGoogleWebhook,
  extractWebhookSignature,
} from '../../shared/utils/webhook-validator.util';

@ApiTags('E-Signature Connections')
@ApiBearerAuth()
@Controller('e-signature-connections')
@UseGuards(JwtAuthGuard)
export class ESignatureConnectionsController {
  private readonly logger = new Logger(ESignatureConnectionsController.name);

  constructor(
    private readonly connectionsService: ESignatureConnectionsService,
    private readonly analyticsService: ESignatureAnalyticsService,
    private readonly config: ConfigService,
  ) {}

  @Get('analytics')
  @ApiOperation({ summary: 'Get e-signature analytics' })
  @ApiResponse({
    status: 200,
    description: 'E-signature analytics retrieved',
  })
  async getAnalytics(@Request() req) {
    const tenantId = req.user.tenantId;
    return this.analyticsService.getAnalytics(tenantId);
  }

  @Get('status')
  @ApiOperation({ summary: 'Get connection status for all providers' })
  @ApiResponse({
    status: 200,
    description: 'Connection statuses retrieved',
    type: [ConnectionStatusDto],
  })
  async getConnectionStatuses(@Request() req): Promise<ConnectionStatusDto[]> {
    const tenantId = req.user.tenantId;
    return this.connectionsService.getAllConnectionStatuses(tenantId);
  }

  @Get('connect/:provider')
  @ApiOperation({ summary: 'Initiate OAuth flow for a provider' })
  @ApiQuery({
    name: 'provider',
    enum: ['docusign', 'adobe_sign', 'signnow', 'google_workspace'],
  })
  @ApiResponse({ status: 302, description: 'Redirect to OAuth provider' })
  @Redirect()
  async initiateOAuth(
    @Param('provider') provider: string,
    @Request() req,
  ): Promise<{ url: string }> {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;

    // Build OAuth URL based on provider
    let authUrl: string;
    const redirectUri = `${this.config.get('BACKEND_URL')}/api/v1/e-signature-connections/callback/${provider}`;
    const state = Buffer.from(JSON.stringify({ tenantId, userId })).toString(
      'base64',
    );

    switch (provider) {
      case 'docusign':
        const docusignClientId = this.config.get('DOCUSIGN_CLIENT_ID');
        authUrl =
          `https://account-d.docusign.com/oauth/auth?` +
          `response_type=code&` +
          `scope=signature%20impersonation&` +
          `client_id=${docusignClientId}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `state=${state}`;
        break;

      case 'adobe_sign':
        const adobeClientId = this.config.get('ADOBE_SIGN_CLIENT_ID');
        authUrl =
          `https://secure.na1.adobesign.com/public/oauth?` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `response_type=code&` +
          `client_id=${adobeClientId}&` +
          `scope=agreement_write:account+agreement_read:account&` +
          `state=${state}`;
        break;

      case 'signnow':
        const signnowClientId = this.config.get('SIGNNOW_CLIENT_ID');
        authUrl =
          `https://app.signnow.com/api/oauth2/authorize?` +
          `response_type=code&` +
          `client_id=${signnowClientId}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `scope=user&` +
          `state=${state}`;
        break;

      case 'google_workspace':
        const googleClientId = this.config.get('GOOGLE_CLIENT_ID');
        authUrl =
          `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${googleClientId}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `response_type=code&` +
          `scope=https://www.googleapis.com/auth/drive.file%20https://www.googleapis.com/auth/gmail.send&` +
          `access_type=offline&` +
          `prompt=consent&` +
          `state=${state}`;
        break;

      default:
        throw new BadRequestException(`Unsupported provider: ${provider}`);
    }

    return { url: authUrl };
  }

  @Get('callback/:provider')
  @ApiOperation({ summary: 'OAuth callback endpoint' })
  @Redirect()
  async handleOAuthCallback(
    @Param('provider') provider: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error?: string,
  ): Promise<{ url: string }> {
    // Decode state to get tenantId and userId
    const { tenantId, userId } = JSON.parse(
      Buffer.from(state, 'base64').toString('utf-8'),
    );

    // Handle OAuth errors
    if (error) {
      return {
        url: `${this.config.get('FRONTEND_URL')}/dashboard/settings/e-signatures?error=${error}`,
      };
    }

    try {
      // Exchange code for access token
      const redirectUri = `${this.config.get('BACKEND_URL')}/api/v1/e-signature-connections/callback/${provider}`;

      let tokenData: {
        accessToken: string;
        refreshToken?: string;
        expiresAt?: Date;
        accountId?: string;
        email?: string;
        scopes: string[];
      };

      switch (provider) {
        case 'docusign':
          tokenData = await this.exchangeDocuSignCode(code, redirectUri);
          break;

        case 'adobe_sign':
          tokenData = await this.exchangeAdobeSignCode(code, redirectUri);
          break;

        case 'signnow':
          tokenData = await this.exchangeSignNowCode(code, redirectUri);
          break;

        case 'google_workspace':
          tokenData = await this.exchangeGoogleCode(code, redirectUri);
          break;

        default:
          throw new BadRequestException(`Unsupported provider: ${provider}`);
      }

      // Save the connection
      await this.connectionsService.upsertConnection(
        tenantId,
        provider,
        tokenData,
      );

      // Redirect back to frontend with success
      return {
        url: `${this.config.get('FRONTEND_URL')}/dashboard/settings/e-signatures?provider=${provider}&status=connected`,
      };
    } catch (err) {
      return {
        url: `${this.config.get('FRONTEND_URL')}/dashboard/settings/e-signatures?error=connection_failed`,
      };
    }
  }

  /**
   * Exchange DocuSign authorization code for access token
   */
  private async exchangeDocuSignCode(
    code: string,
    redirectUri: string,
  ): Promise<any> {
    const clientId = this.config.get('DOCUSIGN_CLIENT_ID');
    const clientSecret = this.config.get('DOCUSIGN_CLIENT_SECRET');

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
      'base64',
    );

    const response = await fetch('https://account-d.docusign.com/oauth/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error(`DocuSign token exchange failed: ${response.statusText}`);
    }

    const data = await response.json();

    // Get user info
    const userInfoResponse = await fetch(
      'https://account-d.docusign.com/oauth/userinfo',
      {
        headers: {
          Authorization: `Bearer ${data.access_token}`,
        },
      },
    );

    const userInfo = await userInfoResponse.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      accountId: userInfo.accounts?.[0]?.account_id,
      email: userInfo.email,
      scopes: data.scope?.split(' ') || [],
    };
  }

  /**
   * Exchange Adobe Sign authorization code for access token
   */
  private async exchangeAdobeSignCode(
    code: string,
    redirectUri: string,
  ): Promise<any> {
    const clientId = this.config.get('ADOBE_SIGN_CLIENT_ID');
    const clientSecret = this.config.get('ADOBE_SIGN_CLIENT_SECRET');

    const response = await fetch('https://api.na1.adobesign.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Adobe Sign token exchange failed: ${response.statusText}`,
      );
    }

    const data = await response.json();

    // Get user info
    const userInfoResponse = await fetch(
      'https://api.na1.adobesign.com/api/rest/v6/users/me',
      {
        headers: {
          Authorization: `Bearer ${data.access_token}`,
        },
      },
    );

    const userInfo = await userInfoResponse.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      accountId: userInfo.id,
      email: userInfo.email,
      scopes: ['agreement_write:account', 'agreement_read:account'],
    };
  }

  /**
   * Exchange SignNow authorization code for access token
   */
  private async exchangeSignNowCode(
    code: string,
    redirectUri: string,
  ): Promise<any> {
    const clientId = this.config.get('SIGNNOW_CLIENT_ID');
    const clientSecret = this.config.get('SIGNNOW_CLIENT_SECRET');

    const response = await fetch('https://api.signnow.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error(`SignNow token exchange failed: ${response.statusText}`);
    }

    const data = await response.json();

    // Get user info
    const userInfoResponse = await fetch('https://api.signnow.com/user', {
      headers: {
        Authorization: `Bearer ${data.access_token}`,
      },
    });

    const userInfo = await userInfoResponse.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined,
      accountId: userInfo.id,
      email: userInfo.email,
      scopes: data.scope?.split(' ') || ['user'],
    };
  }

  /**
   * Exchange Google authorization code for access token
   */
  private async exchangeGoogleCode(
    code: string,
    redirectUri: string,
  ): Promise<any> {
    const clientId = this.config.get('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get('GOOGLE_CLIENT_SECRET');

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      throw new Error(`Google token exchange failed: ${response.statusText}`);
    }

    const data = await response.json();

    // Get user info
    const userInfoResponse = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: {
          Authorization: `Bearer ${data.access_token}`,
        },
      },
    );

    const userInfo = await userInfoResponse.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      accountId: userInfo.id,
      email: userInfo.email,
      scopes: data.scope?.split(' ') || [],
    };
  }

  @Delete(':provider')
  @ApiOperation({ summary: 'Disconnect a provider' })
  @ApiResponse({ status: 200, description: 'Provider disconnected' })
  async disconnectProvider(
    @Param('provider') provider: string,
    @Request() req,
  ): Promise<{ message: string }> {
    const tenantId = req.user.tenantId;

    await this.connectionsService.disconnectProvider(tenantId, provider);

    return {
      message: `${provider} disconnected successfully`,
    };
  }

  @Post('webhooks/docusign')
  @ApiOperation({ summary: 'DocuSign webhook for envelope status updates' })
  async handleDocuSignWebhook(
    @Body() body: any,
    @Headers() headers: Record<string, string>,
    @Req() req: RawBodyRequest<ExpressRequest>,
  ): Promise<{ status: string }> {
    this.logger.log('Received DocuSign webhook:', JSON.stringify(body));

    // Validate webhook signature
    const signature = extractWebhookSignature(headers, 'docusign');
    if (!signature) {
      this.logger.warn('DocuSign webhook missing signature');
      throw new UnauthorizedException('Missing webhook signature');
    }

    const connectKey = this.config.get('DOCUSIGN_CONNECT_KEY');
    const payload = JSON.stringify(body);

    if (!validateDocuSignWebhook(payload, signature, connectKey)) {
      this.logger.error('DocuSign webhook signature validation failed');
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // Process webhook event
    const event = body.event;
    const envelopeId = body.data?.envelopeId || body.envelopeId;

    if (event === 'envelope-completed' && envelopeId) {
      this.logger.log(`DocuSign envelope ${envelopeId} completed`);
      // TODO: Update proposal status to 'signed' in database
      // await this.proposalsService.updateByEnvelopeId(envelopeId, { status: 'signed', clientSignedAt: new Date() });
    }

    return { status: 'ok' };
  }

  @Post('webhooks/adobe-sign')
  @ApiOperation({ summary: 'Adobe Sign webhook for agreement status updates' })
  async handleAdobeSignWebhook(
    @Body() body: any,
    @Headers() headers: Record<string, string>,
  ): Promise<{ status: string }> {
    this.logger.log('Received Adobe Sign webhook:', JSON.stringify(body));

    // Validate webhook signature
    const signature = extractWebhookSignature(headers, 'adobe_sign');
    if (signature) {
      const clientSecret = this.config.get('ADOBE_SIGN_CLIENT_SECRET');
      const payload = JSON.stringify(body);

      if (!validateAdobeSignWebhook(payload, signature, clientSecret)) {
        this.logger.error('Adobe Sign webhook signature validation failed');
        throw new UnauthorizedException('Invalid webhook signature');
      }
    }

    // Process webhook event
    const event = body.event;
    const agreementId = body.agreement?.id;

    if (event === 'AGREEMENT_WORKFLOW_COMPLETED' && agreementId) {
      this.logger.log(`Adobe Sign agreement ${agreementId} completed`);
      // TODO: Update proposal status
    }

    return { status: 'ok' };
  }

  @Post('webhooks/signnow')
  @ApiOperation({ summary: 'SignNow webhook for document status updates' })
  async handleSignNowWebhook(
    @Body() body: any,
    @Headers() headers: Record<string, string>,
  ): Promise<{ status: string }> {
    this.logger.log('Received SignNow webhook:', JSON.stringify(body));

    // Validate webhook signature
    const signature = extractWebhookSignature(headers, 'signnow');
    if (signature) {
      const apiToken = this.config.get('SIGNNOW_API_TOKEN');
      const payload = JSON.stringify(body);

      if (!validateSignNowWebhook(payload, signature, apiToken)) {
        this.logger.error('SignNow webhook signature validation failed');
        throw new UnauthorizedException('Invalid webhook signature');
      }
    }

    // Process webhook event
    const event = body.event_type;
    const documentId = body.document_id;

    if (event === 'document.signed' && documentId) {
      this.logger.log(`SignNow document ${documentId} completed`);
      // TODO: Update proposal status
    }

    return { status: 'ok' };
  }

  @Post('webhooks/google')
  @ApiOperation({ summary: 'Google webhook for document status updates' })
  async handleGoogleWebhook(
    @Body() body: any,
    @Headers() headers: Record<string, string>,
  ): Promise<{ status: string }> {
    this.logger.log('Received Google webhook:', JSON.stringify(body));

    // Validate webhook token
    const channelToken = extractWebhookSignature(headers, 'google_workspace');
    const expectedToken = this.config.get('GOOGLE_WEBHOOK_TOKEN');

    if (channelToken && expectedToken) {
      if (!validateGoogleWebhook(channelToken, expectedToken)) {
        this.logger.error('Google webhook token validation failed');
        throw new UnauthorizedException('Invalid webhook token');
      }
    }

    // Process webhook event
    const resourceState = headers['x-goog-resource-state'];
    const resourceId = headers['x-goog-resource-id'];

    if (resourceState === 'update' && resourceId) {
      this.logger.log(`Google Drive file ${resourceId} updated`);
      // TODO: Check if file has been signed and update proposal
    }

    return { status: 'ok' };
  }
}
