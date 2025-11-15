import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Edit pattern extracted from user's history
 */
export class EditPatternDto {
  @ApiProperty({
    description: 'Type of edit',
    example: 'addition',
    enum: ['addition', 'deletion', 'replacement', 'tone_shift', 'length_change'],
  })
  type: string;

  @ApiProperty({
    description: 'Category of the edit',
    example: 'adds_metrics',
  })
  category: string;

  @ApiProperty({
    description: 'Frequency score (weighted by recency)',
    example: 8.5,
  })
  frequency: number;

  @ApiProperty({
    description: 'Examples of this pattern',
    example: ['Added ROI metrics', 'Included cost savings'],
  })
  examples: string[];

  @ApiProperty({
    description: 'Impact level',
    example: 'high',
    enum: ['high', 'medium', 'low'],
  })
  impact: string;
}

/**
 * User's personalized learning profile
 */
export class LearningProfileResponseDto {
  @ApiProperty({
    description: 'User ID',
    example: 'user-123',
  })
  userId: string;

  @ApiProperty({
    description: 'Tenant ID',
    example: 'tenant-456',
  })
  tenantId: string;

  @ApiPropertyOptional({
    description: 'Preferred tone (learned from edits)',
    example: 'consultative',
    enum: ['professional', 'casual', 'consultative', 'technical'],
  })
  preferredTone?: string;

  @ApiPropertyOptional({
    description: 'Preferred length (learned from edits)',
    example: 'detailed',
    enum: ['concise', 'detailed', 'comprehensive'],
  })
  preferredLength?: string;

  @ApiProperty({
    description: 'Top 10 most frequent edit patterns',
    type: [EditPatternDto],
  })
  topEditPatterns: EditPatternDto[];

  @ApiProperty({
    description: 'Sections consistently rated high or left unedited',
    example: ['executiveSummary', 'pricing'],
  })
  commonStrengths: string[];

  @ApiProperty({
    description: 'Sections needing improvement (frequently edited or rated low)',
    example: ['scopeOfWork', 'timeline'],
  })
  commonWeaknesses: string[];

  @ApiProperty({
    description: 'Patterns user consistently removes (things to avoid)',
    example: ['removes_jargon', 'removes_fluff'],
  })
  avoidPatterns: string[];

  @ApiProperty({
    description: 'Patterns user consistently adds (things to emphasize)',
    example: ['adds_metrics', 'adds_client_specifics'],
  })
  emphasizePatterns: string[];

  @ApiProperty({
    description: 'Number of feedback/edit samples used to build this profile',
    example: 25,
  })
  sampleSize: number;

  @ApiProperty({
    description: 'Confidence score (0-1) - how confident we are in this profile',
    example: 0.82,
    minimum: 0,
    maximum: 1,
  })
  confidenceScore: number;

  @ApiPropertyOptional({
    description: 'Industry-specific preferences',
    example: {
      SaaS: { tone: 'technical', emphasizeROI: true },
      Healthcare: { tone: 'professional', emphasizeCompliance: true },
    },
  })
  industryPreferences?: Record<string, any>;

  @ApiProperty({
    description: 'Personalization enabled for this user',
    example: true,
  })
  enablePersonalization: boolean;

  @ApiProperty({
    description: 'When this profile was last updated',
    example: '2025-11-03T10:30:00Z',
  })
  lastUpdated: string;
}

/**
 * Edit statistics for a user
 */
export class EditStatsResponseDto {
  @ApiProperty({
    description: 'Total number of edits tracked',
    example: 42,
  })
  totalEdits: number;

  @ApiProperty({
    description: 'Average edit magnitude (0-1, percentage of content changed)',
    example: 0.35,
  })
  avgEditMagnitude: number;

  @ApiProperty({
    description: 'Distribution of edit types',
    example: {
      addition: 15,
      deletion: 10,
      replacement: 12,
      tone_shift: 5,
    },
  })
  typeDistribution: Record<string, number>;

  @ApiProperty({
    description: 'Distribution of edit categories',
    example: {
      adds_metrics: 8,
      removes_jargon: 6,
      adds_client_specifics: 7,
    },
  })
  categoryDistribution: Record<string, number>;

  @ApiProperty({
    description: 'Distribution of edits by section',
    example: {
      executiveSummary: 15,
      scopeOfWork: 12,
      pricing: 8,
    },
  })
  sectionDistribution: Record<string, number>;

  @ApiPropertyOptional({
    description: 'Most frequently edited section',
    example: 'executiveSummary',
  })
  mostEditedSection?: string;

  @ApiPropertyOptional({
    description: 'Most common edit category',
    example: 'adds_metrics',
  })
  mostCommonEditCategory?: string;
}

/**
 * Tenant-wide profile statistics
 */
export class TenantProfileStatsResponseDto {
  @ApiProperty({
    description: 'Total number of user profiles',
    example: 15,
  })
  totalProfiles: number;

  @ApiProperty({
    description: 'Average profile confidence score',
    example: 0.75,
  })
  avgConfidence: number;

  @ApiProperty({
    description: 'Average sample size per profile',
    example: 18.5,
  })
  avgSampleSize: number;

  @ApiProperty({
    description: 'Distribution of preferred tones across all users',
    example: {
      professional: 5,
      consultative: 7,
      technical: 3,
    },
  })
  toneDistribution: Record<string, number>;

  @ApiProperty({
    description: 'Distribution of preferred lengths across all users',
    example: {
      concise: 4,
      detailed: 8,
      comprehensive: 3,
    },
  })
  lengthDistribution: Record<string, number>;

  @ApiProperty({
    description: 'Number of high-confidence profiles (confidence > 0.7)',
    example: 10,
  })
  highConfidenceProfiles: number;
}
