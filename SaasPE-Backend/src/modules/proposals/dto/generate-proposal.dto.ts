import { IsArray, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateProposalDto {
  @ApiProperty({
    description: 'Sections to generate',
    example: [
      'executiveSummary',
      'problemStatement',
      'proposedSolution',
      'scope',
      'timeline',
      'pricing',
    ],
    isArray: true,
  })
  @IsArray()
  @IsString({ each: true })
  sections: string[];

  @ApiProperty({
    description: 'Template ID to use for generation',
    example: 'template-standard-web-dev',
    required: false,
  })
  @IsOptional()
  @IsString()
  useTemplateId?: string;

  @ApiProperty({
    description: 'Additional instructions for AI generation',
    example: 'Focus on mobile-first approach and emphasize SEO benefits',
    required: false,
  })
  @IsOptional()
  @IsString()
  customInstructions?: string;
}
