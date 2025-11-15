import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject } from 'class-validator';

/**
 * DTO for tracking edits made to proposal sections
 * Part of Phase 1: Personalized Learning System
 */
export class TrackEditDto {
  @ApiProperty({
    description: 'Section name that was edited',
    example: 'executiveSummary',
    enum: [
      'overview',
      'executiveSummary',
      'problemStatement',
      'proposedSolution',
      'scopeOfWork',
      'timeline',
      'pricing',
      'termsAndConditions',
    ],
  })
  @IsString()
  section: string;

  @ApiProperty({
    description: 'Original AI-generated text before edits',
    example: 'Original executive summary text...',
  })
  @IsString()
  originalText: string;

  @ApiProperty({
    description: 'User-edited text after changes',
    example: 'Edited executive summary with more specific details...',
  })
  @IsString()
  editedText: string;

  @ApiPropertyOptional({
    description: 'Client industry for context',
    example: 'SaaS',
  })
  @IsOptional()
  @IsString()
  clientIndustry?: string;

  @ApiPropertyOptional({
    description: 'Proposal type for context',
    example: 'new_business',
    enum: ['new_business', 'renewal', 'expansion', 'consulting'],
  })
  @IsOptional()
  @IsString()
  proposalType?: string;

  @ApiPropertyOptional({
    description: 'Additional context metadata',
    example: { clientSize: 'enterprise', urgency: 'high' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * Response DTO for edit tracking
 */
export class TrackEditResponseDto {
  @ApiProperty({
    description: 'Whether edit was tracked successfully',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Success or error message',
    example: 'Edit tracked successfully',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Edit analysis results',
    example: {
      editType: 'addition',
      editCategory: 'adds_metrics',
      editMagnitude: 0.35,
      patterns: [
        {
          type: 'addition',
          category: 'adds_metrics',
          impact: 'high',
          examples: ['increased ROI by 40%', '$250K annual savings'],
        },
      ],
    },
  })
  analysis?: {
    editType: string;
    editCategory: string;
    editMagnitude: number;
    editDistance: number;
    patterns: Array<{
      type: string;
      category: string;
      impact: string;
      examples: string[];
    }>;
  };
}
