'use client';


export const dynamic = 'force-dynamic';
import { useState } from 'react';
import {
  TrendingUp,
  Mail,
  MailOpen,
  MousePointerClick,
  Reply,
  AlertTriangle,
  Loader2,
  BarChart3,
  Inbox,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/lib/api/endpoints/analytics';
import { format, subDays } from 'date-fns';

export default function CampaignAnalyticsPage() {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  const getDateRange = () => {
    const end = new Date().toISOString();
    let start: string | undefined;

    switch (dateRange) {
      case '7d':
        start = subDays(new Date(), 7).toISOString();
        break;
      case '30d':
        start = subDays(new Date(), 30).toISOString();
        break;
      case '90d':
        start = subDays(new Date(), 90).toISOString();
        break;
      case 'all':
        start = undefined;
        break;
    }

    return { start, end };
  };

  const { start, end } = getDateRange();

  // Fetch campaign analytics
  const { data: campaignAnalytics, isLoading: loadingCampaigns } = useQuery({
    queryKey: ['campaign-analytics', start, end],
    queryFn: () => analyticsApi.getCampaignAnalytics(start, end),
  });

  // Fetch mailbox analytics
  const { data: mailboxAnalytics, isLoading: loadingMailboxes } = useQuery({
    queryKey: ['mailbox-analytics'],
    queryFn: () => analyticsApi.getMailboxAnalytics(),
  });

  if (loadingCampaigns || loadingMailboxes) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Campaign Analytics</h1>
          <p className="text-gray-500 mt-1">
            Performance metrics and insights for your email campaigns
          </p>
        </div>
        <div className="flex gap-2">
          {(['7d', '30d', '90d', 'all'] as const).map((range) => (
            <Button
              key={range}
              variant={dateRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateRange(range)}
            >
              {range === 'all' ? 'All Time' : range}
            </Button>
          ))}
        </div>
      </div>

      {campaignAnalytics && (
        <>
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Campaigns</CardTitle>
                <BarChart3 className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{campaignAnalytics.overview.totalCampaigns}</div>
                <p className="text-xs text-gray-500 mt-1">
                  {campaignAnalytics.overview.activeCampaigns} active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Emails Sent</CardTitle>
                <Mail className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{campaignAnalytics.overview.totalSent.toLocaleString()}</div>
                <p className="text-xs text-gray-500 mt-1">
                  {campaignAnalytics.overview.totalContacts.toLocaleString()} contacts
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Open Rate</CardTitle>
                <MailOpen className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {campaignAnalytics.metrics.openRate.toFixed(1)}%
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {campaignAnalytics.overview.totalOpened.toLocaleString()} opened
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Click Rate</CardTitle>
                <MousePointerClick className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {campaignAnalytics.metrics.clickRate.toFixed(1)}%
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {campaignAnalytics.overview.totalClicked.toLocaleString()} clicked
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Reply Rate</CardTitle>
                <Reply className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {campaignAnalytics.metrics.replyRate.toFixed(1)}%
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {campaignAnalytics.overview.totalReplied.toLocaleString()} replied
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Performing Campaigns */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Campaigns</CardTitle>
                <CardDescription>Ranked by engagement score</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {campaignAnalytics.topCampaigns.length > 0 ? (
                    campaignAnalytics.topCampaigns.slice(0, 5).map((campaign, index) => (
                      <div key={campaign.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-semibold text-sm">
                            #{index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{campaign.name}</p>
                            <p className="text-xs text-gray-500">{campaign.sent.toLocaleString()} sent</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-green-600">{campaign.openRate}% open</p>
                          <p className="text-xs text-purple-600">{campaign.replyRate}% reply</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-8 text-gray-500">No campaigns data available</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Reply Classifications */}
            <Card>
              <CardHeader>
                <CardTitle>Reply Classifications</CardTitle>
                <CardDescription>Breakdown of reply sentiments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(campaignAnalytics.replyClassifications).length > 0 ? (
                    <>
                      {Object.entries(campaignAnalytics.replyClassifications).map(([classification, count]) => {
                        const total = Object.values(campaignAnalytics.replyClassifications).reduce((a, b) => a + b, 0);
                        const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';

                        const colors: Record<string, { bg: string; text: string }> = {
                          interested: { bg: 'bg-green-100', text: 'text-green-700' },
                          not_interested: { bg: 'bg-gray-100', text: 'text-gray-700' },
                          out_of_office: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
                          unsubscribe: { bg: 'bg-red-100', text: 'text-red-700' },
                          unclassified: { bg: 'bg-blue-100', text: 'text-blue-700' },
                        };

                        const color = colors[classification] || colors.unclassified;

                        return (
                          <div key={classification} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${color.bg} ${color.text}`}>
                                {classification.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">{count}</p>
                              <p className="text-xs text-gray-500">{percentage}%</p>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    <p className="text-center py-8 text-gray-500">No replies yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bounce Rate Alert */}
          {campaignAnalytics.metrics.bounceRate > 5 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="flex items-start gap-4 pt-6">
                <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-orange-900">High Bounce Rate Detected</h3>
                  <p className="text-sm text-orange-800 mt-1">
                    Your campaigns have a bounce rate of {campaignAnalytics.metrics.bounceRate.toFixed(1)}%.
                    Consider reviewing your email list quality and mailbox health to improve deliverability.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Mailbox Performance */}
      {mailboxAnalytics && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Mailbox Performance</CardTitle>
                <CardDescription>
                  {mailboxAnalytics.total} total mailboxes ({mailboxAnalytics.active} active, {mailboxAnalytics.warming} warming up)
                </CardDescription>
              </div>
              <Inbox className="h-5 w-5 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mailboxAnalytics.mailboxes.length > 0 ? (
                mailboxAnalytics.mailboxes.slice(0, 10).map((mailbox) => (
                  <div key={mailbox.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{mailbox.email}</p>
                      <p className="text-xs text-gray-500">
                        {mailbox.sentCount.toLocaleString()} sent · {mailbox.campaigns} campaigns
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-green-600">{mailbox.deliveryRate}% delivery</p>
                      <p className="text-xs text-gray-500">
                        {mailbox.status === 'ACTIVE' ? 'Active' : mailbox.status === 'WARMING_UP' ? `Warming (${mailbox.warmupProgress}%)` : mailbox.status}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center py-8 text-gray-500">No mailboxes configured</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
