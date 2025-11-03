import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, IsIn } from 'class-validator';

export class UpdateCompanyProfileDto {
  @ApiProperty({
    example: 'Acme Inc',
    description: 'Company name',
    required: false,
  })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiProperty({
    example: 'https://acme.com',
    description: 'Company website URL',
    required: false,
  })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiProperty({
    example: 'B2B SaaS',
    description: 'Industry or vertical',
    required: false,
  })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiProperty({
    example: 'Marketing directors at B2B SaaS companies with 50-200 employees',
    description: 'Ideal Customer Profile description',
    required: false,
  })
  @IsOptional()
  @IsString()
  targetICP?: string;

  @ApiProperty({
    example: 'professional',
    description:
      'Email tone preference: professional, casual, consultative, friendly',
    required: false,
    enum: ['professional', 'casual', 'consultative', 'friendly'],
  })
  @IsOptional()
  @IsIn(['professional', 'casual', 'consultative', 'friendly'])
  preferredTone?: string;

  @ApiProperty({
    example: {
      description: 'AI-powered agency automation platform',
      technologies: ['React', 'Node.js'],
      socialMedia: { linkedin: 'https://linkedin.com/company/acme' },
    },
    description: 'Enrichment data from website scraping',
    required: false,
  })
  @IsOptional()
  @IsObject()
  enrichmentData?: Record<string, any>;

  @ApiProperty({
    example: {
      defaultProposalTemplate: 'professional',
      defaultCampaignTone: 'consultative',
    },
    description: 'Default settings for campaigns and proposals',
    required: false,
  })
  @IsOptional()
  @IsObject()
  defaultSettings?: Record<string, any>;
}
