import { IsString, IsOptional, IsObject, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProposalFromTranscriptionDto {
  @ApiPropertyOptional({
    description: 'Client ID (optional if auto-creating from transcription)',
    example: 'client-uuid-123',
  })
  @IsString()
  @IsOptional()
  clientId?: string;

  @ApiProperty({
    description: 'Transcription ID to generate from',
    example: 'transcription-uuid-456',
  })
  @IsString()
  transcriptionId: string;

  @ApiProperty({
    description: 'Proposal title',
    example: 'Digital Marketing Proposal for Acme Corp',
  })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    description: 'Cover page data (term, dates, prepared by, etc.)',
    example: {
      term: '12 months',
      startDate: '2025-02-01',
      endDate: '2026-01-31',
      preparedBy: 'John Smith',
      preparedFor: 'Jane Doe',
    },
  })
  @IsObject()
  @IsOptional()
  coverPageData?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Include table of contents in generated proposal',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  tableOfContents?: boolean;

  @ApiPropertyOptional({
    description: 'Additional template variables',
    example: { customField1: 'value1' },
  })
  @IsObject()
  @IsOptional()
  variables?: Record<string, any>;
}

export class CreateProposalFromTranscriptionResponseDto {
  @ApiProperty({
    description: 'Proposal ID',
    example: 'proposal-uuid-789',
  })
  id: string;

  @ApiProperty({
    description: 'Job ID for background generation',
    example: 'job-123',
  })
  jobId: string;

  @ApiProperty({
    description: 'Status of the proposal',
    example: 'generating',
  })
  status: string;

  @ApiProperty({
    description: 'Message',
    example: 'Proposal is being generated from transcription',
  })
  message: string;
}
