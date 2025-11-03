'use client';


export const dynamic = 'force-dynamic';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { CampaignWizard } from '@/components/campaigns/campaign-wizard';

function NewCampaignContent() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get('clientId');
  const proposalId = searchParams.get('proposalId');

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/campaigns"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Campaigns
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Create New Campaign</h1>
        <p className="text-gray-500 mt-1">
          Set up an automated email outreach campaign with personalization
        </p>
      </div>

      <CampaignWizard
        initialClientId={clientId || undefined}
        initialProposalId={proposalId || undefined}
      />
    </div>
  );
}

export default function NewCampaignPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      }
    >
      <NewCampaignContent />
    </Suspense>
  );
}
