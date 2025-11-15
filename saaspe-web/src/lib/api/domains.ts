import { apiClient } from './client';

export interface ProvisionDomainPayload {
  domain: string;
  purchase?: boolean;
  trackingSubdomain?: string;
  returnPathSubdomain?: string;
  dmarcPolicy?: 'none' | 'quarantine' | 'reject';
  dmarcRua?: string;
}

export const domainsApi = {
  async provision(data: ProvisionDomainPayload) {
    const res = await apiClient.post('/api/v1/domains/provision', data);
    return res.data;
  },

  async getOne(id: string) {
    const res = await apiClient.get(`/api/v1/domains/${id}`);
    return res.data;
  },
};


