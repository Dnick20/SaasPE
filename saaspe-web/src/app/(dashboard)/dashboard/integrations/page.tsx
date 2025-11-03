'use client';


export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  ExternalLink,
  Mail,
  Settings,
  Activity
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { integrationsApi } from '@/lib/api/endpoints/integrations';
import { mailboxesApi } from '@/lib/api/mailboxes';
import { formatRelativeTime } from '@/lib/utils';
import { toast } from 'sonner';
import { EmailAccountWizard } from '@/components/integrations/EmailAccountWizard';
import { WarmupDecisionModal } from '@/components/warmup/WarmupDecisionModal';
import { useRouter } from 'next/navigation';
import { useCustomerJourney } from '@/lib/journey/use-customer-journey';

export default function IntegrationsPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const journey = useCustomerJourney();
  const showWizardParam = searchParams?.get('wizard') === 'true';
  const isOnboarding = searchParams?.get('onboarding') === 'true';

  const [hubspotApiKey, setHubspotApiKey] = useState('');
  const [zapierUrl, setZapierUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  // Wizard state - show wizard if wizard param or onboarding param is present
  const [showWizard, setShowWizard] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // Warmup decision modal state
  const [showWarmupModal, setShowWarmupModal] = useState(false);
  const [newlyAddedMailboxIds, setNewlyAddedMailboxIds] = useState<string[]>([]);

  // Open wizard when URL params indicate it should be shown
  useEffect(() => {
    if (showWizardParam || isOnboarding) {
      setIsWizardOpen(true);
      setShowWizard(true);
    }
  }, [showWizardParam, isOnboarding]);

  // Handle Google OAuth callback
  useEffect(() => {
    const googleAuth = searchParams?.get('google_auth');
    const message = searchParams?.get('message');

    if (googleAuth === 'success') {
      toast.success('Google account connected successfully!');
      // Clean up URL params
      if (window.history.replaceState) {
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    } else if (googleAuth === 'error') {
      const errorMessage = message || 'Failed to connect Google account';
      toast.error(`Google OAuth error: ${errorMessage}`);
      // Clean up URL params
      if (window.history.replaceState) {
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }
  }, [searchParams]);

  const { data: integrations, isLoading } = useQuery({
    queryKey: ['integrations'],
    queryFn: () => integrationsApi.getAll(),
  });

  const { data: hubspotStatus } = useQuery({
    queryKey: ['integrations', 'hubspot', 'status'],
    queryFn: () => integrationsApi.getHubSpotStatus(),
    enabled: integrations?.some(i => i.name === 'hubspot' && i.enabled),
  });

  const { data: zapierWebhooks } = useQuery({
    queryKey: ['integrations', 'zapier', 'webhooks'],
    queryFn: () => integrationsApi.getZapierWebhooks(),
  });

  const { data: mailboxesData } = useQuery({
    queryKey: ['mailboxes'],
    queryFn: () => mailboxesApi.findAll({ limit: 100 }),
  });

  const syncHubSpotMutation = useMutation({
    mutationFn: () => integrationsApi.syncHubSpot(),
    onSuccess: () => {
      toast.success('HubSpot sync started!');
      queryClient.invalidateQueries({ queryKey: ['integrations', 'hubspot'] });
    },
    onError: () => {
      toast.error('Failed to sync HubSpot');
    },
  });

  const connectHubSpotMutation = useMutation({
    mutationFn: (apiKey: string) => integrationsApi.connectHubSpot(apiKey),
    onSuccess: () => {
      toast.success('HubSpot connected successfully!');
      setHubspotApiKey('');
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
    onError: () => {
      toast.error('Failed to connect HubSpot');
    },
  });

  const disconnectHubSpotMutation = useMutation({
    mutationFn: () => integrationsApi.disconnectHubSpot(),
    onSuccess: () => {
      toast.success('HubSpot disconnected');
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
    onError: () => {
      toast.error('Failed to disconnect HubSpot');
    },
  });

  const createWebhookMutation = useMutation({
    mutationFn: () => integrationsApi.createZapierWebhook(zapierUrl, selectedEvents),
    onSuccess: () => {
      toast.success('Zapier webhook created!');
      setZapierUrl('');
      setSelectedEvents([]);
      queryClient.invalidateQueries({ queryKey: ['integrations', 'zapier'] });
    },
    onError: () => {
      toast.error('Failed to create webhook');
    },
  });

  const deleteWebhookMutation = useMutation({
    mutationFn: (id: string) => integrationsApi.deleteZapierWebhook(id),
    onSuccess: () => {
      toast.success('Webhook deleted');
      queryClient.invalidateQueries({ queryKey: ['integrations', 'zapier'] });
    },
    onError: () => {
      toast.error('Failed to delete webhook');
    },
  });

  const toggleWebhookMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      integrationsApi.toggleZapierWebhook(id, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations', 'zapier'] });
    },
  });


  const deleteMailboxMutation = useMutation({
    mutationFn: (id: string) => mailboxesApi.delete(id),
    onSuccess: () => {
      toast.success('Mailbox removed successfully');
      queryClient.invalidateQueries({ queryKey: ['mailboxes'] });
    },
    onError: () => {
      toast.error('Failed to remove mailbox');
    },
  });

  const testMailboxMutation = useMutation({
    mutationFn: (id: string) => mailboxesApi.testConnection(id),
    onSuccess: (response) => {
      if (response.data.success) {
        toast.success('Connection test successful!');
      } else {
        toast.error('Connection test failed');
      }
    },
    onError: () => {
      toast.error('Connection test failed');
    },
  });

  const handleWizardComplete = (addedMailboxIds?: string[]) => {
    setIsWizardOpen(false);
    setShowWizard(false);
    queryClient.invalidateQueries({ queryKey: ['mailboxes'] });

    // If mailboxes were added, show warmup decision modal
    if (addedMailboxIds && addedMailboxIds.length > 0) {
      setNewlyAddedMailboxIds(addedMailboxIds);
      setShowWarmupModal(true);
    }
  };

  const handleWarmupDecision = async (enableWarmup: boolean) => {
    try {
      // Mark mailboxes step as complete
      journey.markStepComplete('mailboxes', { connectedMailboxIds: newlyAddedMailboxIds });

      if (enableWarmup) {
        // Redirect to warmup page with auto-select
        router.push(`/dashboard/warmup?mailboxIds=${newlyAddedMailboxIds.join(',')}&autoStart=true`);
      } else {
        // Skip warmup, move to campaign step
        journey.markStepComplete('warmup');
        router.push('/dashboard/campaigns/new');
      }

      setShowWarmupModal(false);
    } catch (error) {
      console.error('Failed to handle warmup decision:', error);
      toast.error('Failed to update journey progress');
    }
  };

  const availableEvents = [
    { value: 'client.created', label: 'Client Created' },
    { value: 'client.updated', label: 'Client Updated' },
    { value: 'proposal.generated', label: 'Proposal Generated' },
    { value: 'proposal.sent', label: 'Proposal Sent' },
    { value: 'transcription.analyzed', label: 'Transcription Analyzed' },
    { value: 'campaign.sent', label: 'Campaign Sent' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const hubspot = integrations?.find(i => i.name === 'hubspot');
  const _zapier = integrations?.find(i => i.name === 'zapier');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Integrations</h1>
        <p className="text-gray-500 mt-1">
          Connect third-party services to automate your workflow
        </p>
      </div>

      {/* Email Accounts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-6 w-6 text-blue-600" />
                Email Accounts
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Connect your email accounts for warmup and campaigns
              </p>
            </div>
            <Button className="gap-2" onClick={() => setIsWizardOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Account
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {mailboxesData?.data && mailboxesData.data.mailboxes.length > 0 ? (
            <div className="space-y-3">
              {mailboxesData.data.mailboxes.map((mailbox) => (
                <div key={mailbox.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">{mailbox.email}</span>
                        <Badge variant={mailbox.status === 'ACTIVE' ? 'default' : 'secondary'}>
                          {mailbox.status}
                        </Badge>
                        {mailbox.warmupStatus !== 'IDLE' && (
                          <Badge variant="outline" className="gap-1">
                            <Activity className="h-3 w-3" />
                            {mailbox.warmupStatus}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="text-gray-500">Provider:</span> {mailbox.provider}
                        </div>
                        <div>
                          <span className="text-gray-500">Health Score:</span> {mailbox.healthScore}/100
                        </div>
                        {mailbox.warmupStatus !== 'IDLE' && (
                          <>
                            <div>
                              <span className="text-gray-500">Warmup Days:</span> {mailbox.warmupDaysActive}
                            </div>
                            <div>
                              <span className="text-gray-500">Current Limit:</span> {mailbox.warmupCurrentLimit}/day
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => testMailboxMutation.mutate(mailbox.id)}
                        disabled={testMailboxMutation.isPending}
                        className="gap-1"
                      >
                        <Settings className="h-4 w-4" />
                        Test
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMailboxMutation.mutate(mailbox.id)}
                        disabled={deleteMailboxMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Mail className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>No email accounts connected</p>
              <p className="text-sm mt-1">Add an email account to start using warmup and campaigns</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* HubSpot Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="#FF7A59">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm0 21.6c-5.3 0-9.6-4.3-9.6-9.6S6.7 2.4 12 2.4s9.6 4.3 9.6 9.6-4.3 9.6-9.6 9.6z" />
                </svg>
                HubSpot CRM
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Sync contacts and deals with your HubSpot account
              </p>
            </div>
            {hubspot?.enabled ? (
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            ) : (
              <XCircle className="h-6 w-6 text-gray-400" />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {hubspot?.enabled ? (
            <>
              {hubspotStatus && (
                <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Status</span>
                    <span className={`text-sm font-medium capitalize ${
                      hubspotStatus.status === 'active' ? 'text-green-600' : 'text-orange-600'
                    }`}>
                      {hubspotStatus.status}
                    </span>
                  </div>
                  {hubspotStatus.lastSyncAt && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Last Sync</span>
                      <span className="text-sm font-medium">
                        {formatRelativeTime(hubspotStatus.lastSyncAt)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Contacts Synced</span>
                    <span className="text-sm font-medium">{hubspotStatus.totalContactsSynced}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Deals Synced</span>
                    <span className="text-sm font-medium">{hubspotStatus.totalDealsSynced}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={() => syncHubSpotMutation.mutate()}
                  disabled={syncHubSpotMutation.isPending}
                  className="gap-2"
                >
                  {syncHubSpotMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Sync Now
                </Button>
                <Button
                  variant="outline"
                  onClick={() => disconnectHubSpotMutation.mutate()}
                  disabled={disconnectHubSpotMutation.isPending}
                >
                  Disconnect
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium">Connect your HubSpot account</p>
                  <p className="mt-1">
                    Enter your HubSpot API key to enable two-way sync of contacts and deals.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hubspot-api-key">HubSpot API Key</Label>
                <Input
                  id="hubspot-api-key"
                  type="password"
                  placeholder="pat-na1-..."
                  value={hubspotApiKey}
                  onChange={(e) => setHubspotApiKey(e.target.value)}
                />
              </div>

              <Button
                onClick={() => connectHubSpotMutation.mutate(hubspotApiKey)}
                disabled={!hubspotApiKey || connectHubSpotMutation.isPending}
              >
                {connectHubSpotMutation.isPending ? 'Connecting...' : 'Connect HubSpot'}
              </Button>

              <a
                href="https://knowledge.hubspot.com/integrations/how-do-i-get-my-hubspot-api-key"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                How to get your API key
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Zapier Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="#FF4A00">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm0 2.5c5.2 0 9.5 4.3 9.5 9.5s-4.3 9.5-9.5 9.5-9.5-4.3-9.5-9.5S6.8 2.5 12 2.5z" />
                </svg>
                Zapier Webhooks
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Trigger Zapier workflows when events occur in your account
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Webhook List */}
          {zapierWebhooks && zapierWebhooks.length > 0 && (
            <div className="space-y-3">
              {zapierWebhooks.map((webhook) => (
                <div key={webhook.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm break-all">{webhook.url}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {webhook.events.map((event) => (
                          <span
                            key={event}
                            className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded"
                          >
                            {event}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Created {formatRelativeTime(webhook.created)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          toggleWebhookMutation.mutate({ id: webhook.id, enabled: !webhook.enabled })
                        }
                      >
                        {webhook.enabled ? 'Disable' : 'Enable'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteWebhookMutation.mutate(webhook.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Webhook Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 w-full">
                <Plus className="h-4 w-4" />
                Add Webhook
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Zapier Webhook</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="webhook-url">Webhook URL</Label>
                  <Input
                    id="webhook-url"
                    placeholder="https://hooks.zapier.com/hooks/catch/..."
                    value={zapierUrl}
                    onChange={(e) => setZapierUrl(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Trigger Events</Label>
                  <div className="mt-2 space-y-2">
                    {availableEvents.map((event) => (
                      <label key={event.value} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedEvents.includes(event.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedEvents([...selectedEvents, event.value]);
                            } else {
                              setSelectedEvents(selectedEvents.filter(e => e !== event.value));
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">{event.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={() => createWebhookMutation.mutate()}
                  disabled={!zapierUrl || selectedEvents.length === 0 || createWebhookMutation.isPending}
                  className="w-full"
                >
                  {createWebhookMutation.isPending ? 'Creating...' : 'Create Webhook'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Email Account Wizard */}
      <Dialog open={isWizardOpen} onOpenChange={setIsWizardOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <EmailAccountWizard
            isOnboarding={isOnboarding}
            onComplete={handleWizardComplete}
            onDismiss={() => setIsWizardOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Warmup Decision Modal */}
      <WarmupDecisionModal
        open={showWarmupModal}
        onOpenChange={setShowWarmupModal}
        mailboxCount={newlyAddedMailboxIds.length}
        onDecision={handleWarmupDecision}
      />
    </div>
  );
}
