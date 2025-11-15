'use client';


export const dynamic = 'force-dynamic';
import { useState } from 'react';
import { ArrowLeft, Download, Send, FileText, Loader2, Sparkles, PenTool, Rocket, CreditCard, XCircle, Edit } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery, useMutation } from '@tanstack/react-query';
import { proposalsApi } from '@/lib/api/endpoints/proposals';
import { formatRelativeTime, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { AxiosError } from 'axios';
import { AgencySignatureDialog } from '@/components/proposals/agency-signature-dialog';
import { SendToClientDialog } from '@/components/proposals/send-to-client-dialog';
import { SignatureStatusTracker } from '@/components/proposals/signature-status-tracker';
import { TimelineDisplay } from '@/components/proposals/TimelineDisplay';
import { useCustomerJourney } from '@/lib/journey/use-customer-journey';
import { JourneyActionPanel } from '@/components/journey/JourneyActionPanel';

interface ProposalDetailPageProps {
  params: { id: string };
}

export default function ProposalDetailPage({ params }: ProposalDetailPageProps) {
  const { id } = params;
  const router = useRouter();
  const journey = useCustomerJourney();
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);

  const { data: proposal, isLoading, error } = useQuery({
    queryKey: ['proposal', id],
    queryFn: () => proposalsApi.getOne(id),
    refetchInterval: (query) => {
      // Poll every 3 seconds if status is generating
      const currentStatus = query.state.data?.status;
      const previousStatus = query.state.data ? String(query.state.data.status) : '';

      // Show success message when generation completes
      if (previousStatus === 'generating' && currentStatus === 'ready') {
        toast.success('✨ Proposal generation complete! Your AI-powered proposal is ready.', {
          duration: 5000,
        });
      }

      return currentStatus === 'generating' ? 3000 : false;
    },
  });

  const exportPdfMutation = useMutation({
    mutationFn: () => proposalsApi.exportPdf(id),
    onSuccess: (data) => {
      // Open PDF in new tab
      window.open(data.pdfUrl, '_blank');
      toast.success('PDF generated successfully!');
    },
    onError: (error) => {
      const message = error instanceof AxiosError
        ? error.response?.data?.message || 'Failed to export PDF'
        : 'Failed to export PDF';
      toast.error(message);
    },
  });

  const handleExportPdf = () => {
    exportPdfMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading proposal...</p>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-600">Error loading proposal</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/dashboard/proposals')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{proposal.title}</h1>
            <p className="text-gray-500 mt-1">
              Created {formatRelativeTime(proposal.created)}
              {proposal.client && ` • ${proposal.client.companyName}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={proposal.status} />
        </div>
      </div>

      {/* Signature Status Tracker */}
      <SignatureStatusTracker
        proposal={proposal}
        onStatusChange={(newStatus) => {
          // Refetch proposal when status changes
          toast.success(`Proposal status updated: ${newStatus}`);
        }}
      />

      {/* Journey Action Panel - Show if on campaign step or proposal just completed */}
      {journey.currentStep === 'campaign' && proposal.status === 'ready' && (
        <JourneyActionPanel
          title="Create Campaign from This Proposal"
          description="Launch your first email campaign using the contacts from this proposal"
          icon="🚀"
          primaryAction={{
            label: 'Create Campaign',
            onClick: () => router.push(`/dashboard/campaigns/new?clientId=${proposal.client?.id}&proposalId=${id}`),
          }}
        />
      )}

      {/* Action Buttons */}
      {(proposal.status === 'draft' || proposal.status === 'ready' || proposal.status === 'sent' || proposal.status === 'signed') && (
        <div className="flex gap-3">
          {/* Edit Button - Only show for ready/draft status */}
          {(proposal.status === 'ready' || proposal.status === 'draft') && (
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/proposals/${id}/edit`)}
              className="gap-2"
            >
              <Edit className="h-4 w-4" />
              Edit Proposal
            </Button>
          )}
          <Button
            className="gap-2"
            onClick={handleExportPdf}
            disabled={exportPdfMutation.isPending}
          >
            {exportPdfMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Export PDF
              </>
            )}
          </Button>
          {!proposal.agencySignedAt && proposal.status === 'ready' && (
            <Button
              onClick={() => setShowSignatureDialog(true)}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <PenTool className="h-4 w-4" />
              Sign as Agency
            </Button>
          )}
          {proposal.agencySignedAt && !proposal.docusignEnvelopeId && (
            <Button
              onClick={() => setShowSendDialog(true)}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <Send className="h-4 w-4" />
              Send to Client
            </Button>
          )}
          {/* Show "Create Campaign" button if proposal is ready */}
          {proposal.status === 'ready' && proposal.client && (
            <Button
              onClick={() => router.push(`/dashboard/campaigns/new?clientId=${proposal.client?.id}&proposalId=${id}`)}
              className="gap-2 bg-purple-600 hover:bg-purple-700"
            >
              <Rocket className="h-4 w-4" />
              Create Campaign
            </Button>
          )}
        </div>
      )}

      {/* Generating Status */}
      {proposal.status === 'generating' && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-6">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
              <div>
                <p className="font-medium text-blue-900">AI is generating your proposal...</p>
                <p className="text-sm text-blue-700 mt-1">
                  This usually takes 30-60 seconds. The page will update automatically.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Executive Summary */}
      {proposal.executiveSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Executive Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {proposal.executiveSummary}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Objectives and Outcomes */}
      {proposal.objectivesAndOutcomes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              Objectives and Outcomes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {proposal.objectivesAndOutcomes}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scope of Work */}
      {proposal.scopeOfWork && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-600" />
              Scope of Work
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              {typeof proposal.scopeOfWork === 'string' ? (
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {proposal.scopeOfWork}
                </p>
              ) : Array.isArray(proposal.scopeOfWork) ? (
                <div className="space-y-4">
                  {(proposal.scopeOfWork as Array<{ title?: string; objective?: string; keyActivities?: string[]; outcome?: string }>).map((item, index: number) => (
                    <div key={index} className="border-l-4 border-green-500 pl-4 py-2">
                      {item.title && (
                        <h4 className="font-semibold text-gray-900 mb-2">{item.title}</h4>
                      )}
                      {item.objective && (
                        <div className="mb-2">
                          <p className="text-sm font-medium text-gray-600">Objective:</p>
                          <p className="text-gray-700">{item.objective}</p>
                        </div>
                      )}
                      {item.keyActivities && item.keyActivities.length > 0 && (
                        <div className="mb-2">
                          <p className="text-sm font-medium text-gray-600">Key Activities:</p>
                          <ul className="list-disc list-inside space-y-1 ml-2">
                            {item.keyActivities.map((activity, actIdx) => (
                              <li key={actIdx} className="text-gray-700">{activity}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {item.outcome && (
                        <div>
                          <p className="text-sm font-medium text-gray-600">Outcome:</p>
                          <p className="text-gray-700">{item.outcome}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deliverables */}
      {proposal.deliverables && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Deliverables
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              {typeof proposal.deliverables === 'string' ? (
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {proposal.deliverables}
                </p>
              ) : Array.isArray(proposal.deliverables) ? (
                <ul className="list-disc list-inside space-y-2">
                  {(proposal.deliverables as Array<string | { description?: string; name?: string }>).map((item, index: number) => (
                    <li key={index} className="text-gray-700">
                      {typeof item === 'string' ? item : item.description || item.name || ''}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approach and Tools */}
      {proposal.approachAndTools && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600" />
              Approach and Tools
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {proposal.approachAndTools}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      {proposal.timeline && (
        <Card>
          <CardHeader>
            <CardTitle>Project Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <TimelineDisplay timeline={proposal.timeline} />
          </CardContent>
        </Card>
      )}

      {/* Pricing */}
      {proposal.pricing && (
        <Card>
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {proposal.pricing.items && proposal.pricing.items.length > 0 && (
                <div className="space-y-3">
                  {proposal.pricing.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-start border-b border-gray-100 pb-3 last:border-0">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.name}</p>
                        {item.description && (
                          <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                        )}
                      </div>
                      <p className="font-medium text-gray-900 ml-4">
                        {formatCurrency(item.price)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between items-center pt-3 border-t-2 border-gray-200">
                <p className="text-lg font-bold text-gray-900">Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(proposal.pricing.total)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Terms */}
      {proposal.paymentTerms && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-green-600" />
              Payment Terms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {proposal.paymentTerms}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancellation Notice */}
      {proposal.cancellationNotice && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Cancellation Policy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {proposal.cancellationNotice}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Proposal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-500">Status</span>
            <StatusBadge status={proposal.status} />
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Created</span>
            <span className="font-medium">{new Date(proposal.created).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Last Updated</span>
            <span className="font-medium">{formatRelativeTime(proposal.updated)}</span>
          </div>
          {proposal.sentAt && (
            <div className="flex justify-between">
              <span className="text-gray-500">Sent to Client</span>
              <span className="font-medium">{new Date(proposal.sentAt).toLocaleDateString()}</span>
            </div>
          )}
          {proposal.agencySignedAt && (
            <div className="flex justify-between">
              <span className="text-gray-500">Agency Signed</span>
              <span className="font-medium">{new Date(proposal.agencySignedAt).toLocaleDateString()}</span>
            </div>
          )}
          {proposal.clientSignedAt && (
            <div className="flex justify-between">
              <span className="text-gray-500">Client Signed</span>
              <span className="font-medium">{new Date(proposal.clientSignedAt).toLocaleDateString()}</span>
            </div>
          )}
          {proposal.docusignEnvelopeId && (
            <div className="flex justify-between">
              <span className="text-gray-500">DocuSign Envelope</span>
              <span className="font-mono text-xs">{proposal.docusignEnvelopeId}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Signature Dialogs */}
      <AgencySignatureDialog
        proposalId={id}
        isOpen={showSignatureDialog}
        onClose={() => setShowSignatureDialog(false)}
        onSuccess={() => {
          setShowSignatureDialog(false);
          setShowSendDialog(true); // Automatically open send dialog after signing
        }}
      />

      <SendToClientDialog
        proposalId={id}
        clientEmail={proposal.client?.email}
        clientName={proposal.client?.companyName}
        isOpen={showSendDialog}
        onClose={() => setShowSendDialog(false)}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig = {
    draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800' },
    generating: { label: 'Generating', color: 'bg-blue-100 text-blue-800' },
    ready: { label: 'Ready', color: 'bg-green-100 text-green-800' },
    sent: { label: 'Sent', color: 'bg-purple-100 text-purple-800' },
    signed: { label: 'Signed', color: 'bg-teal-100 text-teal-800' },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;

  return (
    <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}
