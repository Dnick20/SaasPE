import { apiClient } from './client';

export const providersApi = {
  async purchaseMailbox(data: { provider: 'titan' | 'zoho' | 'workmail' | 'ses_managed'; domain: string; localPart: string; plan?: string }) {
    const res = await apiClient.post('/api/v1/providers/mailboxes/purchase', data);
    return res.data;
  },
};


