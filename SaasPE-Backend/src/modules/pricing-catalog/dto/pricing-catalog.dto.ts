import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class PricingCatalogItemDto {
  @ApiProperty({ description: 'Item name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Item description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ['recurring', 'one-time'] })
  @IsString()
  @IsIn(['recurring', 'one-time'])
  type: 'recurring' | 'one-time';

  @ApiProperty({ description: 'Default unit price' })
  @IsNumber()
  unitPrice: number;

  @ApiPropertyOptional({ enum: ['monthly', 'yearly'] })
  @IsOptional()
  @IsString()
  billingPeriod?: 'monthly' | 'yearly';

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  taxPct?: number;
}


