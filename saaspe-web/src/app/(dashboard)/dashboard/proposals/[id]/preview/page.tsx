'use client';


export const dynamic = 'force-dynamic';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { proposalsApi } from '@/lib/api/endpoints/proposals';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, FileDown, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function ProposalPreviewPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;
  const [loading, setLoading] = useState(true);
  const [proposal, setProposal] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const p = await proposalsApi.getOne(id);
        setProposal(p);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading || !proposal) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const exportPdf = async () => {
    try {
      const url = `/api/v1/proposals/${proposal.id}/pdf`;
      const a = document.createElement('a');
      a.href = url;
      a.download = `${proposal.title}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      toast.error('Failed to export PDF');
    }
  };

  const exportGDoc = async () => {
    try {
      const statusResp = await fetch('/api/v1/auth/google/status', { credentials: 'include' });
      const status = statusResp.ok ? await statusResp.json() : { data: { connected: false } };
      if (!status?.data?.connected) {
        const confirmConnect = window.confirm('Connect Google to export to Google Docs?');
        if (confirmConnect) window.location.href = '/api/v1/auth/google/authorize';
        return;
      }
      const result = await proposalsApi.exportGDoc(proposal.id);
      window.open(result.docUrl, '_blank');
    } catch {
      toast.error('Failed to export to Google Docs');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Preview Proposal</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push(`/dashboard/proposals/${id}/edit`)}>Edit</Button>
          <Button variant="outline" onClick={exportPdf} className="gap-2">
            <FileDown className="h-4 w-4" /> PDF
          </Button>
          <Button variant="outline" onClick={exportGDoc} className="gap-2">
            <ExternalLink className="h-4 w-4" /> Google Docs
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{proposal.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {proposal.coverPageData?.summary && (
            <div>
              <h3 className="font-semibold mb-1">Overview</h3>
              <p className="text-gray-800 whitespace-pre-wrap">{proposal.coverPageData.summary}</p>
            </div>
          )}

          {proposal.executiveSummary && (
            <div>
              <h3 className="font-semibold mb-1">Executive Summary</h3>
              <p className="text-gray-800 whitespace-pre-wrap">{proposal.executiveSummary}</p>
            </div>
          )}
          {proposal.objectivesAndOutcomes && (
            <div>
              <h3 className="font-semibold mb-1">Objectives & Outcomes</h3>
              <p className="text-gray-800 whitespace-pre-wrap">{proposal.objectivesAndOutcomes}</p>
            </div>
          )}
          {proposal.scopeOfWork && (
            <div>
              <h3 className="font-semibold mb-1">Scope of Work</h3>
              <p className="text-gray-800 whitespace-pre-wrap">{proposal.scopeOfWork}</p>
            </div>
          )}
          {proposal.deliverables && (
            <div>
              <h3 className="font-semibold mb-1">Deliverables</h3>
              <p className="text-gray-800 whitespace-pre-wrap">{proposal.deliverables}</p>
            </div>
          )}
          {proposal.approachAndTools && (
            <div>
              <h3 className="font-semibold mb-1">Approach & Tools</h3>
              <p className="text-gray-800 whitespace-pre-wrap">{proposal.approachAndTools}</p>
            </div>
          )}
          {proposal.paymentTerms && (
            <div>
              <h3 className="font-semibold mb-1">Payment Terms</h3>
              <p className="text-gray-800 whitespace-pre-wrap">{proposal.paymentTerms}</p>
            </div>
          )}
          {proposal.cancellationNotice && (
            <div>
              <h3 className="font-semibold mb-1">Cancellation Notice</h3>
              <p className="text-gray-800 whitespace-pre-wrap">{proposal.cancellationNotice}</p>
            </div>
          )}
          {proposal.timeline && (
            <div>
              <h3 className="font-semibold mb-1">Timeline</h3>
              <pre className="text-sm text-gray-800 whitespace-pre-wrap">{typeof proposal.timeline === 'string' ? proposal.timeline : JSON.stringify(proposal.timeline, null, 2)}</pre>
            </div>
          )}
          {proposal.pricing && (
            <div>
              <h3 className="font-semibold mb-1">Pricing</h3>
              <pre className="text-sm text-gray-800 whitespace-pre-wrap">{JSON.stringify(proposal.pricing, null, 2)}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


