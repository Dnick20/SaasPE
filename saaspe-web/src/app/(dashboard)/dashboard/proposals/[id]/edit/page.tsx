'use client';


export const dynamic = 'force-dynamic';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { ProposalEditor } from '@/components/proposals/proposal-editor';
import { useQuery } from '@tanstack/react-query';

export default function EditProposalPage() {
  const params = useParams();
  const router = useRouter();
  const proposalId = params.id as string;

  const { data: proposal, isLoading, error } = useQuery({
    queryKey: ['proposal', proposalId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/proposals/${proposalId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch proposal');
      }

      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm text-gray-600">Loading proposal...</p>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="space-y-6">
        <div>
          <Link
            href="/dashboard/proposals"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Proposals
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Proposal Not Found</h1>
        </div>
        <div className="text-center py-12">
          <p className="text-red-600">
            {error instanceof Error ? error.message : 'Failed to load proposal'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/proposals"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Proposals
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Edit Proposal</h1>
        <p className="text-gray-500 mt-1">
          Review and refine the AI-generated proposal content
        </p>
      </div>

      <ProposalEditor proposal={proposal} />
    </div>
  );
}
