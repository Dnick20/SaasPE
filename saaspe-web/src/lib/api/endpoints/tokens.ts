import { apiClient } from '../client';

// ============ TYPES & INTERFACES ============

export interface TokenBalance {
  tokenBalance: number;
  monthlyAllocation: number;
  tokensUsedThisPeriod: number;
  lifetimeTokensUsed: number;
  usagePercentage: number;
  daysUntilRefill: number;
  isInOverage: boolean;
  overageTokens: number;
  overageCost: number;
  plan: {
    name: string;
    displayName: string;
    monthlyTokens: number;
    overageTokenCost: number;
  };
  currentPeriodStart: string;
  currentPeriodEnd: string;
}

export interface TokenTransaction {
  id: string;
  tenantId: string;
  subscriptionId: string;
  type: 'consume' | 'allocation' | 'refill' | 'bonus';
  tokens: number;
  balanceBefore: number;
  balanceAfter: number;
  actionType?: string;
  actionId?: string;
  pricingId?: string;
  description: string;
  metadata: Record<string, unknown>;
  created: string;
  tokenPricing?: {
    displayName: string;
    category: string;
  };
}

export interface TransactionHistoryResponse {
  transactions: TokenTransaction[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface UsageAnalytics {
  period: 'day' | 'week' | 'month';
  startDate: string;
  endDate: string;
  totalTokensConsumed: number;
  totalTransactions: number;
  categoryBreakdown: Array<{
    category: string;
    tokens: number;
    count: number;
    percentage: number;
  }>;
}

export interface TokenPricing {
  id: string;
  actionType: string;
  displayName: string;
  description?: string;
  category: string;
  tokenCost: number;
  isActive: boolean;
  estimatedDuration?: string;
  created: string;
  updated: string;
}

export interface CheckActionResponse {
  canPerform: boolean;
  actionType: string;
  cost: number;
  currentBalance: number;
}

export interface ActionCostResponse {
  actionType: string;
  cost: number;
}

export interface SubscriptionPlan {
  name: 'professional' | 'advanced' | 'enterprise' | 'ultimate';
  displayName: string;
  monthlyTokens: number;
  monthlyPrice: number;
}

export interface ChangeSubscriptionRequest {
  newPlan: 'professional' | 'advanced' | 'enterprise' | 'ultimate';
}

export interface ChangeSubscriptionResponse {
  previousPlan: string;
  newPlan: string;
  previousTokenBalance: number;
  newTokenBalance: number;
  tokenAdjustment: number;
  newMonthlyAllocation: number;
  previousMonthlyPrice: number;
  newMonthlyPrice: number;
  proRatedPriceDifference: number;
  daysRemainingInPeriod: number;
  effectiveDate: string;
  message: string;
}

export interface PurchaseTokensRequest {
  tokenAmount: number;
  paymentInfo?: Record<string, unknown>;
}

export interface PurchaseTokensResponse {
  tokenAmount: number;
  cost: number;
  previousBalance: number;
  newBalance: number;
  overageRate: number;
  message: string;
}

// ============ API CLIENT ============

export const tokensApi = {
  /**
   * Get current token balance and usage info
   */
  async getBalance(): Promise<TokenBalance> {
    const response = await apiClient.get<TokenBalance>('/api/v1/tokens/balance');
    return response.data;
  },

  /**
   * Get token transaction history
   */
  async getTransactions(
    limit?: number,
    offset?: number,
    type?: string,
  ): Promise<TransactionHistoryResponse> {
    const params = new URLSearchParams();
    if (limit !== undefined) params.append('limit', limit.toString());
    if (offset !== undefined) params.append('offset', offset.toString());
    if (type) params.append('type', type);

    const response = await apiClient.get<TransactionHistoryResponse>(
      `/api/v1/tokens/transactions?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get token usage analytics
   */
  async getAnalytics(period?: 'day' | 'week' | 'month'): Promise<UsageAnalytics> {
    const params = period ? `?period=${period}` : '';
    const response = await apiClient.get<UsageAnalytics>(
      `/api/v1/tokens/analytics${params}`
    );
    return response.data;
  },

  /**
   * Get token pricing catalog
   */
  async getPricingCatalog(category?: string): Promise<TokenPricing[]> {
    const params = category ? `?category=${category}` : '';
    const response = await apiClient.get<TokenPricing[]>(
      `/api/v1/tokens/pricing${params}`
    );
    return response.data;
  },

  /**
   * Check if sufficient tokens are available for an action
   */
  async checkAction(actionType: string): Promise<CheckActionResponse> {
    const response = await apiClient.post<CheckActionResponse>(
      '/api/v1/tokens/check',
      { actionType }
    );
    return response.data;
  },

  /**
   * Get token cost for specific action type
   */
  async getActionCost(actionType: string): Promise<ActionCostResponse> {
    const response = await apiClient.get<ActionCostResponse>(
      `/api/v1/tokens/action-cost/${actionType}?actionType=${actionType}`
    );
    return response.data;
  },

  /**
   * Change subscription plan (upgrade/downgrade)
   */
  async changeSubscriptionPlan(
    newPlan: 'professional' | 'advanced' | 'enterprise' | 'ultimate'
  ): Promise<ChangeSubscriptionResponse> {
    const response = await apiClient.post<ChangeSubscriptionResponse>(
      '/api/v1/tokens/change-plan',
      { newPlan }
    );
    return response.data;
  },

  /**
   * Purchase additional tokens
   */
  async purchaseTokens(
    tokenAmount: number,
    paymentInfo?: Record<string, unknown>
  ): Promise<PurchaseTokensResponse> {
    const response = await apiClient.post<PurchaseTokensResponse>(
      '/api/v1/tokens/purchase',
      { tokenAmount, paymentInfo }
    );
    return response.data;
  },
};
