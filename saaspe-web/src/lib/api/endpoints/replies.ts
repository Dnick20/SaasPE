import { apiClient } from '../client';

export interface Reply {
  id: string;
  campaignId: string;
  recipientEmail: string;
  recipientName?: string;
  sequenceStep: number;
  subject: string;
  body: string;
  status: string;
  replyBody?: string;
  replyClassification?: 'interested' | 'not_interested' | 'out_of_office' | 'unsubscribe';
  repliedAt?: string;
  campaign: {
    id: string;
    name: string;
    status: string;
  };
  mailbox?: {
    id: string;
    email: string;
  };
  Contact?: {
    id: string;
    firstName?: string;
    lastName?: string;
    company?: string;
    linkedinUrl?: string;
  };
}

export interface PaginatedRepliesResponse {
  data: Reply[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ReplyStats {
  total: number;
  interested: number;
  notInterested: number;
  outOfOffice: number;
  unsubscribe: number;
  unclassified: number;
  interestedRate: string;
}

export const repliesApi = {
  /**
   * Get all replies with pagination and filtering
   */
  async getAll(
    page: number = 1,
    limit: number = 20,
    classification?: 'interested' | 'not_interested' | 'out_of_office' | 'unsubscribe',
    campaignId?: string,
  ): Promise<PaginatedRepliesResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (classification) params.append('classification', classification);
    if (campaignId) params.append('campaignId', campaignId);

    const response = await apiClient.get<PaginatedRepliesResponse>(
      `/api/v1/replies?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get single reply by ID
   */
  async getOne(id: string): Promise<Reply> {
    const response = await apiClient.get<Reply>(`/api/v1/replies/${id}`);
    return response.data;
  },

  /**
   * Get reply statistics
   */
  async getStats(campaignId?: string): Promise<ReplyStats> {
    const params = campaignId ? `?campaignId=${campaignId}` : '';
    const response = await apiClient.get<ReplyStats>(`/api/v1/replies/stats${params}`);
    return response.data;
  },

  /**
   * Update reply classification
   */
  async updateClassification(
    id: string,
    classification: 'interested' | 'not_interested' | 'out_of_office' | 'unsubscribe',
  ): Promise<Reply> {
    const response = await apiClient.patch<Reply>(
      `/api/v1/replies/${id}/classify`,
      { classification }
    );
    return response.data;
  },

  /**
   * Generate AI response suggestion
   */
  async generateResponse(id: string): Promise<{ suggestedResponse: string }> {
    const response = await apiClient.post<{ suggestedResponse: string }>(
      `/api/v1/replies/${id}/generate-response`
    );
    return response.data;
  },

  /**
   * Batch classify unclassified replies
   */
  async batchClassify(limit: number = 50): Promise<{ classified: number; skipped: number }> {
    const response = await apiClient.post<{ classified: number; skipped: number }>(
      `/api/v1/replies/batch-classify`,
      { limit }
    );
    return response.data;
  },
};
