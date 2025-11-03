import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SESClient,
  SendEmailCommand,
  SendRawEmailCommand,
  GetSendQuotaCommand,
  GetSendStatisticsCommand,
} from '@aws-sdk/client-ses';

export interface SendEmailOptions {
  from: string;
  to: string[];
  subject: string;
  htmlBody: string;
  textBody?: string;
  replyTo?: string;
  customHeaders?: Record<string, string>;
  tags?: Record<string, string>;
}

export interface SendEmailResult {
  messageId?: string;
  success: boolean;
  error?: string;
}

export interface SendQuota {
  max24HourSend: number;
  maxSendRate: number;
  sentLast24Hours: number;
}

@Injectable()
export class SesService {
  private readonly logger = new Logger(SesService.name);
  private readonly sesClient: SESClient;
  private readonly region: string;
  private readonly configurationSetName?: string;

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.get<string>('AWS_REGION') || 'us-east-1';
    this.configurationSetName = this.configService.get<string>(
      'AWS_SES_CONFIGURATION_SET',
    );

    this.sesClient = new SESClient({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') || '',
        secretAccessKey:
          this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || '',
      },
    });

    this.logger.log(`AWS SES Service initialized in region: ${this.region}`);
  }

  /**
   * Send an email via AWS SES
   */
  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    try {
      const command = new SendEmailCommand({
        Source: options.from,
        Destination: {
          ToAddresses: options.to,
        },
        Message: {
          Subject: {
            Data: options.subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: options.htmlBody,
              Charset: 'UTF-8',
            },
            Text: options.textBody
              ? {
                  Data: options.textBody,
                  Charset: 'UTF-8',
                }
              : undefined,
          },
        },
        ReplyToAddresses: options.replyTo ? [options.replyTo] : undefined,
        ConfigurationSetName: this.configurationSetName,
        Tags: options.tags
          ? Object.entries(options.tags).map(([Name, Value]) => ({
              Name,
              Value,
            }))
          : undefined,
      });

      const response = await this.sesClient.send(command);

      this.logger.log(
        `Email sent successfully to ${options.to.join(', ')}. MessageId: ${response.MessageId}`,
      );

      return {
        messageId: response.MessageId,
        success: true,
      };
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${options.to.join(', ')}`,
        error.stack,
      );
      return {
        messageId: undefined,
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send a raw email with tracking pixels for opens/clicks
   */
  async sendEmailWithTracking(
    options: SendEmailOptions,
    trackingId: string,
    trackingBaseUrl: string,
  ): Promise<SendEmailResult> {
    try {
      // Add tracking pixel for open tracking
      const trackingPixel = `<img src="${trackingBaseUrl}/track/open/${trackingId}" width="1" height="1" alt="" style="display:none;" />`;

      // Inject tracking pixel before closing </body> tag
      let htmlBody = options.htmlBody;
      if (htmlBody.includes('</body>')) {
        htmlBody = htmlBody.replace('</body>', `${trackingPixel}</body>`);
      } else {
        htmlBody += trackingPixel;
      }

      // Replace links with tracked links for click tracking
      htmlBody = this.wrapLinksWithTracking(
        htmlBody,
        trackingId,
        trackingBaseUrl,
      );

      // Build raw email
      const rawEmail = this.buildRawEmail({
        ...options,
        htmlBody,
      });

      const command = new SendRawEmailCommand({
        RawMessage: {
          Data: Buffer.from(rawEmail),
        },
        ConfigurationSetName: this.configurationSetName,
        Tags: options.tags
          ? Object.entries(options.tags).map(([Name, Value]) => ({
              Name,
              Value,
            }))
          : undefined,
      });

      const response = await this.sesClient.send(command);

      this.logger.log(
        `Email with tracking sent to ${options.to.join(', ')}. MessageId: ${response.MessageId}`,
      );

      return {
        messageId: response.MessageId,
        success: true,
      };
    } catch (error) {
      this.logger.error(
        `Failed to send tracked email to ${options.to.join(', ')}`,
        error.stack,
      );
      return {
        messageId: undefined,
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get current SES send quota
   */
  async getSendQuota(): Promise<SendQuota> {
    try {
      const command = new GetSendQuotaCommand({});
      const response = await this.sesClient.send(command);

      return {
        max24HourSend: response.Max24HourSend || 0,
        maxSendRate: response.MaxSendRate || 0,
        sentLast24Hours: response.SentLast24Hours || 0,
      };
    } catch (error) {
      this.logger.error('Failed to get SES send quota', error.stack);
      throw error;
    }
  }

  /**
   * Get SES send statistics
   */
  async getSendStatistics(): Promise<any> {
    try {
      const command = new GetSendStatisticsCommand({});
      const response = await this.sesClient.send(command);
      return response.SendDataPoints || [];
    } catch (error) {
      this.logger.error('Failed to get SES statistics', error.stack);
      throw error;
    }
  }

  /**
   * Wrap all links in HTML with tracking redirects
   */
  private wrapLinksWithTracking(
    html: string,
    trackingId: string,
    trackingBaseUrl: string,
  ): string {
    // Match all <a href="..."> tags
    const linkRegex = /<a\s+([^>]*href=["']([^"']+)["'][^>]*)>/gi;

    return html.replace(linkRegex, (match, attributes, url) => {
      // Skip if URL is already a tracking URL
      if (url.includes('/track/click/')) {
        return match;
      }

      // Skip mailto: and tel: links
      if (url.startsWith('mailto:') || url.startsWith('tel:')) {
        return match;
      }

      // Encode the original URL
      const encodedUrl = encodeURIComponent(url);

      // Create tracked URL
      const trackedUrl = `${trackingBaseUrl}/track/click/${trackingId}?url=${encodedUrl}`;

      // Replace the href attribute
      return `<a ${attributes.replace(url, trackedUrl)}>`;
    });
  }

  /**
   * Build a raw RFC 822 email message
   */
  private buildRawEmail(options: SendEmailOptions): string {
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    let rawEmail = '';

    // Headers
    rawEmail += `From: ${options.from}\r\n`;
    rawEmail += `To: ${options.to.join(', ')}\r\n`;
    rawEmail += `Subject: ${options.subject}\r\n`;

    if (options.replyTo) {
      rawEmail += `Reply-To: ${options.replyTo}\r\n`;
    }

    // Custom headers
    if (options.customHeaders) {
      for (const [key, value] of Object.entries(options.customHeaders)) {
        rawEmail += `${key}: ${value}\r\n`;
      }
    }

    rawEmail += `MIME-Version: 1.0\r\n`;
    rawEmail += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n`;
    rawEmail += `\r\n`;

    // Text part
    if (options.textBody) {
      rawEmail += `--${boundary}\r\n`;
      rawEmail += `Content-Type: text/plain; charset=UTF-8\r\n`;
      rawEmail += `Content-Transfer-Encoding: 7bit\r\n`;
      rawEmail += `\r\n`;
      rawEmail += `${options.textBody}\r\n`;
      rawEmail += `\r\n`;
    }

    // HTML part
    rawEmail += `--${boundary}\r\n`;
    rawEmail += `Content-Type: text/html; charset=UTF-8\r\n`;
    rawEmail += `Content-Transfer-Encoding: 7bit\r\n`;
    rawEmail += `\r\n`;
    rawEmail += `${options.htmlBody}\r\n`;
    rawEmail += `\r\n`;

    // End boundary
    rawEmail += `--${boundary}--\r\n`;

    return rawEmail;
  }

  /**
   * Verify that an email address is verified in SES
   * (In production, you'd want to check SES identities)
   */
  async isEmailVerified(email: string): Promise<boolean> {
    // For development, always return true
    // In production, use ListVerifiedEmailAddressesCommand or ListIdentitiesCommand
    if (this.configService.get<string>('NODE_ENV') === 'development') {
      return true;
    }

    // TODO: Implement actual SES identity verification check
    return true;
  }
}
