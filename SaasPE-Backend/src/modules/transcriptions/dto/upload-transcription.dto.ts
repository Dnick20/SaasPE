import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadTranscriptionDto {
  // NOTE: 'file' is handled by @UploadedFile() and FileInterceptor, not this DTO
  // Including it here causes validation errors with forbidNonWhitelisted: true

  @ApiProperty({
    description: 'Optional client ID to associate with this transcription',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiProperty({
    description: 'Override the uploaded filename',
    example: 'client-discovery-call-2024-01-15.mp3',
    required: false,
  })
  @IsOptional()
  @IsString()
  fileName?: string;
}
