import { ApiProperty } from '@nestjs/swagger';

export class ClientResponseDto {
  @ApiProperty({
    description: 'Client ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Company name',
    example: 'Acme Corporation',
  })
  companyName: string;

  @ApiProperty({
    description: 'Industry sector',
    example: 'Technology',
    required: false,
  })
  industry?: string;

  @ApiProperty({
    description: 'Company website URL',
    example: 'https://www.acmecorp.com',
    required: false,
  })
  website?: string;

  @ApiProperty({
    description: 'Primary contact first name',
    example: 'John',
    required: false,
  })
  contactFirstName?: string;

  @ApiProperty({
    description: 'Primary contact last name',
    example: 'Doe',
    required: false,
  })
  contactLastName?: string;

  @ApiProperty({
    description: 'Primary contact email',
    example: 'john.doe@acmecorp.com',
    required: false,
  })
  contactEmail?: string;

  @ApiProperty({
    description: 'Primary contact phone number',
    example: '+1-555-123-4567',
    required: false,
  })
  contactPhone?: string;

  @ApiProperty({
    description: 'LinkedIn profile URL',
    example: 'https://linkedin.com/in/johndoe',
    required: false,
  })
  contactLinkedIn?: string;

  @ApiProperty({
    description: 'Problem statement or business challenge',
    example: 'Need to automate sales outreach and improve lead conversion',
    required: false,
  })
  problemStatement?: string;

  @ApiProperty({
    description: 'Current tools and systems being used',
    example: ['Salesforce', 'HubSpot', 'Gmail'],
    required: false,
  })
  currentTools?: string[];

  @ApiProperty({
    description: 'Budget range or estimate',
    example: '$10,000 - $25,000',
    required: false,
  })
  budget?: string;

  @ApiProperty({
    description: 'Project timeline or deadline',
    example: 'Q2 2024',
    required: false,
  })
  timeline?: string;

  @ApiProperty({
    description: 'HubSpot deal ID for CRM integration',
    example: '12345678',
    required: false,
  })
  hubspotDealId?: string;

  @ApiProperty({
    description: 'Client status',
    enum: ['prospect', 'qualified', 'proposal', 'negotiation', 'won', 'lost'],
    example: 'prospect',
  })
  status: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  created: string;

  @ApiProperty({
    description: 'Last updated timestamp',
    example: '2024-01-15T10:35:00Z',
  })
  updated: string;
}

export class ClientsListResponseDto {
  @ApiProperty({
    description: 'Array of clients',
    type: [ClientResponseDto],
  })
  data: ClientResponseDto[];

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
