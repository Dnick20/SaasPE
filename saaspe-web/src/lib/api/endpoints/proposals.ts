import { apiClient } from '../client';

// Pricing V2 Types
export enum BillingCadence {
  FIXED_FEE = 'fixed_fee',
  MONTHLY_RETAINER = 'monthly_retainer',
  HOURLY = 'hourly',
}

export enum LineItemType {
  CORE = 'core',
  TIER = 'tier',
  ADDON = 'addon',
  THIRD_PARTY = 'thirdParty',
}

export enum UnitType {
  FIXED = 'fixed',
  HOURLY = 'hourly',
  MONTHLY = 'monthly',
}

export enum NoteType {
  PAYMENT_METHOD = 'payment_method',
  TERMS = 'terms',
  CANCELLATION = 'cancellation',
  GENERAL = 'general',
}

export interface ProposalPricingLineItem {
  id: string;
  optionId: string;
  lineType: LineItemType;
  description: string;
  amount: number;
  unitType: UnitType;
  hoursIncluded?: number;
  requiresApproval?: boolean;
  notes?: string;
  sortOrder: number;
  created: string;
}

export interface ProposalPricingOption {
  id: string;
  proposalId: string;
  label: string;
  billingCadence: BillingCadence;
  summary: string;
  tierType?: string;
  paymentTerms?: string;
  cancellationNotice?: string;
  isRecommended: boolean;
  sortOrder: number;
  lineItems: ProposalPricingLineItem[];
  created: string;
  updated: string;
}

export interface ProposalPricingNote {
  id: string;
  proposalId: string;
  noteType: NoteType;
  content: string;
  sortOrder: number;
  created: string;
  updated: string;
}

export interface Proposal {
  id: string;
  title: string;
  status: 'draft' | 'generating' | 'ready' | 'sent' | 'signed';
  executiveSummary?: string;
  objectivesAndOutcomes?: string;
  scopeOfWork?: string;
  deliverables?: string;
  approachAndTools?: string;
  paymentTerms?: string;
  cancellationNotice?: string;
  timeline?: string;
  pricing?: {
    items: Array<{ name: string; description: string; price: number }>;
    total: number;
  };
  client?: {
    id: string;
    companyName: string;
    email?: string;
  };
  pdfUrl?: string;
  gdocId?: string;
  gdocUrl?: string;
  sentAt?: string;
  agencySignedAt?: string;
  agencySignedBy?: string;
  agencySignatureS3?: string;
  clientSignedAt?: string;
  docusignEnvelopeId?: string;
  pricingOptionsV2?: ProposalPricingOption[];
  pricingNotesV2?: ProposalPricingNote[];
  created: string;
  updated: string;
}

export interface ProposalRevision {
  id: string;
  proposalId: string;
  revisionNumber: number;
  title: string;
  executiveSummary?: string;
  objectivesAndOutcomes?: string;
  scopeOfWork?: string;
  deliverables?: string;
  approachAndTools?: string;
  paymentTerms?: string;
  cancellationNotice?: string;
  timeline?: string;
  pricing?: any;
  changeNote?: string;
  createdBy: string;
  createdAt: string;
}

export interface PaginatedProposalsResponse {
  data: Proposal[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const proposalsApi = {
  /**
   * Get all proposals with pagination
   */
  async getAll(
    page: number = 1,
    limit: number = 20,
    status?: string,
    clientId?: string
  ): Promise<PaginatedProposalsResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (status) params.append('status', status);
    if (clientId) params.append('clientId', clientId);

    const response = await apiClient.get<PaginatedProposalsResponse>(
      `/api/v1/proposals?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Generate a complete proposal with AI and create a draft
   */
  async generateAI(data: {
    clientId: string;
    transcriptionId?: string;
    title?: string;
    tone?: string;
  }): Promise<Proposal> {
    const response = await apiClient.post<Proposal>(
      '/api/v1/proposals/generate-ai',
      data
    );
    return response.data;
  },

  /**
   * Get single proposal by ID
   */
  async getOne(id: string): Promise<Proposal> {
    const response = await apiClient.get<Proposal>(`/api/v1/proposals/${id}`);
    return response.data;
  },

  /**
   * Create new proposal
   */
  async create(data: {
    clientId: string;
    title: string;
    transcriptionId?: string;
  }): Promise<Proposal> {
    const response = await apiClient.post<Proposal>('/api/v1/proposals', data);
    return response.data;
  },

  /**
   * Update proposal
   */
  async update(
    id: string,
    data: Partial<Omit<Proposal, 'id' | 'created' | 'updated'>>
  ): Promise<Proposal> {
    const response = await apiClient.patch<Proposal>(
      `/api/v1/proposals/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Update only specific sections
   */
  async updateSections(
    id: string,
    data: Partial<Pick<Proposal, 'executiveSummary' | 'objectivesAndOutcomes' | 'scopeOfWork' | 'deliverables' | 'approachAndTools' | 'paymentTerms' | 'cancellationNotice' | 'timeline'>>
  ): Promise<Proposal> {
    const response = await apiClient.patch<Proposal>(
      `/api/v1/proposals/${id}/sections`,
      data
    );
    return response.data;
  },

  /**
   * Update pricing only
   */
  async updatePricing(
    id: string,
    data: {
      currency?: string;
      items: Array<{
        name: string;
        type: 'recurring' | 'one-time';
        unitPrice: number;
        quantity: number;
        billingPeriod?: 'monthly' | 'yearly';
        discountPct?: number;
        taxPct?: number;
      }>; 
    }
  ): Promise<Proposal> {
    const response = await apiClient.patch<Proposal>(
      `/api/v1/proposals/${id}/pricing`,
      data
    );
    return response.data;
  },

  /**
   * Generate AI content for proposal
   */
  async generateContent(
    id: string,
    sections: string[]
  ): Promise<{ status: string; jobId: string }> {
    const response = await apiClient.post<{ status: string; jobId: string }>(
      `/api/v1/proposals/${id}/generate`,
      { sections }
    );
    return response.data;
  },

  /**
   * Export proposal to PDF
   */
  async exportPdf(id: string): Promise<{ pdfUrl: string; expiresAt: string }> {
    const response = await apiClient.post<{ pdfUrl: string; expiresAt: string }>(
      `/api/v1/proposals/${id}/export-pdf`
    );
    return response.data;
  },

  /**
   * Send proposal to client
   */
  async send(
    id: string,
    data: {
      recipientEmail: string;
      recipientName: string;
      includeESignature: boolean;
      message?: string;
    }
  ): Promise<{
    status: string;
    docusignEnvelopeId?: string;
    emailSent: boolean;
  }> {
    const response = await apiClient.post(
      `/api/v1/proposals/${id}/send`,
      data
    );
    return response.data;
  },

  /**
   * Export proposal to Google Docs
   */
  async exportGDoc(id: string): Promise<{
    docId: string;
    docUrl: string;
    message: string;
  }> {
    const response = await apiClient.post<{
      docId: string;
      docUrl: string;
      message: string;
    }>(`/api/v1/proposals/${id}/export-gdoc`);
    return response.data;
  },

  /**
   * Refresh existing Google Doc with current proposal content
   */
  async refreshGDoc(id: string): Promise<{
    docId: string;
    docUrl: string;
    message: string;
  }> {
    const response = await apiClient.post<{
      docId: string;
      docUrl: string;
      message: string;
    }>(`/api/v1/proposals/${id}/refresh-gdoc`);
    return response.data;
  },

  /**
   * Import content from Google Doc into proposal fields
   */
  async importGDoc(id: string): Promise<{
    message: string;
    updatedSections: string[];
  }> {
    const response = await apiClient.post<{
      message: string;
      updatedSections: string[];
    }>(`/api/v1/proposals/${id}/import-gdoc`);
    return response.data;
  },

  /**
   * Get proposal revision history
   */
  async getRevisions(id: string): Promise<{
    revisions: ProposalRevision[];
    currentRevision: number;
  }> {
    const response = await apiClient.get<{
      revisions: ProposalRevision[];
      currentRevision: number;
    }>(`/api/v1/proposals/${id}/revisions`);
    return response.data;
  },

  /**
   * Create a revision snapshot
   */
  async createRevision(
    id: string,
    changeNote?: string
  ): Promise<ProposalRevision> {
    const response = await apiClient.post<ProposalRevision>(
      `/api/v1/proposals/${id}/revisions`,
      { changeNote }
    );
    return response.data;
  },

  /**
   * Restore proposal from a revision
   */
  async restoreRevision(
    id: string,
    revisionId: string
  ): Promise<{
    message: string;
    restoredRevisionNumber: number;
    newRevisionCreated: boolean;
  }> {
    const response = await apiClient.post<{
      message: string;
      restoredRevisionNumber: number;
      newRevisionCreated: boolean;
    }>(`/api/v1/proposals/${id}/restore/${revisionId}`);
    return response.data;
  },

  /**
   * Delete proposal
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/proposals/${id}`);
  },

  // ========== Pricing V2 API Methods ==========

  /**
   * Add pricing option to proposal
   */
  async addPricingOption(
    proposalId: string,
    data: {
      label: string;
      billingCadence: BillingCadence;
      summary: string;
      tierType?: string;
      paymentTerms?: string;
      cancellationNotice?: string;
      isRecommended?: boolean;
      sortOrder?: number;
      lineItems: Array<{
        lineType: LineItemType;
        description: string;
        amount: number;
        unitType: UnitType;
        hoursIncluded?: number;
        requiresApproval?: boolean;
        notes?: string;
        sortOrder?: number;
      }>;
    }
  ): Promise<{ id: string; message: string; pricingOption: ProposalPricingOption }> {
    const response = await apiClient.post(
      `/api/v1/proposals/${proposalId}/pricing-options`,
      data
    );
    return response.data;
  },

  /**
   * Update pricing option
   */
  async updatePricingOption(
    proposalId: string,
    optionId: string,
    data: Partial<{
      label: string;
      billingCadence: BillingCadence;
      summary: string;
      tierType?: string;
      paymentTerms?: string;
      cancellationNotice?: string;
      isRecommended?: boolean;
      sortOrder?: number;
    }>
  ): Promise<{ message: string; pricingOption: ProposalPricingOption }> {
    const response = await apiClient.patch(
      `/api/v1/proposals/${proposalId}/pricing-options/${optionId}`,
      data
    );
    return response.data;
  },

  /**
   * Delete pricing option
   */
  async deletePricingOption(
    proposalId: string,
    optionId: string
  ): Promise<{ message: string }> {
    const response = await apiClient.delete(
      `/api/v1/proposals/${proposalId}/pricing-options/${optionId}`
    );
    return response.data;
  },

  /**
   * Add line item to pricing option
   */
  async addLineItem(
    proposalId: string,
    optionId: string,
    data: {
      lineType: LineItemType;
      description: string;
      amount: number;
      unitType: UnitType;
      hoursIncluded?: number;
      requiresApproval?: boolean;
      notes?: string;
      sortOrder?: number;
    }
  ): Promise<{ id: string; message: string; lineItem: ProposalPricingLineItem }> {
    const response = await apiClient.post(
      `/api/v1/proposals/${proposalId}/pricing-options/${optionId}/line-items`,
      data
    );
    return response.data;
  },

  /**
   * Update line item
   */
  async updateLineItem(
    proposalId: string,
    optionId: string,
    lineItemId: string,
    data: Partial<{
      lineType: LineItemType;
      description: string;
      amount: number;
      unitType: UnitType;
      hoursIncluded?: number;
      requiresApproval?: boolean;
      notes?: string;
      sortOrder?: number;
    }>
  ): Promise<{ message: string; lineItem: ProposalPricingLineItem }> {
    const response = await apiClient.patch(
      `/api/v1/proposals/${proposalId}/pricing-options/${optionId}/line-items/${lineItemId}`,
      data
    );
    return response.data;
  },

  /**
   * Delete line item
   */
  async deleteLineItem(
    proposalId: string,
    optionId: string,
    lineItemId: string
  ): Promise<{ message: string }> {
    const response = await apiClient.delete(
      `/api/v1/proposals/${proposalId}/pricing-options/${optionId}/line-items/${lineItemId}`
    );
    return response.data;
  },

  /**
   * Add pricing note
   */
  async addPricingNote(
    proposalId: string,
    data: {
      noteType: NoteType;
      content: string;
      sortOrder?: number;
    }
  ): Promise<{ id: string; message: string; pricingNote: ProposalPricingNote }> {
    const response = await apiClient.post(
      `/api/v1/proposals/${proposalId}/pricing-notes`,
      data
    );
    return response.data;
  },

  /**
   * Update pricing note
   */
  async updatePricingNote(
    proposalId: string,
    noteId: string,
    data: Partial<{
      noteType: NoteType;
      content: string;
      sortOrder?: number;
    }>
  ): Promise<{ message: string; pricingNote: ProposalPricingNote }> {
    const response = await apiClient.patch(
      `/api/v1/proposals/${proposalId}/pricing-notes/${noteId}`,
      data
    );
    return response.data;
  },

  /**
   * Delete pricing note
   */
  async deletePricingNote(
    proposalId: string,
    noteId: string
  ): Promise<{ message: string }> {
    const response = await apiClient.delete(
      `/api/v1/proposals/${proposalId}/pricing-notes/${noteId}`
    );
    return response.data;
  },

  /**
   * Seed pricing blueprints (templates)
   */
  async seedPricingBlueprints(): Promise<{
    message: string;
    templates: any[];
    count: number;
  }> {
    const response = await apiClient.post('/api/v1/proposals/pricing-blueprints/seed');
    return response.data;
  },
};
