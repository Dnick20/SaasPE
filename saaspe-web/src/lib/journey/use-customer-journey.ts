import { useContext } from 'react';
import { JourneyContext } from './journey-context';

/**
 * Customer Journey Hook
 *
 * Provides access to the customer journey state and actions.
 * Must be used within a JourneyProvider.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const journey = useCustomerJourney();
 *
 *   if (journey.currentStep === 'client') {
 *     // Show client creation UI
 *   }
 *
 *   const handleComplete = () => {
 *     journey.markStepComplete('client', { firstClientId: '123' });
 *     journey.goToNextStep();
 *   };
 *
 *   return (
 *     <div>
 *       <p>Progress: {journey.getProgress()}%</p>
 *       <button onClick={handleComplete}>Complete Step</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useCustomerJourney() {
  const context = useContext(JourneyContext);

  if (!context) {
    throw new Error('useCustomerJourney must be used within a JourneyProvider');
  }

  return context;
}
