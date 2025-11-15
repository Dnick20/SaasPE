'use client';

import { useState } from 'react';
import { useTokenBalance, useChangeSubscription } from '@/lib/hooks/useTokens';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Loader2, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { AxiosError } from 'axios';

interface Plan {
  name: 'professional' | 'advanced' | 'enterprise' | 'ultimate';
  displayName: string;
  monthlyPrice: number;
  monthlyTokens: number;
  overageTokenCost?: number;
  features: string[];
  popular?: boolean;
}

const PLANS: Plan[] = [
  {
    name: 'professional',
    displayName: 'Professional',
    monthlyPrice: 500,
    monthlyTokens: 50000,
    features: [
      '50,000 tokens per month',
      'All core features',
      'Email support',
      'Standard integrations',
    ],
  },
  {
    name: 'advanced',
    displayName: 'Advanced',
    monthlyPrice: 1200,
    monthlyTokens: 125000,
    popular: true,
    features: [
      '125,000 tokens per month',
      'All Professional features',
      'Priority support',
      'Advanced integrations',
      'Custom workflows',
    ],
  },
  {
    name: 'enterprise',
    displayName: 'Enterprise',
    monthlyPrice: 2500,
    monthlyTokens: 300000,
    features: [
      '300,000 tokens per month',
      'All Advanced features',
      '24/7 dedicated support',
      'Custom integrations',
      'SLA guarantee',
      'Training & onboarding',
    ],
  },
  {
    name: 'ultimate',
    displayName: 'Ultimate',
    monthlyPrice: 5000,
    monthlyTokens: 750000,
    features: [
      '750,000 tokens per month',
      'All Enterprise features',
      'Dedicated account manager',
      'Custom development',
      'White-label options',
      'API rate limit increases',
    ],
  },
];

export function SubscriptionPlans() {
  const { data: balance } = useTokenBalance();
  const changeSubscription = useChangeSubscription();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handleChangePlan = async (planName: 'professional' | 'advanced' | 'enterprise' | 'ultimate') => {
    if (!balance) return;

    if (balance.plan.name === planName) {
      toast.info('You are already on this plan');
      return;
    }

    setSelectedPlan(planName);

    try {
      const result = await changeSubscription.mutateAsync(planName);
      toast.success(result.message, {
        description: `Your new token balance is ${result.newTokenBalance.toLocaleString()} tokens`,
      });
    } catch (error: unknown) {
      const message = error instanceof AxiosError
        ? error.response?.data?.message || 'Please try again later'
        : 'Please try again later';
      toast.error('Failed to change plan', {
        description: message,
      });
    } finally {
      setSelectedPlan(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Subscription Plans</h2>
        <p className="text-gray-600 mt-1">
          Choose the plan that best fits your needs. You can upgrade or downgrade at any time.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {PLANS.map((plan) => {
          const isCurrentPlan = balance?.plan.name === plan.name;
          const isLoading = selectedPlan === plan.name && changeSubscription.isPending;

          return (
            <Card
              key={plan.name}
              className={`relative ${
                plan.popular ? 'border-blue-500 border-2 shadow-lg' : ''
              } ${isCurrentPlan ? 'ring-2 ring-green-500' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    Most Popular
                  </span>
                </div>
              )}
              {isCurrentPlan && (
                <div className="absolute -top-3 right-4">
                  <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    Current Plan
                  </span>
                </div>
              )}

              <CardHeader>
                <CardTitle className="text-xl">{plan.displayName}</CardTitle>
                <CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-gray-900">
                      ${plan.monthlyPrice}
                    </span>
                    <span className="text-gray-600 ml-2">/month</span>
                  </div>
                  <div className="mt-2 text-sm">
                    {plan.monthlyTokens.toLocaleString()} tokens/month
                  </div>
                </CardDescription>
              </CardHeader>

              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleChangePlan(plan.name)}
                  disabled={isCurrentPlan || isLoading}
                  className="w-full"
                  variant={plan.popular && !isCurrentPlan ? 'default' : 'outline'}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Changing...
                    </>
                  ) : isCurrentPlan ? (
                    'Current Plan'
                  ) : (
                    <>
                      <TrendingUp className="mr-2 h-4 w-4" />
                      {balance && balance.plan.monthlyTokens < plan.monthlyTokens ? 'Upgrade' : 'Change Plan'}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-blue-100 p-2">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900">Flexible Billing</h3>
              <p className="text-sm text-blue-700 mt-1">
                All plan changes are pro-rated based on your current billing cycle.
                You&apos;ll receive token adjustments immediately and billing changes will
                reflect on your next invoice.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
