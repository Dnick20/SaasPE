'use client';

import { useState } from 'react';
import { useTokenTransactions } from '@/lib/hooks/useTokens';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowDownCircle, ArrowUpCircle, Gift, RefreshCw } from 'lucide-react';
import { formatDistance } from 'date-fns';

export function TransactionHistory() {
  const [limit] = useState(50);
  const [offset] = useState(0);
  const { data, isLoading, error } = useTokenTransactions(limit, offset);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Loading transaction history...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg border border-gray-200">
                <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
                </div>
                <div className="h-6 w-20 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Error loading transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">Failed to load transaction history. Please try again.</p>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Your token usage history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <RefreshCw className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No transactions yet</h3>
            <p className="mt-2 text-sm text-gray-500">
              Your token transactions will appear here as you use the platform.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'consume':
        return <ArrowDownCircle className="h-5 w-5 text-red-600" />;
      case 'allocation':
      case 'refill':
        return <ArrowUpCircle className="h-5 w-5 text-green-600" />;
      case 'bonus':
        return <Gift className="h-5 w-5 text-blue-600" />;
      default:
        return <RefreshCw className="h-5 w-5 text-gray-600" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'consume':
        return 'text-red-900 bg-red-50 border-red-200';
      case 'allocation':
      case 'refill':
        return 'text-green-900 bg-green-50 border-green-200';
      case 'bonus':
        return 'text-blue-900 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-900 bg-gray-50 border-gray-200';
    }
  };

  const formatTokenAmount = (tokens: number) => {
    const isNegative = tokens < 0;
    const absolute = Math.abs(tokens);
    return `${isNegative ? '-' : '+'}${absolute.toLocaleString()}`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>
              Showing {data.transactions.length} of {data.total} transactions
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.transactions.map((transaction) => (
            <div
              key={transaction.id}
              className={`flex items-center gap-4 p-4 rounded-lg border ${getTransactionColor(transaction.type)}`}
            >
              <div className="rounded-full bg-white p-2 shadow-sm">
                {getTransactionIcon(transaction.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {transaction.description}
                    </p>
                    {transaction.tokenPricing && (
                      <p className="text-xs text-gray-600 mt-0.5">
                        {transaction.tokenPricing.displayName} • {transaction.tokenPricing.category}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDistance(new Date(transaction.created), new Date(), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`font-semibold text-sm ${transaction.tokens < 0 ? 'text-red-700' : 'text-green-700'}`}>
                      {formatTokenAmount(transaction.tokens)} tokens
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Balance: {transaction.balanceAfter.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {data.hasMore && (
            <div className="pt-4 text-center">
              <Button variant="outline" size="sm">
                Load More
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
