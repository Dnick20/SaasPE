'use client';


export const dynamic = 'force-dynamic';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { proposalsApi } from '@/lib/api/endpoints/proposals';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, FileDown, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import { TimelineDisplay } from '@/components/proposals/TimelineDisplay';

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

  // Poll for status updates when proposal is generating
  useEffect(() => {
    if (!proposal || proposal.status !== 'generating') {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const updated = await proposalsApi.getOne(id);
        setProposal(updated);

        // Stop polling when status changes from generating
        if (updated.status !== 'generating') {
          clearInterval(pollInterval);
          if (updated.status === 'ready') {
            toast.success('Proposal generation completed!');
          }
        }
      } catch (error) {
        console.error('Error polling proposal status:', error);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [id, proposal?.status]);

  if (loading || !proposal) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const exportPdf = async () => {
    try {
      const url = `${process.env.NEXT_PUBLIC_API_URL || 'https://api.saasope.com'}/api/v1/proposals/${proposal.id}/pdf`;
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
      let status: any = { data: { connected: false } };
      try {
        const { data } = await apiClient.get('/api/v1/auth/google/status');
        status = data;
      } catch {}
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
          <Button variant="outline" onClick={exportPdf} className="gap-2" disabled={proposal.status === 'generating'}>
            <FileDown className="h-4 w-4" /> PDF
          </Button>
          <Button variant="outline" onClick={exportGDoc} className="gap-2" disabled={proposal.status === 'generating'}>
            <ExternalLink className="h-4 w-4" /> Google Docs
          </Button>
        </div>
      </div>

      {proposal.status === 'generating' && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <div>
                <p className="font-medium text-blue-900">AI is generating your proposal...</p>
                <p className="text-sm text-blue-700">This usually takes 30-60 seconds. The page will update automatically.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
              {typeof proposal.scopeOfWork === 'string' ? (
                <p className="text-gray-800 whitespace-pre-wrap">{proposal.scopeOfWork}</p>
              ) : Array.isArray(proposal.scopeOfWork) ? (
                <div className="space-y-3">
                  {(proposal.scopeOfWork as Array<{ title?: string; objective?: string; keyActivities?: string[]; outcome?: string }>).map((item, index: number) => (
                    <div key={index} className="border-l-4 border-green-500 pl-3 py-2">
                      {item.title && (
                        <h4 className="font-semibold text-gray-900 mb-1">{item.title}</h4>
                      )}
                      {item.objective && (
                        <div className="mb-1">
                          <p className="text-sm font-medium text-gray-600">Objective:</p>
                          <p className="text-gray-800">{item.objective}</p>
                        </div>
                      )}
                      {item.keyActivities && item.keyActivities.length > 0 && (
                        <div className="mb-1">
                          <p className="text-sm font-medium text-gray-600">Key Activities:</p>
                          <ul className="list-disc list-inside space-y-1 ml-2">
                            {item.keyActivities.map((activity, actIdx) => (
                              <li key={actIdx} className="text-gray-800">{activity}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {item.outcome && (
                        <div>
                          <p className="text-sm font-medium text-gray-600">Outcome:</p>
                          <p className="text-gray-800">{item.outcome}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}
          {proposal.deliverables && (
            <div>
              <h3 className="font-semibold mb-1">Deliverables</h3>
              {typeof proposal.deliverables === 'string' ? (
                <p className="text-gray-800 whitespace-pre-wrap">{proposal.deliverables}</p>
              ) : Array.isArray(proposal.deliverables) ? (
                <ul className="list-disc list-inside space-y-1">
                  {(proposal.deliverables as Array<string | { description?: string; name?: string }>).map((item, index: number) => (
                    <li key={index} className="text-gray-800">
                      {typeof item === 'string' ? item : item.description || item.name || ''}
                    </li>
                  ))}
                </ul>
              ) : null}
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
              <h3 className="font-semibold mb-3">Project Timeline</h3>
              <TimelineDisplay timeline={proposal.timeline} />
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


