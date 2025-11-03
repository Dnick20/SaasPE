'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Plus, Play, Pause, Trash2, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCampaigns } from '@/lib/hooks/useCampaigns';
import { formatRelativeTime } from '@/lib/utils';

export default function CampaignsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useCampaigns(page, 20);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading campaigns...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-600">Error loading campaigns</p>
      </div>
    );
  }

  const campaigns = data?.data || [];
  const hasCampaigns = campaigns.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-gray-500 mt-1">
            Create and manage email outreach campaigns
          </p>
        </div>
        <Link href="/dashboard/campaigns/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Campaign
          </Button>
        </Link>
      </div>

      {!hasCampaigns ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mail className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No campaigns yet
            </h3>
            <p className="text-sm text-gray-500 mb-4 text-center max-w-sm">
              Create your first email campaign with automated sequences, tracking, and AI personalization.
            </p>
            <Link href="/dashboard/campaigns/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Your First Campaign
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-blue-600 mt-1" />
                    <div>
                      <CardTitle className="text-lg">{campaign.name}</CardTitle>
                      <p className="text-sm text-gray-500 mt-1">
                        Created {formatRelativeTime(campaign.created)}
                        {campaign.mailbox && ` • From: ${campaign.mailbox.email}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={campaign.status} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-500">Contacts</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {campaign.totalContacts}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Sent</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {campaign.sentCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Opened</p>
                    <p className="text-2xl font-bold text-green-600">
                      {campaign.openedCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Replied</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {campaign.repliedCount}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    {campaign.sentCount > 0 && (
                      <>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="text-gray-600">
                          {Math.round((campaign.openedCount / campaign.sentCount) * 100)}% open rate
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {campaign.status === 'draft' && (
                      <Button variant="default" size="sm" className="gap-2">
                        <Play className="h-4 w-4" />
                        Start
                      </Button>
                    )}
                    {campaign.status === 'running' && (
                      <Button variant="outline" size="sm" className="gap-2">
                        <Pause className="h-4 w-4" />
                        Pause
                      </Button>
                    )}
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-600">
            Page {page} of {data.pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === data.pagination.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig = {
    draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800' },
    scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-800' },
    running: { label: 'Running', color: 'bg-green-100 text-green-800' },
    paused: { label: 'Paused', color: 'bg-yellow-100 text-yellow-800' },
    completed: { label: 'Completed', color: 'bg-purple-100 text-purple-800' },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}
