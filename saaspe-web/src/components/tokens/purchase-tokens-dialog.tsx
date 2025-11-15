'use client';

import { useState } from 'react';
import { useTokenBalance, usePurchaseTokens } from '@/lib/hooks/useTokens';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AxiosError } from 'axios';
import { Loader2, DollarSign, Coins } from 'lucide-react';
import { toast } from 'sonner';

interface PurchaseTokensDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SUGGESTED_AMOUNTS = [10000, 25000, 50000, 100000];

export function PurchaseTokensDialog({ open, onOpenChange }: PurchaseTokensDialogProps) {
  const { data: balance } = useTokenBalance();
  const purchaseTokens = usePurchaseTokens();
  const [tokenAmount, setTokenAmount] = useState<string>('10000');
  const [error, setError] = useState<string>('');

  const overageRate = balance?.plan.overageTokenCost || 0.005;
  const calculatedCost = parseFloat(tokenAmount || '0') * overageRate;

  const handlePurchase = async () => {
    const amount = parseInt(tokenAmount);

    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid token amount');
      return;
    }

    if (amount > 1000000) {
      setError('Maximum purchase is 1,000,000 tokens at a time');
      return;
    }

    setError('');

    try {
      const result = await purchaseTokens.mutateAsync({
        tokenAmount: amount,
        paymentInfo: {
          // In a real system, this would contain Stripe payment method ID
          timestamp: new Date().toISOString(),
        },
      });

      toast.success('Tokens purchased successfully!', {
        description: result.message,
      });

      onOpenChange(false);
      setTokenAmount('10000');
    } catch (error: unknown) {
      const message = error instanceof AxiosError
        ? error.response?.data?.message || 'Please try again later'
        : 'Please try again later';
      toast.error('Failed to purchase tokens', {
        description: message,
      });
      setError(error instanceof AxiosError ? (error.response?.data?.message || 'Purchase failed') : 'Purchase failed');
    }
  };

  const handleAmountChange = (value: string) => {
    setError('');
    setTokenAmount(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Purchase Additional Tokens
          </DialogTitle>
          <DialogDescription>
            Buy additional tokens at your plan&apos;s overage rate of ${overageRate.toFixed(4)} per token.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Token Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="tokenAmount">Number of Tokens</Label>
            <Input
              id="tokenAmount"
              type="number"
              placeholder="Enter token amount"
              value={tokenAmount}
              onChange={(e) => handleAmountChange(e.target.value)}
              min="1"
              max="1000000"
              step="1000"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          {/* Suggested Amounts */}
          <div className="space-y-2">
            <Label>Quick Select</Label>
            <div className="grid grid-cols-4 gap-2">
              {SUGGESTED_AMOUNTS.map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => handleAmountChange(amount.toString())}
                  className={tokenAmount === amount.toString() ? 'border-blue-500 bg-blue-50' : ''}
                >
                  {amount >= 1000 ? `${amount / 1000}k` : amount}
                </Button>
              ))}
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="rounded-lg border border-gray-200 p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Token amount</span>
              <span className="font-medium">{parseInt(tokenAmount || '0').toLocaleString()} tokens</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Rate per token</span>
              <span className="font-medium">${overageRate.toFixed(4)}</span>
            </div>
            <div className="border-t pt-3 flex justify-between">
              <span className="font-semibold text-lg">Total Cost</span>
              <span className="font-bold text-lg flex items-center gap-1">
                <DollarSign className="h-5 w-5" />
                {calculatedCost.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Current Balance Info */}
          {balance && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
              <div className="flex justify-between text-sm">
                <span className="text-blue-900">Current balance</span>
                <span className="font-medium text-blue-900">
                  {balance.tokenBalance.toLocaleString()} tokens
                </span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-blue-900">New balance after purchase</span>
                <span className="font-semibold text-blue-900">
                  {(balance.tokenBalance + parseInt(tokenAmount || '0')).toLocaleString()} tokens
                </span>
              </div>
            </div>
          )}

          {/* Payment Notice */}
          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
            <strong>Note:</strong> This is a demo environment. In production, this would integrate with
            Stripe for secure payment processing. Tokens will be added to your account immediately.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={purchaseTokens.isPending}>
            Cancel
          </Button>
          <Button onClick={handlePurchase} disabled={purchaseTokens.isPending || !tokenAmount}>
            {purchaseTokens.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <DollarSign className="mr-2 h-4 w-4" />
                Purchase for ${calculatedCost.toFixed(2)}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
