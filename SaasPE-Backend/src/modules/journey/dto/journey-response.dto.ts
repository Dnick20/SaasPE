import { ApiProperty } from '@nestjs/swagger';

export class JourneyResponseDto {
  @ApiProperty({ example: 'uuid-v4' })
  id: string;

  @ApiProperty({ example: 'uuid-v4' })
  userId: string;

  @ApiProperty({
    example: 'client',
    description:
      'Current step in the journey: discovery, client, proposal, mailboxes, warmup, campaign, complete',
  })
  currentStep: string;

  @ApiProperty({
    example: ['discovery', 'client'],
    description: 'Array of completed step names',
  })
  completedSteps: string[];

  @ApiProperty({
    example: ['warmup'],
    description: 'Array of skipped step names',
    required: false,
  })
  skippedSteps?: string[];

  @ApiProperty({
    example: {
      discoveryResponses: { companyName: 'Acme Inc', targetICP: 'B2B SaaS' },
      linkedEntityIds: { clientId: 'uuid', proposalId: 'uuid' },
    },
    description:
      'Journey metadata including discovery responses and linked entity IDs',
  })
  metadata: Record<string, any>;

  @ApiProperty({
    example: 42.85,
    description: 'Journey completion progress (0-100%)',
  })
  progress: number;

  @ApiProperty({ example: '2025-10-28T10:30:00Z' })
  lastActiveAt: Date;

  @ApiProperty({ example: '2025-10-28T08:00:00Z' })
  startedAt: Date;

  @ApiProperty({ example: '2025-10-28T18:00:00Z', nullable: true })
  completedAt?: Date | null;

  @ApiProperty({ example: '2025-10-28T08:00:00Z' })
  created: Date;

  @ApiProperty({ example: '2025-10-28T10:30:00Z' })
  updated: Date;
}
