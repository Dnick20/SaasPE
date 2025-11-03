import { IsString, IsOptional, IsHexColor } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTenantBrandingDto {
  @ApiProperty({
    description: 'S3 key for the logo file',
    example: 'tenants/abc-123/logo.png',
  })
  @IsString()
  @IsOptional()
  logoS3Key?: string;

  @ApiProperty({
    description: 'Public URL for the logo',
    example: 'https://s3.amazonaws.com/bucket/tenants/abc-123/logo.png',
  })
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiProperty({
    description: 'Primary brand color (hex)',
    example: '#1E40AF',
    default: '#1E40AF',
  })
  @IsHexColor()
  @IsOptional()
  primaryColor?: string;

  @ApiProperty({
    description: 'Secondary brand color (hex)',
    example: '#F97316',
    default: '#F97316',
  })
  @IsHexColor()
  @IsOptional()
  secondaryColor?: string;

  @ApiPropertyOptional({
    description: 'Accent brand color (hex)',
    example: '#8B5CF6',
  })
  @IsHexColor()
  @IsOptional()
  accentColor?: string;

  @ApiProperty({
    description: 'Font family for body text',
    example: 'Inter',
    default: 'Inter',
  })
  @IsString()
  @IsOptional()
  fontFamily?: string;

  @ApiProperty({
    description: 'Font family for headings',
    example: 'Inter',
    default: 'Inter',
  })
  @IsString()
  @IsOptional()
  headingFont?: string;

  @ApiProperty({
    description: 'Company name (for PDF cover pages)',
    example: 'Acme Corporation',
  })
  @IsString()
  companyName: string;

  @ApiPropertyOptional({
    description: 'Company address',
    example: '123 Main St, San Francisco, CA 94105',
  })
  @IsString()
  @IsOptional()
  companyAddress?: string;

  @ApiPropertyOptional({
    description: 'Company phone number',
    example: '+1 (555) 123-4567',
  })
  @IsString()
  @IsOptional()
  companyPhone?: string;

  @ApiPropertyOptional({
    description: 'Company email address',
    example: 'contact@acme.com',
  })
  @IsString()
  @IsOptional()
  companyEmail?: string;

  @ApiPropertyOptional({
    description: 'Company website URL',
    example: 'https://www.acme.com',
  })
  @IsString()
  @IsOptional()
  companyWebsite?: string;

  @ApiPropertyOptional({
    description: 'Company tagline or slogan',
    example: 'Innovation Through Excellence',
  })
  @IsString()
  @IsOptional()
  companyTagline?: string;

  @ApiPropertyOptional({
    description: 'Footer text for PDF templates',
    example: 'Confidential - For Client Review Only',
  })
  @IsString()
  @IsOptional()
  footerText?: string;

  @ApiProperty({
    description: 'Logo position in PDFs',
    enum: ['header', 'cover-only'],
    example: 'header',
    default: 'header',
  })
  @IsString()
  @IsOptional()
  logoPosition?: 'header' | 'cover-only';

  @ApiProperty({
    description: 'E-signature provider for proposals',
    enum: ['docusign', 'adobe_sign', 'signnow', 'google_workspace'],
    example: 'docusign',
    default: 'docusign',
  })
  @IsString()
  @IsOptional()
  eSignatureProvider?:
    | 'docusign'
    | 'adobe_sign'
    | 'signnow'
    | 'google_workspace';
}
