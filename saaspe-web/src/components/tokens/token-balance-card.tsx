'use client';

import { useTokenBalance } from '@/lib/hooks/useTokens';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ArrowUpCircle, Clock, TrendingUp } from 'lucide-react';

interface TokenBalanceCardProps {
  onPurchaseClick?: () => void;
  onUpgradeClick?: () => void;
}

export function TokenBalanceCard({ onPurchaseClick, onUpgradeClick }: TokenBalanceCardProps) {
  const { data: balance, isLoading, error } = useTokenBalance();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Token Balance</CardTitle>
          <CardDescription>Loading your token information...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Token Balance</CardTitle>
          <CardDescription>Error loading balance information</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">Failed to load token balance. Please try again.</p>
        </CardContent>
      </Card>
    );
  }

  if (!balance) return null;

  const _usageColor = balance.usagePercentage >= 90 ? 'bg-red-500' :
                     balance.usagePercentage >= 70 ? 'bg-yellow-500' :
                     'bg-green-500';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Token Balance</CardTitle>
            <CardDescription>{balance.plan.displayName} Plan</CardDescription>
          </div>
          <div className="flex gap-2">
            {balance.isInOverage && onPurchaseClick && (
              <Button onClick={onPurchaseClick} size="sm" variant="outline">
                <ArrowUpCircle className="mr-2 h-4 w-4" />
                Buy Tokens
              </Button>
            )}
            {onUpgradeClick && (
              <Button onClick={onUpgradeClick} size="sm">
                <TrendingUp className="mr-2 h-4 w-4" />
                Upgrade Plan
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Balance */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <h3 className="text-3xl font-bold">
              {balance.tokenBalance.toLocaleString()}
            </h3>
            <span className="text-sm text-gray-500">tokens available</span>
          </div>
          <Progress
            value={balance.usagePercentage}
            className="h-2"
          />
          <div className="flex justify-between text-xs text-gray-600">
            <span>
              {balance.tokensUsedThisPeriod.toLocaleString()} / {balance.monthlyAllocation.toLocaleString()} used this period
            </span>
            <span className="font-medium">{balance.usagePercentage.toFixed(1)}%</span>
          </div>
        </div>

        {/* Overage Alert */}
        {balance.isInOverage && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-red-100 p-2">
                <ArrowUpCircle className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-red-900">Overage Usage</h4>
                <p className="mt-1 text-sm text-red-700">
                  You&apos;ve used {balance.overageTokens.toLocaleString()} tokens beyond your monthly allocation.
                </p>
                <p className="mt-1 text-sm font-medium text-red-900">
                  Current overage cost: ${balance.overageCost.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Monthly Allocation</p>
            <p className="text-lg font-semibold">{balance.monthlyAllocation.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Lifetime Used</p>
            <p className="text-lg font-semibold">{balance.lifetimeTokensUsed.toLocaleString()}</p>
          </div>
          <div className="space-y-1 flex items-start gap-2">
            <Clock className="h-4 w-4 text-gray-400 mt-1" />
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Next Refill</p>
              <p className="text-lg font-semibold">{balance.daysUntilRefill} days</p>
            </div>
          </div>
        </div>

        {/* Pricing Info */}
        <div className="border-t pt-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Overage rate</span>
            <span className="font-medium">${balance.plan.overageTokenCost.toFixed(4)} per token</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
