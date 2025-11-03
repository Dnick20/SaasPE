import { apiClient } from '../client';

export type ESignatureProvider = 'docusign' | 'adobe_sign' | 'signnow' | 'google_workspace';
export type LogoPosition = 'header' | 'cover-only';

export interface TenantBranding {
  id: string;
  tenantId: string;
  logoS3Key?: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;
  fontFamily: string;
  headingFont: string;
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyWebsite?: string;
  companyTagline?: string;
  footerText?: string;
  logoPosition: LogoPosition;
  eSignatureProvider: ESignatureProvider;
  created: string;
  updated: string;
}

export interface UpdateTenantBrandingDto {
  logoS3Key?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
  headingFont?: string;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyWebsite?: string;
  companyTagline?: string;
  footerText?: string;
  logoPosition?: LogoPosition;
  eSignatureProvider?: ESignatureProvider;
}

export const tenantBrandingApi = {
  /**
   * Get tenant branding
   */
  get: async (): Promise<TenantBranding | null> => {
    const response = await apiClient.get<TenantBranding>('/api/v1/tenant-branding');
    return response.data;
  },

  /**
   * Update tenant branding
   */
  update: async (data: UpdateTenantBrandingDto): Promise<TenantBranding> => {
    const response = await apiClient.patch<TenantBranding>('/api/v1/tenant-branding', data);
    return response.data;
  },

  /**
   * Create tenant branding
   */
  create: async (data: UpdateTenantBrandingDto): Promise<TenantBranding> => {
    const response = await apiClient.post<TenantBranding>('/api/v1/tenant-branding', data);
    return response.data;
  },

  /**
   * Update e-signature provider
   */
  updateESignatureProvider: async (provider: ESignatureProvider): Promise<TenantBranding> => {
    const response = await apiClient.patch<TenantBranding>('/api/v1/tenant-branding', {
      eSignatureProvider: provider,
    });
    return response.data;
  },
};
