'use client';

import { useSearchParams } from 'next/navigation';
import { useClient } from '@/lib/hooks/useClients';
import { PlaybookWizard } from '@/components/playbook/wizard/PlaybookWizard';
import { Loader2 } from 'lucide-react';
import { Suspense } from 'react';

function PlaybookPageContent() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get('clientId');
  const proposalId = searchParams.get('proposalId');

  const { data: client, isLoading } = useClient(clientId || undefined);

  if (!clientId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-600">Client ID is required to create a playbook</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-600">Client not found</p>
      </div>
    );
  }

  return (
    <PlaybookWizard
      clientId={clientId}
      clientName={client.companyName}
      proposalId={proposalId || undefined}
    />
  );
}

export default function PlaybookPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      }
    >
      <PlaybookPageContent />
    </Suspense>
  );
}
