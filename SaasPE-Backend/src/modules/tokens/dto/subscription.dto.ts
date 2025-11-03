import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum SubscriptionPlan {
  PROFESSIONAL = 'professional',
  ADVANCED = 'advanced',
  ENTERPRISE = 'enterprise',
  ULTIMATE = 'ultimate',
}

/**
 * DTO for subscription plan change request
 */
export class ChangeSubscriptionDto {
  @ApiProperty({
    description: 'New subscription plan',
    enum: SubscriptionPlan,
    example: 'advanced',
  })
  @IsNotEmpty()
  @IsEnum(SubscriptionPlan)
  newPlan: SubscriptionPlan;
}

/**
 * Response DTO for subscription change
 */
export class SubscriptionChangeResponseDto {
  @ApiProperty({
    description: 'Previous plan',
    example: 'professional',
  })
  previousPlan: string;

  @ApiProperty({
    description: 'New plan',
    example: 'advanced',
  })
  newPlan: string;

  @ApiProperty({
    description: 'Previous token balance',
    example: 45000,
  })
  previousTokenBalance: number;

  @ApiProperty({
    description: 'New token balance',
    example: 125000,
  })
  newTokenBalance: number;

  @ApiProperty({
    description:
      'Token adjustment applied (positive for upgrade, negative for downgrade)',
    example: 80000,
  })
  tokenAdjustment: number;

  @ApiProperty({
    description: 'New monthly token allocation',
    example: 125000,
  })
  newMonthlyAllocation: number;

  @ApiProperty({
    description: 'Previous monthly price',
    example: 500,
  })
  previousMonthlyPrice: number;

  @ApiProperty({
    description: 'New monthly price',
    example: 1200,
  })
  newMonthlyPrice: number;

  @ApiProperty({
    description: 'Pro-rated price difference for current period',
    example: 525,
  })
  proRatedPriceDifference: number;

  @ApiProperty({
    description: 'Days remaining in current billing period',
    example: 15,
  })
  daysRemainingInPeriod: number;

  @ApiProperty({
    description: 'Effective date of change',
    example: '2025-10-22T23:15:00Z',
  })
  effectiveDate: string;

  @ApiProperty({
    description: 'Message to user',
    example:
      'Your plan has been upgraded to Advanced. Your next billing cycle starts on 2025-11-15.',
  })
  message: string;
}
