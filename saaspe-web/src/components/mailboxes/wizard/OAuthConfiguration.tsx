'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { CreateMailboxDto } from '@/lib/api/mailboxes';
import { toast } from 'sonner';
import { ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  trackOAuthStarted,
  trackOAuthCompleted,
} from '@/lib/analytics/email-accounts';

/**
 * OAuth Configuration Step
 *
 * Guides user through OAuth setup for Gmail or Outlook
 * In production, this would redirect to OAuth consent screen
 */

interface OAuthConfigurationProps {
  provider: 'GMAIL' | 'OUTLOOK';
  onComplete: (data: Partial<CreateMailboxDto>) => void;
  onBack: () => void;
}

export function OAuthConfiguration({
  provider,
  onComplete,
  onBack,
}: OAuthConfigurationProps) {
  const [email, setEmail] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [oauthCompleted, setOauthCompleted] = useState(false);
  const [mockToken, setMockToken] = useState('');

  const providerName = provider === 'GMAIL' ? 'Google' : 'Microsoft';
  const oauthProvider = provider === 'GMAIL' ? 'google' : 'microsoft';

  const handleOAuthConnect = async () => {
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setIsConnecting(true);
    trackOAuthStarted(oauthProvider, email);

    // TODO: In production, redirect to actual OAuth consent screen
    // For now, simulate OAuth flow with mock token
    setTimeout(() => {
      const token = `mock_refresh_token_${Date.now()}`;
      setMockToken(token);
      setOauthCompleted(true);
      setIsConnecting(false);
      trackOAuthCompleted(oauthProvider, email);
      toast.success(`Connected to ${providerName}!`);
    }, 1500);
  };

  const handleContinue = () => {
    if (!email || !oauthCompleted) {
      toast.error('Please complete OAuth connection');
      return;
    }

    onComplete({
      email,
      oauthProvider,
      oauthRefreshToken: mockToken,
      oauthScopes: [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.readonly',
      ],
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-2">
          Connect {providerName} Account
        </h3>
        <p className="text-sm text-muted-foreground">
          Authorize SaasPE to send emails from your {providerName} account
        </p>
      </div>

      {/* Email Input */}
      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          placeholder={`your-email@${provider === 'GMAIL' ? 'gmail.com' : 'outlook.com'}`}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={oauthCompleted}
        />
        <p className="text-xs text-muted-foreground">
          The email address you want to send from
        </p>
      </div>

      {/* OAuth Connection Card */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-lg ${
            oauthCompleted ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
          }`}>
            {oauthCompleted ? (
              <CheckCircle2 className="w-6 h-6" />
            ) : (
              <ExternalLink className="w-6 h-6" />
            )}
          </div>

          <div className="flex-1">
            <h4 className="font-semibold mb-2">
              {oauthCompleted ? 'OAuth Connected!' : 'OAuth Authorization Required'}
            </h4>
            <p className="text-sm text-muted-foreground mb-4">
              {oauthCompleted ? (
                `Successfully connected to ${providerName}. You can now send emails from ${email}`
              ) : (
                `Click the button below to authorize SaasPE to access your ${providerName} account. You'll be redirected to ${providerName}'s secure login page.`
              )}
            </p>

            {!oauthCompleted ? (
              <Button
                onClick={handleOAuthConnect}
                disabled={!email || isConnecting}
                className="w-full"
              >
                {isConnecting ? (
                  'Connecting...'
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Connect with {providerName}
                  </>
                )}
              </Button>
            ) : (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                <span>Authorization completed</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Permissions Info */}
      <Card className="p-4 bg-gray-50 border-gray-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-gray-500 mt-0.5" />
          <div>
            <h4 className="font-medium text-sm mb-2">Required Permissions</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Send emails on your behalf</li>
              <li>• Read email metadata (for tracking)</li>
              <li>• Manage drafts</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-2">
              You can revoke access anytime from your {providerName} account settings
            </p>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          onClick={handleContinue}
          disabled={!oauthCompleted}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
