import { apiClient } from '../client';

export interface Transcription {
  id: string;
  fileName: string;
  fileSize: number;
  fileType?: string;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  transcript?: string;
  duration?: number;
  language?: string;
  confidence?: number;
  analyzed: boolean;
  extractedData?: {
    problemStatement?: string;
    budget?: { min: number; max: number; currency: string };
    timeline?: string;
  };
  wonBusiness: boolean;
  isExample: boolean;
  salesTips?: {
    strengths?: string[];
    improvements?: string[];
    keyMoments?: string[];
  };
  client?: {
    id: string;
    companyName: string;
  };
  created: string;
  updated?: string;
}

export interface PaginatedTranscriptionsResponse {
  data: Transcription[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateTranscriptionResponse {
  id: string;
  uploadUrl: string;
  fileName: string;
}

export const transcriptionsApi = {
  /**
   * Get all transcriptions with pagination
   */
  async getAll(
    page: number = 1,
    limit: number = 20,
    status?: string,
    clientId?: string
  ): Promise<PaginatedTranscriptionsResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (status) params.append('status', status);
    if (clientId) params.append('clientId', clientId);

    const response = await apiClient.get<PaginatedTranscriptionsResponse>(
      `/api/v1/transcriptions?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get single transcription by ID
   */
  async getOne(id: string): Promise<Transcription> {
    const response = await apiClient.get<Transcription>(
      `/api/v1/transcriptions/${id}`
    );
    return response.data;
  },

  /**
   * Create transcription and get upload URL
   */
  async create(data: {
    fileName: string;
    fileSize: number;
    fileType: string;
    clientId?: string;
  }): Promise<CreateTranscriptionResponse> {
    const response = await apiClient.post<CreateTranscriptionResponse>(
      '/api/v1/transcriptions',
      data
    );
    return response.data;
  },

  /**
   * Upload transcription file directly (multipart/form-data)
   */
  async uploadDirect(formData: FormData): Promise<Transcription> {
    // For FormData, axios will automatically set the correct Content-Type with boundary
    // We just need to not override it
    const response = await apiClient.post<Transcription>(
      '/api/v1/transcriptions',
      formData
    );
    return response.data;
  },

  /**
   * Upload file directly to S3
   */
  async uploadFile(uploadUrl: string, file: File): Promise<void> {
    await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });
  },

  /**
   * Trigger AI analysis on completed transcription
   */
  async analyze(id: string): Promise<void> {
    await apiClient.post(`/api/v1/transcriptions/${id}/analyze`);
  },

  /**
   * Create a proposal from transcription
   */
  async createProposal(id: string): Promise<{
    id: string;
    title: string;
    status: string;
    message: string;
  }> {
    const response = await apiClient.post(`/api/v1/transcriptions/${id}/create-proposal`);
    return response.data;
  },

  /**
   * Update learning fields (wonBusiness, isExample)
   */
  async updateLearning(
    id: string,
    data: { wonBusiness?: boolean; isExample?: boolean }
  ): Promise<Transcription> {
    const response = await apiClient.patch<Transcription>(
      `/api/v1/transcriptions/${id}/learning`,
      data
    );
    return response.data;
  },

  /**
   * Associate a client with a transcription
   */
  async associateClient(id: string, clientId: string): Promise<Transcription> {
    const response = await apiClient.patch<Transcription>(
      `/api/v1/transcriptions/${id}/client`,
      { clientId }
    );
    return response.data;
  },

  /**
   * Extract comprehensive lead intake info from transcription using AI (gpt-4o-mini with structured outputs)
   */
  async extractClientInfo(id: string): Promise<{
    company: {
      name: string;
      industry: string;
      website: string;
      budget_note: string;
      timeline_note: string;
      status: string;
      hubspot_deal_id: string;
    };
    primary_contact: {
      first_name: string;
      last_name: string;
      email: string;
      phone: string;
      linkedin_url: string;
    };
    alt_contacts: Array<{
      role_or_note: string;
      first_name: string;
      last_name: string;
      email: string;
    }>;
    business_details: {
      problem_statement: string;
      current_tools_systems_csv: string;
      deliverables_logistics: string;
      key_meetings_schedule: string;
    };
    provenance: {
      transcript_date: string;
      confidence_notes: string;
      missing_fields: string[];
    };
  }> {
    const response = await apiClient.post(
      `/api/v1/transcriptions/${id}/extract-client-info`
    );
    return response.data;
  },

  /**
   * Delete transcription
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/transcriptions/${id}`);
  },
};
