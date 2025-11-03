'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CreateMailboxDto } from '@/lib/api/mailboxes';
import { CheckCircle2, Mail, Server, Shield, Key } from 'lucide-react';

/**
 * Review and Test Step
 *
 * Final step - review configuration before adding mailbox
 */

interface ReviewAndTestProps {
  mailboxData: Partial<CreateMailboxDto>;
  provider: 'GMAIL' | 'OUTLOOK' | 'SMTP' | 'AWS_SES';
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function ReviewAndTest({
  mailboxData,
  provider,
  onBack,
  onSubmit,
  isSubmitting,
}: ReviewAndTestProps) {
  const providerName = {
    GMAIL: 'Google Gmail',
    OUTLOOK: 'Microsoft Outlook',
    SMTP: 'SMTP',
    AWS_SES: 'AWS SES',
  }[provider];

  const isOAuth = provider === 'GMAIL' || provider === 'OUTLOOK';

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="flex justify-center mb-4">
          <div className="p-4 rounded-full bg-green-100">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <h3 className="text-lg font-semibold mb-2">
          Review Your Configuration
        </h3>
        <p className="text-sm text-muted-foreground">
          Verify your email account details before adding
        </p>
      </div>

      {/* Configuration Summary */}
      <Card className="p-6 space-y-4">
        {/* Provider */}
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
            <Mail className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">Provider</p>
            <p className="text-base font-semibold">{providerName}</p>
          </div>
        </div>

        {/* Email Address */}
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
            <Mail className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">Email Address</p>
            <p className="text-base font-semibold">{mailboxData.email}</p>
          </div>
        </div>

        {/* Authentication Method */}
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-green-100 text-green-600">
            <Shield className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">Authentication</p>
            <p className="text-base font-semibold">
              {isOAuth ? 'OAuth 2.0 (Secure)' : 'SMTP Credentials'}
            </p>
            {isOAuth && (
              <p className="text-xs text-muted-foreground mt-1">
                ✓ Refresh token configured
              </p>
            )}
          </div>
        </div>

        {/* SMTP Configuration (if applicable) */}
        {!isOAuth && mailboxData.smtpHost && (
          <>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
                <Server className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">SMTP Server</p>
                <p className="text-base font-semibold">
                  {mailboxData.smtpHost}:{mailboxData.smtpPort}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {mailboxData.smtpUseSsl ? '✓ SSL/TLS Enabled' : '⚠ SSL/TLS Disabled'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-gray-100 text-gray-600">
                <Key className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Username</p>
                <p className="text-base font-semibold">{mailboxData.smtpUsername}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  ✓ Password encrypted
                </p>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* What Happens Next */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <h4 className="font-medium text-sm mb-3">What happens next?</h4>
        <ul className="text-sm text-muted-foreground space-y-2">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <span>Your email account will be added to your mailboxes</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <span>Connection will be tested automatically</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <span>Email warmup will start (recommended for new accounts)</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <span>You can start sending campaigns</span>
          </li>
        </ul>
      </Card>

      {/* Security Notice */}
      {!isOAuth && (
        <Card className="p-4 bg-yellow-50 border-yellow-200">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-sm mb-1">Security Notice</h4>
              <p className="text-sm text-muted-foreground">
                Your SMTP password will be encrypted using AES-256-GCM before storage.
                For enhanced security, consider using OAuth providers (Google/Microsoft).
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
          Back
        </Button>
        <Button onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Adding Email Account...' : 'Add Email Account'}
        </Button>
      </div>
    </div>
  );
}
