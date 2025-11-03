import { apiClient } from '../client';

export interface Campaign {
  id: string;
  name: string;
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed';
  type?: 'email' | 'sms' | 'multi-channel';
  totalContacts: number;
  sentCount: number;
  openedCount: number;
  clickedCount: number;
  repliedCount: number;
  bouncedCount: number;
  // Alternative naming for stats
  totalSent?: number;
  totalOpened?: number;
  totalClicked?: number;
  totalReplied?: number;
  started?: string;
  completed?: string;
  scheduledFor?: string;
  created: string;
  updated: string;
  mailbox?: {
    id: string;
    email: string;
    type: string;
  };
  client?: {
    id: string;
    companyName: string;
  };
  variants?: Array<{
    id: string;
    name: string;
    subject: string;
    body: string;
    sent: number;
    sentCount: number;
    opened: number;
    openedCount: number;
    clicked: number;
    clickedCount: number;
    replied: number;
    repliedCount?: number;
  }>;
  winnerVariantId?: string;
  settings?: {
    sendDays?: string[];
    sendTimeStart?: string;
    sendTimeEnd?: string;
    timezone?: string;
    dailyLimit?: number;
    trackOpens?: boolean;
    trackClicks?: boolean;
    fromName?: string;
    fromEmail?: string;
    replyTo?: string;
  };
}

export interface PaginatedCampaignsResponse {
  data: Campaign[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CampaignEmail {
  id: string;
  recipientEmail: string;
  recipientName?: string;
  sequenceStep: number;
  subject: string;
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'replied' | 'bounced' | 'failed';
  sentAt?: string;
  openedAt?: string;
  clickedAt?: string;
  repliedAt?: string;
  replyBody?: string;
  replyClassification?: 'interested' | 'not_interested' | 'out_of_office' | 'unsubscribe';
  error?: string;
  created: string;
}

export interface PaginatedCampaignEmailsResponse {
  data: CampaignEmail[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const campaignsApi = {
  /**
   * Get all campaigns with pagination
   */
  async getAll(
    page: number = 1,
    limit: number = 20,
    status?: string,
    mailboxId?: string
  ): Promise<PaginatedCampaignsResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (status) params.append('status', status);
    if (mailboxId) params.append('mailboxId', mailboxId);

    const response = await apiClient.get<PaginatedCampaignsResponse>(
      `/api/v1/campaigns?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get single campaign by ID
   */
  async getOne(id: string): Promise<Campaign> {
    const response = await apiClient.get<Campaign>(`/api/v1/campaigns/${id}`);
    return response.data;
  },

  /**
   * Create new campaign
   */
  async create(data: {
    name: string;
    mailboxId: string;
    clientId?: string;
    sequence: Array<{
      step: number;
      subject: string;
      body: string;
      delayDays: number;
      aiPersonalization: boolean;
    }>;
    contacts: Array<{
      email: string;
      firstName?: string;
      lastName?: string;
      company?: string;
    }>;
    schedule: {
      sendDays: string[];
      sendTimeStart: string;
      sendTimeEnd: string;
      timezone: string;
    };
  }): Promise<Campaign> {
    const response = await apiClient.post<Campaign>('/api/v1/campaigns', data);
    return response.data;
  },

  /**
   * Start campaign
   */
  async start(id: string): Promise<{
    id: string;
    status: 'running';
    started: string;
    estimatedCompletion: string;
  }> {
    const response = await apiClient.post(`/api/v1/campaigns/${id}/start`);
    return response.data;
  },

  /**
   * Pause campaign
   */
  async pause(id: string): Promise<{ id: string; status: 'paused' }> {
    const response = await apiClient.post(`/api/v1/campaigns/${id}/pause`);
    return response.data;
  },

  /**
   * Delete campaign
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/campaigns/${id}`);
  },

  /**
   * Get campaign emails with pagination
   */
  async getEmails(
    campaignId: string,
    page: number = 1,
    limit: number = 20,
    status?: string,
    sequenceStep?: number
  ): Promise<PaginatedCampaignEmailsResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (status) params.append('status', status);
    if (sequenceStep !== undefined) params.append('sequenceStep', sequenceStep.toString());

    const response = await apiClient.get<PaginatedCampaignEmailsResponse>(
      `/api/v1/campaigns/${campaignId}/emails?${params.toString()}`
    );
    return response.data;
  },
};
