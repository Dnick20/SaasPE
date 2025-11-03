import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class SkipStepDto {
  @ApiProperty({
    example: 'warmup',
    description:
      'Step name to skip (will be marked as both skipped and completed)',
  })
  @IsString()
  step: string;
}
