import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TenantBrandingResponseDto {
  @ApiProperty({ example: 'uuid-123' })
  id: string;

  @ApiProperty({ example: 'tenant-uuid-456' })
  tenantId: string;

  @ApiPropertyOptional({ example: 'tenants/abc-123/logo.png' })
  logoS3Key: string | null;

  @ApiPropertyOptional({
    example: 'https://s3.amazonaws.com/bucket/tenants/abc-123/logo.png',
  })
  logoUrl: string | null;

  @ApiProperty({ example: '#1E40AF' })
  primaryColor: string;

  @ApiProperty({ example: '#F97316' })
  secondaryColor: string;

  @ApiPropertyOptional({ example: '#8B5CF6' })
  accentColor: string | null;

  @ApiProperty({ example: 'Inter' })
  fontFamily: string;

  @ApiProperty({ example: 'Inter' })
  headingFont: string;

  @ApiProperty({ example: 'Acme Corporation' })
  companyName: string;

  @ApiPropertyOptional({ example: '123 Main St, San Francisco, CA 94105' })
  companyAddress: string | null;

  @ApiPropertyOptional({ example: '+1 (555) 123-4567' })
  companyPhone: string | null;

  @ApiPropertyOptional({ example: 'contact@acme.com' })
  companyEmail: string | null;

  @ApiPropertyOptional({ example: 'https://www.acme.com' })
  companyWebsite: string | null;

  @ApiPropertyOptional({ example: 'Innovation Through Excellence' })
  companyTagline: string | null;

  @ApiPropertyOptional({ example: 'Confidential - For Client Review Only' })
  footerText: string | null;

  @ApiProperty({ example: 'header' })
  logoPosition: string;

  @ApiProperty({
    example: 'docusign',
    enum: ['docusign', 'adobe_sign', 'signnow', 'google_workspace'],
    description: 'E-signature provider for proposals',
  })
  eSignatureProvider: string;

  @ApiProperty({ example: '2025-01-15T10:30:00Z' })
  created: Date;

  @ApiProperty({ example: '2025-01-20T14:45:00Z' })
  updated: Date;
}
