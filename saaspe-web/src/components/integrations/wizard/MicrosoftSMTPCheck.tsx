'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, ExternalLink, Loader2 } from 'lucide-react';

interface MicrosoftSMTPCheckProps {
  onContinue: () => void;
}

export function MicrosoftSMTPCheck({ onContinue }: MicrosoftSMTPCheckProps) {
  const [checkStatus, setCheckStatus] = useState<'pending' | 'checking' | 'enabled' | 'disabled'>('pending');

  const handleCheck = async () => {
    setCheckStatus('checking');
    // Simulate check - in reality this would call an API
    setTimeout(() => {
      setCheckStatus('enabled');
    }, 2000);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">
          Enable SMTP for Microsoft 365
        </h2>
        <p className="text-gray-600 text-lg">
          Before connecting, make sure SMTP is enabled for your account
        </p>
      </div>

      <div className="space-y-4">
        {/* Why this is needed */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
          <h3 className="font-semibold text-blue-900 mb-2">
            Why do I need to enable SMTP?
          </h3>
          <p className="text-sm text-blue-800">
            Microsoft 365 requires SMTP authentication to be explicitly enabled for
            each account. This allows applications to send emails on your behalf
            while maintaining security.
          </p>
        </div>

        {/* Steps */}
        <div className="border border-gray-200 rounded-lg p-5">
          <h3 className="font-semibold text-gray-900 mb-4">
            Follow these steps to enable SMTP:
          </h3>

          <ol className="space-y-4">
            <li className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 text-sm font-bold">1</span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-700 mb-2">
                  Go to Microsoft 365 Admin Center
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    window.open('https://admin.microsoft.com', '_blank')
                  }
                >
                  Open Admin Center
                  <ExternalLink className="h-3 w-3 ml-2" />
                </Button>
              </div>
            </li>

            <li className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 text-sm font-bold">2</span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-700">
                  Navigate to <strong>Users → Active users</strong> and select your account
                </p>
              </div>
            </li>

            <li className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 text-sm font-bold">3</span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-700">
                  Click <strong>Mail</strong> → <strong>Manage email apps</strong>
                </p>
              </div>
            </li>

            <li className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 text-sm font-bold">4</span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-700">
                  Enable <strong>Authenticated SMTP</strong> and click Save
                </p>
              </div>
            </li>
          </ol>
        </div>

        {/* Alternative: App Password */}
        <div className="border border-gray-200 rounded-lg p-5">
          <h3 className="font-semibold text-gray-900 mb-2">
            Alternative: Use an App Password
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            If your organization has multi-factor authentication (MFA) enabled, you'll
            need to generate an app password instead of using your regular password.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              window.open(
                'https://support.microsoft.com/en-us/account-billing/using-app-passwords-with-apps-that-don-t-support-two-step-verification-5896ed9b-4263-e681-128a-a6f2979a7944',
                '_blank'
              )
            }
          >
            Learn about app passwords
            <ExternalLink className="h-3 w-3 ml-2" />
          </Button>
        </div>

        {/* Check Status */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          {checkStatus === 'pending' && (
            <>
              <p className="text-sm text-gray-600 mb-4">
                Once you've enabled SMTP, click the button below to verify
              </p>
              <Button onClick={handleCheck}>
                Verify SMTP is Enabled
              </Button>
            </>
          )}

          {checkStatus === 'checking' && (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm text-gray-600">Checking SMTP status...</p>
            </div>
          )}

          {checkStatus === 'enabled' && (
            <div className="flex flex-col items-center gap-3">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
              <p className="font-semibold text-gray-900">SMTP is enabled!</p>
              <p className="text-sm text-gray-600 mb-4">
                You're ready to connect your Microsoft 365 account
              </p>
              <Button onClick={onContinue}>
                Continue to Account Setup
              </Button>
            </div>
          )}

          {checkStatus === 'disabled' && (
            <div className="flex flex-col items-center gap-3">
              <XCircle className="h-12 w-12 text-red-600" />
              <p className="font-semibold text-gray-900">SMTP is not enabled</p>
              <p className="text-sm text-gray-600 mb-4">
                Please follow the steps above to enable SMTP
              </p>
              <Button variant="outline" onClick={() => setCheckStatus('pending')}>
                Try Again
              </Button>
            </div>
          )}
        </div>

        {/* Skip option */}
        {checkStatus === 'pending' && (
          <div className="text-center">
            <button
              onClick={onContinue}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Skip verification (I've already enabled SMTP)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
