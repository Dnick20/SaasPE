import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsNumber,
  IsBoolean,
  IsString,
  IsEnum,
  IsObject,
  IsArray,
  Min,
  Max,
} from 'class-validator';

/**
 * Enhanced feedback DTO with multi-dimensional ratings
 * Part of Phase 1: Personalized Learning System
 */
export class SubmitFeedbackDto {
  @ApiPropertyOptional({
    description: 'Simple thumbs up (true) or thumbs down (false) rating',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  thumbsUp?: boolean;

  @ApiPropertyOptional({
    description: 'Overall user rating (1-5)',
    minimum: 1,
    maximum: 5,
    example: 4,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  userRating?: number;

  @ApiPropertyOptional({
    description:
      'Multi-dimensional ratings: { accuracy, tone, length, specificity, persuasiveness, structure }',
    example: {
      accuracy: 5,
      tone: 4,
      length: 3,
      specificity: 4,
      persuasiveness: 5,
      structure: 4,
    },
  })
  @IsOptional()
  @IsObject()
  detailedRatings?: Record<string, number>;

  @ApiPropertyOptional({
    description:
      'Quick categorical feedback tags (e.g., "too_generic", "wrong_tone", "missing_details")',
    example: ['too_generic', 'missing_metrics'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoricalFeedback?: string[];

  @ApiPropertyOptional({
    description: 'Free-text feedback explanation',
    example: 'Good overall, but needs more specific metrics and client details.',
  })
  @IsOptional()
  @IsString()
  feedback?: string;

  @ApiPropertyOptional({
    description: 'Deal outcome status',
    enum: ['won_deal', 'lost_deal', 'no_response', 'in_progress', 'unclear'],
    example: 'won_deal',
  })
  @IsOptional()
  @IsEnum(['won_deal', 'lost_deal', 'no_response', 'in_progress', 'unclear'])
  outcome?: 'won_deal' | 'lost_deal' | 'no_response' | 'in_progress' | 'unclear';

  @ApiPropertyOptional({
    description: 'Deal value in USD (if won)',
    minimum: 0,
    example: 25000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  dealValue?: number;

  @ApiPropertyOptional({
    description: 'Was the proposal edited by the user?',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  wasEdited?: boolean;

  @ApiPropertyOptional({
    description: 'Full edited version of the proposal (if edited)',
    example: 'Edited proposal content...',
  })
  @IsOptional()
  @IsString()
  editedVersion?: string;
}

/**
 * Response DTO for feedback submission
 */
export class SubmitFeedbackResponseDto {
  @ApiProperty({
    description: 'Whether feedback was submitted successfully',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Success or error message',
    example: 'Feedback submitted successfully',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Feedback validation result',
    example: {
      isValid: true,
      confidenceScore: 0.85,
      warnings: [],
      feedbackWeight: 4.5,
    },
  })
  validation?: {
    isValid: boolean;
    confidenceScore: number;
    warnings: string[];
    feedbackWeight: number;
  };
}
