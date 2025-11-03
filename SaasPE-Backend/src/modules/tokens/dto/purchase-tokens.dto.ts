import { IsNumber, IsPositive, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for purchasing additional tokens
 */
export class PurchaseTokensDto {
  @ApiProperty({
    description: 'Number of tokens to purchase',
    example: 10000,
    minimum: 1,
  })
  @IsNumber()
  @IsPositive()
  tokenAmount: number;

  @ApiProperty({
    description: 'Optional payment information (for future Stripe integration)',
    required: false,
    example: { paymentMethodId: 'pm_xxx', customerId: 'cus_xxx' },
  })
  @IsOptional()
  @IsObject()
  paymentInfo?: any;
}

/**
 * Response DTO for token purchase
 */
export class PurchaseTokensResponseDto {
  @ApiProperty({
    description: 'Number of tokens purchased',
    example: 10000,
  })
  tokenAmount: number;

  @ApiProperty({
    description: 'Cost of purchase in dollars',
    example: 50.0,
  })
  cost: number;

  @ApiProperty({
    description: 'Previous token balance',
    example: 5000,
  })
  previousBalance: number;

  @ApiProperty({
    description: 'New token balance after purchase',
    example: 15000,
  })
  newBalance: number;

  @ApiProperty({
    description: 'Overage token cost rate (cost per token)',
    example: 0.005,
  })
  overageRate: number;

  @ApiProperty({
    description: 'Success message',
    example: 'Successfully purchased 10,000 tokens for $50.00',
  })
  message: string;
}
