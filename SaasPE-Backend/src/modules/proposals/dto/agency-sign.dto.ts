import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AgencySignDto {
  @ApiPropertyOptional({
    description: 'Base64-encoded signature image (optional if using DocuSign)',
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
  })
  @IsString()
  @IsOptional()
  signatureImage?: string;

  @ApiPropertyOptional({
    description: 'Signer name',
    example: 'John Smith',
  })
  @IsString()
  @IsOptional()
  signerName?: string;
}

export class AgencySignResponseDto {
  @ApiProperty({
    description: 'Proposal ID',
    example: 'proposal-uuid-789',
  })
  id: string;

  @ApiProperty({
    description: 'Agency signed timestamp',
    example: '2025-01-20T14:30:00Z',
  })
  agencySignedAt: Date;

  @ApiProperty({
    description: 'S3 key for signature image',
    example: 'signatures/agency/proposal-uuid-789.png',
  })
  agencySignatureS3?: string;

  @ApiProperty({
    description: 'Message',
    example: 'Proposal signed by agency successfully',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'DocuSign envelope ID if DocuSign was used',
    example: 'envelope-123',
  })
  docusignEnvelopeId?: string;
}
