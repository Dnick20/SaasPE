'use client';


export const dynamic = 'force-dynamic';
import { useState } from 'react';
import {
  ArrowLeft,
  Mail,
  TrendingUp,
  MousePointerClick,
  CheckCircle2,
  Loader2,
  Play,
  Pause,
  MailOpen,
  Reply,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignsApi, type CampaignEmail } from '@/lib/api/endpoints/campaigns';
import { formatRelativeTime } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface CampaignDetailPageProps {
  params: { id: string };
}

export default function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  const { id } = params;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [emailStatusFilter, setEmailStatusFilter] = useState<string | undefined>();
  const [emailPage, setEmailPage] = useState(1);

  // Fetch campaign with auto-refresh every 30s if running
  const { data: campaign, isLoading, error } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => campaignsApi.getOne(id),
    refetchInterval: (query) => (query.state.data?.status === 'running' ? 30000 : false),
  });

  // Fetch campaign emails
  const { data: emails } = useQuery({
    queryKey: ['campaign-emails', id, emailPage, emailStatusFilter],
    queryFn: () => campaignsApi.getEmails(id, emailPage, 50, emailStatusFilter),
    enabled: !!campaign,
  });

  // Pause/Resume mutations
  const pauseMutation = useMutation({
    mutationFn: () => campaignsApi.pause(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', id] });
    },
  });

  const startMutation = useMutation({
    mutationFn: () => campaignsApi.start(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', id] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-600">Error loading campaign</p>
      </div>
    );
  }

  // Calculate metrics
  const variants = campaign.variants || [];
  const hasVariants = variants.length > 0;
  const totalContacts = campaign.totalContacts || 0;
  const totalSent = campaign.sentCount || campaign.totalSent || 0;
  const totalOpened = campaign.openedCount || campaign.totalOpened || 0;
  const totalClicked = campaign.clickedCount || campaign.totalClicked || 0;
  const totalReplied = campaign.repliedCount || campaign.totalReplied || 0;
  const totalBounced = campaign.bouncedCount || 0;

  const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : '0.0';
  const clickRate = totalOpened > 0 ? ((totalClicked / totalOpened) * 100).toFixed(1) : '0.0';
  const replyRate = totalSent > 0 ? ((totalReplied / totalSent) * 100).toFixed(1) : '0.0';
  const bounceRate = totalSent > 0 ? ((totalBounced / totalSent) * 100).toFixed(1) : '0.0';
  const progress = totalContacts > 0 ? (totalSent / totalContacts) * 100 : 0;

  const getEmailStatusBadge = (status: string) => {
    const badges: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      pending: { variant: 'outline', label: 'Pending' },
      sent: { variant: 'secondary', label: 'Sent' },
      delivered: { variant: 'default', label: 'Delivered' },
      opened: { variant: 'default', label: 'Opened' },
      clicked: { variant: 'default', label: 'Clicked' },
      replied: { variant: 'default', label: 'Replied' },
      bounced: { variant: 'destructive', label: 'Bounced' },
      failed: { variant: 'destructive', label: 'Failed' },
    };
    const config = badges[status] || { variant: 'outline' as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/dashboard/campaigns')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{campaign.name}</h1>
            <p className="text-gray-500 mt-1">
              Created {formatRelativeTime(campaign.created)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {campaign.status === 'running' && (
            <Button
              variant="outline"
              onClick={() => pauseMutation.mutate()}
              disabled={pauseMutation.isPending}
            >
              <Pause className="h-4 w-4 mr-2" />
              {pauseMutation.isPending ? 'Pausing...' : 'Pause'}
            </Button>
          )}
          {(campaign.status === 'paused' || campaign.status === 'draft') && (
            <Button
              onClick={() => startMutation.mutate()}
              disabled={startMutation.isPending}
            >
              <Play className="h-4 w-4 mr-2" />
              {startMutation.isPending ? 'Starting...' : campaign.status === 'paused' ? 'Resume' : 'Start'}
            </Button>
          )}
          <StatusBadge status={campaign.status} />
        </div>
      </div>

      {/* Progress Bar */}
      {campaign.status !== 'draft' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Campaign Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{totalSent} of {totalContacts} emails sent</span>
                <span>{progress.toFixed(1)}%</span>
              </div>
              <Progress value={progress} className="h-3" />
              {campaign.status === 'running' && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Auto-refreshing every 30 seconds
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overall Campaign Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Sent</CardTitle>
            <Mail className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign.totalSent || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Open Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(campaign.totalSent || 0) > 0
                ? `${((campaign.totalOpened || 0) / (campaign.totalSent || 1) * 100).toFixed(1)}%`
                : '0%'
              }
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {campaign.totalOpened || 0} opened
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Click Rate</CardTitle>
            <MousePointerClick className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(campaign.totalSent || 0) > 0
                ? `${((campaign.totalClicked || 0) / (campaign.totalSent || 1) * 100).toFixed(1)}%`
                : '0%'
              }
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {campaign.totalClicked || 0} clicked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Reply Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(campaign.totalSent || 0) > 0
                ? `${((campaign.totalReplied || 0) / (campaign.totalSent || 1) * 100).toFixed(1)}%`
                : '0%'
              }
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {campaign.totalReplied || 0} replied
            </p>
          </CardContent>
        </Card>
      </div>

      {/* A/B Test Variants */}
      {hasVariants && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>A/B Test Variants</CardTitle>
              {campaign.winnerVariantId && (
                <span className="text-sm text-green-600 font-medium">
                  Winner declared
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {variants.map((variant, index) => {
              const openRate = variant.sent > 0 ? (variant.opened / variant.sent * 100) : 0;
              const clickRate = variant.sent > 0 ? (variant.clicked / variant.sent * 100) : 0;
              const replyRate = variant.sent > 0 ? (variant.replied / variant.sent * 100) : 0;
              const isWinner = campaign.winnerVariantId === variant.id;

              return (
                <div key={variant.id} className={`p-4 rounded-lg border ${isWinner ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        Variant {String.fromCharCode(65 + index)}
                        {isWinner && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                            Winner
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">{variant.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{variant.sent}</p>
                      <p className="text-xs text-gray-500">emails sent</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600">Open Rate</span>
                        <span className="text-sm font-medium">{openRate.toFixed(1)}%</span>
                      </div>
                      <Progress value={openRate} className="h-2" />
                      <p className="text-xs text-gray-500 mt-1">{variant.opened} opened</p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600">Click Rate</span>
                        <span className="text-sm font-medium">{clickRate.toFixed(1)}%</span>
                      </div>
                      <Progress value={clickRate} className="h-2" />
                      <p className="text-xs text-gray-500 mt-1">{variant.clicked} clicked</p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600">Reply Rate</span>
                        <span className="text-sm font-medium">{replyRate.toFixed(1)}%</span>
                      </div>
                      <Progress value={replyRate} className="h-2" />
                      <p className="text-xs text-gray-500 mt-1">{variant.replied} replied</p>
                    </div>
                  </div>

                  {variant.subject && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Subject Line</p>
                      <p className="text-sm font-medium">{variant.subject}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Bounce Rate Alert */}
      {parseFloat(bounceRate) > 5 && totalSent > 10 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            High bounce rate detected ({bounceRate}%). Consider reviewing your email list quality and mailbox health.
          </AlertDescription>
        </Alert>
      )}

      {/* Campaign Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Campaign Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <StatusBadge status={campaign.status} />
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Type</span>
              <span className="font-medium capitalize">{campaign.type || 'Standard'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Created</span>
              <span className="font-medium">{new Date(campaign.created).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Last Updated</span>
              <span className="font-medium">{formatRelativeTime(campaign.updated)}</span>
            </div>
            {campaign.scheduledFor && (
              <div className="flex justify-between">
                <span className="text-gray-500">Scheduled For</span>
                <span className="font-medium">{new Date(campaign.scheduledFor).toLocaleString()}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {campaign.settings && (
          <Card>
            <CardHeader>
              <CardTitle>Campaign Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {campaign.settings.fromName && (
                <div className="flex justify-between">
                  <span className="text-gray-500">From Name</span>
                  <span className="font-medium">{campaign.settings.fromName}</span>
                </div>
              )}
              {campaign.settings.fromEmail && (
                <div className="flex justify-between">
                  <span className="text-gray-500">From Email</span>
                  <span className="font-medium">{campaign.settings.fromEmail}</span>
                </div>
              )}
              {campaign.settings.replyTo && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Reply To</span>
                  <span className="font-medium">{campaign.settings.replyTo}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Email List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Campaign Emails</CardTitle>
              <CardDescription>
                {emails?.pagination.total || 0} total emails
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={emailStatusFilter === undefined ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEmailStatusFilter(undefined)}
              >
                All
              </Button>
              <Button
                variant={emailStatusFilter === 'sent' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEmailStatusFilter('sent')}
              >
                Sent
              </Button>
              <Button
                variant={emailStatusFilter === 'opened' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEmailStatusFilter('opened')}
              >
                Opened
              </Button>
              <Button
                variant={emailStatusFilter === 'clicked' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEmailStatusFilter('clicked')}
              >
                Clicked
              </Button>
              <Button
                variant={emailStatusFilter === 'replied' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEmailStatusFilter('replied')}
              >
                Replied
              </Button>
              <Button
                variant={emailStatusFilter === 'bounced' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEmailStatusFilter('bounced')}
              >
                Bounced
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!emails || emails.data.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No emails found for this campaign
            </div>
          ) : (
            <div className="space-y-3">
              {emails.data.map((email) => (
                <div
                  key={email.id}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">
                          {email.recipientName || email.recipientEmail}
                        </span>
                        {getEmailStatusBadge(email.status)}
                      </div>
                      {email.recipientName && (
                        <p className="text-sm text-gray-500">{email.recipientEmail}</p>
                      )}
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      Step {email.sequenceStep}
                    </div>
                  </div>

                  <p className="text-sm font-medium text-gray-700 mb-2">{email.subject}</p>

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {email.sentAt && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        Sent {formatDistanceToNow(new Date(email.sentAt), { addSuffix: true })}
                      </div>
                    )}
                    {email.openedAt && (
                      <div className="flex items-center gap-1">
                        <MailOpen className="h-3 w-3" />
                        Opened {formatDistanceToNow(new Date(email.openedAt), { addSuffix: true })}
                      </div>
                    )}
                    {email.clickedAt && (
                      <div className="flex items-center gap-1">
                        <MousePointerClick className="h-3 w-3" />
                        Clicked {formatDistanceToNow(new Date(email.clickedAt), { addSuffix: true })}
                      </div>
                    )}
                    {email.repliedAt && (
                      <div className="flex items-center gap-1">
                        <Reply className="h-3 w-3" />
                        Replied {formatDistanceToNow(new Date(email.repliedAt), { addSuffix: true })}
                      </div>
                    )}
                  </div>

                  {email.error && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                      <AlertTriangle className="h-3 w-3 inline mr-1" />
                      {email.error}
                    </div>
                  )}

                  {email.replyBody && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                      <p className="text-xs text-gray-600 mb-1">Reply:</p>
                      <p className="text-sm text-gray-800">{email.replyBody}</p>
                      {email.replyClassification && (
                        <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                          {email.replyClassification.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {emails && emails.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <div className="text-sm text-gray-600">
                Page {emails.pagination.page} of {emails.pagination.totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEmailPage((prev) => Math.max(1, prev - 1))}
                  disabled={emailPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEmailPage((prev) => Math.min(emails.pagination.totalPages, prev + 1))}
                  disabled={emailPage === emails.pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig = {
    draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800' },
    scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-800' },
    sending: { label: 'Sending', color: 'bg-yellow-100 text-yellow-800' },
    sent: { label: 'Sent', color: 'bg-green-100 text-green-800' },
    paused: { label: 'Paused', color: 'bg-orange-100 text-orange-800' },
    completed: { label: 'Completed', color: 'bg-teal-100 text-teal-800' },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;

  return (
    <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}
