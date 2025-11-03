'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileText, Plus, Download, Send, Trash2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useProposals, useDeleteProposal } from '@/lib/hooks/useProposals';
import { formatRelativeTime, formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function ProposalsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [proposalToDelete, setProposalToDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const { data, isLoading, error } = useProposals(page, 20);
  const deleteProposal = useDeleteProposal();

  const handleDeleteClick = (proposal: { id: string; title: string }) => {
    setProposalToDelete(proposal);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!proposalToDelete) return;

    try {
      await deleteProposal.mutateAsync(proposalToDelete.id);
      toast({
        title: 'Proposal deleted',
        description: `"${proposalToDelete.title}" has been deleted successfully.`,
      });
      setDeleteDialogOpen(false);
      setProposalToDelete(null);
    } catch (error) {
      toast({
        title: 'Error deleting proposal',
        description: 'Failed to delete the proposal. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading proposals...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-600">Error loading proposals</p>
      </div>
    );
  }

  const proposals = data?.data || [];
  const hasProposals = proposals.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Proposals</h1>
          <p className="text-gray-500 mt-1">
            Create and manage AI-powered sales proposals
          </p>
        </div>
        <Link href="/dashboard/proposals/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Proposal
          </Button>
        </Link>
      </div>

      {!hasProposals ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No proposals yet
            </h3>
            <p className="text-sm text-gray-500 mb-4 text-center max-w-sm">
              Create your first proposal with AI-powered content generation, PDF export, and e-signature support.
            </p>
            <Link href="/dashboard/proposals/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Your First Proposal
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {proposals.map((proposal) => (
            <Card
              key={proposal.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/dashboard/proposals/${proposal.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-blue-600 mt-1" />
                    <div>
                      <CardTitle className="text-lg">{proposal.title}</CardTitle>
                      <p className="text-sm text-gray-500 mt-1">
                        Created {formatRelativeTime(proposal.created)}
                        {proposal.client && ` • ${proposal.client.companyName}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={proposal.status} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    {proposal.pricing && (
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(proposal.pricing.total)}
                      </p>
                    )}
                    {proposal.executiveSummary && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {proposal.executiveSummary}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {proposal.status === 'draft' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          // TODO: Implement generate
                        }}
                      >
                        <Sparkles className="h-4 w-4" />
                        Generate
                      </Button>
                    )}
                    {(proposal.status === 'ready' || proposal.status === 'sent') && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            // TODO: Implement PDF download
                          }}
                        >
                          <Download className="h-4 w-4" />
                          PDF
                        </Button>
                        {proposal.status === 'ready' && (
                          <Button
                            variant="default"
                            size="sm"
                            className="gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              // TODO: Implement send
                            }}
                          >
                            <Send className="h-4 w-4" />
                            Send
                          </Button>
                        )}
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick({
                          id: proposal.id,
                          title: proposal.title,
                        });
                      }}
                    >
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Proposal</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{proposalToDelete?.title}"? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setProposalToDelete(null);
              }}
              disabled={deleteProposal.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteProposal.isPending}
            >
              {deleteProposal.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}
