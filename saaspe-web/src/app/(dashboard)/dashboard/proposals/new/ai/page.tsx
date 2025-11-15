'use client';


export const dynamic = 'force-dynamic';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Sparkles } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { proposalsApi } from '@/lib/api/endpoints/proposals';
import { clientsApi } from '@/lib/api/endpoints/clients';

interface Client { id: string; companyName: string; }

function AIProposalNewContent() {
  const params = useSearchParams();
  const router = useRouter();
  const urlClientId = params.get('clientId') || undefined;
  const urlTranscriptionId = params.get('transcriptionId') || undefined;

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [clientId, setClientId] = useState<string | undefined>(urlClientId);
  const [transcriptionId, setTranscriptionId] = useState<string | undefined>(urlTranscriptionId || undefined);
  const [title, setTitle] = useState<string>('');
  const [tone, setTone] = useState<string>('professional');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const list = await clientsApi.getAll(1, 100);
        setClients(list.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchClients();
  }, []);

  const handleGenerate = async () => {
    if (!clientId) {
      setError('Please select a client');
      return;
    }
    try {
      setError(null);
      setSubmitting(true);
      const proposal = await proposalsApi.generateAI({ clientId, transcriptionId, title: title || undefined, tone });
      router.push(`/dashboard/proposals/${proposal.id}/edit`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to generate proposal');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href={'/dashboard/proposals'} className="text-sm text-gray-600 hover:text-gray-900">
          ← Back to Proposals
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-2">Generate Proposal with AI</h1>
        <p className="text-gray-500 mt-1">Select a client and optionally a transcription, then generate all sections.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inputs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Client *</Label>
              <Select value={clientId} onValueChange={(v) => setClientId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Transcription ID (optional)</Label>
              <Input value={transcriptionId || ''} onChange={(e) => setTranscriptionId(e.target.value || undefined)} placeholder="transcription-uuid" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Title (optional)</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Growth Strategy for ACME" />
            </div>
            <div>
              <Label>Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent>
                  {['professional', 'friendly', 'consultative', 'casual'].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button onClick={handleGenerate} disabled={submitting || !clientId} className="gap-2">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {submitting ? 'Generating…' : 'Generate with AI'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AIProposalNewPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>}>
      <AIProposalNewContent />
    </Suspense>
  );
}


