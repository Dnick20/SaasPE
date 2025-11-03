'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function TranscriptionError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to Sentry
    Sentry.captureException(error);
    console.error('Transcription page error:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="p-8 max-w-md">
        <h2 className="text-2xl font-bold text-red-600 mb-4">
          Error Loading Transcription
        </h2>
        <p className="text-gray-600 mb-6">
          {error.message || 'An unexpected error occurred while loading this transcription.'}
        </p>
        <div className="space-x-4">
          <Button onClick={() => reset()}>
            Try Again
          </Button>
          <Button variant="outline" onClick={() => window.history.back()}>
            Go Back
          </Button>
        </div>
      </Card>
    </div>
  );
}
