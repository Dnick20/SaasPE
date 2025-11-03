import { apiClient } from '../client';

export interface PricingCatalogItem {
  id: string;
  name: string;
  description?: string;
  type: 'recurring' | 'one-time';
  unitPrice: number;
  billingPeriod?: 'monthly' | 'yearly';
  taxPct?: number;
}

export const pricingCatalogApi = {
  async list(): Promise<PricingCatalogItem[]> {
    const resp = await apiClient.get<PricingCatalogItem[]>('/api/v1/pricing-catalog');
    return resp.data;
  },
  async add(item: Omit<PricingCatalogItem, 'id'>): Promise<PricingCatalogItem> {
    const resp = await apiClient.post<PricingCatalogItem>('/api/v1/pricing-catalog/items', item);
    return resp.data;
  },
  async update(id: string, item: Partial<Omit<PricingCatalogItem, 'id'>>): Promise<PricingCatalogItem> {
    const resp = await apiClient.patch<PricingCatalogItem>(`/api/v1/pricing-catalog/items/${id}`, item);
    return resp.data;
  },
  async remove(id: string): Promise<{ message: string }> {
    const resp = await apiClient.delete(`/api/v1/pricing-catalog/items/${id}`);
    return resp.data;
  },
};


