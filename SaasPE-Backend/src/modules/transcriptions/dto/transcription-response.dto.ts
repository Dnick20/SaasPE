import { ApiProperty } from '@nestjs/swagger';

export class TranscriptionResponseDto {
  @ApiProperty({
    description: 'Transcription ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Original file name',
    example: 'client-meeting-2024-01-15.mp3',
  })
  fileName: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 15728640,
  })
  fileSize: number;

  @ApiProperty({
    description: 'Audio/video duration in seconds',
    example: 1834,
    required: false,
  })
  duration?: number;

  @ApiProperty({
    description: 'Processing status',
    enum: ['uploaded', 'processing', 'completed', 'failed'],
    example: 'processing',
  })
  status: string;

  @ApiProperty({
    description: 'S3 key for the uploaded file',
    example: 'tenant-123/transcriptions/abc-def-123.mp3',
  })
  s3Key: string;

  @ApiProperty({
    description: 'Full transcript text',
    example: 'Hello, this is a test transcript...',
    required: false,
  })
  transcript?: string;

  @ApiProperty({
    description: 'Transcription confidence score (0-1)',
    example: 0.92,
    required: false,
  })
  confidence?: number;

  @ApiProperty({
    description: 'Detected language code',
    example: 'en',
    required: false,
  })
  language?: string;

  @ApiProperty({
    description: 'Whether AI analysis has been performed',
    example: false,
  })
  analyzed: boolean;

  @ApiProperty({
    description: 'AI-extracted structured data',
    example: {
      problemStatement: 'Need to automate sales outreach',
      budget: { min: 5000, max: 10000, currency: 'USD' },
    },
    required: false,
  })
  extractedData?: any;

  @ApiProperty({
    description: 'Whether this transcription led to won business',
    example: false,
  })
  wonBusiness: boolean;

  @ApiProperty({
    description: 'Whether this is marked as an example for AI learning',
    example: false,
  })
  isExample: boolean;

  @ApiProperty({
    description: 'AI-generated sales tips based on transcription analysis',
    example: {
      strengths: ['Strong rapport building', 'Clear value proposition'],
      improvements: ['Could ask more discovery questions'],
      keyMoments: [
        'Timestamp 5:30 - Client showed strong interest in automation',
      ],
    },
    required: false,
  })
  salesTips?: any;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  created: string;

  @ApiProperty({
    description: 'Completion timestamp',
    example: '2024-01-15T10:35:00Z',
    required: false,
  })
  completed?: string;

  @ApiProperty({
    description: 'Error message if processing failed',
    example: null,
    required: false,
  })
  error?: string;
}

export class TranscriptionsListResponseDto {
  @ApiProperty({
    description: 'Array of transcriptions',
    type: [TranscriptionResponseDto],
  })
  data: TranscriptionResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    example: {
      page: 1,
      limit: 20,
      total: 45,
      totalPages: 3,
    },
  })
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class AnalyzeResponseDto {
  @ApiProperty({
    description: 'Transcription ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Updated status',
    example: 'analyzing',
  })
  status: string;

  @ApiProperty({
    description: 'Background job ID',
    example: '456',
  })
  jobId: string;
}
