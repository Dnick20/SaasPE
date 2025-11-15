import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  retryWithBackoff,
  isRetryableError,
} from '../../shared/utils/retry.util';

@Injectable()
export class WebhookRegistrationService {
  private readonly logger = new Logger(WebhookRegistrationService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Register webhooks with provider after successful OAuth connection
   */
  async registerWebhooks(
    provider: string,
    accessToken: string,
    accountId: string,
  ): Promise<void> {
    this.logger.log(`Registering webhooks for ${provider}`);

    try {
      switch (provider) {
        case 'docusign':
          await this.registerDocuSignWebhook(accessToken, accountId);
          break;
        case 'adobe_sign':
          await this.registerAdobeSignWebhook(accessToken);
          break;
        case 'signnow':
          await this.registerSignNowWebhook(accessToken);
          break;
        case 'google_workspace':
          await this.registerGoogleWebhook(accessToken);
          break;
        default:
          this.logger.warn(`No webhook registration for provider: ${provider}`);
      }
    } catch (error) {
      this.logger.error(`Failed to register webhooks for ${provider}:`, error);
      // Don't throw - webhook registration failure shouldn't block connection
    }
  }

  /**
   * Register DocuSign Connect webhook
   */
  private async registerDocuSignWebhook(
    accessToken: string,
    accountId: string,
  ): Promise<void> {
    const webhookUrl = `${this.config.get('BACKEND_URL')}/api/v1/e-signature-connections/webhooks/docusign`;

    await retryWithBackoff(
      async () => {
        const response = await fetch(
          `https://demo.docusign.net/restapi/v2.1/accounts/${accountId}/connect`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: 'SaasPE Proposal Signatures',
              urlToPublishTo: webhookUrl,
              allUsers: 'true',
              includeEnvelopeVoidReason: 'true',
              includeTimeZoneInformation: 'true',
              envelopeEvents: [
                'envelope-completed',
                'envelope-sent',
                'envelope-voided',
              ],
              recipientEvents: ['recipient-completed'],
              configurationType: 'custom',
            }),
          },
        );

        if (!response.ok) {
          throw new Error(
            `DocuSign webhook registration failed: ${response.statusText}`,
          );
        }

        this.logger.log('DocuSign webhook registered successfully');
      },
      { maxRetries: 3, shouldRetry: isRetryableError },
    );
  }

  /**
   * Register Adobe Sign webhook
   */
  private async registerAdobeSignWebhook(accessToken: string): Promise<void> {
    const webhookUrl = `${this.config.get('BACKEND_URL')}/api/v1/e-signature-connections/webhooks/adobe-sign`;

    await retryWithBackoff(
      async () => {
        const response = await fetch(
          'https://api.na1.adobesign.com/api/rest/v6/webhooks',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: 'SaasPE Proposal Signatures',
              scope: 'ACCOUNT',
              state: 'ACTIVE',
              webhookSubscriptionEvents: [
                'AGREEMENT_WORKFLOW_COMPLETED',
                'AGREEMENT_CREATED',
              ],
              webhookUrlInfo: {
                url: webhookUrl,
              },
            }),
          },
        );

        if (!response.ok) {
          throw new Error(
            `Adobe Sign webhook registration failed: ${response.statusText}`,
          );
        }

        this.logger.log('Adobe Sign webhook registered successfully');
      },
      { maxRetries: 3, shouldRetry: isRetryableError },
    );
  }

  /**
   * Register SignNow webhook
   */
  private async registerSignNowWebhook(accessToken: string): Promise<void> {
    const webhookUrl = `${this.config.get('BACKEND_URL')}/api/v1/e-signature-connections/webhooks/signnow`;

    await retryWithBackoff(
      async () => {
        const response = await fetch(
          'https://api.signnow.com/event_subscription',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              event: 'document.signed',
              callback_url: webhookUrl,
            }),
          },
        );

        if (!response.ok) {
          throw new Error(
            `SignNow webhook registration failed: ${response.statusText}`,
          );
        }

        this.logger.log('SignNow webhook registered successfully');
      },
      { maxRetries: 3, shouldRetry: isRetryableError },
    );
  }

  /**
   * Register Google Drive push notification
   */
  private async registerGoogleWebhook(accessToken: string): Promise<void> {
    const webhookUrl = `${this.config.get('BACKEND_URL')}/api/v1/e-signature-connections/webhooks/google`;
    const channelId = `saaspe-${Date.now()}`;
    const channelToken =
      this.config.get('GOOGLE_WEBHOOK_TOKEN') || 'secure-token';

    await retryWithBackoff(
      async () => {
        const response = await fetch(
          'https://www.googleapis.com/drive/v3/files/watch',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: channelId,
              type: 'web_hook',
              address: webhookUrl,
              token: channelToken,
            }),
          },
        );

        if (!response.ok) {
          throw new Error(
            `Google webhook registration failed: ${response.statusText}`,
          );
        }

        this.logger.log(
          'Google Drive push notification registered successfully',
        );
      },
      { maxRetries: 3, shouldRetry: isRetryableError },
    );
  }

  /**
   * Unregister webhooks when disconnecting
   */
  async unregisterWebhooks(
    provider: string,
    accessToken: string,
    webhookId?: string,
  ): Promise<void> {
    this.logger.log(`Unregistering webhooks for ${provider}`);

    try {
      switch (provider) {
        case 'docusign':
          if (webhookId) {
            await this.unregisterDocuSignWebhook(accessToken, webhookId);
          }
          break;
        case 'adobe_sign':
          if (webhookId) {
            await this.unregisterAdobeSignWebhook(accessToken, webhookId);
          }
          break;
        case 'signnow':
          if (webhookId) {
            await this.unregisterSignNowWebhook(accessToken, webhookId);
          }
          break;
        default:
          this.logger.warn(
            `No webhook unregistration for provider: ${provider}`,
          );
      }
    } catch (error) {
      this.logger.error(
        `Failed to unregister webhooks for ${provider}:`,
        error,
      );
    }
  }

  private async unregisterDocuSignWebhook(
    accessToken: string,
    webhookId: string,
  ): Promise<void> {
    // Implementation for unregistering DocuSign webhook
    this.logger.log(`Unregistering DocuSign webhook ${webhookId}`);
  }

  private async unregisterAdobeSignWebhook(
    accessToken: string,
    webhookId: string,
  ): Promise<void> {
    // Implementation for unregistering Adobe Sign webhook
    this.logger.log(`Unregistering Adobe Sign webhook ${webhookId}`);
  }

  private async unregisterSignNowWebhook(
    accessToken: string,
    webhookId: string,
  ): Promise<void> {
    // Implementation for unregistering SignNow webhook
    this.logger.log(`Unregistering SignNow webhook ${webhookId}`);
  }
}
