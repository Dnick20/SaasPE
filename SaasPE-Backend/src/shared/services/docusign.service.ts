import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as docusign from 'docusign-esign';
import {
  IESignatureProvider,
  CreateEnvelopeOptions,
  EnvelopeStatus,
} from '../interfaces/e-signature-provider.interface';

/**
 * DocuSign Service
 *
 * Handles DocuSign eSignature API integration:
 * - Create envelopes with documents
 * - Send for signature
 * - Check signature status
 * - Retrieve signed documents
 */
@Injectable()
export class DocuSignService implements IESignatureProvider {
  private readonly logger = new Logger(DocuSignService.name);
  private readonly apiClient: docusign.ApiClient;
  private readonly accountId: string;
  private readonly basePath: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: Date | null = null;

  constructor(private config: ConfigService) {
    this.clientId = this.config.get('DOCUSIGN_CLIENT_ID') || '';
    this.clientSecret = this.config.get('DOCUSIGN_CLIENT_SECRET') || '';
    this.accountId = this.config.get('DOCUSIGN_ACCOUNT_ID') || '';
    this.basePath =
      this.config.get('DOCUSIGN_BASE_PATH') ||
      'https://demo.docusign.net/restapi';

    if (!this.clientId || !this.clientSecret || !this.accountId) {
      this.logger.warn(
        'DocuSign credentials not configured. E-signature features will not work.',
      );
    }

    this.apiClient = new docusign.ApiClient();
    this.apiClient.setBasePath(this.basePath);

    this.logger.log('DocuSign Service initialized');
  }

  /**
   * Get OAuth access token (or use cached token if valid)
   * DocuSign uses OAuth 2.0 JWT Grant for server-to-server authentication
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid (with 5-minute buffer)
    if (this.accessToken && this.tokenExpiresAt) {
      const now = new Date();
      const bufferTime = 5 * 60 * 1000; // 5 minutes
      if (now.getTime() < this.tokenExpiresAt.getTime() - bufferTime) {
        return this.accessToken;
      }
    }

    try {
      // In production, you would use JWT Grant authentication
      // For now, we'll simulate with a placeholder
      // Real implementation would use: this.apiClient.requestJWTUserToken(...)

      this.logger.log('Requesting new DocuSign access token');

      // TODO: Implement actual JWT Grant authentication
      // const response = await this.apiClient.requestJWTUserToken(
      //   this.clientId,
      //   userId,
      //   scopes,
      //   privateKeyBytes,
      //   expiresIn
      // );

      // For development/testing, we'll use a placeholder
      this.accessToken = 'DOCUSIGN_ACCESS_TOKEN_PLACEHOLDER';
      this.tokenExpiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour

      return this.accessToken;
    } catch (error) {
      this.logger.error('Failed to get DocuSign access token:', error);
      throw error;
    }
  }

  /**
   * Create and send an envelope with a document for signature
   */
  async createAndSendEnvelope(options: CreateEnvelopeOptions): Promise<string> {
    try {
      this.logger.log(
        `Creating DocuSign envelope for ${options.recipientEmail}`,
      );

      const accessToken = await this.getAccessToken();
      this.apiClient.addDefaultHeader('Authorization', `Bearer ${accessToken}`);

      // Create envelope definition
      const envelopeDefinition = new docusign.EnvelopeDefinition();
      envelopeDefinition.emailSubject = options.emailSubject;
      envelopeDefinition.emailBlurb = options.emailBody || '';
      envelopeDefinition.status = 'sent'; // 'sent' immediately sends the envelope

      // Add document
      const document = new docusign.Document();
      document.documentBase64 = options.documentBase64;
      document.name = options.documentName;
      document.fileExtension = 'pdf';
      document.documentId = '1';
      envelopeDefinition.documents = [document];

      // Add recipient (signer)
      const signer = new docusign.Signer();
      signer.email = options.recipientEmail;
      signer.name = options.recipientName;
      signer.recipientId = '1';
      signer.routingOrder = '1';

      // Add signature tab (sign here field)
      const signHere = new docusign.SignHere();
      signHere.documentId = '1';
      signHere.pageNumber = '1';
      signHere.recipientId = '1';
      signHere.tabLabel = 'SignHereTab';
      signHere.xPosition = '100';
      signHere.yPosition = '100';

      const signHereTabs = [signHere];
      signer.tabs = new docusign.Tabs();
      signer.tabs.signHereTabs = signHereTabs;

      envelopeDefinition.recipients = new docusign.Recipients();
      envelopeDefinition.recipients.signers = [signer];

      // Create envelope via API
      const envelopesApi = new docusign.EnvelopesApi(this.apiClient);
      const results = await envelopesApi.createEnvelope(this.accountId, {
        envelopeDefinition,
      });

      const envelopeId = results.envelopeId;

      this.logger.log(`DocuSign envelope created successfully: ${envelopeId}`);

      return envelopeId;
    } catch (error) {
      this.logger.error('Failed to create DocuSign envelope:', error);
      throw error;
    }
  }

  /**
   * Get envelope status
   */
  async getEnvelopeStatus(envelopeId: string): Promise<EnvelopeStatus> {
    try {
      const accessToken = await this.getAccessToken();
      this.apiClient.addDefaultHeader('Authorization', `Bearer ${accessToken}`);

      const envelopesApi = new docusign.EnvelopesApi(this.apiClient);
      const envelope = await envelopesApi.getEnvelope(
        this.accountId,
        envelopeId,
      );

      return {
        envelopeId: envelope.envelopeId,
        status: envelope.status,
        sentDateTime: envelope.sentDateTime,
        deliveredDateTime: envelope.deliveredDateTime,
        signedDateTime: envelope.signedDateTime,
        completedDateTime: envelope.completedDateTime,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get envelope status for ${envelopeId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get signed document as base64
   */
  async getSignedDocument(
    envelopeId: string,
    documentId: string = '1',
  ): Promise<Buffer> {
    try {
      const accessToken = await this.getAccessToken();
      this.apiClient.addDefaultHeader('Authorization', `Bearer ${accessToken}`);

      const envelopesApi = new docusign.EnvelopesApi(this.apiClient);
      const document = await envelopesApi.getDocument(
        this.accountId,
        envelopeId,
        documentId,
      );

      // Convert to Buffer
      return Buffer.from(document, 'binary');
    } catch (error) {
      this.logger.error(
        `Failed to get signed document for envelope ${envelopeId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Void (cancel) an envelope
   */
  async voidEnvelope(envelopeId: string, reason: string): Promise<void> {
    try {
      const accessToken = await this.getAccessToken();
      this.apiClient.addDefaultHeader('Authorization', `Bearer ${accessToken}`);

      const envelopesApi = new docusign.EnvelopesApi(this.apiClient);
      await envelopesApi.update(this.accountId, envelopeId, {
        envelope: { status: 'voided', voidedReason: reason },
      });

      this.logger.log(`Envelope ${envelopeId} voided: ${reason}`);
    } catch (error) {
      this.logger.error(`Failed to void envelope ${envelopeId}:`, error);
      throw error;
    }
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return 'DocuSign';
  }
}
