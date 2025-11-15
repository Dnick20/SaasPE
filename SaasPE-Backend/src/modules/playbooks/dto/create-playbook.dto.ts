import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsObject,
  IsArray,
  IsInt,
  Min,
  IsBoolean,
} from 'class-validator';

export class CreatePlaybookDto {
  @ApiProperty({
    description: 'Client ID this playbook belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  clientId: string;

  @ApiPropertyOptional({
    description: 'Optional proposal ID to link playbook to',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsString()
  proposalId?: string;

  @ApiProperty({
    description: 'Target ICP (Ideal Customer Profile) data',
    example: {
      industry: 'Technology',
      companySize: '50-200 employees',
      roles: ['CTO', 'VP Engineering'],
      painPoints: ['Scaling issues', 'Legacy systems'],
    },
  })
  @IsObject()
  targetICP: Record<string, any>;

  @ApiProperty({
    description: 'Email script with subject, body, CTA, and follow-up sequence',
    example: {
      subject: 'Solving [Pain Point] for [Company]',
      body: 'Hi [First Name], ...',
      ctaText: 'Schedule a call',
      ctaUrl: 'https://calendly.com/...',
      followUpSequence: ['Follow-up 1', 'Follow-up 2'],
    },
  })
  @IsObject()
  emailScript: Record<string, any>;

  @ApiProperty({
    description:
      'LinkedIn script with connection request, first message, and follow-up message',
    example: {
      connectionRequest: 'Hi [First Name], ...',
      firstMessage: 'Thank you for connecting! I noticed...',
      followUpMessage: 'Following up on our previous conversation...',
    },
  })
  @IsObject()
  linkedInScript: Record<string, any>;

  @ApiProperty({
    description:
      'Cold call script with opener, discovery, objection handling, and close',
    example: {
      opener: 'Hi [First Name], ...',
      discovery: ['Question 1', 'Question 2'],
      objectionHandling: { 'Not interested': 'Response' },
      close: 'Close statement',
    },
  })
  @IsObject()
  coldCallScript: Record<string, any>;

  @ApiProperty({
    description: 'Communication tone',
    example: 'professional',
    enum: ['professional', 'friendly', 'direct', 'casual'],
  })
  @IsString()
  tone: string;

  @ApiProperty({
    description: 'Campaign structure and sequence timing',
    example: {
      phases: ['Awareness', 'Consideration', 'Decision'],
      touchpoints: 7,
      cadence: 'Day 1, Day 3, Day 7, Day 14',
    },
  })
  @IsObject()
  structure: Record<string, any>;

  @ApiProperty({
    description: 'Call-to-actions',
    example: ['Schedule a demo', 'Download whitepaper', 'Book a call'],
  })
  @IsArray()
  @IsString({ each: true })
  ctas: string[];

  @ApiPropertyOptional({
    description: 'Legal and compliance notes',
    example: {
      gdpr: 'Include unsubscribe link',
      canSpam: 'Include physical address',
    },
  })
  @IsOptional()
  @IsObject()
  compliance?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Number of campaigns to create',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  campaignCount?: number;

  @ApiProperty({
    description: 'Campaign strategy with channels, touchpoints, and cadence',
    example: {
      channels: ['Email', 'LinkedIn', 'Phone'],
      touchpoints: 7,
      cadence: { email: 3, linkedin: 2, phone: 2 },
    },
  })
  @IsObject()
  campaignStrategy: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Playbook version number',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;

  @ApiPropertyOptional({
    description: 'Whether this playbook is a reusable template',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;

  @ApiPropertyOptional({
    description: 'User ID who created this playbook',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @IsOptional()
  @IsString()
  createdBy?: string;
}
