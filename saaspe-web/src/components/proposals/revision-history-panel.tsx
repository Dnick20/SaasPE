'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { proposalsApi, ProposalRevision } from '@/lib/api/endpoints/proposals';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { History, RotateCcw, Eye, Loader2, FileText, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { formatRelativeTime } from '@/lib/utils';

interface RevisionHistoryPanelProps {
  proposalId: string;
}

export function RevisionHistoryPanel({ proposalId }: RevisionHistoryPanelProps) {
  const queryClient = useQueryClient();
  const [selectedRevision, setSelectedRevision] = useState<ProposalRevision | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['proposals', proposalId, 'revisions'],
    queryFn: () => proposalsApi.getRevisions(proposalId),
  });

  const restoreMutation = useMutation({
    mutationFn: (revisionId: string) => proposalsApi.restoreRevision(proposalId, revisionId),
    onSuccess: () => {
      toast.success('Revision restored successfully');
      queryClient.invalidateQueries({ queryKey: ['proposals', proposalId] });
      queryClient.invalidateQueries({ queryKey: ['proposals', proposalId, 'revisions'] });
      setIsDialogOpen(false);
    },
    onError: () => {
      toast.error('Failed to restore revision');
    },
  });

  const createRevisionMutation = useMutation({
    mutationFn: (changeNote?: string) => proposalsApi.createRevision(proposalId, changeNote),
    onSuccess: () => {
      toast.success('Revision snapshot created');
      queryClient.invalidateQueries({ queryKey: ['proposals', proposalId, 'revisions'] });
    },
    onError: () => {
      toast.error('Failed to create revision');
    },
  });

  const handleRestore = (revisionId: string) => {
    restoreMutation.mutate(revisionId);
  };

  const handleCreateSnapshot = () => {
    const changeNote = prompt('Enter a note for this revision (optional):');
    createRevisionMutation.mutate(changeNote || undefined);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const revisions = data?.revisions || [];
  const currentRevision = data?.currentRevision || 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Revision History
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Current revision: #{currentRevision}
            </p>
          </div>
          <Button
            onClick={handleCreateSnapshot}
            disabled={createRevisionMutation.isPending}
            size="sm"
          >
            {createRevisionMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            Create Snapshot
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {revisions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <History className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p>No revision history available</p>
            <p className="text-sm mt-1">Create a snapshot to save the current state</p>
          </div>
        ) : (
          <div className="space-y-3">
            {revisions.map((revision) => (
              <div
                key={revision.id}
                className={`p-4 border rounded-lg hover:border-blue-300 transition-colors ${
                  revision.revisionNumber === currentRevision
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={revision.revisionNumber === currentRevision ? 'default' : 'secondary'}>
                        Revision #{revision.revisionNumber}
                      </Badge>
                      {revision.revisionNumber === currentRevision && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Current
                        </Badge>
                      )}
                    </div>
                    <h4 className="font-medium text-sm">{revision.title}</h4>
                    {revision.changeNote && (
                      <p className="text-sm text-gray-600 mt-1">{revision.changeNote}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatRelativeTime(revision.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Dialog open={isDialogOpen && selectedRevision?.id === revision.id} onOpenChange={setIsDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedRevision(revision)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Revision #{revision.revisionNumber}</DialogTitle>
                          <DialogDescription>
                            Created {formatRelativeTime(revision.createdAt)}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="mt-6 space-y-6">
                          <div>
                            <h3 className="font-semibold mb-2">Title</h3>
                            <p className="text-sm text-gray-700">{revision.title}</p>
                          </div>
                          {revision.changeNote && (
                            <div>
                              <h3 className="font-semibold mb-2">Change Note</h3>
                              <p className="text-sm text-gray-700">{revision.changeNote}</p>
                            </div>
                          )}
                          <Separator />
                          {revision.executiveSummary && (
                            <div>
                              <h3 className="font-semibold mb-2">Executive Summary</h3>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                {revision.executiveSummary}
                              </p>
                            </div>
                          )}
                          {revision.objectivesAndOutcomes && (
                            <div>
                              <h3 className="font-semibold mb-2">Objectives & Outcomes</h3>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                {revision.objectivesAndOutcomes}
                              </p>
                            </div>
                          )}
                          {revision.scopeOfWork && (
                            <div>
                              <h3 className="font-semibold mb-2">Scope of Work</h3>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                {revision.scopeOfWork}
                              </p>
                            </div>
                          )}
                          {revision.deliverables && (
                            <div>
                              <h3 className="font-semibold mb-2">Deliverables</h3>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                {revision.deliverables}
                              </p>
                            </div>
                          )}
                          {revision.approachAndTools && (
                            <div>
                              <h3 className="font-semibold mb-2">Approach & Tools</h3>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                {revision.approachAndTools}
                              </p>
                            </div>
                          )}
                          {revision.paymentTerms && (
                            <div>
                              <h3 className="font-semibold mb-2">Payment Terms</h3>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                {revision.paymentTerms}
                              </p>
                            </div>
                          )}
                          {revision.cancellationNotice && (
                            <div>
                              <h3 className="font-semibold mb-2">Cancellation Notice</h3>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                {revision.cancellationNotice}
                              </p>
                            </div>
                          )}
                          {revision.timeline && (
                            <div>
                              <h3 className="font-semibold mb-2">Timeline</h3>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                {revision.timeline}
                              </p>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                    {revision.revisionNumber !== currentRevision && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={restoreMutation.isPending}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Restore
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Restore Revision?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will restore the proposal to revision #{revision.revisionNumber}.
                              A new revision will be created with the current state before restoring.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRestore(revision.id)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              Restore Revision
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
