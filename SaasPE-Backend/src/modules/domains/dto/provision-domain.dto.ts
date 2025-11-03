import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

export class ProvisionDomainDto {
  @IsString()
  @Matches(/^[a-z0-9.-]+\.[a-z]{2,}$/i)
  domain: string;

  @IsOptional()
  @IsBoolean()
  purchase?: boolean;

  @IsOptional()
  @IsString()
  trackingSubdomain?: string; // e.g., "track"

  @IsOptional()
  @IsString()
  returnPathSubdomain?: string; // e.g., "returnpath"

  @IsOptional()
  @IsString()
  dmarcPolicy?: 'none' | 'quarantine' | 'reject';

  @IsOptional()
  @IsString()
  dmarcRua?: string; // e.g., mailto:dmarc@example.com
}


