import { apiClient } from '../client';

export interface ICP {
  industry?: string;
  companySize?: string;
  roles?: string[];
  painPoints?: string[];
  [key: string]: unknown;
}

export interface EmailScript {
  subject: string;
  body: string;
  ctaText: string;
  ctaUrl?: string;
  followUpSequence: string[];
  variants: string[];
  followUps: string[];
}

export interface LinkedInScript {
  connectionRequest: string;
  firstMessage: string;
  followUpMessage: string;
  inMail: string;
  messageSequence: string[];
}

export interface ColdCallScript {
  opener: string;
  discovery: string[];
  objectionHandling: Record<string, string>;
  close: string;
}

export interface CreatePlaybookDto {
  clientId: string;
  proposalId?: string;
  targetICP: ICP;
  emailScript: EmailScript;
  linkedInScript: LinkedInScript;
  coldCallScript: ColdCallScript;
  tone: string;
  structure: Record<string, unknown>;
  ctas: string[];
  compliance?: Record<string, unknown>;
  campaignCount?: number;
  campaignStrategy: Record<string, unknown>;
  version?: number;
  isTemplate?: boolean;
  createdBy?: string;
}

export interface UpdatePlaybookDto {
  targetICP?: ICP;
  emailScript?: EmailScript;
  linkedInScript?: LinkedInScript;
  coldCallScript?: ColdCallScript;
  tone?: string;
  structure?: Record<string, unknown>;
  ctas?: string[];
  compliance?: Record<string, unknown>;
  campaignCount?: number;
  campaignStrategy?: Record<string, unknown>;
  googleDocUrl?: string;
  pdfS3Key?: string;
  pdfUrl?: string;
  version?: number;
  isTemplate?: boolean;
}

export interface PlaybookResponse {
  id: string;
  tenantId: string;
  clientId: string;
  proposalId?: string;
  targetICP: ICP;
  emailScript: EmailScript;
  linkedInScript: LinkedInScript;
  coldCallScript: ColdCallScript;
  tone: string;
  structure: Record<string, unknown>;
  ctas: string[];
  compliance?: Record<string, unknown>;
  campaignCount: number;
  campaignStrategy: Record<string, unknown>;
  googleDocUrl?: string;
  pdfS3Key?: string;
  pdfUrl?: string;
  version: number;
  isTemplate: boolean;
  createdBy: string;
  created: string;
  updated: string;
}

export interface GenerateScriptsDto {
  targetICP: ICP;
  tone: string;
  ctas: string[];
  clientContext?: {
    companyName?: string;
    problemStatement?: string;
    currentTools?: string[];
  };
}

export const playbooksApi = {
  /**
   * Create a new playbook
   */
  create: async (data: CreatePlaybookDto): Promise<PlaybookResponse> => {
    const response = await apiClient.post('/api/v1/playbooks', data);
    return response.data;
  },

  /**
   * Generate scripts using AI
   */
  generateScripts: async (data: GenerateScriptsDto): Promise<{
    emailScript: EmailScript;
    linkedInScript: LinkedInScript;
    coldCallScript: ColdCallScript;
  }> => {
    const response = await apiClient.post('/api/v1/playbooks/generate-scripts', data);
    return response.data;
  },

  /**
   * Get all playbooks for tenant
   */
  getAll: async (): Promise<PlaybookResponse[]> => {
    const response = await apiClient.get('/api/v1/playbooks');
    return response.data;
  },

  /**
   * Get playbooks for a specific client
   */
  getByClient: async (clientId: string): Promise<PlaybookResponse[]> => {
    const response = await apiClient.get(`/api/v1/playbooks/client/${clientId}`);
    return response.data;
  },

  /**
   * Get a single playbook by ID
   */
  getById: async (id: string): Promise<PlaybookResponse> => {
    const response = await apiClient.get(`/api/v1/playbooks/${id}`);
    return response.data;
  },

  /**
   * Update a playbook
   */
  update: async (id: string, data: UpdatePlaybookDto): Promise<PlaybookResponse> => {
    const response = await apiClient.patch(`/api/v1/playbooks/${id}`, data);
    return response.data;
  },

  /**
   * Delete a playbook
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/playbooks/${id}`);
  },
};
