import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PricingItemDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: ['recurring', 'one-time'] })
  @IsString()
  @IsIn(['recurring', 'one-time'])
  type: 'recurring' | 'one-time';

  @ApiProperty()
  @IsNumber()
  unitPrice: number;

  @ApiProperty()
  @IsNumber()
  quantity: number;

  @ApiProperty({ required: false, enum: ['monthly', 'yearly', null] })
  @IsOptional()
  @IsString()
  billingPeriod?: 'monthly' | 'yearly';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  discountPct?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  taxPct?: number;
}

export class UpdateProposalPricingDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ type: [PricingItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PricingItemDto)
  items: PricingItemDto[];
}


