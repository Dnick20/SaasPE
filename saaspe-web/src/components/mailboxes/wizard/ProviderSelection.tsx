'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Server, Cloud } from 'lucide-react';

/**
 * Provider Selection Step
 *
 * First step in the email wizard - select email provider
 */

interface ProviderSelectionProps {
  onSelect: (provider: 'GMAIL' | 'OUTLOOK' | 'SMTP' | 'AWS_SES') => void;
}

export function ProviderSelection({ onSelect }: ProviderSelectionProps) {
  const providers = [
    {
      id: 'GMAIL' as const,
      name: 'Google / Gmail',
      description: 'Connect via OAuth 2.0 (recommended)',
      icon: Mail,
      color: 'text-red-500',
      recommended: true,
    },
    {
      id: 'OUTLOOK' as const,
      name: 'Microsoft / Outlook',
      description: 'Connect via OAuth 2.0 (recommended)',
      icon: Mail,
      color: 'text-blue-500',
      recommended: true,
    },
    {
      id: 'SMTP' as const,
      name: 'SMTP / Custom',
      description: 'Connect via SMTP credentials',
      icon: Server,
      color: 'text-gray-500',
      recommended: false,
    },
    {
      id: 'AWS_SES' as const,
      name: 'AWS SES',
      description: 'Coming soon',
      icon: Cloud,
      color: 'text-orange-500',
      recommended: false,
      disabled: true,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-2">
          Choose Your Email Provider
        </h3>
        <p className="text-sm text-muted-foreground">
          Select how you want to connect your email account
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {providers.map((provider) => {
          const Icon = provider.icon;

          return (
            <Card
              key={provider.id}
              className={`p-6 relative cursor-pointer transition-all hover:shadow-md ${
                provider.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary'
              }`}
              onClick={() => !provider.disabled && onSelect(provider.id)}
            >
              {provider.recommended && (
                <div className="absolute top-2 right-2">
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
                    Recommended
                  </span>
                </div>
              )}

              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg bg-gray-100 ${provider.color}`}>
                  <Icon className="w-6 h-6" />
                </div>

                <div className="flex-1">
                  <h4 className="font-semibold mb-1">{provider.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {provider.description}
                  </p>
                </div>
              </div>

              {!provider.disabled && (
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(provider.id);
                  }}
                >
                  Select {provider.name}
                </Button>
              )}
            </Card>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-medium text-sm mb-2">Why OAuth is recommended?</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• More secure (no password storage)</li>
          <li>• Automatic token refresh</li>
          <li>• Better deliverability</li>
          <li>• Revocable access</li>
        </ul>
      </div>
    </div>
  );
}
