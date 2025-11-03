export class EmailCreditsBalanceDto {
  monthlyAllocation: number;
  creditsUsed: number;
  creditsRemaining: number;
  usagePercentage: number;
  overageCreditsUsed: number;
  overageRate: number;
  currentPeriodEnd: Date;
}
