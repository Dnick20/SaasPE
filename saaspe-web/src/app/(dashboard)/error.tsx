'use client';

/**
 * Dashboard Error Boundary
 * Catches errors in dashboard routes
 */

import { useEffect } from 'react';
import { reportError } from '@/lib/services/errorReporting';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Report error
    reportError(error, {
      severity: 'error',
      category: 'ui',
      component: 'DashboardError',
      extra: {
        route: 'dashboard',
      },
    });
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-xl w-full p-8">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-600 mb-6">
              We encountered an error while loading this page. Please try again.
            </p>

            {process.env.NODE_ENV === 'development' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-red-700 font-mono">
                  {error.message}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={() => reset()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button
                variant="outline"
                onClick={() => (window.location.href = '/dashboard')}
              >
                <Home className="h-4 w-4 mr-2" />
                Dashboard Home
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
