import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SignatureNotificationData {
  proposalId: string;
  proposalTitle: string;
  clientName: string;
  clientEmail: string;
  agencyName: string;
  envelopeId: string;
  provider: string;
  signedAt: Date;
  proposalUrl: string;
}

@Injectable()
export class EmailNotificationService {
  private readonly logger = new Logger(EmailNotificationService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Send email notification when proposal is sent for signature
   */
  async notifyProposalSentForSignature(data: {
    proposalId: string;
    proposalTitle: string;
    clientName: string;
    clientEmail: string;
    agencyName: string;
    envelopeId: string;
    provider: string;
    proposalUrl: string;
  }): Promise<void> {
    this.logger.log(
      `Sending proposal sent notification for ${data.proposalId}`,
    );

    const subject = `Proposal "${data.proposalTitle}" sent for signature`;
    const body = `
      <h2>Proposal Sent for E-Signature</h2>
      <p>Your proposal has been successfully sent to ${data.clientName} for signature.</p>

      <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Proposal:</strong> ${data.proposalTitle}</p>
        <p><strong>Client:</strong> ${data.clientName} (${data.clientEmail})</p>
        <p><strong>Provider:</strong> ${this.getProviderDisplayName(data.provider)}</p>
        <p><strong>Envelope ID:</strong> ${data.envelopeId}</p>
      </div>

      <p>You will receive a notification when the client signs the proposal.</p>

      <p>
        <a href="${data.proposalUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          View Proposal
        </a>
      </p>

      <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
        This is an automated notification from ${data.agencyName}.
      </p>
    `;

    await this.sendEmail({
      to: [], // Agency email would be added here
      subject,
      html: body,
    });
  }

  /**
   * Send email notification when client signs proposal
   */
  async notifyProposalSigned(data: SignatureNotificationData): Promise<void> {
    this.logger.log(
      `Sending proposal signed notification for ${data.proposalId}`,
    );

    const subject = `🎉 Proposal "${data.proposalTitle}" has been signed!`;
    const body = `
      <h2 style="color: #10b981;">Proposal Signed Successfully!</h2>
      <p>Great news! ${data.clientName} has signed your proposal.</p>

      <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Proposal:</strong> ${data.proposalTitle}</p>
        <p><strong>Client:</strong> ${data.clientName} (${data.clientEmail})</p>
        <p><strong>Signed at:</strong> ${data.signedAt.toLocaleString()}</p>
        <p><strong>Provider:</strong> ${this.getProviderDisplayName(data.provider)}</p>
      </div>

      <p>The signed document is now available in the proposal details.</p>

      <p>
        <a href="${data.proposalUrl}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          View Signed Proposal
        </a>
      </p>

      <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
        This is an automated notification from ${data.agencyName}.
      </p>
    `;

    await this.sendEmail({
      to: [], // Agency email would be added here
      subject,
      html: body,
    });
  }

  /**
   * Send reminder when proposal hasn't been signed within timeframe
   */
  async sendSignatureReminder(data: {
    proposalId: string;
    proposalTitle: string;
    clientName: string;
    clientEmail: string;
    agencyName: string;
    daysSinceSent: number;
    proposalUrl: string;
  }): Promise<void> {
    this.logger.log(`Sending signature reminder for ${data.proposalId}`);

    const subject = `Reminder: Proposal "${data.proposalTitle}" awaiting signature`;
    const body = `
      <h2>Signature Reminder</h2>
      <p>Your proposal has been waiting for signature for ${data.daysSinceSent} days.</p>

      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Proposal:</strong> ${data.proposalTitle}</p>
        <p><strong>Client:</strong> ${data.clientName} (${data.clientEmail})</p>
        <p><strong>Sent:</strong> ${data.daysSinceSent} days ago</p>
      </div>

      <p>You may want to follow up with ${data.clientName} to ensure they received the signature request.</p>

      <p>
        <a href="${data.proposalUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          View Proposal
        </a>
      </p>

      <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
        This is an automated reminder from ${data.agencyName}.
      </p>
    `;

    await this.sendEmail({
      to: [], // Agency email would be added here
      subject,
      html: body,
    });
  }

  /**
   * Send actual email (integrate with SendGrid, AWS SES, etc.)
   */
  private async sendEmail(options: {
    to: string[];
    subject: string;
    html: string;
  }): Promise<void> {
    // In production, integrate with email service (SendGrid, AWS SES, etc.)
    this.logger.log(
      `Would send email: ${options.subject} to ${options.to.join(', ')}`,
    );

    // Example SendGrid integration:
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(this.config.get('SENDGRID_API_KEY'));
    // await sgMail.send({
    //   to: options.to,
    //   from: this.config.get('FROM_EMAIL'),
    //   subject: options.subject,
    //   html: options.html,
    // });
  }

  /**
   * Get display name for provider
   */
  private getProviderDisplayName(provider: string): string {
    const names: Record<string, string> = {
      docusign: 'DocuSign',
      adobe_sign: 'Adobe Acrobat Sign',
      signnow: 'SignNow',
      google_workspace: 'Google Workspace',
    };
    return names[provider] || provider;
  }
}
