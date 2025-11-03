'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { useCreateMailbox } from '@/lib/hooks/useMailboxes';
import { CreateMailboxDto } from '@/lib/api/mailboxes';
import { toast } from 'sonner';
import { ProviderSelection } from './wizard/ProviderSelection';
import { OAuthConfiguration } from './wizard/OAuthConfiguration';
import { SMTPConfiguration } from './wizard/SMTPConfiguration';
import { ReviewAndTest } from './wizard/ReviewAndTest';
import {
  trackWizardOpened,
  trackProviderSelected,
  trackMailboxCreated,
  trackMailboxCreationFailed,
} from '@/lib/analytics/email-accounts';

/**
 * Email Account Wizard
 *
 * Multi-step wizard for adding email accounts:
 * 1. Select provider (Google/Microsoft/SMTP/AWS SES)
 * 2. Configure OAuth or SMTP
 * 3. Review and test connection
 *
 * Usage:
 * ```tsx
 * <EmailWizard open={isOpen} onClose={() => setIsOpen(false)} />
 * ```
 */

interface EmailWizardProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type Provider = 'GMAIL' | 'OUTLOOK' | 'SMTP' | 'AWS_SES';
type Step = 1 | 2 | 3;

export function EmailWizard({ open, onClose, onSuccess }: EmailWizardProps) {
  const [step, setStep] = useState<Step>(1);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [mailboxData, setMailboxData] = useState<Partial<CreateMailboxDto>>({});

  const createMailbox = useCreateMailbox();

  // Track wizard opened
  useEffect(() => {
    if (open) {
      trackWizardOpened();
    }
  }, [open]);

  const handleProviderSelect = (selectedProvider: Provider) => {
    trackProviderSelected(selectedProvider);
    setProvider(selectedProvider);
    setMailboxData({
      ...mailboxData,
      provider: selectedProvider,
      type: 'USER_PROVIDED',
    });
    setStep(2);
  };

  const handleOAuthComplete = (data: Partial<CreateMailboxDto>) => {
    setMailboxData({ ...mailboxData, ...data });
    setStep(3);
  };

  const handleSMTPComplete = (data: Partial<CreateMailboxDto>) => {
    setMailboxData({ ...mailboxData, ...data });
    setStep(3);
  };

  const handleSubmit = async () => {
    if (!mailboxData.email || !mailboxData.provider) {
      toast.error('Missing required fields');
      return;
    }

    try {
      await createMailbox.mutateAsync(mailboxData as CreateMailboxDto);

      // Track successful creation
      const authType = mailboxData.oauthRefreshToken ? 'oauth' : 'smtp';
      trackMailboxCreated(mailboxData.provider, authType);

      toast.success('Email account added successfully!');
      handleClose();
      onSuccess?.();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to add email account';

      // Track failed creation
      trackMailboxCreationFailed(mailboxData.provider || 'unknown', message);

      toast.error(message);
    }
  };

  const handleClose = () => {
    setStep(1);
    setProvider(null);
    setMailboxData({});
    onClose();
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as Step);
    }
  };

  const progressPercentage = (step / 3) * 100;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Email Account</DialogTitle>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className={step >= 1 ? 'text-primary font-medium' : 'text-muted-foreground'}>
              1. Select Provider
            </span>
            <span className={step >= 2 ? 'text-primary font-medium' : 'text-muted-foreground'}>
              2. Configure
            </span>
            <span className={step >= 3 ? 'text-primary font-medium' : 'text-muted-foreground'}>
              3. Review
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">
          {step === 1 && (
            <ProviderSelection onSelect={handleProviderSelect} />
          )}

          {step === 2 && provider && (
            <>
              {(provider === 'GMAIL' || provider === 'OUTLOOK') && (
                <OAuthConfiguration
                  provider={provider}
                  onComplete={handleOAuthComplete}
                  onBack={handleBack}
                />
              )}

              {provider === 'SMTP' && (
                <SMTPConfiguration
                  onComplete={handleSMTPComplete}
                  onBack={handleBack}
                />
              )}

              {provider === 'AWS_SES' && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">
                    AWS SES configuration coming soon
                  </p>
                  <Button onClick={handleBack} variant="outline">
                    Back
                  </Button>
                </div>
              )}
            </>
          )}

          {step === 3 && (
            <ReviewAndTest
              mailboxData={mailboxData}
              provider={provider!}
              onBack={handleBack}
              onSubmit={handleSubmit}
              isSubmitting={createMailbox.isPending}
            />
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={step === 1 ? handleClose : handleBack}
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>

          {step === 3 && (
            <Button
              onClick={handleSubmit}
              disabled={createMailbox.isPending}
            >
              {createMailbox.isPending ? 'Adding...' : 'Add Email Account'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
