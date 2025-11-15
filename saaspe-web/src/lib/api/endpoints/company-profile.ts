import { apiClient } from '../client';

export interface CompanyProfile {
  id: string;
  companyName: string;
  website?: string;
  industry?: string;
  targetICP?: string;
  preferredTone?: 'professional' | 'friendly' | 'consultative' | 'casual';
  enrichmentData?: {
    description?: string;
    services?: string[];
    industry?: string;
    valueProposition?: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface WebsiteAnalysisResult {
  description: string;
  services: string[];
  industry: string;
  valueProposition?: string;
}

export const companyProfileApi = {
  /**
   * Get company profile
   */
  get: async (): Promise<CompanyProfile> => {
    const response = await apiClient.get<CompanyProfile>('/api/v1/company-profile');
    return response.data;
  },

  /**
   * Create company profile
   */
  create: async (data: Partial<CompanyProfile>) => {
    return apiClient.post<CompanyProfile>('/api/v1/company-profile', data);
  },

  /**
   * Update company profile
   */
  update: async (data: Partial<CompanyProfile>) => {
    return apiClient.patch<CompanyProfile>('/api/v1/company-profile', data);
  },

  /**
   * Analyze website using AI
   */
  analyzeWebsite: async (url: string) => {
    return apiClient.post<WebsiteAnalysisResult>('/api/v1/company-profile/analyze-website', { url });
  },

  /**
   * Get default company profile based on tenant settings
   */
  getDefaults: async () => {
    const response = await apiClient.get('/api/v1/company-profile/defaults');
    return response.data;
  },

  /**
   * Delete company profile
   */
  delete: async () => {
    return apiClient.delete('/api/v1/company-profile');
  },
};
