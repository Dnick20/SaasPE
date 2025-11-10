'use client';


export const dynamic = 'force-dynamic';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { ProposalPathSelection } from '@/components/proposals/proposal-path-selection';
import { CreateProposalFromTranscription } from '@/components/proposals/create-proposal-from-transcription';
import { CreateProposalForm } from '@/components/proposals/create-proposal-form';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { clientsApi } from '@/lib/api/endpoints/clients';

type ProposalCreationPath = 'selection' | 'transcription' | 'manual';

interface Client {
  id: string;
  companyName: string;
}

function NewProposalContent() {
  const searchParams = useSearchParams();
  const urlClientId = searchParams.get('clientId');
  const urlTranscriptionId = searchParams.get('transcriptionId');

  // Auto-select 'transcription' path if transcriptionId is present
  const initialPath = urlTranscriptionId ? 'transcription' : 'selection';

  const [path, setPath] = useState<ProposalCreationPath>(initialPath);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(urlClientId);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const data = await clientsApi.getAll(1, 100);
        setClients(data.data || []);
      } catch (error) {
        console.error('Failed to fetch clients:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchClients();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const showClientSelector = (!selectedClientId || path === 'selection') && path !== 'transcription';

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={path === 'selection' ? '/dashboard/proposals' : '#'}
          onClick={(e) => {
            if (path !== 'selection') {
              e.preventDefault();
              setPath('selection');
            }
          }}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          {path === 'selection' ? 'Back to Proposals' : 'Back to Selection'}
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Create New Proposal</h1>
        <p className="text-gray-500 mt-1">
          {path === 'selection' && 'Choose how you want to create your proposal'}
          {path === 'transcription' && 'Generate proposal from meeting transcription using AI'}
          {path === 'manual' && 'Create a proposal manually with full control'}
        </p>
      </div>

      {showClientSelector && (
        <div className="max-w-md">
          <Label htmlFor="client">Select Client (Optional for AI Generation)</Label>
          <Select value={selectedClientId || undefined} onValueChange={setSelectedClientId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a client" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.companyName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {clients.length === 0 && (
            <p className="text-sm text-gray-500 mt-2">
              No clients found.{' '}
              <Link href="/dashboard/clients/new" className="text-blue-600 hover:underline">
                Create a client
              </Link>{' '}
              first, or proceed with AI generation from transcription.
            </p>
          )}
        </div>
      )}

      {selectedClientId && path === 'selection' && (
        <ProposalPathSelection
          clientId={selectedClientId}
          onSelectPath={(selectedPath) => setPath(selectedPath)}
        />
      )}

      {path === 'transcription' && (
        <CreateProposalFromTranscription
          clientId={selectedClientId || undefined}
          initialTranscriptionId={urlTranscriptionId || undefined}
          onBack={() => setPath('selection')}
        />
      )}

      {selectedClientId && path === 'manual' && (
        <CreateProposalForm clientId={selectedClientId} />
      )}
    </div>
  );
}

export default function NewProposalPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      }
    >
      <NewProposalContent />
    </Suspense>
  );
}
