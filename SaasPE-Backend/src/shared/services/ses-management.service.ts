import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SESv2Client,
  GetEmailIdentityCommand,
  CreateEmailIdentityCommand,
  PutEmailIdentityMailFromAttributesCommand,
} from '@aws-sdk/client-sesv2';

@Injectable()
export class SesManagementService {
  private readonly logger = new Logger(SesManagementService.name);
  private readonly region: string;
  private readonly sesv2: SESv2Client;

  constructor(private readonly config: ConfigService) {
    this.region = this.config.get<string>('AWS_REGION') || 'us-east-1';
    this.sesv2 = new SESv2Client({
      region: this.region,
      credentials: {
        accessKeyId: this.config.get<string>('AWS_ACCESS_KEY_ID') || '',
        secretAccessKey: this.config.get<string>('AWS_SECRET_ACCESS_KEY') || '',
      },
    });
  }

  /**
   * Ensure SES domain identity exists (stub for now). Should create identity and return DKIM tokens.
   */
  async ensureDomainIdentity(domain: string): Promise<{ dkimTokens: string[] }> {
    this.logger.log(`Ensuring SES domain identity for ${domain} in ${this.region}`);

    const existing = await this.safelyGetIdentity(domain);
    if (existing?.DkimAttributes?.Tokens && existing.DkimAttributes.Tokens.length > 0) {
      return { dkimTokens: existing.DkimAttributes.Tokens as string[] };
    }

    // Create identity with Easy DKIM
    const createRes = await this.sesv2.send(
      new CreateEmailIdentityCommand({
        EmailIdentity: domain,
        DkimSigningAttributes: { NextSigningKeyLength: 'RSA_2048_BIT' },
      }),
    );

    const tokens = (createRes.DkimAttributes?.Tokens || []) as string[];
    return { dkimTokens: tokens };
  }

  /**
   * Configure custom MAIL FROM domain (stub). Should call SES SetIdentityMailFromDomain / SESv2 equivalent.
   */
  async configureMailFrom(domain: string, mailFromSubdomain: string): Promise<void> {
    this.logger.log(`Configuring MAIL FROM for ${domain} -> ${mailFromSubdomain}.${domain}`);
    await this.sesv2.send(
      new PutEmailIdentityMailFromAttributesCommand({
        EmailIdentity: domain,
        MailFromDomain: `${mailFromSubdomain}.${domain}`,
        BehaviorOnMxFailure: 'USE_DEFAULT_VALUE',
      }),
    );
  }

  /**
   * Get identity status (stub). Should return verification and DKIM status.
   */
  async getIdentityStatus(domain: string): Promise<{ verified: boolean; dkimStatus?: string }> {
    this.logger.log(`Fetching SES identity status for ${domain}`);
    const identity = await this.safelyGetIdentity(domain);
    const verified = Boolean(identity?.VerifiedForSendingStatus);
    const dkimStatus = identity?.DkimAttributes?.Status;
    return { verified, dkimStatus };
  }

  private async safelyGetIdentity(domain: string) {
    try {
      const res = await this.sesv2.send(new GetEmailIdentityCommand({ EmailIdentity: domain }));
      return res;
    } catch (e) {
      return undefined;
    }
  }
}


