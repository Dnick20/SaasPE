import { apiClient } from './client';

export interface Mailbox {
  id: string;
  tenantId: string;
  userId: string;
  email: string;
  type: 'USER_PROVIDED' | 'MANAGED';
  provider: 'GMAIL' | 'OUTLOOK' | 'SMTP' | 'AWS_SES';
  status: 'ACTIVE' | 'WARMING' | 'SUSPENDED' | 'INACTIVE';

  // OAuth metadata (no tokens for security)
  oauthProvider?: 'google' | 'microsoft';
  oauthTokenExpiry?: string;
  oauthScopes?: string[];
  hasOAuthToken: boolean;

  // SMTP metadata (no password)
  smtpHost?: string;
  smtpPort?: number;
  smtpUsername?: string;
  smtpUseSsl?: boolean;

  // AWS SES metadata
  awsSesIdentity?: string;
  awsSesRegion?: string;
  dedicatedIp?: string;

  // Warmup settings
  warmupStatus: 'IDLE' | 'WARMING' | 'ACTIVE' | 'PAUSED';
  warmupDaysActive: number;
  warmupCurrentLimit: number;
  warmupTargetLimit: number;

  // Health metrics
  healthScore: number;
  bounceRate: number;
  complaintRate: number;

  // Timestamps
  created: string;
  updated: string;
}

export interface CreateMailboxDto {
  email: string;
  type?: 'USER_PROVIDED' | 'MANAGED';
  provider: 'GMAIL' | 'OUTLOOK' | 'SMTP' | 'AWS_SES';

  // OAuth Configuration (for Gmail/Outlook)
  oauthProvider?: 'google' | 'microsoft';
  oauthRefreshToken?: string;
  oauthAccessToken?: string;
  oauthTokenExpiry?: string;
  oauthScopes?: string[];

  // SMTP Configuration
  smtpHost?: string;
  smtpPort?: number;
  smtpUsername?: string;
  smtpPassword?: string;
  smtpUseSsl?: boolean;

  // AWS SES Configuration
  awsSesIdentity?: string;
  awsSesRegion?: string;
  dedicatedIp?: string;
}

export type UpdateMailboxDto = Partial<CreateMailboxDto>;

export interface MailboxListResponse {
  mailboxes: Mailbox[];
  total: number;
  page: number;
  limit: number;
}

export const mailboxesApi = {
  /**
   * Create a new mailbox
   */
  create: (data: CreateMailboxDto) =>
    apiClient.post<Mailbox>('/api/v1/mailboxes', data),

  /**
   * List all mailboxes
   */
  findAll: (params?: { page?: number; limit?: number; status?: string }) =>
    apiClient.get<MailboxListResponse>('/api/v1/mailboxes', { params }),

  /**
   * Get a single mailbox
   */
  findOne: (id: string) =>
    apiClient.get<Mailbox>(`/api/v1/mailboxes/${id}`),

  /**
   * Update a mailbox
   */
  update: (id: string, data: UpdateMailboxDto) =>
    apiClient.patch<Mailbox>(`/api/v1/mailboxes/${id}`, data),

  /**
   * Delete a mailbox
   */
  delete: (id: string) =>
    apiClient.delete(`/api/v1/mailboxes/${id}`),

  /**
   * Test mailbox connection
   */
  testConnection: (id: string) =>
    apiClient.post<{ success: boolean; message: string }>(`/api/v1/mailboxes/${id}/test`),

  /**
   * Bulk import mailboxes from CSV data
   */
  bulkImport: (data: { mailboxes: CreateMailboxDto[] }) =>
    apiClient.post<{
      success: boolean;
      imported: number;
      failed: number;
      errors?: Array<{ email: string; error: string }>;
    }>('/api/v1/mailboxes/bulk-import', data),
};
