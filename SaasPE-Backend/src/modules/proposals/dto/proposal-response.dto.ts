import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PricingOptionResponseDto,
  PricingNoteResponseDto,
} from './pricing-v2.dto';

export class ProposalResponseDto {
  @ApiProperty({
    description: 'Proposal ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Client ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  clientId: string;

  @ApiProperty({
    description: 'Client details',
    example: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      companyName: 'Acme Corp',
    },
    required: false,
  })
  client?: {
    id: string;
    companyName: string;
  };

  @ApiProperty({
    description: 'Proposal title',
    example: 'Website Redesign Proposal',
  })
  title: string;

  @ApiProperty({
    description: 'Proposal status',
    enum: ['draft', 'generating', 'ready', 'sent', 'signed', 'rejected'],
    example: 'draft',
  })
  status: string;

  @ApiPropertyOptional({
    description: 'Cover page data (includes summary/overview)',
  })
  coverPageData?: any;

  @ApiProperty({
    description: 'Executive summary',
    required: false,
  })
  executiveSummary?: string;

  @ApiProperty({
    description: 'Objectives and outcomes',
    required: false,
  })
  objectivesAndOutcomes?: string;

  @ApiProperty({
    description: 'Scope of work',
    required: false,
  })
  scopeOfWork?: string;

  @ApiProperty({
    description: 'Deliverables',
    required: false,
  })
  deliverables?: any;

  @ApiProperty({
    description: 'Approach and tools',
    required: false,
  })
  approachAndTools?: string;

  @ApiProperty({
    description: 'Timeline',
    required: false,
  })
  timeline?: string;

  @ApiProperty({
    description: 'Payment terms',
    required: false,
  })
  paymentTerms?: string;

  @ApiProperty({
    description: 'Cancellation notice',
    required: false,
  })
  cancellationNotice?: string;

  @ApiProperty({
    description: 'Pricing structure',
    example: {
      items: [{ name: 'Development', description: 'Full-stack', price: 10000 }],
      total: 10000,
    },
    required: false,
  })
  pricing?: {
    items: Array<{
      name: string;
      description?: string;
      price: number;
    }>;
    total: number;
  };

  // Enhanced Proposal Sections (Proposal V2)
  @ApiProperty({
    description: 'Account hierarchy and organizational structure',
    required: false,
  })
  accountHierarchy?: any;

  @ApiProperty({
    description:
      'Content enrichment with product libraries and customer segments',
    required: false,
  })
  contentEnrichment?: any;

  @ApiProperty({
    description: 'KPI forecast and projected metrics',
    required: false,
  })
  kpiForecast?: any;

  @ApiProperty({
    description: 'Team roster with member bios and roles',
    required: false,
  })
  teamRoster?: any;

  @ApiProperty({
    description:
      'Appendix with supporting documents, case studies, and references',
    required: false,
  })
  appendix?: any;

  // Pricing V2 (Narrative Pricing)
  @ApiPropertyOptional({
    description: 'Narrative pricing options (V2)',
    type: [PricingOptionResponseDto],
  })
  pricingOptionsV2?: PricingOptionResponseDto[];

  @ApiPropertyOptional({
    description: 'Global pricing notes (V2)',
    type: [PricingNoteResponseDto],
  })
  pricingNotesV2?: PricingNoteResponseDto[];

  @ApiProperty({
    description: 'PDF download URL',
    required: false,
  })
  pdfUrl?: string;

  @ApiProperty({
    description: 'DocuSign envelope ID',
    required: false,
  })
  docusignEnvelopeId?: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  created: string;

  @ApiProperty({
    description: 'Last updated timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  updated: string;

  @ApiProperty({
    description: 'Sent timestamp',
    required: false,
  })
  sentAt?: string;

  @ApiProperty({
    description: 'Signed timestamp',
    required: false,
  })
  signedAt?: string;
}

export class ProposalsListResponseDto {
  @ApiProperty({
    description: 'Array of proposals',
    type: [ProposalResponseDto],
  })
  data: ProposalResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    example: {
      page: 1,
      limit: 20,
      total: 45,
      totalPages: 3,
    },
  })
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class GenerateProposalResponseDto {
  @ApiProperty({
    description: 'Proposal ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Updated status',
    example: 'generating',
  })
  status: string;

  @ApiProperty({
    description: 'Background job ID',
    example: '456',
  })
  jobId: string;

  @ApiProperty({
    description: 'Estimated completion time',
    example: '2024-01-15T10:35:00Z',
  })
  estimatedCompletion: string;
}

export class ExportPdfResponseDto {
  @ApiProperty({
    description: 'Pre-signed S3 URL for PDF download',
    example: 'https://s3.amazonaws.com/bucket/proposal.pdf?...',
  })
  pdfUrl: string;

  @ApiProperty({
    description: 'URL expiration timestamp',
    example: '2024-01-15T11:30:00Z',
  })
  expiresAt: string;
}

export class ExportWordResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Word document generated successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Word document buffer (binary data)',
  })
  buffer: Buffer;
}

export class SendProposalResponseDto {
  @ApiProperty({
    description: 'Proposal ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Updated status',
    example: 'sent',
  })
  status: string;

  @ApiProperty({
    description: 'Sent timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  sentAt: string;

  @ApiProperty({
    description: 'DocuSign envelope ID (if e-signature enabled)',
    required: false,
  })
  docusignEnvelopeId?: string;

  @ApiProperty({
    description: 'Whether email was sent successfully',
    example: true,
  })
  emailSent: boolean;
}
