import { IsString, IsUUID, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProposalDto {
  @ApiProperty({
    description: 'Client ID to create proposal for',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  clientId: string;

  @ApiProperty({
    description: 'Optional source transcription ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  transcriptionId?: string;

  @ApiProperty({
    description: 'Proposal title',
    example: 'Website Redesign Proposal for Acme Corp',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Proposal template ID to use',
    example: 'template-standard-web-dev',
    required: false,
  })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiProperty({
    description: 'Custom template variables',
    example: { companyName: 'Acme Corp', projectType: 'Website Redesign' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;
}
