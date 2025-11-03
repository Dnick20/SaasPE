'use client';


export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { warmupApi } from '@/lib/api/warmup';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Mail,
  TrendingUp,
  Pause,
  Play,
  Activity,
  CheckCircle,
  Zap,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/types/errors';
import { useCustomerJourney } from '@/lib/journey/use-customer-journey';

export default function WarmupPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const journey = useCustomerJourney();
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [selectedMailboxId, setSelectedMailboxId] = useState<string | null>(null);
  const [selectedMailboxIds, setSelectedMailboxIds] = useState<string[]>([]);
  const [targetLimit, setTargetLimit] = useState(50);

  // Handle query params for auto-selection and auto-start
  useEffect(() => {
    const mailboxIdsParam = searchParams.get('mailboxIds');
    const autoStart = searchParams.get('autoStart') === 'true';

    if (mailboxIdsParam) {
      const ids = mailboxIdsParam.split(',').filter(id => id.trim());
      setSelectedMailboxIds(ids);

      if (autoStart && ids.length > 0) {
        // Auto-open dialog with first mailbox selected
        setSelectedMailboxId(ids[0]);
        setStartDialogOpen(true);
      }
    }
  }, [searchParams]);

  // Fetch stats
  const { data: statsData, isLoading: _isLoading } = useQuery({
    queryKey: ['warmup-stats'],
    queryFn: () => warmupApi.getStats(),
  });

  // Start warmup mutation
  const startMutation = useMutation({
    mutationFn: ({ mailboxId, targetLimit }: { mailboxId: string; targetLimit: number }) =>
      warmupApi.start(mailboxId, targetLimit),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warmup-stats'] });
      toast({
        title: 'Success',
        description: 'Email warmup started successfully',
      });
      setStartDialogOpen(false);
      setSelectedMailboxId(null);
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: getErrorMessage(error) || 'Failed to start warmup',
        variant: 'destructive',
      });
    },
  });

  // Pause warmup mutation
  const _pauseMutation = useMutation({
    mutationFn: (mailboxId: string) => warmupApi.pause(mailboxId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warmup-stats'] });
      toast({
        title: 'Success',
        description: 'Email warmup paused',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: getErrorMessage(error) || 'Failed to pause warmup',
        variant: 'destructive',
      });
    },
  });

  // Resume warmup mutation
  const _resumeMutation = useMutation({
    mutationFn: (mailboxId: string) => warmupApi.resume(mailboxId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warmup-stats'] });
      toast({
        title: 'Success',
        description: 'Email warmup resumed',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: getErrorMessage(error) || 'Failed to resume warmup',
        variant: 'destructive',
      });
    },
  });

  // Stop warmup mutation
  const _stopMutation = useMutation({
    mutationFn: (mailboxId: string) => warmupApi.stop(mailboxId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warmup-stats'] });
      toast({
        title: 'Success',
        description: 'Email warmup stopped',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: getErrorMessage(error) || 'Failed to stop warmup',
        variant: 'destructive',
      });
    },
  });

  const handleStartWarmup = async () => {
    if (selectedMailboxId) {
      startMutation.mutate({ mailboxId: selectedMailboxId, targetLimit });

      // Complete warmup journey step if on warmup step
      if (journey.currentStep === 'warmup') {
        try {
          journey.markStepComplete('warmup', { connectedMailboxIds: selectedMailboxIds });
        } catch (error) {
          console.error('Failed to complete warmup step:', error);
        }
      }
    }
  };

  const handleSkipWarmup = async () => {
    try {
      journey.markStepComplete('warmup');
      window.location.href = '/dashboard/campaigns/new';
    } catch (error) {
      console.error('Failed to skip warmup:', error);
      toast({
        title: 'Error',
        description: 'Failed to update journey progress',
        variant: 'destructive',
      });
    }
  };

  const stats = statsData?.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Email Warmup</h1>
          <p className="text-gray-600 mt-1">
            Gradually increase your email sending volume to build sender reputation
          </p>
        </div>
        {journey.currentStep === 'warmup' && !journey.isStepComplete('warmup') && (
          <Button variant="outline" onClick={handleSkipWarmup}>
            Skip to Campaign Creation
          </Button>
        )}
      </div>

      {/* Info Banner */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">
                What is Email Warmup?
              </h3>
              <p className="text-sm text-blue-800">
                Email warmup is a process of gradually increasing your email sending volume to establish
                trust with email providers and improve deliverability. This helps prevent your emails
                from being marked as spam.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Mailboxes</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMailboxes ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Warmups</CardTitle>
              <Activity className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeWarmups ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedWarmups ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
              <Zap className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(stats.totalEmailsSent ?? 0).toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Mailboxes - For demo, showing placeholder */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Email Accounts</CardTitle>
            <Button
              onClick={() => {
                // In a real app, user would select mailbox from a list
                // For demo, we'll use a placeholder ID
                setSelectedMailboxId('demo-mailbox-id');
                setStartDialogOpen(true);
              }}
            >
              Start Warmup
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Mail className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Email Accounts Connected
            </h3>
            <p className="text-gray-600 mb-4">
              Connect your email accounts in the Integrations page to start warming them up
            </p>
            <Button variant="outline" onClick={() => window.location.href = '/dashboard/integrations'}>
              Go to Integrations
            </Button>
          </div>

          {/* Demo: Show what mailboxes would look like */}
          <div className="mt-8 space-y-4 opacity-50 pointer-events-none">
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="font-semibold">demo@example.com</div>
                      <div className="text-sm text-gray-600">Warmup in progress</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-medium">25 / 50 emails per day</span>
                    </div>
                    <Progress value={50} className="h-2" />
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Started 7 days ago</span>
                      <span>~7 days remaining</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Badge className="bg-green-500">Active</Badge>
                  <Button variant="outline" size="sm">
                    <Pause className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="font-semibold">sales@example.com</div>
                      <div className="text-sm text-gray-600">Ready to start</div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Badge variant="secondary">Not Started</Badge>
                  <Button variant="outline" size="sm">
                    <Play className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How it Works */}
      <Card>
        <CardHeader>
          <CardTitle>How Email Warmup Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 font-bold">1</span>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Start Small</h4>
                <p className="text-sm text-gray-600">
                  We begin by sending a small number of emails per day from your account
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 font-bold">2</span>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Gradual Increase</h4>
                <p className="text-sm text-gray-600">
                  Each day, we gradually increase the sending volume to build trust
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 font-bold">3</span>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Full Capacity</h4>
                <p className="text-sm text-gray-600">
                  After 2-4 weeks, your account reaches full sending capacity with good reputation
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Start Warmup Dialog */}
      <Dialog open={startDialogOpen} onOpenChange={setStartDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Email Warmup</DialogTitle>
            <DialogDescription>
              Configure your warmup settings to gradually increase your sending volume
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="targetLimit">Target Daily Limit</Label>
              <Input
                id="targetLimit"
                type="number"
                value={targetLimit}
                onChange={(e) => setTargetLimit(parseInt(e.target.value))}
                min={10}
                max={200}
              />
              <p className="text-xs text-gray-500 mt-1">
                The maximum number of emails per day you want to reach (typically 50-100)
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-md">
              <h4 className="font-semibold text-sm mb-2">Warmup Schedule:</h4>
              <ul className="text-xs space-y-1 text-gray-600">
                <li>• Day 1-3: 5-10 emails/day</li>
                <li>• Day 4-7: 10-20 emails/day</li>
                <li>• Day 8-14: 20-35 emails/day</li>
                <li>• Day 15-21: 35-{targetLimit} emails/day</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setStartDialogOpen(false);
                setSelectedMailboxId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleStartWarmup}
              disabled={startMutation.isPending}
            >
              {startMutation.isPending ? 'Starting...' : 'Start Warmup'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
