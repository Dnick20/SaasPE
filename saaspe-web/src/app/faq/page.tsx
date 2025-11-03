import Link from 'next/link';
import { ArrowLeft, Mail, Send, TrendingUp, Settings } from 'lucide-react';

export const metadata = {
  title: 'Limits FAQ - SaasPE',
  description: 'Frequently asked questions about email sending limits and best practices',
};

export default function LimitsFAQPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-blue-600">
                SaasPE
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/pricing"
                className="text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Pricing
              </Link>
              <Link
                href="/dashboard"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
        {/* Back Link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-8"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>

        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Limits FAQ
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Essential guidelines for successful cold email outreach
          </p>
        </div>

        {/* FAQ Sections */}
        <div className="space-y-12">
          {/* Setup Section */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <div className="flex items-center mb-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-blue-100 mr-4">
                <Settings className="h-6 w-6 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Setup</h2>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-sm font-medium mr-3 mt-0.5 flex-shrink-0">
                  3
                </span>
                <span className="text-gray-700 text-lg">Email accounts per domain max</span>
              </li>
            </ul>
          </div>

          {/* Warmup Section */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <div className="flex items-center mb-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-orange-100 mr-4">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Warmup</h2>
            </div>
            <ul className="space-y-4">
              <li className="flex items-start">
                <span className="text-blue-600 mr-3 mt-1 text-lg font-bold">•</span>
                <span className="text-gray-700 text-lg">
                  Minimum <span className="font-semibold text-gray-900">2 weeks</span> before sending cold emails
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-3 mt-1 text-lg font-bold">•</span>
                <span className="text-gray-700 text-lg">
                  <span className="font-semibold text-gray-900">20 Warmup Emails Daily</span> (Use Instantly default settings and ramp)
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-3 mt-1 text-lg font-bold">•</span>
                <span className="text-gray-700 text-lg">Keep on forever</span>
              </li>
            </ul>
          </div>

          {/* Sending Section */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <div className="flex items-center mb-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-green-100 mr-4">
                <Send className="h-6 w-6 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Sending</h2>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-600 text-white text-sm font-bold mr-3 mt-0.5 flex-shrink-0">
                  30
                </span>
                <span className="text-gray-700 text-lg">Cold emails daily max per sending account</span>
              </li>
            </ul>
          </div>

          {/* Results Section */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <div className="flex items-center mb-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-purple-100 mr-4">
                <Mail className="h-6 w-6 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Results</h2>
            </div>
            <ul className="space-y-4">
              <li className="flex items-start">
                <span className="text-blue-600 mr-3 mt-1 text-lg font-bold">•</span>
                <span className="text-gray-700 text-lg">
                  <span className="font-semibold text-gray-900">1 Positive response</span> per 200 emails sent{' '}
                  <span className="text-gray-500 italic">(change copy/targeting if no responses)</span>
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-3 mt-1 text-lg font-bold">•</span>
                <span className="text-gray-700 text-lg">
                  <span className="font-semibold text-gray-900">1 Close</span> per 2.5K emails sent{' '}
                  <span className="text-gray-500 italic">(change niche/offer if no closes)</span>
                </span>
              </li>
            </ul>
          </div>

          {/* PS Section */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border-2 border-blue-200 p-8">
            <p className="text-base text-gray-700 leading-relaxed">
              <span className="font-bold text-gray-900 text-lg">PS:</span> In the beginning stop worrying too much about open rates and reply rates. Your focus should be on getting{' '}
              <span className="font-bold text-blue-600">positive responses</span> and{' '}
              <span className="font-bold text-blue-600">closes</span>. Once you&apos;re making over{' '}
              <span className="font-bold text-gray-900">$10K/mo</span> you can make your own rules.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-8 py-4 text-base font-semibold text-white hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
          >
            Get Started with Your Campaign
          </Link>
        </div>
      </div>
    </div>
  );
}
