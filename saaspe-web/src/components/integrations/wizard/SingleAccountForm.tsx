'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, User, Mail, Server, Lock } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { mailboxesApi, CreateMailboxDto } from '@/lib/api/mailboxes';
import { toast } from 'sonner';
import { EmailProvider, GoogleConnectionType } from '../EmailAccountWizard';

// Schema for form validation
const accountSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email address'),
  smtpHost: z.string().optional(),
  smtpPort: z.string().optional(),
  smtpUsername: z.string().optional(),
  smtpPassword: z.string().optional(),
});

type AccountFormData = z.infer<typeof accountSchema>;

interface SingleAccountFormProps {
  provider: EmailProvider;
  googleConnectionType?: GoogleConnectionType;
  onComplete: () => void;
}

export function SingleAccountForm({
  provider,
  googleConnectionType,
  onComplete,
}: SingleAccountFormProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<'name' | 'email' | 'smtp'>('name');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      smtpPort: '587',
    },
  });

  const createMailboxMutation = useMutation({
    mutationFn: (data: CreateMailboxDto) => mailboxesApi.create(data),
    onSuccess: () => {
      toast.success('Email account connected successfully!');
      queryClient.invalidateQueries({ queryKey: ['mailboxes'] });
      onComplete();
    },
    onError: (error: unknown) => {
      const message = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to connect account'
        : 'Failed to connect account';
      toast.error(message);
    },
  });

  const onSubmit = (data: AccountFormData) => {
    // Determine provider type based on wizard selection
    let providerType: 'GMAIL' | 'OUTLOOK' | 'SMTP' | 'AWS_SES' = 'SMTP';

    if (provider === 'google') {
      providerType = 'GMAIL';
    } else if (provider === 'microsoft') {
      providerType = 'OUTLOOK';
    }

    const mailboxData: CreateMailboxDto = {
      email: data.email,
      type: 'USER_PROVIDED',
      provider: providerType,
    };

    // Add SMTP configuration for manual SMTP or app password flows
    if (provider === 'smtp' || googleConnectionType === 'app-password') {
      mailboxData.smtpHost = data.smtpHost || (providerType === 'GMAIL' ? 'smtp.gmail.com' : 'smtp-mail.outlook.com');
      mailboxData.smtpPort = parseInt(data.smtpPort || '587');
      mailboxData.smtpUsername = data.smtpUsername || data.email;
      mailboxData.smtpPassword = data.smtpPassword;
    }

    createMailboxMutation.mutate(mailboxData);
  };

  const firstName = watch('firstName');
  const lastName = watch('lastName');
  const email = watch('email');

  const canContinueFromName = firstName && lastName;
  const canContinueFromEmail = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">
          {step === 'name' && 'Tell us your name'}
          {step === 'email' && 'What\'s your email address?'}
          {step === 'smtp' && 'Configure SMTP settings'}
        </h2>
        <p className="text-gray-600 text-lg">
          {step === 'name' && 'We\'ll use this to personalize your experience'}
          {step === 'email' && `Enter your ${provider === 'google' ? 'Gmail' : provider === 'microsoft' ? 'Microsoft 365' : 'email'} address`}
          {step === 'smtp' && 'Enter your SMTP server details'}
        </p>
      </div>

      {/* Progress Dots */}
      <div className="flex justify-center gap-2">
        <div className={`w-2 h-2 rounded-full ${step === 'name' ? 'bg-blue-600' : 'bg-gray-300'}`} />
        <div className={`w-2 h-2 rounded-full ${step === 'email' ? 'bg-blue-600' : 'bg-gray-300'}`} />
        {(provider === 'smtp' || googleConnectionType === 'app-password' || provider === 'microsoft') && (
          <div className={`w-2 h-2 rounded-full ${step === 'smtp' ? 'bg-blue-600' : 'bg-gray-300'}`} />
        )}
      </div>

      {/* Step 1: Name */}
      {step === 'name' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-gray-500" />
                  First Name
                </div>
              </Label>
              <Input
                id="firstName"
                placeholder="John"
                {...register('firstName')}
                autoFocus
                className="text-lg py-6"
              />
              {errors.firstName && (
                <p className="text-sm text-red-600 mt-1">{errors.firstName.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="lastName">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-gray-500" />
                  Last Name
                </div>
              </Label>
              <Input
                id="lastName"
                placeholder="Doe"
                {...register('lastName')}
                className="text-lg py-6"
              />
              {errors.lastName && (
                <p className="text-sm text-red-600 mt-1">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <Button
            type="button"
            onClick={() => setStep('email')}
            disabled={!canContinueFromName}
            className="w-full py-6 text-lg"
          >
            Continue
          </Button>
        </div>
      )}

      {/* Step 2: Email */}
      {step === 'email' && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="email">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="h-4 w-4 text-gray-500" />
                Email Address
              </div>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder={
                provider === 'google'
                  ? 'you@gmail.com'
                  : provider === 'microsoft'
                    ? 'you@company.com'
                    : 'you@example.com'
              }
              {...register('email')}
              autoFocus
              className="text-lg py-6"
            />
            {errors.email && (
              <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
            )}
          </div>

          {/* Info box based on provider */}
          {provider === 'google' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                {googleConnectionType === 'app-password'
                  ? 'Make sure you have 2-factor authentication enabled and generate an app password for SaasPE.'
                  : 'We\'ll use OAuth to securely connect to your Gmail account.'}
              </p>
            </div>
          )}

          {provider === 'microsoft' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                Make sure SMTP is enabled for this Microsoft 365 account.
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep('name')}
              className="flex-1 py-6 text-lg"
            >
              Back
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (provider === 'smtp' || googleConnectionType === 'app-password' || provider === 'microsoft') {
                  setStep('smtp');
                } else {
                  handleSubmit(onSubmit)();
                }
              }}
              disabled={!canContinueFromEmail}
              className="flex-1 py-6 text-lg"
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: SMTP Configuration (only for SMTP, app-password, or Microsoft) */}
      {step === 'smtp' && (
        <div className="space-y-4">
          {provider !== 'smtp' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800">
                {provider === 'google'
                  ? 'You\'ll need to generate an app password from your Google Account settings and use it below.'
                  : 'Use your Microsoft 365 email password or an app password if you have MFA enabled.'}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 md:col-span-1">
              <Label htmlFor="smtpHost">
                <div className="flex items-center gap-2 mb-2">
                  <Server className="h-4 w-4 text-gray-500" />
                  SMTP Host
                </div>
              </Label>
              <Input
                id="smtpHost"
                placeholder={provider === 'google' ? 'smtp.gmail.com' : 'smtp-mail.outlook.com'}
                {...register('smtpHost')}
                defaultValue={
                  provider === 'google'
                    ? 'smtp.gmail.com'
                    : provider === 'microsoft'
                      ? 'smtp.office365.com'
                      : ''
                }
              />
            </div>

            <div className="col-span-2 md:col-span-1">
              <Label htmlFor="smtpPort">
                <div className="flex items-center gap-2 mb-2">
                  <Server className="h-4 w-4 text-gray-500" />
                  SMTP Port
                </div>
              </Label>
              <Input
                id="smtpPort"
                placeholder="587"
                {...register('smtpPort')}
                defaultValue="587"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="smtpUsername">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-gray-500" />
                SMTP Username
              </div>
            </Label>
            <Input
              id="smtpUsername"
              placeholder={email || 'your-email@example.com'}
              {...register('smtpUsername')}
              defaultValue={email}
            />
          </div>

          <div>
            <Label htmlFor="smtpPassword">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="h-4 w-4 text-gray-500" />
                {googleConnectionType === 'app-password' ? 'App Password' : 'SMTP Password'}
              </div>
            </Label>
            <Input
              id="smtpPassword"
              type="password"
              placeholder="••••••••"
              {...register('smtpPassword')}
              autoFocus
            />
            {errors.smtpPassword && (
              <p className="text-sm text-red-600 mt-1">{errors.smtpPassword.message}</p>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep('email')}
              disabled={createMailboxMutation.isPending}
              className="flex-1"
            >
              Back
            </Button>
            <Button
              type="submit"
              disabled={createMailboxMutation.isPending}
              className="flex-1"
            >
              {createMailboxMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Connecting...
                </>
              ) : (
                'Connect Account'
              )}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
