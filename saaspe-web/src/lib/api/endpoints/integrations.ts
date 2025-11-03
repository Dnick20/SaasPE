import { apiClient } from '../client';

export interface Integration {
  id: string;
  name: 'hubspot' | 'zapier' | 'sendgrid' | 'docusign';
  displayName: string;
  description: string;
  enabled: boolean;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
  config?: Record<string, unknown>;
}

export interface HubSpotSyncStatus {
  lastSyncAt?: string;
  nextSyncAt?: string;
  totalContactsSynced: number;
  totalDealsSynced: number;
  status: 'active' | 'paused' | 'error';
  errors?: string[];
}

export interface ZapierWebhook {
  id: string;
  url: string;
  events: string[];
  enabled: boolean;
  created: string;
}

export const integrationsApi = {
  /**
   * Get all integrations
   */
  getAll: async (): Promise<Integration[]> => {
    const response = await apiClient.get<Integration[]>('/api/v1/integrations');
    return response.data;
  },

  /**
   * Get HubSpot sync status
   */
  getHubSpotStatus: async (): Promise<HubSpotSyncStatus> => {
    const response = await apiClient.get<HubSpotSyncStatus>('/api/v1/integrations/hubspot/status');
    return response.data;
  },

  /**
   * Trigger HubSpot sync
   */
  syncHubSpot: async (direction: 'import' | 'export' = 'import') => {
    const response = await apiClient.post('/api/v1/integrations/hubspot/sync', { direction });
    return response.data;
  },

  /**
   * Connect HubSpot
   */
  connectHubSpot: async (apiKey: string) => {
    const response = await apiClient.post('/api/v1/integrations/hubspot/connect', { apiKey });
    return response.data;
  },

  /**
   * Disconnect HubSpot
   */
  disconnectHubSpot: async () => {
    const response = await apiClient.post('/api/v1/integrations/hubspot/disconnect');
    return response.data;
  },

  /**
   * Get all Zapier webhooks
   */
  getZapierWebhooks: async (): Promise<ZapierWebhook[]> => {
    const response = await apiClient.get<ZapierWebhook[]>('/api/v1/integrations/zapier/webhooks');
    return response.data;
  },

  /**
   * Create Zapier webhook
   */
  createZapierWebhook: async (url: string, events: string[]) => {
    const response = await apiClient.post('/api/v1/integrations/zapier/webhooks', { url, events });
    return response.data;
  },

  /**
   * Delete Zapier webhook
   */
  deleteZapierWebhook: async (id: string) => {
    const response = await apiClient.delete(`/api/v1/integrations/zapier/webhooks/${id}`);
    return response.data;
  },

  /**
   * Toggle webhook enabled status
   */
  toggleZapierWebhook: async (id: string, enabled: boolean) => {
    const response = await apiClient.patch(`/api/v1/integrations/zapier/webhooks/${id}`, { enabled });
    return response.data;
  },
};
