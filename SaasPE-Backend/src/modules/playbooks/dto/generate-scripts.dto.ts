import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsArray, IsObject, IsOptional } from 'class-validator';

export class GenerateScriptsDto {
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
  targetICP: {
    industry?: string;
    companySize?: string;
    roles?: string[];
    painPoints?: string[];
    [key: string]: any;
  };

  @ApiProperty({
    description: 'Communication tone',
    example: 'professional',
    enum: ['professional', 'friendly', 'direct', 'casual'],
  })
  @IsString()
  tone: string;

  @ApiProperty({
    description: 'Call-to-actions to include',
    example: ['Schedule a demo', 'Download whitepaper'],
  })
  @IsArray()
  @IsString({ each: true })
  ctas: string[];

  @ApiPropertyOptional({
    description: 'Optional client context for personalization',
    example: {
      companyName: 'Acme Corp',
      problemStatement: 'Need to modernize infrastructure',
      currentTools: ['Jenkins', 'Ansible'],
    },
  })
  @IsOptional()
  @IsObject()
  clientContext?: {
    companyName?: string;
    problemStatement?: string;
    currentTools?: string[];
  };
}
