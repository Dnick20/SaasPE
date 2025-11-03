'use client';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TrendingUp, SkipForward, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface WarmupDecisionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mailboxCount: number;
  mailboxIds?: string[];
  onDecision?: (enableWarmup: boolean) => void;
}

export function WarmupDecisionModal({ open, onOpenChange, mailboxCount, mailboxIds, onDecision }: WarmupDecisionModalProps) {
  const router = useRouter();

  const handleStartWarmup = () => {
    if (onDecision) {
      onDecision(true);
    } else {
      const queryParam = mailboxIds ? `?mailboxIds=${mailboxIds.join(',')}&autoStart=true` : '';
      router.push(`/dashboard/warmup${queryParam}`);
      onOpenChange(false);
    }
  };

  const handleSkip = () => {
    if (onDecision) {
      onDecision(false);
    } else {
      // Just close modal - user can continue to next step
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Email Warmup Recommended
          </DialogTitle>
          <DialogDescription>
            Warming up your mailboxes improves deliverability and sender reputation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Why Warm Up?</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✅ Gradually increase sending volume</li>
              <li>✅ Build trust with email providers</li>
              <li>✅ Prevent spam folder placement</li>
              <li>✅ Typically takes 2-4 weeks</li>
            </ul>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-900 mb-1">Skipping Warmup?</h4>
                <p className="text-sm text-amber-800">
                  Sending high volumes immediately may trigger spam filters and damage your sender reputation.
                  We recommend starting with warmup for best results.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleSkip} className="gap-2">
            <SkipForward className="h-4 w-4" />
            Skip for Now
          </Button>
          <Button onClick={handleStartWarmup} className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Start Warmup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
