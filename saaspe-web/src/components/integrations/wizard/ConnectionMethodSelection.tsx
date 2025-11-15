'use client';

import { Sparkles, Headphones, Link2 } from 'lucide-react';
import { ConnectionMethod } from '../EmailAccountWizard';

interface ConnectionMethodSelectionProps {
  onSelect: (method: ConnectionMethod) => void;
  selectedMethod?: ConnectionMethod;
}

export function ConnectionMethodSelection({
  onSelect,
  selectedMethod,
}: ConnectionMethodSelectionProps) {
  const methods = [
    {
      id: 'pre-warmed' as ConnectionMethod,
      icon: Sparkles,
      title: 'Pre-Warmed Accounts',
      description: 'Get instant access to warm, ready-to-use email accounts',
      features: [
        'Instant availability',
        'Already warmed up',
        'Optimal deliverability',
        'Managed by SaasPE',
      ],
      badge: 'FASTEST',
      badgeColor: 'bg-green-500',
      disabled: true,
      comingSoon: true,
    },
    {
      id: 'done-for-you' as ConnectionMethod,
      icon: Headphones,
      title: 'Done-For-You Setup',
      description: 'Our team sets up and manages everything for you',
      features: [
        'White-glove service',
        'Expert configuration',
        'Ongoing management',
        'Premium support',
      ],
      badge: 'PREMIUM',
      badgeColor: 'bg-purple-500',
      disabled: true,
      comingSoon: true,
    },
    {
      id: 'connect-existing' as ConnectionMethod,
      icon: Link2,
      title: 'Connect Your Own',
      description: 'Use your existing Gmail, Outlook, or SMTP accounts',
      features: [
        'Use your email',
        'Full control',
        'No extra cost',
        'Multiple providers',
      ],
      badge: 'POPULAR',
      badgeColor: 'bg-blue-500',
      disabled: false,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">
          How would you like to connect your email?
        </h2>
        <p className="text-gray-600 text-lg">
          Choose the method that works best for your workflow
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        {methods.map((method) => {
          const Icon = method.icon;
          const isSelected = selectedMethod === method.id;

          return (
            <button
              key={method.id}
              onClick={() => !method.disabled && onSelect(method.id)}
              disabled={method.disabled}
              className={`
                relative text-left border-2 rounded-xl p-6 transition-all
                ${isSelected ? 'border-blue-500 shadow-lg' : 'border-gray-200'}
                ${
                  method.disabled
                    ? 'opacity-60 cursor-not-allowed'
                    : 'hover:border-blue-400 hover:shadow-md cursor-pointer'
                }
              `}
            >
              {/* Badge */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span
                  className={`${method.badgeColor} text-white px-3 py-1 rounded-full text-xs font-semibold`}
                >
                  {method.badge}
                </span>
              </div>

              {/* Coming Soon Badge */}
              {method.comingSoon && (
                <div className="absolute top-4 right-4">
                  <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-semibold">
                    Coming Soon
                  </span>
                </div>
              )}

              {/* Icon */}
              <div
                className={`
                w-12 h-12 rounded-xl flex items-center justify-center mb-4
                ${isSelected ? 'bg-blue-100' : 'bg-gray-100'}
              `}
              >
                <Icon
                  className={`h-6 w-6 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`}
                />
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {method.title}
              </h3>
              <p className="text-sm text-gray-600 mb-4">{method.description}</p>

              {/* Features */}
              <ul className="space-y-2">
                {method.features.map((feature) => (
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

      <div className="text-center mt-8">
        <p className="text-sm text-gray-500">
          Not sure which to choose?{' '}
          <a
            href="#"
            className="text-blue-600 hover:underline"
            onClick={(e) => {
              e.preventDefault();
              // Could open a help modal here
            }}
          >
            See our comparison guide
          </a>
        </p>
      </div>
    </div>
  );
}
