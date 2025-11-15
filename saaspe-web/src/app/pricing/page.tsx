import Link from 'next/link';
import { Check, ArrowRight, Zap, TrendingUp } from 'lucide-react';

export const metadata = {
  title: 'Pricing - SaasPE',
  description: 'Transparent token-based pricing that scales with your agency',
};

const plans = [
  {
    name: 'Professional',
    price: 550,
    tokens: '50,000',
    emailCredits: '100,000',
    description: 'Perfect for small to mid-sized agencies',
    features: [
      '50,000 tokens/month',
      '100,000 email credits/month',
      '~71 transcriptions (30 min)',
      '~238 AI proposals with adaptive learning',
      'Unlimited contacts with deduplication',
      '25 email account warmup automation',
      'AI-powered support chat',
      'CRM with unlimited clients',
      'Advanced analytics',
      'Email campaigns',
      'Priority email support',
      'Up to 5 team members',
    ],
    overage: '$0.009 per token',
    popular: false,
  },
  {
    name: 'Advanced',
    price: 1500,
    tokens: '125,000',
    emailCredits: '500,000',
    description: 'Most popular - For growing agencies',
    features: [
      '125,000 tokens/month',
      '500,000 email credits/month',
      '~178 transcriptions (30 min)',
      '~595 AI proposals with adaptive learning',
      'Unlimited contacts with deduplication',
      'Unlimited email account warmup',
      'AI-powered support chat with priority',
      'Advanced analytics & reporting',
      'HubSpot integration',
      'API access',
      'Priority support',
      'Up to 15 team members',
    ],
    overage: '$0.008 per token',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 2500,
    tokens: '300,000',
    emailCredits: '1,000,000',
    description: 'For established high-volume agencies',
    features: [
      '300,000 tokens/month',
      '1,000,000 email credits/month',
      '~428 transcriptions (30 min)',
      '~1,428 AI proposals with adaptive learning',
      'Unlimited contacts with deduplication',
      'Unlimited email account warmup',
      'Dedicated AI support chat assistant',
      'Unlimited clients & users',
      'DocuSign integration',
      'White-label options',
      'Custom branding',
      'Dedicated success manager',
      'Up to 50 team members',
    ],
    overage: '$0.007 per token',
    popular: false,
  },
];

const tokenPricing = [
  { action: 'Upload & transcribe meeting (30 min)', tokens: 70, cost: '$0.70' },
  { action: 'Generate AI proposal', tokens: 210, cost: '$2.10' },
  { action: 'Send 100 emails', tokens: 140, cost: '$1.40' },
  { action: 'Extract key moments (AI)', tokens: 35, cost: '$0.35' },
  { action: 'Create client record', tokens: 2, cost: '$0.02' },
  { action: 'Export proposal to PDF', tokens: 10, cost: '$0.10' },
];

const topUpPackages = [
  { name: 'Small', tokens: '5,000', price: 43, perToken: '$0.00855', savings: 'Save 5%' },
  { name: 'Medium', tokens: '15,000', price: 128, perToken: '$0.00855', savings: 'Save 5%' },
  { name: 'Large', tokens: '50,000', price: 428, perToken: '$0.00855', savings: 'Save 5%' },
  { name: 'XL', tokens: '150,000', price: 1283, perToken: '$0.00855', savings: 'Save 5%' },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <Link href="/" className="flex items-center">
              <span className="text-2xl font-bold text-blue-600">SaasPE</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Complete agency automation with tokens + dedicated email credits. All plans include AI-powered features.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              <span>Email warmup automation</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              <span>AI adaptive learning</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              <span>Contact deduplication</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              <span>AI support chat</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border-2 ${
                plan.popular
                  ? 'border-blue-500 shadow-lg scale-105'
                  : 'border-gray-200'
              } bg-white p-8 hover:shadow-xl transition-all`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    Most Popular
                  </div>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                <p className="text-gray-600 mt-2 text-sm">{plan.description}</p>
              </div>

              <div className="text-center mb-6">
                <div className="flex items-baseline justify-center">
                  <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                  <span className="text-gray-600 ml-2">/month</span>
                </div>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-center gap-1 text-blue-600 font-semibold text-sm">
                    <Zap className="h-4 w-4" />
                    <span>{plan.tokens} tokens</span>
                  </div>
                  <div className="flex items-center justify-center gap-1 text-green-600 font-semibold text-sm">
                    <Check className="h-4 w-4" />
                    <span>{plan.emailCredits} emails</span>
                  </div>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="text-center text-xs text-gray-500 mb-6">
                Overage: {plan.overage}
              </div>

              <Link
                href="/register"
                className={`block w-full text-center py-3 px-4 rounded-lg font-semibold transition-colors ${
                  plan.popular
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                Get Started
              </Link>
            </div>
          ))}
        </div>

        {/* New Features Showcase */}
        <div className="mt-24 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-12">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">
            Instantly.ai-Style Features + AI Intelligence
          </h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            All plans include powerful features that make SaasPE the most advanced agency automation platform
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Email Warmup Automation</h3>
              <p className="text-sm text-gray-600">
                Automatic progressive warmup for your email accounts. Start at 5 emails/day,
                automatically increase to 50 over 27 days. Protect your sender reputation.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Contact Deduplication</h3>
              <p className="text-sm text-gray-600">
                Automatically prevent duplicate contacts. Bulk import with smart merge capabilities.
                Keep your contact database clean and organized.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">AI Adaptive Learning</h3>
              <p className="text-sm text-gray-600">
                Our AI learns from your feedback. Rate proposals, track outcomes, and watch
                quality improve over time. Few-shot learning for better results.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                <Check className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Dedicated Email Credits</h3>
              <p className="text-sm text-gray-600">
                Separate email credits from tokens. Send thousands of emails without consuming
                your token balance. Monthly allocations based on your plan.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-pink-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">AI Support Chat</h3>
              <p className="text-sm text-gray-600">
                Real-time AI-powered support chat with WebSocket technology. Get instant
                answers to your questions without leaving the app.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Unlimited Contacts</h3>
              <p className="text-sm text-gray-600">
                Store unlimited contacts on all plans. No per-contact pricing. Import, export,
                and manage your entire contact database without limits.
              </p>
            </div>
          </div>
        </div>

        {/* Token Pricing Table */}
        <div className="mt-24">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">
            Token Pricing
          </h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            Clear, transparent pricing for every action. Know exactly what you&apos;re paying for.
          </p>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden max-w-4xl mx-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Action
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                    Tokens
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                    Cost
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {tokenPricing.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{item.action}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-right">
                      {item.tokens}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                      {item.cost}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-center text-sm text-gray-600 mt-6">
            Base rate: $0.10 per 100 tokens = $0.001 per token
          </p>
        </div>

        {/* Token Top-Up Packages */}
        <div className="mt-24">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">
            Token Top-Up Packages
          </h2>
          <p className="text-gray-600 text-center mb-12">
            Need more tokens? Purchase additional tokens at discounted rates.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {topUpPackages.map((pkg) => (
              <div
                key={pkg.name}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
              >
                <h3 className="text-lg font-bold text-gray-900 mb-2">{pkg.name}</h3>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  ${pkg.price}
                </div>
                <div className="text-blue-600 font-semibold mb-4">
                  {pkg.tokens} tokens
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>{pkg.perToken} per token</div>
                  <div className="text-green-600 font-medium">Save {pkg.savings}</div>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-gray-600 mt-6">
            Tokens never expire and roll over month-to-month
          </p>
        </div>

        {/* FAQ */}
        <div className="mt-24 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-2">
                What happens when I run out of tokens?
              </h3>
              <p className="text-gray-600 text-sm">
                You can purchase a top-up package instantly, or wait until your next month&apos;s allocation. Tokens are consumed as you use features, and you&apos;ll always see your balance before taking actions.
              </p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-2">
                Do unused tokens expire?
              </h3>
              <p className="text-gray-600 text-sm">
                No! Unused tokens roll over indefinitely. Your balance only grows. This means you never waste your investment.
              </p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-2">
                Can I downgrade my plan?
              </h3>
              <p className="text-gray-600 text-sm">
                Yes, you can change plans at any time. When you downgrade, you keep your existing token balance - only the monthly allocation changes.
              </p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-2">
                How do I know if I&apos;m on the right plan?
              </h3>
              <p className="text-gray-600 text-sm">
                Our dashboard shows real-time token usage and projected runway. We&apos;ll alert you if you&apos;re consistently under or over-utilizing your allocation so you can adjust.
              </p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-2">
                What&apos;s the difference between tokens and email credits?
              </h3>
              <p className="text-gray-600 text-sm">
                Tokens power AI features like transcriptions and proposal generation. Email credits are dedicated for sending campaign emails only. This separation ensures your email campaigns never consume your AI token balance.
              </p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-2">
                How does email warmup work?
              </h3>
              <p className="text-gray-600 text-sm">
                Our automated warmup starts your email accounts at 5 emails per day and progressively increases by 5 every 3 days until reaching 50 emails/day. This protects your sender reputation and ensures high deliverability.
              </p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-2">
                What is adaptive learning?
              </h3>
              <p className="text-gray-600 text-sm">
                Our AI learns from your feedback on proposals. Rate generated content, track deal outcomes, and the system uses this data to improve future generations. The more you use it, the better it gets at understanding your style and needs.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-24 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to get started?
          </h2>
          <p className="text-gray-600 mb-8">
            Start with our Starter plan and scale as you grow.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-lg"
          >
            Start Free Trial
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
