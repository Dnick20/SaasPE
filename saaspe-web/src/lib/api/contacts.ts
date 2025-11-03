import { apiClient } from './client';

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  position?: string;
  status: 'active' | 'unsubscribed' | 'bounced';
  tags: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContactDto {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  position?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateContactDto extends Partial<CreateContactDto> {
  status?: 'active' | 'unsubscribed' | 'bounced';
}

export interface BulkImportContactsDto {
  contacts: CreateContactDto[];
}

export interface ContactsListResponse {
  data: Contact[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ContactStats {
  total: number;
  active: number;
  unsubscribed: number;
  bounced: number;
  byTag: Record<string, number>;
}

export const contactsApi = {
  /**
   * Create a new contact
   */
  create: (data: CreateContactDto) =>
    apiClient.post<Contact>('/api/v1/contacts', data),

  /**
   * Bulk import contacts from CSV or array
   */
  bulkImport: (data: BulkImportContactsDto) =>
    apiClient.post<{ imported: number; failed: number; errors: unknown[] }>(
      '/api/v1/contacts/bulk-import',
      data
    ),

  /**
   * Get all contacts with pagination and filtering
   */
  findAll: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    tags?: string;
    search?: string;
  }) =>
    apiClient.get<ContactsListResponse>('/api/v1/contacts', { params }),

  /**
   * Get contact statistics
   */
  getStats: () =>
    apiClient.get<ContactStats>('/api/v1/contacts/stats'),

  /**
   * Get a single contact by ID
   */
  findOne: (id: string) =>
    apiClient.get<Contact>(`/api/v1/contacts/${id}`),

  /**
   * Update a contact
   */
  update: (id: string, data: UpdateContactDto) =>
    apiClient.patch<Contact>(`/api/v1/contacts/${id}`, data),

  /**
   * Delete a contact
   */
  delete: (id: string) =>
    apiClient.delete(`/api/v1/contacts/${id}`),
};
