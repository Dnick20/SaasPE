import { apiClient } from '../client';

export interface DatabaseHealth {
  connected: boolean;
  responseTime: number;
  activeConnections: number;
  error?: string;
}

export interface ProviderHealth {
  configured: Record<string, boolean>;
  activeConnections: Record<string, number>;
}

export interface TokenHealth {
  total: number;
  active: number;
  expired: number;
  expiringSoon: number;
  expiringThisWeek: number;
  criticalIssues: boolean;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  responseTime: number;
  database: DatabaseHealth;
  providers: ProviderHealth;
  tokens: TokenHealth;
}

export interface BasicHealthResponse {
  status: string;
  timestamp: string;
}

export const healthApi = {
  /**
   * Basic health check
   */
  getBasicHealth: async (): Promise<BasicHealthResponse> => {
    const response = await apiClient.get<BasicHealthResponse>('/health');
    return response.data;
  },

  /**
   * Detailed health check with all system statuses
   */
  getDetailedHealth: async (): Promise<HealthCheckResponse> => {
    const response = await apiClient.get<HealthCheckResponse>('/health/detailed');
    return response.data;
  },

  /**
   * Readiness probe
   */
  getReadiness: async (): Promise<{ status: string; ready: boolean }> => {
    const response = await apiClient.get<{ status: string; ready: boolean }>('/health/ready');
    return response.data;
  },

  /**
   * Liveness probe
   */
  getLiveness: async (): Promise<{ status: string; alive: boolean }> => {
    const response = await apiClient.get<{ status: string; alive: boolean }>('/health/live');
    return response.data;
  },
};
