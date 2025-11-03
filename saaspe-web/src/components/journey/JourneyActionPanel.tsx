'use client';

import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, SkipForward } from 'lucide-react';

interface JourneyActionPanelProps {
  title: string;
  description: string;
  icon?: string;
  primaryAction: {
    label: string;
    onClick: () => void;
    loading?: boolean;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  children?: ReactNode;
  className?: string;
}

/**
 * Journey Action Panel
 *
 * Rich contextual panel component used on pages to show next-step actions.
 * Provides consistent UI for journey progression.
 *
 * @example
 * ```tsx
 * <JourneyActionPanel
 *   title="Create Your First Proposal"
 *   description="You've created a client. Now generate a proposal using AI."
 *   icon="📄"
 *   primaryAction={{
 *     label: "Continue to Proposals",
 *     onClick: () => router.push('/dashboard/proposals/new?clientId=123')
 *   }}
 *   secondaryAction={{
 *     label: "Skip for now",
 *     onClick: () => journey.skipStep('proposal')
 *   }}
 * />
 * ```
 */
export function JourneyActionPanel({
  title,
  description,
  icon,
  primaryAction,
  secondaryAction,
  children,
  className = '',
}: JourneyActionPanelProps) {
  return (
    <Card className={`border-2 border-blue-200 bg-blue-50/50 ${className}`}>
      <CardHeader>
        <div className="flex items-start gap-3">
          {icon && <span className="text-3xl">{icon}</span>}
          <div className="flex-1">
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {children}

        <div className="flex items-center gap-3 mt-4">
          <Button
            onClick={primaryAction.onClick}
            disabled={primaryAction.loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {primaryAction.loading ? 'Loading...' : primaryAction.label}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          {secondaryAction && (
            <Button
              variant="ghost"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
              <SkipForward className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
