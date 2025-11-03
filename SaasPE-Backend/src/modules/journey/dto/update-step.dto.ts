import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject } from 'class-validator';

export class UpdateStepDto {
  @ApiProperty({
    example: 'client',
    description: 'Step name to mark as complete or update',
  })
  @IsString()
  step: string;

  @ApiProperty({
    example: { clientId: 'uuid-v4', clientName: 'Acme Corp' },
    description: 'Optional metadata to attach to this step',
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
