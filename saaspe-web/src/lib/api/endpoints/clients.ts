import { apiClient } from '../client';

export interface Client {
  id: string;
  companyName: string;
  industry?: string;
  website?: string;
  contactFirstName?: string;
  contactLastName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactLinkedIn?: string;
  problemStatement?: string;
  currentTools?: string[];
  budget?: string;
  timeline?: string;
  hubspotDealId?: string;
  status: 'prospect' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  created: string;
  updated: string;
  transcriptions?: Array<{
    id: string;
    fileName: string;
    status: string;
    created: string;
  }>;
  proposals?: Array<{
    id: string;
    title: string;
    status: string;
    created: string;
  }>;
}

export interface PaginatedClientsResponse {
  data: Client[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateClientDto {
  companyName: string;
  industry?: string;
  website?: string;
  contactFirstName?: string;
  contactLastName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactLinkedIn?: string;
  problemStatement?: string;
  currentTools?: string[];
  budget?: string;
  timeline?: string;
  hubspotDealId?: string;
  status?: 'prospect' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
}

export type UpdateClientDto = Partial<CreateClientDto>;

export const clientsApi = {
  /**
   * Get all clients with pagination
   */
  async getAll(
    page: number = 1,
    limit: number = 20,
    status?: string,
  ): Promise<PaginatedClientsResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (status) params.append('status', status);

    const response = await apiClient.get<PaginatedClientsResponse>(
      `/api/v1/clients?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get single client by ID
   */
  async getOne(id: string): Promise<Client> {
    const response = await apiClient.get<Client>(`/api/v1/clients/${id}`);
    return response.data;
  },

  /**
   * Create a new client
   */
  async create(data: CreateClientDto): Promise<Client> {
    const response = await apiClient.post<Client>('/api/v1/clients', data);
    return response.data;
  },

  /**
   * Update a client
   */
  async update(id: string, data: UpdateClientDto): Promise<Client> {
    const response = await apiClient.patch<Client>(
      `/api/v1/clients/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a client
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/clients/${id}`);
  },
};
