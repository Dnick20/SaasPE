import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GenerateAIProposalDto {
  @ApiProperty({ description: 'Client ID to generate the proposal for' })
  @IsString()
  clientId: string;

  @ApiPropertyOptional({ description: 'Optional transcription ID to use as context' })
  @IsOptional()
  @IsString()
  transcriptionId?: string;

  @ApiPropertyOptional({ description: 'Optional proposal title override' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Desired writing tone (e.g., professional, friendly)' })
  @IsOptional()
  @IsString()
  tone?: string;

  @ApiPropertyOptional({ description: 'Optional brand voice identifier' })
  @IsOptional()
  @IsString()
  brandVoiceId?: string;
}


