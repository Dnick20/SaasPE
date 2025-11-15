'use client';


export const dynamic = 'force-dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/design-system/metric-card';
import { FileText, Mail, Mic, TrendingUp, Users, Loader2 } from 'lucide-react';
import { useDashboardMetrics, useActivity } from '@/lib/hooks/useAnalytics';
import { formatRelativeTime } from '@/lib/utils';
import { useCustomerJourney } from '@/lib/journey/use-customer-journey';
import { JourneyActionPanel } from '@/components/journey/JourneyActionPanel';
import { DiscoveryWizard } from '@/components/onboarding/DiscoveryWizard';

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const journey = useCustomerJourney();
  const { data: metrics, isLoading, error } = useDashboardMetrics();
  const { data: activity, isLoading: activityLoading } = useActivity(10);
  const [showDiscoveryWizard, setShowDiscoveryWizard] = useState(false);

  // Check if we should auto-open onboarding
  useEffect(() => {
    const shouldShowOnboarding = searchParams.get('showOnboarding') === 'true';
    if (shouldShowOnboarding && journey.currentStep === 'discovery') {
      setShowDiscoveryWizard(true);
    }
  }, [searchParams, journey.currentStep]);

  // Helper function to format change percentage
  const formatChange = (value: number): string => {
    if (value === 0) return '0%';
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  // Helper function to determine change type
  const getChangeType = (value: number): 'positive' | 'negative' | 'neutral' => {
    if (value > 0) return 'positive';
    if (value < 0) return 'negative';
    return 'neutral';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-600">Error loading dashboard metrics</p>
      </div>
    );
  }

  const stats = [
    {
      name: 'Total Clients',
      value: metrics.totalClients.toString(),
      icon: Users,
      change: formatChange(metrics.changes.clients),
      changeType: getChangeType(metrics.changes.clients),
    },
    {
      name: 'Active Proposals',
      value: metrics.activeProposals.toString(),
      icon: FileText,
      change: formatChange(metrics.changes.proposals),
      changeType: getChangeType(metrics.changes.proposals),
    },
    {
      name: 'Transcriptions',
      value: metrics.totalTranscriptions.toString(),
      icon: Mic,
      change: formatChange(metrics.changes.transcriptions),
      changeType: getChangeType(metrics.changes.transcriptions),
    },
    {
      name: 'Response Rate',
      value: `${metrics.responseRate.toFixed(1)}%`,
      icon: TrendingUp,
      change: formatChange(metrics.changes.responseRate),
      changeType: getChangeType(metrics.changes.responseRate),
    },
  ];

  // Get contextual next action for journey
  const getJourneyAction = () => {
    switch (journey.currentStep) {
      case 'discovery':
        return {
          title: 'Complete Your Agency Profile',
          description: 'Tell us about your business to get personalized templates and recommendations',
          icon: '🎯',
          primaryAction: {
            label: 'Start Discovery',
            onClick: () => setShowDiscoveryWizard(true),
          },
        };
      case 'client':
        return {
          title: 'Create Your First Client',
          description: 'Upload a transcription or add client details to get started',
          icon: '👥',
          primaryAction: {
            label: 'Upload Transcription',
            onClick: () => router.push('/dashboard/transcriptions?fromDiscovery=true'),
          },
          secondaryAction: {
            label: 'Add Client Manually',
            onClick: () => router.push('/dashboard/clients'),
          },
        };
      case 'proposal':
        return {
          title: 'Generate Your First Proposal',
          description: 'Create an AI-powered proposal for your client',
          icon: '📄',
          primaryAction: {
            label: 'Create Proposal',
            onClick: () => {
              const clientId = journey.metadata.firstClientId;
              router.push(clientId ? `/dashboard/proposals/new?clientId=${clientId}` : '/dashboard/proposals/new');
            },
          },
        };
      case 'mailboxes':
        return {
          title: 'Connect Email Accounts',
          description: 'Add email accounts to send campaigns',
          icon: '📧',
          primaryAction: {
            label: 'Connect Email',
            onClick: () => router.push('/dashboard/integrations'),
          },
        };
      case 'warmup':
        return {
          title: 'Setup Email Warmup',
          description: 'Improve deliverability by warming up your email accounts',
          icon: '🔥',
          primaryAction: {
            label: 'Configure Warmup',
            onClick: () => router.push('/dashboard/warmup'),
          },
          secondaryAction: {
            label: 'Skip for Now',
            onClick: () => {
              journey.markStepComplete('warmup');
              journey.goToNextStep();
            },
          },
        };
      case 'campaign':
        return {
          title: 'Launch Your First Campaign',
          description: 'Start sending emails to your prospects',
          icon: '🚀',
          primaryAction: {
            label: 'Create Campaign',
            onClick: () => router.push('/dashboard/campaigns/new'),
          },
        };
      default:
        return null;
    }
  };

  const journeyAction = getJourneyAction();

  return (
    <div className="space-y-8">
      {/* Discovery Wizard Modal */}
      {showDiscoveryWizard && (
        <DiscoveryWizard />
      )}

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-2 tracking-tight">
          Dashboard
        </h1>
        <p className="text-base text-slate-600">
          Welcome back! Here&apos;s an overview of your agency&apos;s activity.
        </p>
      </div>

      {/* Journey Action Panel - Show if journey not complete */}
      {!journey.isComplete && journeyAction && (
        <JourneyActionPanel
          title={journeyAction.title}
          description={journeyAction.description}
          icon={journeyAction.icon}
          primaryAction={journeyAction.primaryAction}
          secondaryAction={journeyAction.secondaryAction}
        />
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((stat) => (
          <MetricCard
            key={stat.name}
            label={stat.name}
            value={stat.value}
            icon={stat.icon}
            change={{
              value: stat.change,
              type: stat.changeType,
              label: 'from last month',
            }}
          />
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-slate-900">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : activity && activity.length > 0 ? (
              <div className="space-y-0">
                {activity.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 py-4 border-b border-slate-100 last:border-0">
                    {item.type === 'client_created' && <Users className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />}
                    {item.type === 'proposal_generated' && <FileText className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />}
                    {item.type === 'transcription_analyzed' && <Mic className="h-5 w-5 text-sky-600 mt-0.5 flex-shrink-0" />}
                    {item.type === 'campaign_sent' && <Mail className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900 mb-1">{item.description}</p>
                      <p className="text-xs text-slate-500">{formatRelativeTime(item.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-500 text-center py-12">
                No recent activity yet. Start by uploading a transcription or creating a proposal!
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-slate-900">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <button
              onClick={() => router.push('/dashboard/transcriptions')}
              className="block w-full text-left p-5 rounded-md border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all duration-200 transform hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-3">
                <Mic className="h-6 w-6 text-blue-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-base font-semibold text-slate-900 mb-1">Upload Transcription</p>
                  <p className="text-sm text-slate-500">Upload a client meeting recording</p>
                </div>
              </div>
            </button>
            <button
              onClick={() => router.push('/dashboard/proposals/new')}
              className="block w-full text-left p-5 rounded-md border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all duration-200 transform hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-blue-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-base font-semibold text-slate-900 mb-1">Create Proposal</p>
                  <p className="text-sm text-slate-500">Generate a new sales proposal</p>
                </div>
              </div>
            </button>
            <button
              onClick={() => router.push('/dashboard/campaigns/new')}
              className="block w-full text-left p-5 rounded-md border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all duration-200 transform hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-3">
                <Mail className="h-6 w-6 text-blue-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-base font-semibold text-slate-900 mb-1">Start Campaign</p>
                  <p className="text-sm text-slate-500">Create an email outreach campaign</p>
                </div>
              </div>
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
