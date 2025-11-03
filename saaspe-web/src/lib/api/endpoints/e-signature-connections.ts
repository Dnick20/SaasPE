import { apiClient } from '../client';

export type ESignatureProvider = 'docusign' | 'adobe_sign' | 'signnow' | 'google_workspace';

export interface ConnectionStatus {
  provider: ESignatureProvider;
  displayName: string;
  isConnected: boolean;
  connectedEmail?: string;
  connectedAt?: string;
  expiresAt?: string;
  accountId?: string;
  scopes?: string[];
}

export interface ProviderInfo {
  name: ESignatureProvider;
  displayName: string;
  description: string;
  logo: string;
  pricing: string;
  features: string[];
  pros: string[];
  cons: string[];
  bestFor: string;
}

export const eSignatureConnectionsApi = {
  /**
   * Get connection status for all providers
   */
  getConnectionStatuses: async (): Promise<ConnectionStatus[]> => {
    const response = await apiClient.get<ConnectionStatus[]>('/api/v1/e-signature-connections/status');
    return response.data;
  },

  /**
   * Initiate OAuth flow for a provider
   * This will redirect the user to the provider's OAuth consent page
   */
  connectProvider: async (provider: ESignatureProvider): Promise<{ url: string }> => {
    const response = await apiClient.get<{ url: string }>(`/api/v1/e-signature-connections/connect/${provider}`);
    return response.data;
  },

  /**
   * Disconnect a provider
   */
  disconnectProvider: async (provider: ESignatureProvider): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/api/v1/e-signature-connections/${provider}`);
    return response.data;
  },

  /**
   * Get available providers with comparison information
   */
  getAvailableProviders: (): ProviderInfo[] => {
    return [
      {
        name: 'docusign',
        displayName: 'DocuSign',
        description: 'Industry-leading e-signature solution with comprehensive features',
        logo: '/logos/docusign.svg',
        pricing: '$10-40/month',
        features: [
          'Legally binding signatures',
          'Mobile app support',
          'Advanced authentication',
          'Template management',
          'Audit trails',
        ],
        pros: [
          'Most recognized brand',
          'Extensive integrations',
          'Strong security features',
        ],
        cons: [
          'Higher pricing',
          'Complex setup for advanced features',
        ],
        bestFor: 'Enterprise and high-volume users',
      },
      {
        name: 'adobe_sign',
        displayName: 'Adobe Acrobat Sign',
        description: 'PDF-native e-signature with Adobe Creative Cloud integration',
        logo: '/logos/adobe.svg',
        pricing: '$12.99+/month',
        features: [
          'PDF form conversion',
          'Creative Cloud integration',
          'Bulk send',
          'Custom branding',
          'Real-time tracking',
        ],
        pros: [
          'Excellent PDF handling',
          'Adobe ecosystem integration',
          'User-friendly interface',
        ],
        cons: [
          'Requires Adobe account',
          'Limited mobile features',
        ],
        bestFor: 'Creative agencies and PDF-heavy workflows',
      },
      {
        name: 'signnow',
        displayName: 'SignNow',
        description: 'Budget-friendly e-signature with essential features',
        logo: '/logos/signnow.svg',
        pricing: '$8-15/month',
        features: [
          'Unlimited signatures',
          'Template library',
          'In-person signing',
          'Document merging',
          'Reminders',
        ],
        pros: [
          'Affordable pricing',
          'Simple interface',
          'Good API',
        ],
        cons: [
          'Fewer integrations',
          'Limited advanced features',
        ],
        bestFor: 'Small businesses and startups',
      },
      {
        name: 'google_workspace',
        displayName: 'Google Workspace',
        description: 'Basic e-signature using Google Drive and Gmail',
        logo: '/logos/google.svg',
        pricing: 'Included with Google Workspace',
        features: [
          'Google Drive integration',
          'Gmail send',
          'Basic signatures',
          'Free for Workspace users',
        ],
        pros: [
          'Free with Google Workspace',
          'Familiar interface',
          'Easy setup',
        ],
        cons: [
          'Limited features',
          'Not a dedicated e-signature platform',
          'Basic compliance only',
        ],
        bestFor: 'Google Workspace users with basic needs',
      },
    ];
  },
};
