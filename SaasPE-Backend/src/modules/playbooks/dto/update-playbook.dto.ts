import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsObject,
  IsArray,
  IsInt,
  Min,
  IsBoolean,
} from 'class-validator';

export class UpdatePlaybookDto {
  @ApiPropertyOptional({
    description: 'Target ICP (Ideal Customer Profile) data',
  })
  @IsOptional()
  @IsObject()
  targetICP?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Email script with subject, body, CTA, and follow-up sequence',
  })
  @IsOptional()
  @IsObject()
  emailScript?: Record<string, any>;

  @ApiPropertyOptional({
    description:
      'LinkedIn script with connection request, first message, and follow-up message',
  })
  @IsOptional()
  @IsObject()
  linkedInScript?: Record<string, any>;

  @ApiPropertyOptional({
    description:
      'Cold call script with opener, discovery, objection handling, and close',
  })
  @IsOptional()
  @IsObject()
  coldCallScript?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Communication tone',
  })
  @IsOptional()
  @IsString()
  tone?: string;

  @ApiPropertyOptional({
    description: 'Campaign structure and sequence timing',
  })
  @IsOptional()
  @IsObject()
  structure?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Call-to-actions',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ctas?: string[];

  @ApiPropertyOptional({
    description: 'Legal and compliance notes',
  })
  @IsOptional()
  @IsObject()
  compliance?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Number of campaigns to create',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  campaignCount?: number;

  @ApiPropertyOptional({
    description: 'Campaign strategy with channels, touchpoints, and cadence',
  })
  @IsOptional()
  @IsObject()
  campaignStrategy?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Google Doc export URL',
  })
  @IsOptional()
  @IsString()
  googleDocUrl?: string;

  @ApiPropertyOptional({
    description: 'PDF S3 key',
  })
  @IsOptional()
  @IsString()
  pdfS3Key?: string;

  @ApiPropertyOptional({
    description: 'PDF public/signed URL',
  })
  @IsOptional()
  @IsString()
  pdfUrl?: string;

  @ApiPropertyOptional({
    description: 'Playbook version number',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;

  @ApiPropertyOptional({
    description: 'Whether this playbook is a reusable template',
  })
  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;
}
