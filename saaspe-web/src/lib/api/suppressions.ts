import { apiClient } from './client';

export const suppressionsApi = {
  async list(params: { type?: string; q?: string; page?: number; limit?: number } = {}) {
    const query = new URLSearchParams();
    if (params.type) query.set('type', params.type);
    if (params.q) query.set('q', params.q);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    const res = await apiClient.get(`/api/v1/suppressions?${query.toString()}`);
    return res.data;
  },
  async add(data: { email: string; type: string; reason?: string }) {
    const res = await apiClient.post('/api/v1/suppressions', data);
    return res.data;
  },
  async remove(id: string) {
    const res = await apiClient.delete(`/api/v1/suppressions/${id}`);
    return res.data;
  },
  async import(entries: Array<{ email: string; type: string; reason?: string }>) {
    const res = await apiClient.post('/api/v1/suppressions/import', { entries });
    return res.data;
  },
  async export(type?: string) {
    const query = type ? `?type=${encodeURIComponent(type)}` : '';
    const res = await apiClient.get(`/api/v1/suppressions/export${query}`);
    return res.data as { csv: string };
  },
};


