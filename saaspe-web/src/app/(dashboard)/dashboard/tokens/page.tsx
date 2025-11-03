'use client';

import { useState } from 'react';
import { TokenBalanceCard } from '@/components/tokens/token-balance-card';
import { TransactionHistory } from '@/components/tokens/transaction-history';
import { SubscriptionPlans } from '@/components/tokens/subscription-plans';
import { PurchaseTokensDialog } from '@/components/tokens/purchase-tokens-dialog';

export default function TokensPage() {
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [showPlans, setShowPlans] = useState(false);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Token Management</h1>
        <p className="text-gray-600 mt-2">
          Monitor your token usage, purchase additional tokens, and manage your subscription plan.
        </p>
      </div>

      {/* Token Balance Card */}
      <TokenBalanceCard
        onPurchaseClick={() => setPurchaseDialogOpen(true)}
        onUpgradeClick={() => setShowPlans(true)}
      />

      {/* Conditional Rendering: Plans or Transaction History */}
      {showPlans ? (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowPlans(false)}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              ← Back to Overview
            </button>
          </div>
          <SubscriptionPlans />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Recent Activity</h2>
            <button
              onClick={() => setShowPlans(true)}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              View All Plans →
            </button>
          </div>
          <TransactionHistory />
        </div>
      )}

      {/* Purchase Tokens Dialog */}
      <PurchaseTokensDialog
        open={purchaseDialogOpen}
        onOpenChange={setPurchaseDialogOpen}
      />
    </div>
  );
}
