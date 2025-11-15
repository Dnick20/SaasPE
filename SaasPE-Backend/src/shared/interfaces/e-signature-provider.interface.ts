/**
 * E-Signature Provider Interface
 *
 * Abstraction for different e-signature providers (DocuSign, Adobe Sign, SignNow, Google Workspace)
 */

export interface CreateEnvelopeOptions {
  documentBase64: string;
  documentName: string;
  recipientEmail: string;
  recipientName: string;
  emailSubject: string;
  emailBody?: string;
}

export interface EnvelopeStatus {
  envelopeId: string;
  status: string; // 'sent' | 'delivered' | 'signed' | 'completed' | 'declined' | 'voided'
  sentDateTime?: string;
  deliveredDateTime?: string;
  signedDateTime?: string;
  completedDateTime?: string;
  recipients?: any[];
}

export interface IESignatureProvider {
  /**
   * Create and send an envelope with a document for signature
   */
  createAndSendEnvelope(options: CreateEnvelopeOptions): Promise<string>;

  /**
   * Get envelope status
   */
  getEnvelopeStatus(envelopeId: string): Promise<EnvelopeStatus>;

  /**
   * Get signed document as buffer
   */
  getSignedDocument(envelopeId: string, documentId?: string): Promise<Buffer>;

  /**
   * Void (cancel) an envelope
   */
  voidEnvelope(envelopeId: string, reason: string): Promise<void>;

  /**
   * Get provider name
   */
  getProviderName(): string;
}
