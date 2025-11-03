/**
 * Error Management API Endpoints
 */

import { apiClient } from '../client';

export interface ErrorLog {
  id: string;
  errorId: string;
  sentryId?: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  category?: string;
  source: 'frontend' | 'backend';
  message: string;
  stackTrace?: string;
  errorType?: string;
  context?: Record<string, unknown>;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  userEmail?: string;
  affectedUsers: number;
  occurrenceCount: number;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  resolution?: string;
  notificationSent: boolean;
  notifiedAt?: string;
  created: string;
  updated: string;
}

export interface ErrorStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  byCategory: Record<string, number>;
  bySource: {
    frontend: number;
    backend: number;
  };
  trend: {
    date: string;
    count: number;
  }[];
}

export interface ErrorListResponse {
  errors: ErrorLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UnreadCountResponse {
  critical: number;
  high: number;
  total: number;
}

export const errorAPI = {
  /**
   * Get paginated list of errors
   */
  getErrors: async (params?: {
    severity?: string;
    source?: string;
    resolved?: boolean;
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ErrorListResponse> => {
    const response = await apiClient.get('/api/v1/admin/errors', { params });
    return response.data;
  },

  /**
   * Get error statistics
   */
  getStats: async (params?: { days?: number }): Promise<ErrorStats> => {
    const response = await apiClient.get('/api/v1/admin/errors/stats', { params });
    return response.data;
  },

  /**
   * Get unread error count
   */
  getUnreadCount: async (): Promise<UnreadCountResponse> => {
    const response = await apiClient.get('/api/v1/admin/errors/unread-count');
    return response.data;
  },

  /**
   * Get specific error details
   */
  getError: async (id: string): Promise<ErrorLog> => {
    const response = await apiClient.get(`/api/v1/admin/errors/${id}`);
    return response.data;
  },

  /**
   * Mark error as resolved
   */
  resolveError: async (id: string, resolution: string): Promise<ErrorLog> => {
    const response = await apiClient.patch(`/api/v1/admin/errors/${id}/resolve`, {
      resolution,
    });
    return response.data;
  },

  /**
   * Reopen a resolved error
   */
  unresolveError: async (id: string): Promise<ErrorLog> => {
    const response = await apiClient.patch(`/api/v1/admin/errors/${id}/unresolve`);
    return response.data;
  },

  /**
   * Log an error from frontend
   */
  logError: async (error: {
    errorId: string;
    severity: string;
    category?: string;
    source: 'frontend' | 'backend';
    message: string;
    stackTrace?: string;
    errorType?: string;
    context?: Record<string, unknown>;
    endpoint?: string;
    method?: string;
    statusCode?: number;
    userId?: string;
    userEmail?: string;
  }): Promise<ErrorLog> => {
    const response = await apiClient.post('/api/v1/admin/errors', error);
    return response.data;
  },
};
