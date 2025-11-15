'use client';

/**
 * Root Error Boundary
 * Catches all errors in the app root
 */

import { useEffect } from 'react';
import { reportError } from '@/lib/services/errorReporting';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Report error
    reportError(error, {
      severity: 'fatal',
      category: 'unknown',
      component: 'RootError',
    });
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full p-8">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <AlertCircle className="h-10 w-10 text-red-600" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Application Error
                </h1>
                <p className="text-gray-600 mb-6">
                  We encountered an unexpected error. Our team has been notified and is working on a fix.
                </p>

                {process.env.NODE_ENV === 'development' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <h3 className="text-sm font-semibold text-red-800 mb-2">Error Details:</h3>
                    <p className="text-sm text-red-700 font-mono">
                      {error.message}
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => reset()} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.location.reload()}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reload Page
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => (window.location.href = '/dashboard')}
                    className="gap-2"
                  >
                    <Home className="h-4 w-4" />
                    Go to Dashboard
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </body>
    </html>
  );
}
