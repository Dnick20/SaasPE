import { usePolling } from './usePolling';

export interface ProposalStatusResponse {
  id: string;
  status: 'draft' | 'generating' | 'completed' | 'sent' | 'viewed' | 'signed' | 'archived';
  generationStatus?: 'pending' | 'in_progress' | 'completed' | 'failed';
  generationProgress?: number;
  title?: string;
  clientId?: string;
  error?: string;
}

export interface UseProposalStatusPollingOptions {
  /**
   * Proposal ID to poll status for
   */
  proposalId: string | null;

  /**
   * Whether to start polling immediately
   */
  enabled?: boolean;

  /**
   * Callback when proposal generation completes
   */
  onComplete?: (proposal: ProposalStatusResponse) => void;

  /**
   * Callback when proposal generation fails
   */
  onError?: (error: Error) => void;

  /**
   * Custom initial interval (default: 2000ms / 2 seconds)
   */
  initialInterval?: number;

  /**
   * Custom max interval (default: 10000ms / 10 seconds)
   */
  maxInterval?: number;

  /**
   * Custom max attempts (default: 30 = ~5 minutes with backoff)
   */
  maxAttempts?: number;
}

/**
 * useProposalStatusPolling Hook
 *
 * Polls a proposal's generation status with exponential backoff.
 * Automatically stops when proposal is completed or failed.
 *
 * @example
 * ```tsx
 * const { proposal, isPolling, startPolling, progress } = useProposalStatusPolling({
 *   proposalId: 'prop_123',
 *   enabled: true,
 *   onComplete: (proposal) => router.push(`/proposals/${proposal.id}`),
 *   onError: (error) => toast.error(error.message),
 * });
 * ```
 */
export function useProposalStatusPolling({
  proposalId,
  enabled = false,
  onComplete,
  onError,
  initialInterval = 2000,
  maxInterval = 10000,
  maxAttempts = 30,
}: UseProposalStatusPollingOptions) {
  const polling = usePolling<ProposalStatusResponse>({
    pollFn: async () => {
      if (!proposalId) {
        throw new Error('No proposal ID provided');
      }

      const response = await fetch(`/api/v1/proposals/${proposalId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Proposal not found');
        }
        throw new Error('Failed to fetch proposal status');
      }

      return response.json();
    },

    shouldStopPolling: (data, error) => {
      // Stop on error
      if (error) {
        return true;
      }

      // Stop if no data
      if (!data) {
        return false;
      }

      // Stop if generation is completed or failed
      if (data.generationStatus === 'completed' || data.generationStatus === 'failed') {
        return true;
      }

      // Stop if proposal status indicates it's ready
      if (data.status === 'completed' || data.status === 'sent') {
        return true;
      }

      // Continue polling
      return false;
    },

    initialInterval,
    maxInterval,
    maxAttempts,
    backoffMultiplier: 1.5,
    enabled: enabled && !!proposalId,

    onSuccess: (data) => {
      if (data.generationStatus === 'completed' || data.status === 'completed') {
        onComplete?.(data);
      } else if (data.generationStatus === 'failed') {
        onError?.(new Error(data.error || 'Proposal generation failed'));
      }
    },

    onError: (error) => {
      onError?.(error);
    },
  });

  return {
    proposal: polling.data,
    isPolling: polling.isPolling,
    error: polling.error,
    attempt: polling.attempt,
    currentInterval: polling.currentInterval,
    progress: polling.data?.generationProgress,
    startPolling: polling.startPolling,
    stopPolling: polling.stopPolling,
    reset: polling.reset,
  };
}
