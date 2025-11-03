'use client';

import { useCustomerJourney } from '@/lib/journey/use-customer-journey';
import { JOURNEY_STEPS, JOURNEY_STEP_LABELS, JourneyStep } from '@/lib/journey/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ChevronRight, Check, X } from 'lucide-react';
import { useState } from 'react';

/**
 * Journey Progress Banner
 *
 * Displays at the top of dashboard pages showing:
 * - Current step in the journey
 * - Progress breadcrumb navigation
 * - Next action button
 * - Skip/dismiss option
 */
export function JourneyProgress() {
  const journey = useCustomerJourney();
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show if journey is complete or dismissed
  if (journey.isComplete || isDismissed) {
    return null;
  }

  // Don't show on onboarding page itself
  if (typeof window !== 'undefined' && window.location.pathname === '/dashboard/onboarding') {
    return null;
  }

  const handleStepClick = (step: JourneyStep) => {
    if (journey.canAccessStep(step)) {
      journey.goToStep(step);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  const handleContinue = () => {
    // If current step is complete, advance to next step
    if (journey.isStepComplete(journey.currentStep)) {
      journey.goToNextStep();
    } else {
      // Otherwise, navigate to current step's route
      journey.goToStep(journey.currentStep);
    }
  };

  return (
    <Card className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{journey.nextAction.icon}</span>
          <div>
            <h3 className="font-semibold text-gray-900">
              {journey.nextAction.label}
            </h3>
            <p className="text-sm text-gray-600">
              {journey.nextAction.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleContinue}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {journey.isStepComplete(journey.currentStep) ? 'Next Step' : 'Continue'}
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <Progress value={journey.progressPercentage} className="h-2" />
        <p className="text-xs text-gray-500 mt-1 text-right">
          {journey.progressPercentage}% Complete
        </p>
      </div>

      {/* Journey Steps Breadcrumb */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {JOURNEY_STEPS.filter(step => step !== 'complete').map((step, index) => {
          const isComplete = journey.isStepComplete(step);
          const isCurrent = journey.currentStep === step;
          const canAccess = journey.canAccessStep(step);

          return (
            <div key={step} className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => handleStepClick(step)}
                disabled={!canAccess}
                className={`
                  flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium
                  transition-all duration-200
                  ${isComplete
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : isCurrent
                    ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-400'
                    : canAccess
                    ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                  }
                `}
              >
                {isComplete && <Check className="h-3 w-3" />}
                {JOURNEY_STEP_LABELS[step]}
              </button>

              {index < JOURNEY_STEPS.length - 2 && (
                <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Skip Option */}
      {journey.currentStep !== 'discovery' && (
        <div className="mt-3 pt-3 border-t border-blue-200">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => journey.skipStep(journey.currentStep)}
            className="text-gray-500 hover:text-gray-700 text-xs"
          >
            Skip this step for now
          </Button>
        </div>
      )}
    </Card>
  );
}
