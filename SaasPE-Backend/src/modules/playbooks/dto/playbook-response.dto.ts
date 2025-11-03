import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PlaybookResponseDto {
  @ApiProperty({
    description: 'Playbook ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Tenant ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  tenantId: string;

  @ApiProperty({
    description: 'Client ID',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  clientId: string;

  @ApiPropertyOptional({
    description: 'Proposal ID (if linked)',
    example: '123e4567-e89b-12d3-a456-426614174003',
  })
  proposalId?: string;

  @ApiProperty({
    description: 'Target ICP data',
  })
  targetICP: Record<string, any>;

  @ApiProperty({
    description: 'Email script',
  })
  emailScript: Record<string, any>;

  @ApiProperty({
    description: 'LinkedIn script',
  })
  linkedInScript: Record<string, any>;

  @ApiProperty({
    description: 'Cold call script',
  })
  coldCallScript: Record<string, any>;

  @ApiProperty({
    description: 'Communication tone',
  })
  tone: string;

  @ApiProperty({
    description: 'Campaign structure',
  })
  structure: Record<string, any>;

  @ApiProperty({
    description: 'Call-to-actions',
  })
  ctas: string[];

  @ApiPropertyOptional({
    description: 'Compliance notes',
  })
  compliance?: Record<string, any>;

  @ApiProperty({
    description: 'Number of campaigns',
  })
  campaignCount: number;

  @ApiProperty({
    description: 'Campaign strategy',
  })
  campaignStrategy: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Google Doc URL',
  })
  googleDocUrl?: string;

  @ApiPropertyOptional({
    description: 'PDF S3 key',
  })
  pdfS3Key?: string;

  @ApiPropertyOptional({
    description: 'PDF URL',
  })
  pdfUrl?: string;

  @ApiProperty({
    description: 'Playbook version number',
    example: 1,
  })
  version: number;

  @ApiProperty({
    description: 'Whether this playbook is a reusable template',
    example: false,
  })
  isTemplate: boolean;

  @ApiProperty({
    description: 'User ID who created this playbook',
    example: '123e4567-e89b-12d3-a456-426614174004',
  })
  createdBy: string;

  @ApiProperty({
    description: 'Creation timestamp',
  })
  created: Date;

  @ApiProperty({
    description: 'Last update timestamp',
  })
  updated: Date;
}
