export interface CampaignResponseDto {
  id: string;
  name: string;
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed';
  totalContacts: number;
  sentCount: number;
  openedCount: number;
  clickedCount: number;
  repliedCount: number;
  bouncedCount: number;
  unsubscribedCount: number;
  started?: string;
  completed?: string;
  created: string;
  updated: string;
  mailbox?: {
    id: string;
    email: string;
    type: string;
  };
  client?: {
    id: string;
    companyName: string;
  };
}

export interface StartCampaignResponseDto {
  id: string;
  status: 'running';
  started: string;
  estimatedCompletion: string;
}

export interface PauseCampaignResponseDto {
  id: string;
  status: 'paused';
}

export interface CampaignEmailResponseDto {
  id: string;
  recipientEmail: string;
  recipientName?: string;
  sequenceStep: number;
  subject: string;
  status:
    | 'pending'
    | 'sent'
    | 'delivered'
    | 'opened'
    | 'clicked'
    | 'replied'
    | 'bounced'
    | 'failed';
  sentAt?: string;
  openedAt?: string;
  clickedAt?: string;
  repliedAt?: string;
  replyBody?: string;
  replyClassification?: 'interested' | 'not_interested' | 'out_of_office';
  error?: string;
  created: string;
}

export interface PaginatedCampaignsResponseDto {
  data: CampaignResponseDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginatedCampaignEmailsResponseDto {
  data: CampaignEmailResponseDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
