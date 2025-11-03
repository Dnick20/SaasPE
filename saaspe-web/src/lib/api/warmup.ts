import { apiClient } from './client';

export interface WarmupStats {
  totalMailboxes: number;
  activeWarmups: number;
  pausedWarmups: number;
  completedWarmups: number;
  totalEmailsSent: number;
  averageReputation: number;
}

export interface WarmupStatus {
  mailboxId: string;
  status: 'not_started' | 'warming_up' | 'paused' | 'completed';
  currentLimit: number;
  targetLimit: number;
  emailsSentToday: number;
  totalEmailsSent: number;
  startDate?: string;
  estimatedCompletionDate?: string;
  reputationScore?: number;
}

export const warmupApi = {
  /**
   * Get aggregate warmup statistics for the tenant
   */
  getStats: () =>
    apiClient.get<WarmupStats>('/api/v1/warmup/stats'),

  /**
   * Start warmup for a mailbox
   */
  start: (mailboxId: string, targetLimit?: number) =>
    apiClient.post<WarmupStatus>(`/api/v1/warmup/${mailboxId}/start`, { targetLimit }),

  /**
   * Pause warmup for a mailbox
   */
  pause: (mailboxId: string) =>
    apiClient.post<WarmupStatus>(`/api/v1/warmup/${mailboxId}/pause`),

  /**
   * Resume warmup for a mailbox
   */
  resume: (mailboxId: string) =>
    apiClient.post<WarmupStatus>(`/api/v1/warmup/${mailboxId}/resume`),

  /**
   * Stop warmup and mark mailbox as active
   */
  stop: (mailboxId: string) =>
    apiClient.post<WarmupStatus>(`/api/v1/warmup/${mailboxId}/stop`),

  /**
   * Get warmup status for a mailbox
   */
  getStatus: (mailboxId: string) =>
    apiClient.get<WarmupStatus>(`/api/v1/warmup/${mailboxId}/status`),
};
