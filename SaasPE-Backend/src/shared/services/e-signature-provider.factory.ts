import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { IESignatureProvider } from '../interfaces/e-signature-provider.interface';
import { DocuSignService } from './docusign.service';
import { AdobeSignService } from './adobe-sign.service';
import { SignNowService } from './signnow.service';
import { GoogleWorkspaceSignatureService } from './google-workspace-signature.service';

export type ESignatureProviderType =
  | 'docusign'
  | 'adobe_sign'
  | 'signnow'
  | 'google_workspace';

/**
 * E-Signature Provider Factory
 *
 * Creates instances of e-signature providers based on tenant settings
 */
@Injectable()
export class ESignatureProviderFactory {
  private readonly logger = new Logger(ESignatureProviderFactory.name);

  constructor(
    private readonly docuSignService: DocuSignService,
    private readonly adobeSignService: AdobeSignService,
    private readonly signNowService: SignNowService,
    private readonly googleWorkspaceService: GoogleWorkspaceSignatureService,
  ) {}

  /**
   * Get provider instance based on provider type
   */
  getProvider(providerType: ESignatureProviderType): IESignatureProvider {
    this.logger.log(`Creating provider instance for: ${providerType}`);

    switch (providerType) {
      case 'docusign':
        return this.docuSignService;

      case 'adobe_sign':
        return this.adobeSignService;

      case 'signnow':
        return this.signNowService;

      case 'google_workspace':
        return this.googleWorkspaceService;

      default:
        throw new BadRequestException(
          `Unsupported e-signature provider: ${providerType}`,
        );
    }
  }

  /**
   * Get list of available providers with metadata
   */
  getAvailableProviders() {
    return [
      {
        id: 'docusign',
        name: 'DocuSign',
        description:
          'Industry-leader, broad features, strong integrations (400+ apps)',
        pros: [
          'Most widely recognized and trusted',
          'Extensive integrations (Google Workspace, Salesforce, etc.)',
          'Advanced features (templates, bulk send, custom branding)',
          'Comprehensive audit trails and compliance (SOC 2, HIPAA)',
        ],
        cons: [
          'Higher cost (~$10-40/user/month)',
          'May be overkill for simple contracts',
          'Steeper learning curve',
        ],
        pricing: 'From $10-40/user/month',
        recommended: true,
      },
      {
        id: 'adobe_sign',
        name: 'Adobe Acrobat Sign',
        description:
          'Excellent PDF integration, strong brand/templating, good Microsoft/Adobe ecosystem',
        pros: [
          'Seamless integration with Adobe Creative Cloud & Acrobat',
          'Strong Microsoft ecosystem integration',
          'Good templating and workflow automation',
          'Trusted Adobe brand',
        ],
        cons: [
          'More complex setup and configuration',
          'Higher cost (~$12.99-29.99/user/month)',
          'May require Adobe ecosystem for full value',
        ],
        pricing: 'From $12.99/user/month',
        recommended: false,
      },
      {
        id: 'signnow',
        name: 'SignNow (by airSlate)',
        description:
          'Budget-friendly option with good business workflow features',
        pros: [
          'Very affordable (~$8-15/user/month)',
          'Good for standard business workflows',
          'Easy to use interface',
          'Unlimited signatures on most plans',
        ],
        cons: [
          'Fewer integrations compared to DocuSign/Adobe',
          'May lack advanced customization options',
          'Less recognized brand',
        ],
        pricing: 'From $8/user/month',
        recommended: false,
      },
      {
        id: 'google_workspace',
        name: 'Google Workspace eSignature',
        description:
          'Built-in signatures in Google Docs/Drive, no separate system required',
        pros: [
          'No additional cost if already using Google Workspace',
          'Very low friction - integrated into existing workflow',
          'Simple and familiar interface',
          'No separate login or system to manage',
        ],
        cons: [
          'Basic feature set compared to dedicated solutions',
          'Limited audit trail and compliance features',
          'No bulk send or advanced workflows',
          'May not be sufficient for complex contracts',
        ],
        pricing: 'Included with Google Workspace',
        recommended: false,
      },
    ];
  }
}
