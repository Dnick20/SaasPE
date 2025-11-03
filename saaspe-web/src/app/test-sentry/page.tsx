'use client';

import * as Sentry from '@sentry/nextjs';
import { useState } from 'react';
import { reportError, trackUserAction } from '@/lib/services/errorReporting';
import { apiClient, getCircuitBreakerState } from '@/lib/api/client';
import { handleAPIError, withErrorHandling } from '@/lib/utils/errorUtils';

export default function TestSentryPage() {
  const [result, setResult] = useState<string>('');
  const [circuitState, setCircuitState] = useState<string>('');

  const testError = () => {
    try {
      setResult('Sending error to Sentry...');
      throw new Error('Test error from SaasPE Web - Handled');
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          test: 'manual',
          component: 'TestSentryPage',
        },
        extra: {
          testType: 'handled_error',
          timestamp: new Date().toISOString(),
        },
      });
      setResult('✅ Error sent to Sentry! Check your dashboard.');
    }
  };

  const testUnhandledError = () => {
    setResult('Triggering unhandled error...');
    // This will crash and be caught by Sentry's error boundary
    throw new Error('Test unhandled error from SaasPE Web');
  };

  const testMessage = () => {
    setResult('Sending message to Sentry...');
    Sentry.captureMessage('Test info message from SaasPE Web', 'info');
    setResult('✅ Info message sent to Sentry!');
  };

  const testWarning = () => {
    setResult('Sending warning to Sentry...');
    Sentry.captureMessage('Test warning from SaasPE Web', 'warning');
    setResult('✅ Warning sent to Sentry!');
  };

  const testBreadcrumb = () => {
    Sentry.addBreadcrumb({
      category: 'user-action',
      message: 'User clicked test breadcrumb button',
      level: 'info',
    });
    setResult('✅ Breadcrumb added! Now trigger an error to see it in context.');
  };

  const testErrorReporting = () => {
    try {
      setResult('Testing error reporting service...');
      trackUserAction('Test Button Click', { testId: 'error-reporting' });
      throw new Error('Test error through reporting service');
    } catch (error) {
      reportError(error as Error, {
        severity: 'error',
        category: 'ui',
        component: 'TestSentryPage',
        action: 'testErrorReporting',
        extra: {
          testData: 'sample context',
        },
      });
      setResult('✅ Error reported with full context!');
    }
  };

  const testAPIError = async () => {
    setResult('Testing API error handling...');
    try {
      await apiClient.get('/api/v1/non-existent-endpoint');
    } catch (error) {
      const message = handleAPIError(error, {
        component: 'TestSentryPage',
        action: 'testAPIError',
        showToast: false,
      });
      setResult(`✅ API error handled: ${message}`);
    }
  };

  const testRetryLogic = async () => {
    setResult('Testing retry logic (will retry 3 times on 503)...');
    try {
      // This should trigger retries if backend returns 503
      await apiClient.get('/api/v1/test-retry-503');
      setResult('✅ Request succeeded (possibly after retries)');
    } catch {
      setResult('❌ Request failed after 3 retries');
    }
  };

  const testCircuitBreaker = async () => {
    setResult('Testing circuit breaker (triggering 5 failures)...');
    for (let i = 0; i < 6; i++) {
      try {
        await apiClient.get('/api/v1/force-500-error');
      } catch {
        // Ignore errors
      }
    }
    const state = getCircuitBreakerState();
    setCircuitState(state);
    setResult(`Circuit breaker state: ${state}`);
  };

  const testWithErrorHandling = async () => {
    setResult('Testing async error wrapper...');
    const result = await withErrorHandling(
      async () => {
        throw new Error('Test async error');
      },
      {
        component: 'TestSentryPage',
        action: 'testWithErrorHandling',
        showToast: false,
        category: 'ui',
      }
    );
    setResult(result ? '❌ Should have returned null' : '✅ Async error handled correctly');
  };

  const testNetworkError = async () => {
    setResult('Testing network error...');
    try {
      await apiClient.get('http://localhost:9999/non-existent', { timeout: 1000 });
    } catch (error) {
      handleAPIError(error, {
        component: 'TestSentryPage',
        action: 'testNetworkError',
        showToast: false,
      });
      setResult('✅ Network error handled');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-indigo-600 rounded-t-lg p-6 text-white">
          <h1 className="text-3xl font-bold mb-2">Sentry Test Page</h1>
          <p className="text-indigo-100">Test error monitoring for SaasPE Web</p>
        </div>

        {/* Result Display */}
        {result && (
          <div className="bg-white border-x border-gray-200 p-4">
            <div className={`p-4 rounded-md ${
              result.includes('✅')
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-blue-50 border border-blue-200 text-blue-800'
            }`}>
              <p className="font-medium">{result}</p>
            </div>
          </div>
        )}

        {/* Circuit Breaker Status */}
        {circuitState && (
          <div className="bg-white border-x border-gray-200 p-4">
            <div className={`p-4 rounded-md ${
              circuitState === 'OPEN'
                ? 'bg-red-50 border border-red-200 text-red-800'
                : circuitState === 'HALF_OPEN'
                ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
                : 'bg-green-50 border border-green-200 text-green-800'
            }`}>
              <p className="font-medium">Circuit Breaker: {circuitState}</p>
            </div>
          </div>
        )}

        {/* Test Buttons */}
        <div className="bg-white rounded-b-lg shadow-lg p-8 space-y-8">
          {/* Basic Error Testing Section */}
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Basic Error Testing</h2>
            <div className="grid gap-4">
              <TestButton
                onClick={testError}
                color="red"
                title="Test Handled Error"
                description="Catches and reports error to Sentry"
              />
              <TestButton
                onClick={testUnhandledError}
                color="orange"
                title="Test Unhandled Error ⚠️"
                description="Will crash the page (Sentry catches it)"
              />
            </div>
          </section>

          {/* Error Reporting Service */}
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Error Reporting Service</h2>
            <div className="grid gap-4">
              <TestButton
                onClick={testErrorReporting}
                color="purple"
                title="Test Error Reporting Service"
                description="Reports error with full context (navigation, actions, etc.)"
              />
              <TestButton
                onClick={testWithErrorHandling}
                color="purple"
                title="Test Async Error Wrapper"
                description="Tests withErrorHandling utility"
              />
            </div>
          </section>

          {/* API Error Testing */}
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">API Error Testing</h2>
            <div className="grid gap-4">
              <TestButton
                onClick={testAPIError}
                color="blue"
                title="Test API Error (404)"
                description="Tests API error handling utilities"
              />
              <TestButton
                onClick={testRetryLogic}
                color="blue"
                title="Test Retry Logic"
                description="Tests exponential backoff retry (503 errors)"
              />
              <TestButton
                onClick={testNetworkError}
                color="blue"
                title="Test Network Error"
                description="Tests network timeout handling"
              />
            </div>
          </section>

          {/* Circuit Breaker Testing */}
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Circuit Breaker Testing</h2>
            <div className="grid gap-4">
              <TestButton
                onClick={testCircuitBreaker}
                color="orange"
                title="Test Circuit Breaker"
                description="Triggers 6 failures to open circuit (check status above)"
              />
            </div>
          </section>

          {/* Message Testing Section */}
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Message Testing</h2>
            <div className="grid gap-4">
              <TestButton
                onClick={testMessage}
                color="blue"
                title="Send Info Message"
                description="Sends informational message"
              />
              <TestButton
                onClick={testWarning}
                color="yellow"
                title="Send Warning"
                description="Sends warning message"
              />
            </div>
          </section>

          {/* Breadcrumb Testing */}
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Breadcrumb Testing</h2>
            <TestButton
              onClick={testBreadcrumb}
              color="purple"
              title="Add Breadcrumb"
              description="Adds a breadcrumb (trigger error after to see it)"
            />
          </section>

          {/* Verification Instructions */}
          <section className="bg-gray-50 rounded-lg p-6 mt-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">How to Verify</h2>
            <ol className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="font-bold mr-2">1.</span>
                <span>Click any test button above</span>
              </li>
              <li className="flex items-start">
                <span className="font-bold mr-2">2.</span>
                <span>Go to <a href="https://sentry.io" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">https://sentry.io</a></span>
              </li>
              <li className="flex items-start">
                <span className="font-bold mr-2">3.</span>
                <span>Select your organization: <strong>bv-studios</strong></span>
              </li>
              <li className="flex items-start">
                <span className="font-bold mr-2">4.</span>
                <span>Select project: <strong>saaspe-web</strong></span>
              </li>
              <li className="flex items-start">
                <span className="font-bold mr-2">5.</span>
                <span>Check the Issues page for your test error/message</span>
              </li>
              <li className="flex items-start">
                <span className="font-bold mr-2">6.</span>
                <span>Click on the issue to see breadcrumbs, context, and stack trace</span>
              </li>
            </ol>
          </section>

          {/* Configuration Info */}
          <section className="bg-indigo-50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Configuration</h2>
            <div className="space-y-2 text-sm font-mono text-gray-700">
              <p><strong>DSN Configured:</strong> {process.env.NEXT_PUBLIC_SENTRY_DSN ? '✅ Yes' : '❌ No'}</p>
              <p><strong>Environment:</strong> {process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV}</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

interface TestButtonProps {
  onClick: () => void;
  color: 'red' | 'orange' | 'blue' | 'yellow' | 'purple';
  title: string;
  description: string;
}

function TestButton({ onClick, color, title, description }: TestButtonProps) {
  const colorClasses = {
    red: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    orange: 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500',
    blue: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    yellow: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
    purple: 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500',
  };

  return (
    <button
      onClick={onClick}
      className={`${colorClasses[color]} text-white rounded-lg p-4 text-left transition-all transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2`}
    >
      <div className="font-semibold text-lg">{title}</div>
      <div className="text-sm opacity-90 mt-1">{description}</div>
    </button>
  );
}
