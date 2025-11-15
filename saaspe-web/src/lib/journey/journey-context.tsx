'use client';

import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  JourneyStep,
  JourneyMetadata,
  JourneyContextValue,
  NextAction,
  JOURNEY_STEPS,
  JOURNEY_STEP_LABELS,
  JOURNEY_STEP_ROUTES,
} from './types';

export const JourneyContext = createContext<JourneyContextValue | null>(null);

interface JourneyProviderProps {
  children: ReactNode;
  initialStep?: JourneyStep;
  userId?: string;
  clientId?: string;  // For client-scoped journeys
}

/**
 * Journey Provider
 *
 * Manages the customer journey state and provides context to all dashboard pages.
 * Automatically syncs journey progress to the backend.
 */
export function JourneyProvider({ children, initialStep = 'discovery', userId, clientId }: JourneyProviderProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<JourneyStep>(initialStep);
  const [completedSteps, setCompletedSteps] = useState<Set<JourneyStep>>(new Set());
  const [metadata, setMetadata] = useState<JourneyMetadata>({});
  const [isLoading, setIsLoading] = useState(true);

  // Calculate derived state
  const isComplete = currentStep === 'complete';
  const progressPercentage = Math.round((completedSteps.size / (JOURNEY_STEPS.length - 1)) * 100);

  // Get next action
  const getNextAction = useCallback((): NextAction => {
    const stepIndex = JOURNEY_STEPS.indexOf(currentStep);
    const nextStep = JOURNEY_STEPS[stepIndex + 1];

    const actionMap: Record<JourneyStep, NextAction> = {
      discovery: {
        label: 'Start Discovery',
        route: JOURNEY_STEP_ROUTES.discovery,
        description: 'Tell us about your business',
        icon: '🎯',
      },
      client: {
        label: 'Create First Client',
        route: JOURNEY_STEP_ROUTES.client,
        description: 'Add your first client to get started',
        icon: '👥',
      },
      proposal: {
        label: 'Generate Proposal',
        route: metadata.firstClientId
          ? `/dashboard/proposals/new?clientId=${metadata.firstClientId}`
          : JOURNEY_STEP_ROUTES.proposal,
        description: 'Create an AI-powered proposal',
        icon: '📄',
      },
      playbook: {
        label: 'Create Playbook',
        route: metadata.clientId
          ? `/dashboard/playbooks/new?clientId=${metadata.clientId}`
          : JOURNEY_STEP_ROUTES.playbook,
        description: 'Generate scripts & campaign strategy',
        icon: '📘',
      },
      mailboxes: {
        label: 'Connect Email Account',
        route: JOURNEY_STEP_ROUTES.mailboxes,
        description: 'Add email accounts for campaigns',
        icon: '📧',
      },
      warmup: {
        label: 'Setup Email Warmup',
        route: metadata.connectedMailboxIds
          ? `/dashboard/warmup?mailboxIds=${metadata.connectedMailboxIds.join(',')}`
          : JOURNEY_STEP_ROUTES.warmup,
        description: 'Improve email deliverability',
        icon: '🔥',
      },
      campaign: {
        label: 'Launch First Campaign',
        route: metadata.firstProposalId
          ? `/dashboard/campaigns/new?proposalId=${metadata.firstProposalId}`
          : JOURNEY_STEP_ROUTES.campaign,
        description: 'Start your first email campaign',
        icon: '🚀',
      },
      complete: {
        label: 'Go to Dashboard',
        route: '/dashboard',
        description: 'You\'re all set!',
        icon: '✅',
      },
    };

    return actionMap[currentStep] || actionMap.discovery;
  }, [currentStep, metadata]);

  const nextAction = getNextAction();

  // Load journey state from backend
  useEffect(() => {
    const loadJourneyState = async () => {
      if (!userId) {
        setIsLoading(false);
        return;
      }

      try {
        // Use relative URL so cookies are sent (same-origin request)
        // Include clientId for client-scoped journeys
        const url = clientId
          ? `/api/v1/journey?clientId=${clientId}`
          : '/api/v1/journey';

        const response = await fetch(url, {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setCurrentStep(data.currentStep || 'discovery');
          setCompletedSteps(new Set(data.completedSteps || []));
          setMetadata(data.metadata || {});
        }
      } catch (error) {
        console.error('Failed to load journey state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadJourneyState();
  }, [userId, clientId]);

  // Sync journey state to backend
  const syncToBackend = useCallback(async (
    step: JourneyStep,
    completed: Set<JourneyStep>,
    meta: JourneyMetadata
  ) => {
    if (!userId) return;

    try {
      // Use relative URL so cookies are sent (same-origin request)
      await fetch('/api/v1/journey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentStep: step,
          completedSteps: Array.from(completed),
          metadata: {
            ...meta,
            clientId: clientId || meta.clientId,  // Include clientId for client-scoping
          },
        }),
      });
    } catch (error) {
      console.error('Failed to sync journey state:', error);
    }
  }, [userId, clientId]);

  // Go to next step in sequence
  const goToNextStep = useCallback(() => {
    const currentIndex = JOURNEY_STEPS.indexOf(currentStep);
    const nextStep = JOURNEY_STEPS[currentIndex + 1];

    if (nextStep) {
      setCurrentStep(nextStep);
      const nextRoute = JOURNEY_STEP_ROUTES[nextStep];
      router.push(nextRoute);

      // Sync to backend
      syncToBackend(nextStep, completedSteps, metadata);
    }
  }, [currentStep, completedSteps, metadata, router, syncToBackend]);

  // Go to specific step
  const goToStep = useCallback((step: JourneyStep) => {
    setCurrentStep(step);
    const route = JOURNEY_STEP_ROUTES[step];
    router.push(route);

    // Sync to backend
    syncToBackend(step, completedSteps, metadata);
  }, [completedSteps, metadata, router, syncToBackend]);

  // Mark step as complete
  const markStepComplete = useCallback((
    step: JourneyStep,
    newMetadata?: Partial<JourneyMetadata>
  ) => {
    setCompletedSteps((prev) => {
      const updated = new Set(prev);
      updated.add(step);
      return updated;
    });

    if (newMetadata) {
      setMetadata((prev) => {
        const updated = {
          ...prev,
          ...newMetadata,
          lastCompletedAt: new Date(),
        };

        // Sync to backend
        syncToBackend(currentStep, new Set([...Array.from(completedSteps), step]), updated);

        return updated;
      });
    } else {
      // Sync to backend
      syncToBackend(currentStep, new Set([...Array.from(completedSteps), step]), metadata);
    }
  }, [currentStep, completedSteps, metadata, syncToBackend]);

  // Skip step
  const skipStep = useCallback((step: JourneyStep) => {
    setMetadata((prev) => {
      const skipped = prev.skippedSteps || [];
      const updated = {
        ...prev,
        skippedSteps: [...skipped, step],
      };

      // Sync to backend
      syncToBackend(currentStep, completedSteps, updated);

      return updated;
    });

    // Also mark as complete but with skipped flag
    markStepComplete(step);
    goToNextStep();
  }, [currentStep, completedSteps, markStepComplete, goToNextStep, syncToBackend]);

  // Reset journey
  const resetJourney = useCallback(() => {
    setCurrentStep('discovery');
    setCompletedSteps(new Set());
    setMetadata({});

    // Sync to backend
    syncToBackend('discovery', new Set(), {});

    router.push(JOURNEY_STEP_ROUTES.discovery);
  }, [router, syncToBackend]);

  // Update metadata
  const updateMetadata = useCallback((newMetadata: Partial<JourneyMetadata>) => {
    setMetadata((prev) => {
      const updated = { ...prev, ...newMetadata };

      // Sync to backend
      syncToBackend(currentStep, completedSteps, updated);

      return updated;
    });
  }, [currentStep, completedSteps, syncToBackend]);

  // Check if step is complete
  const isStepComplete = useCallback((step: JourneyStep) => {
    return completedSteps.has(step);
  }, [completedSteps]);

  // Check if user can access step
  const canAccessStep = useCallback((step: JourneyStep) => {
    const stepIndex = JOURNEY_STEPS.indexOf(step);
    const currentIndex = JOURNEY_STEPS.indexOf(currentStep);

    // Can access completed steps or current step or next step
    return (
      stepIndex <= currentIndex + 1 ||
      completedSteps.has(step)
    );
  }, [currentStep, completedSteps]);

  // Get progress percentage
  const getProgress = useCallback(() => {
    return progressPercentage;
  }, [progressPercentage]);

  const value: JourneyContextValue = {
    currentStep,
    completedSteps,
    metadata,
    nextAction,
    isComplete,
    progressPercentage,
    goToNextStep,
    goToStep,
    markStepComplete,
    skipStep,
    resetJourney,
    updateMetadata,
    isStepComplete,
    canAccessStep,
    getProgress,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <JourneyContext.Provider value={value}>
      {children}
    </JourneyContext.Provider>
  );
}
