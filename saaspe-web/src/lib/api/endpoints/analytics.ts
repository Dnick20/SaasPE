import { apiClient } from '../client';

export interface DashboardMetrics {
  totalClients: number;
  activeProposals: number;
  totalTranscriptions: number;
  campaignsSent: number;
  responseRate: number;
  aiCostsThisMonth: number;
  clientsThisMonth: number;
  proposalsThisMonth: number;
  transcriptionsThisMonth: number;
  changes: {
    clients: number;
    proposals: number;
    transcriptions: number;
    campaigns: number;
    responseRate: number;
  };
}

export interface ActivityItem {
  id: string;
  type: 'client_created' | 'proposal_generated' | 'transcription_analyzed' | 'campaign_sent';
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface AnalyticsMetrics {
  totalClients: number;
  totalProposals: number;
  totalTranscriptions: number;
  totalCampaigns: number;
  averageResponseRate: number;
  totalAiCosts: number;
  aiCostsBreakdown: {
    proposals: number;
    transcriptions: number;
    keyMoments: number;
  };
  timeSeriesData: {
    date: string;
    clients: number;
    proposals: number;
    campaigns: number;
  }[];
}

export interface CampaignAnalytics {
  overview: {
    totalCampaigns: number;
    activeCampaigns: number;
    completedCampaigns: number;
    totalContacts: number;
    totalSent: number;
    totalOpened: number;
    totalClicked: number;
    totalReplied: number;
    totalBounced: number;
  };
  metrics: {
    openRate: number;
    clickRate: number;
    replyRate: number;
    bounceRate: number;
  };
  replyClassifications: Record<string, number>;
  topCampaigns: Array<{
    id: string;
    name: string;
    sent: number;
    openRate: string;
    replyRate: string;
  }>;
  timeSeries: Array<{
    date: string;
    sent: number;
    opened: number;
    clicked: number;
    replied: number;
  }>;
}

export interface MailboxAnalytics {
  total: number;
  active: number;
  warming: number;
  mailboxes: Array<{
    id: string;
    email: string;
    status: string;
    warmupProgress: number;
    dailySendLimit: number;
    sentCount: number;
    deliveryRate: number;
    campaigns: number;
  }>;
}

export const analyticsApi = {
  /**
   * Get dashboard overview metrics
   */
  getDashboard: async (): Promise<DashboardMetrics> => {
    const response = await apiClient.get<DashboardMetrics>('/api/v1/analytics/dashboard');
    return response.data;
  },

  /**
   * Get recent activity
   */
  getActivity: async (limit: number = 10): Promise<ActivityItem[]> => {
    const response = await apiClient.get<ActivityItem[]>('/api/v1/analytics/activity', {
      params: { limit },
    });
    return response.data;
  },

  /**
   * Get detailed analytics with date range
   */
  getMetrics: async (startDate?: string, endDate?: string): Promise<AnalyticsMetrics> => {
    const response = await apiClient.get<AnalyticsMetrics>('/api/v1/analytics/metrics', {
      params: {
        startDate,
        endDate,
      },
    });
    return response.data;
  },

  /**
   * Get AI cost tracking
   */
  getAiCosts: async (startDate?: string, endDate?: string) => {
    const response = await apiClient.get('/api/v1/analytics/ai-costs', {
      params: {
        startDate,
        endDate,
      },
    });
    return response.data;
  },

  /**
   * Get campaign analytics
   */
  getCampaignAnalytics: async (startDate?: string, endDate?: string): Promise<CampaignAnalytics> => {
    const response = await apiClient.get<CampaignAnalytics>('/api/v1/analytics/campaigns', {
      params: {
        startDate,
        endDate,
      },
    });
    return response.data;
  },

  /**
   * Get mailbox analytics
   */
  getMailboxAnalytics: async (): Promise<MailboxAnalytics> => {
    const response = await apiClient.get<MailboxAnalytics>('/api/v1/analytics/mailboxes');
    return response.data;
  },
};
