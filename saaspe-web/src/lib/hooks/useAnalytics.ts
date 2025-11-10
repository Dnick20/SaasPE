import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../api/endpoints/analytics';

export function useDashboardMetrics() {
  return useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: () => analyticsApi.getDashboard(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  });
}

export function useActivity(limit: number = 10) {
  return useQuery({
    queryKey: ['analytics', 'activity', limit],
    queryFn: () => analyticsApi.getActivity(limit),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 2, // Refetch every 2 minutes
  });
}

export function useAnalyticsMetrics(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['analytics', 'metrics', startDate, endDate],
    queryFn: () => analyticsApi.getMetrics(startDate, endDate),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useAiCosts(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['analytics', 'ai-costs', startDate, endDate],
    queryFn: () => analyticsApi.getAiCosts(startDate, endDate),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useProposalWinRate(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['analytics', 'proposals', 'win-rate', startDate, endDate],
    queryFn: () => analyticsApi.getProposalWinRate(startDate, endDate),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useProposalPipeline() {
  return useQuery({
    queryKey: ['analytics', 'proposals', 'pipeline'],
    queryFn: () => analyticsApi.getProposalPipeline(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useTimeToClose() {
  return useQuery({
    queryKey: ['analytics', 'proposals', 'time-to-close'],
    queryFn: () => analyticsApi.getTimeToClose(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
