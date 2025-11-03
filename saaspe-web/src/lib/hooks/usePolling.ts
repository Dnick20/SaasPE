import { useEffect, useRef, useState } from 'react';

export interface PollingOptions<T> {
  /**
   * Function to call on each poll
   */
  pollFn: () => Promise<T>;

  /**
   * Condition to stop polling (return true when done)
   */
  shouldStopPolling: (data: T | null, error: Error | null) => boolean;

  /**
   * Initial interval in milliseconds (default: 1000ms)
   */
  initialInterval?: number;

  /**
   * Maximum interval in milliseconds (default: 30000ms / 30s)
   */
  maxInterval?: number;

  /**
   * Backoff multiplier (default: 1.5)
   */
  backoffMultiplier?: number;

  /**
   * Maximum number of poll attempts (default: 60)
   */
  maxAttempts?: number;

  /**
   * Whether to start polling immediately (default: false)
   */
  enabled?: boolean;

  /**
   * Callback when polling completes successfully
   */
  onSuccess?: (data: T) => void;

  /**
   * Callback when polling fails or times out
   */
  onError?: (error: Error) => void;
}

export interface PollingState<T> {
  data: T | null;
  error: Error | null;
  isPolling: boolean;
  attempt: number;
  currentInterval: number;
  startPolling: () => void;
  stopPolling: () => void;
  reset: () => void;
}

/**
 * usePolling Hook
 *
 * Implements exponential backoff polling with configurable parameters.
 * Useful for checking job status, proposal generation, etc.
 *
 * @example
 * ```tsx
 * const { data, isPolling, startPolling } = usePolling({
 *   pollFn: () => fetch(`/api/proposals/${id}`).then(r => r.json()),
 *   shouldStopPolling: (data) => data?.status === 'completed',
 *   onSuccess: (data) => console.log('Proposal ready:', data),
 * });
 * ```
 */
export function usePolling<T>({
  pollFn,
  shouldStopPolling,
  initialInterval = 1000,
  maxInterval = 30000,
  backoffMultiplier = 1.5,
  maxAttempts = 60,
  enabled = false,
  onSuccess,
  onError,
}: PollingOptions<T>): PollingState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isPolling, setIsPolling] = useState(enabled);
  const [attempt, setAttempt] = useState(0);
  const [currentInterval, setCurrentInterval] = useState(initialInterval);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Track if polling was manually stopped
  const manuallyStoppedRef = useRef(false);

  const stopPolling = () => {
    manuallyStoppedRef.current = true;
    setIsPolling(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const startPolling = () => {
    manuallyStoppedRef.current = false;
    setIsPolling(true);
    setAttempt(0);
    setCurrentInterval(initialInterval);
    setError(null);
  };

  const reset = () => {
    stopPolling();
    setData(null);
    setError(null);
    setAttempt(0);
    setCurrentInterval(initialInterval);
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopPolling();
    };
  }, []);

  useEffect(() => {
    if (!isPolling || manuallyStoppedRef.current) {
      return;
    }

    const poll = async () => {
      // Check if we've exceeded max attempts
      if (attempt >= maxAttempts) {
        const timeoutError = new Error(
          `Polling timed out after ${maxAttempts} attempts`,
        );
        setError(timeoutError);
        setIsPolling(false);
        onError?.(timeoutError);
        return;
      }

      try {
        const result = await pollFn();

        if (!isMountedRef.current) return;

        setData(result);
        setAttempt((prev) => prev + 1);

        // Check if we should stop polling
        if (shouldStopPolling(result, null)) {
          setIsPolling(false);
          onSuccess?.(result);
          return;
        }

        // Calculate next interval with exponential backoff
        const nextInterval = Math.min(
          currentInterval * backoffMultiplier,
          maxInterval,
        );
        setCurrentInterval(nextInterval);

        // Schedule next poll
        timeoutRef.current = setTimeout(poll, nextInterval);
      } catch (err) {
        if (!isMountedRef.current) return;

        const pollError = err instanceof Error ? err : new Error('Polling failed');
        setError(pollError);

        // Check if error is terminal
        if (shouldStopPolling(null, pollError)) {
          setIsPolling(false);
          onError?.(pollError);
          return;
        }

        // Continue polling on non-terminal errors
        setAttempt((prev) => prev + 1);
        const nextInterval = Math.min(
          currentInterval * backoffMultiplier,
          maxInterval,
        );
        setCurrentInterval(nextInterval);
        timeoutRef.current = setTimeout(poll, nextInterval);
      }
    };

    // Start first poll immediately
    poll();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isPolling, attempt]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    data,
    error,
    isPolling,
    attempt,
    currentInterval,
    startPolling,
    stopPolling,
    reset,
  };
}
