import { IsOptional, IsString, IsUrl, IsArray, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateClientDto {
  @ApiProperty({
    description: 'Company name',
    example: 'Acme Corporation',
  })
  @IsString()
  companyName: string;

  @ApiProperty({
    description: 'Industry sector',
    example: 'Technology',
    required: false,
  })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiProperty({
    description: 'Company website URL',
    example: 'https://www.acmecorp.com',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiProperty({
    description: 'Primary contact first name',
    example: 'John',
    required: false,
  })
  @IsOptional()
  @IsString()
  contactFirstName?: string;

  @ApiProperty({
    description: 'Primary contact last name',
    example: 'Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  contactLastName?: string;

  @ApiProperty({
    description: 'Primary contact email',
    example: 'john.doe@acmecorp.com',
    required: false,
  })
  @IsOptional()
  @IsString()
  contactEmail?: string;

  @ApiProperty({
    description: 'Primary contact phone number',
    example: '+1-555-123-4567',
    required: false,
  })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiProperty({
    description: 'LinkedIn profile URL',
    example: 'https://linkedin.com/in/johndoe',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  contactLinkedIn?: string;

  @ApiProperty({
    description: 'Problem statement or business challenge',
    example: 'Need to automate sales outreach and improve lead conversion',
    required: false,
  })
  @IsOptional()
  @IsString()
  problemStatement?: string;

  @ApiProperty({
    description: 'Current tools and systems being used',
    example: ['Salesforce', 'HubSpot', 'Gmail'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  currentTools?: string[];

  @ApiProperty({
    description: 'Budget range or estimate',
    example: '$10,000 - $25,000',
    required: false,
  })
  @IsOptional()
  @IsString()
  budget?: string;

  @ApiProperty({
    description: 'Project timeline or deadline',
    example: 'Q2 2024',
    required: false,
  })
  @IsOptional()
  @IsString()
  timeline?: string;

  @ApiProperty({
    description: 'Budget note or context',
    example: 'Clay $800/mo + 20 hours of development',
    required: false,
  })
  @IsOptional()
  @IsString()
  budgetNote?: string;

  @ApiProperty({
    description: 'Timeline note with commitments and checkpoints',
    example: 'Weekly sync meetings, Q2 deadline for MVP',
    required: false,
  })
  @IsOptional()
  @IsString()
  timelineNote?: string;

  @ApiProperty({
    description: 'Additional contacts (JSON array of contact objects)',
    example: [
      {
        role_or_note: 'Technical Lead',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane@acme.com',
      },
    ],
    required: false,
  })
  @IsOptional()
  additionalContacts?: any;

  @ApiProperty({
    description: 'Deliverables and logistics information',
    example:
      '• Client provides CSV files weekly\n• We deliver JSON via API\n• Files must be UTF-8 encoded',
    required: false,
  })
  @IsOptional()
  @IsString()
  deliverablesLogistics?: string;

  @ApiProperty({
    description: 'Key meetings schedule',
    example:
      '• Weekly sync: Mondays 10am EST\n• Monthly review: First Friday of month',
    required: false,
  })
  @IsOptional()
  @IsString()
  keyMeetingsSchedule?: string;

  @ApiProperty({
    description: 'HubSpot deal ID for CRM integration',
    example: '12345678',
    required: false,
  })
  @IsOptional()
  @IsString()
  hubspotDealId?: string;

  @ApiProperty({
    description: 'Client status',
    enum: ['prospect', 'qualified', 'proposal', 'negotiation', 'won', 'lost'],
    example: 'prospect',
    required: false,
  })
  @IsOptional()
  @IsEnum(['prospect', 'qualified', 'proposal', 'negotiation', 'won', 'lost'])
  status?: string;
}
