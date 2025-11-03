import { apiClient } from '../client';

export interface ESignatureAnalytics {
  totalConnections: number;
  activeConnections: number;
  connectionsByProvider: Record<string, number>;
  totalEnvelopesSent: number;
  totalEnvelopesSigned: number;
  signatureCompletionRate: number;
  averageSigningTime: number | null; // in hours
  recentActivity: Array<{
    date: string;
    envelopesSent: number;
    envelopesSigned: number;
  }>;
  topProviders: Array<{
    provider: string;
    count: number;
    percentage: number;
  }>;
}

export const eSignatureAnalyticsApi = {
  /**
   * Get e-signature analytics
   */
  getAnalytics: async (): Promise<ESignatureAnalytics> => {
    const response = await apiClient.get<ESignatureAnalytics>('/api/v1/e-signature-connections/analytics');
    return response.data;
  },
};
