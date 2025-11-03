'use client';

import { useTokenBalance } from '@/lib/hooks/useTokens';
import { Coins, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export function NavbarTokenBalance() {
  const { data: balance, isLoading, error } = useTokenBalance();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-md animate-pulse">
        <Coins className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-gray-400">Loading...</span>
      </div>
    );
  }

  if (error || !balance) {
    return null; // Don't show anything if there's an error
  }

  // Determine color based on usage percentage
  const isLow = balance.usagePercentage >= 80;
  const isCritical = balance.usagePercentage >= 95;
  const colorClass = isCritical ? 'text-red-600 bg-red-50 border-red-200' :
                     isLow ? 'text-yellow-700 bg-yellow-50 border-yellow-200' :
                     'text-gray-700 bg-gray-50 border-gray-200';

  return (
    <Link
      href="/dashboard/tokens"
      className={`flex items-center gap-2 px-3 py-1.5 rounded-md border transition-colors hover:opacity-80 ${colorClass}`}
      title={`${balance.tokensUsedThisPeriod.toLocaleString()} / ${balance.monthlyAllocation.toLocaleString()} used (${balance.usagePercentage.toFixed(1)}%)`}
    >
      {isCritical ? (
        <AlertCircle className="h-4 w-4" />
      ) : (
        <Coins className="h-4 w-4" />
      )}
      <span className="text-sm font-medium">
        {balance.tokenBalance.toLocaleString()}
      </span>
      <span className="text-xs opacity-75">tokens</span>
    </Link>
  );
}
