'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp, FileSignature, CheckCircle2, Clock, BarChart3 } from 'lucide-react';
import { eSignatureAnalyticsApi } from '@/lib/api/endpoints/e-signature-analytics';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function ESignatureAnalyticsPage() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['e-signature-analytics'],
    queryFn: eSignatureAnalyticsApi.getAnalytics,
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading || !analytics) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const getProviderDisplayName = (provider: string) => {
    const names: Record<string, string> = {
      docusign: 'DocuSign',
      adobe_sign: 'Adobe Sign',
      signnow: 'SignNow',
      google_workspace: 'Google Workspace',
    };
    return names[provider] || provider;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">E-Signature Analytics</h1>
          <p className="text-gray-500 mt-1">
            Monitor your e-signature usage and performance
          </p>
        </div>
        <Link href="/dashboard/settings/e-signatures">
          <Button variant="outline">Back to Settings</Button>
        </Link>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Connections */}
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Connections</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-gray-900">
                  {analytics.totalConnections}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {analytics.activeConnections} active
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <FileSignature className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Envelopes Sent */}
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Envelopes Sent</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-gray-900">
                  {analytics.totalEnvelopesSent}
                </div>
                <p className="text-sm text-gray-500 mt-1">All time</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Completion Rate */}
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Completion Rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-gray-900">
                  {analytics.signatureCompletionRate}%
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {analytics.totalEnvelopesSigned} signed
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Avg Signing Time */}
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Avg. Signing Time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-gray-900">
                  {analytics.averageSigningTime ? `${analytics.averageSigningTime}h` : 'N/A'}
                </div>
                <p className="text-sm text-gray-500 mt-1">Hours to sign</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Provider Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Provider Usage
            </CardTitle>
            <CardDescription>Connections by e-signature provider</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {analytics.topProviders.length > 0 ? (
              analytics.topProviders.map((provider) => (
                <div key={provider.provider} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-900">
                      {getProviderDisplayName(provider.provider)}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">{provider.count} connections</span>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {provider.percentage.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                  <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all"
                      style={{ width: `${provider.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                No provider connections yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Recent Activity
            </CardTitle>
            <CardDescription>Last 7 days of e-signature activity</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.recentActivity.length > 0 ? (
              <div className="space-y-3">
                {analytics.recentActivity
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 7)
                  .map((activity) => (
                    <div
                      key={activity.date}
                      className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                    >
                      <div className="text-sm font-medium text-gray-900">
                        {new Date(activity.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-gray-600">
                          <span className="font-medium text-purple-600">
                            {activity.envelopesSent}
                          </span>{' '}
                          sent
                        </div>
                        <div className="text-gray-600">
                          <span className="font-medium text-green-600">
                            {activity.envelopesSigned}
                          </span>{' '}
                          signed
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No recent activity
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Connections Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Connections Breakdown</CardTitle>
          <CardDescription>
            Detailed view of all your e-signature provider connections
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(analytics.connectionsByProvider).map(([provider, count]) => (
              <div
                key={provider}
                className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-900">
                    {getProviderDisplayName(provider)}
                  </h4>
                  <Badge className="bg-blue-600">{count}</Badge>
                </div>
                <p className="text-sm text-gray-600">
                  {count === 1 ? '1 connection' : `${count} connections`}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
