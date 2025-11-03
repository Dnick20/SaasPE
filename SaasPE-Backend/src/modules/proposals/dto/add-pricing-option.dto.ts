import {
  IsString,
  IsNumber,
  IsArray,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class PricingItemDto {
  @ApiProperty({
    description: 'Item name',
    example: 'SEO Optimization',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Item description',
    example: 'Comprehensive SEO strategy and implementation',
  })
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Price in USD',
    example: 5000,
  })
  @IsNumber()
  price: number;
}

export class AddPricingOptionDto {
  @ApiProperty({
    description: 'Option name (e.g., A, B, Premium, Standard)',
    example: 'Option A',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Option description',
    example: 'Comprehensive package with all features',
  })
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Pricing items in this option',
    type: [PricingItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PricingItemDto)
  items: PricingItemDto[];

  @ApiProperty({
    description: 'Total price for this option',
    example: 15000,
  })
  @IsNumber()
  total: number;
}

export class AddPricingOptionResponseDto {
  @ApiProperty({
    description: 'Proposal ID',
    example: 'proposal-uuid-789',
  })
  id: string;

  @ApiProperty({
    description: 'Updated pricing options',
    example: [
      {
        name: 'Option A',
        description: 'Comprehensive package',
        items: [],
        total: 15000,
      },
    ],
  })
  pricingOptions: any[];

  @ApiProperty({
    description: 'Message',
    example: 'Pricing option added successfully',
  })
  message: string;
}
