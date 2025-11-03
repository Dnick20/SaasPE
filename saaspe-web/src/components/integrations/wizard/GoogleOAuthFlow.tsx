'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Check, Key, ShieldCheck } from 'lucide-react';
import { GoogleConnectionType } from '../EmailAccountWizard';
import { featureFlags } from '@/lib/feature-flags';

interface GoogleOAuthFlowProps {
  onSelect: (type: GoogleConnectionType) => void;
  onContinue: () => void;
}

export function GoogleOAuthFlow({ onSelect }: GoogleOAuthFlowProps) {
  const [selectedType, setSelectedType] = useState<GoogleConnectionType | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTypeSelect = (type: GoogleConnectionType) => {
    setSelectedType(type);
    onSelect(type);
  };

  if (!selectedType) {
    return (
      <div className="space-y-6">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            Connect your Google account
          </h2>
          <p className="text-gray-600 text-lg">
            Choose how you'd like to authenticate
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 max-w-4xl mx-auto">
          {/* OAuth Option - Only show if feature flag enabled */}
          {featureFlags.ENABLE_OAUTH && (
            <button
              onClick={() => handleTypeSelect('oauth')}
              className="text-left border-2 border-gray-200 rounded-xl p-6 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <ShieldCheck className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">OAuth 2.0</h3>
                  <span className="text-xs text-green-600 font-semibold">
                    RECOMMENDED
                  </span>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                Secure authentication with automatic token refresh
              </p>

              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-gray-700">Most secure method</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-gray-700">No password needed</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-gray-700">Auto token refresh</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-gray-700">Easier setup</span>
                </li>
              </ul>
            </button>
          )}

          {/* App Password Option */}
          <button
            onClick={() => handleTypeSelect('app-password')}
            className="text-left border-2 border-gray-200 rounded-xl p-6 hover:border-gray-400 hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <Key className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">App Password</h3>
                <span className="text-xs text-green-600 font-semibold">
                  {featureFlags.ENABLE_OAUTH ? 'ALTERNATIVE' : 'RECOMMENDED'}
                </span>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Use SMTP with a Google app password
            </p>

            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-gray-700">Works with all apps</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-gray-700">Manual configuration</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-gray-700">Requires 2FA enabled</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-gray-700">More control</span>
              </li>
            </ul>
          </button>
        </div>

        {featureFlags.ENABLE_OAUTH && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-4xl mx-auto">
            <div className="flex items-start gap-3">
              <svg
                className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">
                  We recommend OAuth 2.0
                </h4>
                <p className="text-sm text-blue-800">
                  OAuth is more secure, easier to set up, and automatically refreshes
                  your authentication. You won't need to generate or manage passwords.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // OAuth Instructions (shown after OAuth is selected)
  if (selectedType === 'oauth') {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            Set up Google OAuth
          </h2>
          <p className="text-gray-600 text-lg">
            Follow these steps to enable OAuth authentication
          </p>
        </div>

        <div className="space-y-4">
          {/* Step 1 */}
          <div className="border border-gray-200 rounded-lg p-5">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Enable Gmail API in Google Cloud Console
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  Go to the Google Cloud Console and enable the Gmail API for your
                  project
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    window.open(
                      'https://console.cloud.google.com/apis/library/gmail.googleapis.com',
                      '_blank'
                    )
                  }
                >
                  Open Google Cloud Console →
                </Button>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="border border-gray-200 rounded-lg p-5">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold">2</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Create OAuth 2.0 Credentials
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  Create new OAuth credentials and configure the authorized redirect
                  URI
                </p>
                <div className="bg-gray-50 rounded p-3 mb-3">
                  <Label className="text-xs text-gray-600 mb-1">
                    Authorized Redirect URI:
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      readOnly
                      value={`${window.location.origin}/api/oauth/google/callback`}
                      className="text-sm font-mono"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleCopy(
                          `${window.location.origin}/api/oauth/google/callback`
                        )
                      }
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    window.open(
                      'https://console.cloud.google.com/apis/credentials',
                      '_blank'
                    )
                  }
                >
                  Create Credentials →
                </Button>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // If app-password is selected, it will continue to SingleAccountForm
  return null;
}
