import { apiClient } from '../client';
import { JourneyStep, JourneyMetadata } from '@/lib/journey/types';

export interface JourneyState {
  currentStep: JourneyStep;
  completedSteps: JourneyStep[];
  metadata: JourneyMetadata;
}

export const journeyApi = {
  /**
   * Get current journey status
   */
  getStatus: async (clientId?: string): Promise<JourneyState> => {
    const url = clientId ? `/api/v1/journey?clientId=${clientId}` : '/api/v1/journey';
    const response = await apiClient.get<JourneyState>(url);
    return response.data;
  },

  /**
   * Update journey state
   */
  updateState: async (state: {
    currentStep: JourneyStep;
    completedSteps: JourneyStep[];
    metadata: JourneyMetadata;
  }): Promise<void> => {
    await apiClient.post('/api/v1/journey', state);
  },

  /**
   * Complete a step with optional metadata
   */
  completeStep: async (step: JourneyStep, metadata?: Partial<JourneyMetadata>) => {
    return apiClient.patch('/api/v1/journey/complete-step', { step, metadata });
  },

  /**
   * Update current step
   */
  updateCurrentStep: async (step: JourneyStep) => {
    return apiClient.patch('/api/v1/journey/update-step', { step });
  },

  /**
   * Skip entire onboarding
   */
  skipOnboarding: async () => {
    return apiClient.post('/api/v1/journey/skip');
  },

  /**
   * Skip a specific step
   */
  skipStep: async (step: JourneyStep) => {
    return apiClient.post('/api/v1/journey/skip-step', { step });
  },

  /**
   * Reset journey to beginning
   */
  resetJourney: async () => {
    return apiClient.post('/api/v1/journey/reset');
  },

  /**
   * Update journey metadata
   */
  updateMetadata: async (metadata: Partial<JourneyMetadata>) => {
    return apiClient.patch('/api/v1/journey/metadata', metadata);
  },
};
