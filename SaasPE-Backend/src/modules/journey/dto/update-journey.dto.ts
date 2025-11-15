import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, IsObject } from 'class-validator';

export class UpdateJourneyDto {
  @ApiProperty({
    example: 'client',
    description:
      'Current step: discovery, client, proposal, mailboxes, warmup, campaign, complete',
  })
  @IsString()
  currentStep: string;

  @ApiProperty({
    example: ['discovery'],
    description: 'Array of completed step names',
  })
  @IsArray()
  @IsString({ each: true })
  completedSteps: string[];

  @ApiProperty({
    example: {
      discoveryResponses: { companyName: 'Acme Inc' },
      linkedEntityIds: { clientId: 'uuid-v4' },
    },
    description:
      'Metadata object to store discovery responses and linked entity IDs',
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
