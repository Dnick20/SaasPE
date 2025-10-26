'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UpgradeInterstitialModal } from './wizard/UpgradeInterstitialModal';
import { UserInfoStep } from './wizard/UserInfoStep';
import { ConnectionMethodSelection } from './wizard/ConnectionMethodSelection';
import { ProviderSelection } from './wizard/ProviderSelection';
import { AccountQuantitySelection, AccountQuantity } from './wizard/AccountQuantitySelection';
import { GoogleOAuthFlow } from './wizard/GoogleOAuthFlow';
import { MicrosoftSMTPCheck } from './wizard/MicrosoftSMTPCheck';
import { BulkCSVUpload } from './wizard/BulkCSVUpload';
import { SingleAccountForm } from './wizard/SingleAccountForm';

export type WizardStep =
  | 'upgrade-interstitial'
  | 'user-info'
  | 'connection-method'
  | 'provider-selection'
  | 'account-quantity'
  | 'google-oauth'
  | 'microsoft-smtp'
  | 'bulk-csv'
  | 'single-account'
  | 'complete';

export type ConnectionMethod = 'pre-warmed' | 'done-for-you' | 'connect-existing';
export type EmailProvider = 'google' | 'microsoft' | 'smtp';
export type GoogleConnectionType = 'oauth' | 'app-password';

interface UserInfo {
  fullName: string;
  companyName: string;
  companyWebsite?: string;
}

interface WizardState {
  step: WizardStep;
  userInfo?: UserInfo;
  connectionMethod?: ConnectionMethod;
  emailProvider?: EmailProvider;
  accountQuantity?: AccountQuantity;
  googleConnectionType?: GoogleConnectionType;
}

interface EmailAccountWizardProps {
  isOnboarding?: boolean;
  onComplete?: () => void;
  onDismiss?: () => void;
}

export function EmailAccountWizard({
  isOnboarding = false,
  onComplete,
  onDismiss,
}: EmailAccountWizardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showOnboarding = searchParams?.get('onboarding') === 'true' || isOnboarding;
  const directToWizard = searchParams?.get('wizard') === 'true';

  const [state, setState] = useState<WizardState>({
    step: showOnboarding && !directToWizard ? 'upgrade-interstitial' : 'user-info',
  });

  const [showUpgradeModal, setShowUpgradeModal] = useState(showOnboarding && !directToWizard);

  const handleUpgradeModalClose = (action: 'upgrade' | 'later') => {
    setShowUpgradeModal(false);
    if (action === 'upgrade') {
      // Redirect to pricing page
      router.push('/dashboard/tokens');
    } else {
      // Continue with onboarding - start with user info
      setState({ step: 'user-info' });
    }
  };

  const handleUserInfoComplete = (data: UserInfo) => {
    setState((prev) => ({
      ...prev,
      userInfo: data,
      step: 'connection-method',
    }));
  };

  const handleConnectionMethodSelect = (method: ConnectionMethod) => {
    setState((prev) => ({
      ...prev,
      connectionMethod: method,
      step: 'provider-selection',
    }));
  };

  const handleProviderSelect = (provider: EmailProvider) => {
    setState((prev) => ({
      ...prev,
      emailProvider: provider,
      step: 'account-quantity',
    }));
  };

  const handleAccountQuantitySelect = (quantity: AccountQuantity) => {
    setState((prev) => {
      const { emailProvider } = prev;

      // If bulk selected, go straight to bulk CSV
      if (quantity === 'bulk') {
        return {
          ...prev,
          accountQuantity: quantity,
          step: 'bulk-csv',
        };
      }

      // For single account, route based on provider
      return {
        ...prev,
        accountQuantity: quantity,
        step:
          emailProvider === 'google'
            ? 'google-oauth'
            : emailProvider === 'microsoft'
              ? 'microsoft-smtp'
              : 'single-account',
      };
    });
  };

  const handleGoogleConnectionTypeSelect = (type: GoogleConnectionType) => {
    setState((prev) => ({
      ...prev,
      googleConnectionType: type,
      step: 'single-account',
    }));
  };

  const handleMicrosoftSMTPCheckComplete = () => {
    setState((prev) => ({
      ...prev,
      step: 'single-account',
    }));
  };

  const handleAccountCreated = () => {
    setState({ step: 'complete' });
    if (onComplete) {
      onComplete();
    } else {
      // Remove onboarding query param and refresh
      router.push('/dashboard/integrations');
    }
  };

  const handleBack = () => {
    setState((prev) => {
      const currentStep = prev.step;

      // Navigation logic based on current step
      if (currentStep === 'user-info') {
        return prev; // Can't go back from first step
      }

      if (currentStep === 'connection-method') {
        return { ...prev, step: 'user-info' };
      }

      if (currentStep === 'provider-selection') {
        return { ...prev, step: 'connection-method' };
      }

      if (currentStep === 'account-quantity') {
        return { ...prev, step: 'provider-selection' };
      }

      if (currentStep === 'google-oauth' || currentStep === 'microsoft-smtp') {
        return { ...prev, step: 'account-quantity' };
      }

      if (currentStep === 'single-account') {
        if (prev.emailProvider === 'google') {
          return { ...prev, step: 'google-oauth' };
        }
        if (prev.emailProvider === 'microsoft') {
          return { ...prev, step: 'microsoft-smtp' };
        }
        return { ...prev, step: 'account-quantity' };
      }

      if (currentStep === 'bulk-csv') {
        return { ...prev, step: 'account-quantity' };
      }

      return prev;
    });
  };

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss();
    } else {
      router.push('/dashboard/integrations');
    }
  };

  // Don't render wizard until we know if it's onboarding
  if (typeof window === 'undefined') {
    return null;
  }

  return (
    <>
      {/* Upgrade Interstitial Modal */}
      {showUpgradeModal && (
        <UpgradeInterstitialModal onClose={handleUpgradeModalClose} />
      )}

      {/* Main Wizard Content */}
      {!showUpgradeModal && state.step !== 'complete' && (
        <div className="min-h-[600px] relative">
          {/* Close Button (only if not mandatory onboarding) */}
          {!showOnboarding && (
            <div className="absolute top-0 right-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDismiss}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          )}

          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <button
                onClick={handleBack}
                disabled={state.step === 'user-info'}
                className="text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                ← Back
              </button>
              <span className="mx-2">|</span>
              <span className="capitalize">
                {state.step.replace(/-/g, ' ')}
              </span>
            </div>
          </div>

          {/* Step Content */}
          <div className="space-y-6">
            {state.step === 'user-info' && (
              <UserInfoStep
                onComplete={handleUserInfoComplete}
                initialData={state.userInfo}
              />
            )}

            {state.step === 'connection-method' && (
              <ConnectionMethodSelection
                onSelect={handleConnectionMethodSelect}
                selectedMethod={state.connectionMethod}
              />
            )}

            {state.step === 'provider-selection' && (
              <ProviderSelection
                onSelect={handleProviderSelect}
                selectedProvider={state.emailProvider}
              />
            )}

            {state.step === 'account-quantity' && (
              <AccountQuantitySelection
                onSelect={handleAccountQuantitySelect}
              />
            )}

            {state.step === 'google-oauth' && (
              <GoogleOAuthFlow
                onSelect={handleGoogleConnectionTypeSelect}
                onContinue={handleAccountCreated}
              />
            )}

            {state.step === 'microsoft-smtp' && (
              <MicrosoftSMTPCheck
                onContinue={handleMicrosoftSMTPCheckComplete}
              />
            )}

            {state.step === 'bulk-csv' && (
              <BulkCSVUpload onComplete={handleAccountCreated} />
            )}

            {state.step === 'single-account' && (
              <SingleAccountForm
                provider={state.emailProvider!}
                googleConnectionType={state.googleConnectionType}
                onComplete={handleAccountCreated}
              />
            )}
          </div>
        </div>
      )}

      {/* Completion State */}
      {state.step === 'complete' && (
        <div className="text-center py-12">
          <div className="mb-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Email Account Connected!
          </h2>
          <p className="text-gray-600 mb-6">
            Your email account has been successfully configured and is ready to use.
          </p>
          <Button onClick={handleDismiss}>Go to Integrations</Button>
        </div>
      )}
    </>
  );
}
