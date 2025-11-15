'use client';

import { Mail } from 'lucide-react';
import { EmailProvider } from '../EmailAccountWizard';
import { featureFlags } from '@/lib/feature-flags';

interface ProviderSelectionProps {
  onSelect: (provider: EmailProvider) => void;
  selectedProvider?: EmailProvider;
}

export function ProviderSelection({
  onSelect,
  selectedProvider,
}: ProviderSelectionProps) {
  const providers = [
    {
      id: 'google' as EmailProvider,
      name: 'Google Workspace',
      description: 'Connect your Gmail or Google Workspace account',
      logo: (
        <svg className="h-12 w-12" viewBox="0 0 48 48">
          <path
            fill="#EA4335"
            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
          />
          <path
            fill="#4285F4"
            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
          />
          <path
            fill="#FBBC05"
            d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
          />
          <path
            fill="#34A853"
            d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
          />
        </svg>
      ),
      features: featureFlags.ENABLE_OAUTH
        ? [
            'OAuth 2.0 authentication',
            'App password support',
            'Automatic token refresh',
            'Best-in-class deliverability',
          ]
        : [
            'App password support',
            'SMTP authentication',
            'Secure connection',
            'Best-in-class deliverability',
          ],
      recommended: true,
    },
    {
      id: 'microsoft' as EmailProvider,
      name: 'Microsoft 365',
      description: 'Connect your Outlook or Office 365 account',
      logo: (
        <svg className="h-12 w-12" viewBox="0 0 48 48">
          <path fill="#FF5722" d="M6 6h16v16H6z" />
          <path fill="#4CAF50" d="M26 6h16v16H26z" />
          <path fill="#2196F3" d="M6 26h16v16H6z" />
          <path fill="#FFC107" d="M26 26h16v16H26z" />
        </svg>
      ),
      features: featureFlags.ENABLE_OAUTH
        ? [
            'OAuth 2.0 authentication',
            'SMTP app password',
            'Enterprise-grade security',
            'Office 365 integration',
          ]
        : [
            'SMTP app password',
            'Secure authentication',
            'Enterprise-grade security',
            'Office 365 integration',
          ],
      recommended: false,
    },
    {
      id: 'smtp' as EmailProvider,
      name: 'Custom SMTP',
      description: 'Connect any email provider using SMTP',
      logo: (
        <div className="h-12 w-12 bg-gray-100 rounded-xl flex items-center justify-center">
          <Mail className="h-6 w-6 text-gray-600" />
        </div>
      ),
      features: [
        'Works with any provider',
        'Full SMTP control',
        'Custom configuration',
        'Direct connection',
      ],
      recommended: false,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">
          Choose your email provider
        </h2>
        <p className="text-gray-600 text-lg">
          Select the email service you want to connect
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        {providers.map((provider) => {
          const isSelected = selectedProvider === provider.id;

          return (
            <button
              key={provider.id}
              onClick={() => onSelect(provider.id)}
              className={`
                relative text-left border-2 rounded-xl p-6 transition-all
                ${isSelected ? 'border-blue-500 shadow-lg' : 'border-gray-200'}
                hover:border-blue-400 hover:shadow-md cursor-pointer
              `}
            >
              {/* Recommended Badge */}
              {provider.recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    RECOMMENDED
                  </span>
                </div>
              )}

              {/* Logo */}
              <div className="flex justify-center mb-4">{provider.logo}</div>

              {/* Content */}
              <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">
                {provider.name}
              </h3>
              <p className="text-sm text-gray-600 mb-4 text-center">
                {provider.description}
              </p>

              {/* Features */}
              <ul className="space-y-2 mt-4">
                {provider.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <svg
                      className="h-4 w-4 text-green-500 flex-shrink-0"
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
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Selection Indicator */}
              {isSelected && (
                <div className="absolute -bottom-1 left-0 right-0 h-1 bg-blue-500 rounded-b-xl" />
              )}
            </button>
          );
        })}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-8">
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
              Need help choosing?
            </h4>
            <p className="text-sm text-blue-800">
              We recommend Google Workspace for the best deliverability and easiest
              setup. {featureFlags.ENABLE_OAUTH
                ? 'OAuth authentication is more secure than SMTP passwords and provides automatic token refresh.'
                : 'Use app passwords for secure authentication with two-factor authentication enabled.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
