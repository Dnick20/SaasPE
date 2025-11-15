import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tokensApi } from '../api/endpoints/tokens';



/**
 * Hook to get current token balance and usage info
 */
export function useTokenBalance() {
  return useQuery({
    queryKey: ['tokens', 'balance'],
    queryFn: () => tokensApi.getBalance(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

/**
 * Hook to get token transaction history
 */
export function useTokenTransactions(
  limit?: number,
  offset?: number,
  type?: string
) {
  return useQuery({
    queryKey: ['tokens', 'transactions', limit, offset, type],
    queryFn: () => tokensApi.getTransactions(limit, offset, type),
  });
}

/**
 * Hook to get token usage analytics
 */
export function useTokenAnalytics(period?: 'day' | 'week' | 'month') {
  return useQuery({
    queryKey: ['tokens', 'analytics', period],
    queryFn: () => tokensApi.getAnalytics(period),
  });
}

/**
 * Hook to get token pricing catalog
 */
export function useTokenPricing(category?: string) {
  return useQuery({
    queryKey: ['tokens', 'pricing', category],
    queryFn: () => tokensApi.getPricingCatalog(category),
  });
}

/**
 * Hook to check if an action can be performed
 */
export function useCheckAction(actionType: string) {
  return useQuery({
    queryKey: ['tokens', 'check', actionType],
    queryFn: () => tokensApi.checkAction(actionType),
    enabled: !!actionType,
  });
}

/**
 * Hook to get action cost
 */
export function useActionCost(actionType: string) {
  return useQuery({
    queryKey: ['tokens', 'cost', actionType],
    queryFn: () => tokensApi.getActionCost(actionType),
    enabled: !!actionType,
  });
}

/**
 * Hook to change subscription plan
 */
export function useChangeSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newPlan: 'professional' | 'advanced' | 'enterprise' | 'ultimate') =>
      tokensApi.changeSubscriptionPlan(newPlan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tokens'] });
    },
  });
}

/**
 * Hook to purchase additional tokens
 */
export function usePurchaseTokens() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tokenAmount, paymentInfo }: { tokenAmount: number; paymentInfo?: Record<string, unknown> }) =>
      tokensApi.purchaseTokens(tokenAmount, paymentInfo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tokens'] });
    },
  });
}
