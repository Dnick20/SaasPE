'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle2,
  Clock,
  FileSignature,
  Send,
  AlertCircle,
  ExternalLink,
  User,
  Building2,
} from 'lucide-react';
import { format } from 'date-fns';
import type { Proposal } from '@/lib/api/endpoints/proposals';

interface SignatureStatusTrackerProps {
  proposal: Proposal;
  onStatusChange?: (newStatus: string) => void;
}

export function SignatureStatusTracker({ proposal, onStatusChange }: SignatureStatusTrackerProps) {
  // Poll for status updates every 30 seconds if envelope is pending
  const { data: updatedProposal, isLoading } = useQuery({
    queryKey: ['proposal', proposal.id, 'status'],
    queryFn: async () => {
      // In a real implementation, this would fetch updated proposal data
      return proposal;
    },
    refetchInterval: proposal.docusignEnvelopeId && !proposal.clientSignedAt ? 30000 : false,
    enabled: !!proposal.docusignEnvelopeId && !proposal.clientSignedAt,
  });

  const currentProposal = updatedProposal || proposal;

  // Notify parent of status changes
  useEffect(() => {
    if (onStatusChange && currentProposal.status !== proposal.status) {
      onStatusChange(currentProposal.status);
    }
  }, [currentProposal.status, proposal.status, onStatusChange]);

  const getStatusBadge = () => {
    if (currentProposal.clientSignedAt) {
      return (
        <Badge className="bg-green-600 text-white">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Fully Signed
        </Badge>
      );
    }

    if (currentProposal.docusignEnvelopeId) {
      return (
        <Badge className="bg-yellow-500 text-white animate-pulse">
          <Clock className="h-3 w-3 mr-1" />
          Pending Client Signature
        </Badge>
      );
    }

    if (currentProposal.agencySignedAt) {
      return (
        <Badge className="bg-blue-600 text-white">
          <FileSignature className="h-3 w-3 mr-1" />
          Agency Signed
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="bg-gray-50">
        <AlertCircle className="h-3 w-3 mr-1" />
        Not Signed
      </Badge>
    );
  };

  const getProgressPercentage = () => {
    if (currentProposal.clientSignedAt) return 100;
    if (currentProposal.docusignEnvelopeId) return 66;
    if (currentProposal.agencySignedAt) return 33;
    return 0;
  };

  const showTracker = currentProposal.agencySignedAt || currentProposal.docusignEnvelopeId;

  if (!showTracker) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 border-blue-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileSignature className="h-5 w-5 text-blue-600" />
              Signature Status
            </CardTitle>
            <CardDescription className="mt-1">
              Track the e-signature workflow progress
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="relative">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 transition-all duration-500 ease-out"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>Draft</span>
            <span>Agency Signed</span>
            <span>Client Sent</span>
            <span>Completed</span>
          </div>
        </div>

        <Separator />

        {/* Timeline */}
        <div className="space-y-4">
          {/* Agency Signature */}
          <div className="flex items-start gap-4">
            <div
              className={`h-10 w-10 rounded-full flex items-center justify-center ${
                currentProposal.agencySignedAt
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              <Building2 className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-900">Agency Signature</h4>
                {currentProposal.agencySignedAt && (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                )}
              </div>
              {currentProposal.agencySignedAt ? (
                <div className="text-sm text-gray-600 mt-1">
                  Signed by {currentProposal.agencySignedBy} on{' '}
                  {format(new Date(currentProposal.agencySignedAt), 'MMM dd, yyyy at h:mm a')}
                </div>
              ) : (
                <div className="text-sm text-gray-500 mt-1">
                  Waiting for agency to sign proposal
                </div>
              )}
            </div>
          </div>

          {/* Sent to Client */}
          {currentProposal.agencySignedAt && (
            <>
              <div className="flex items-start gap-4">
                <div
                  className={`h-10 w-10 rounded-full flex items-center justify-center ${
                    currentProposal.docusignEnvelopeId
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  <Send className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-900">Sent to Client</h4>
                    {currentProposal.docusignEnvelopeId && (
                      <CheckCircle2 className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                  {currentProposal.docusignEnvelopeId ? (
                    <div className="text-sm text-gray-600 mt-1 space-y-1">
                      <div>
                        Sent to {currentProposal.client?.email || 'client'} via e-signature
                      </div>
                      <div className="flex items-center gap-2 text-blue-600">
                        <span>Envelope ID: {currentProposal.docusignEnvelopeId.substring(0, 12)}...</span>
                        <ExternalLink className="h-3 w-3" />
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 mt-1">
                      Ready to send to client for signature
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Client Signature */}
          {currentProposal.docusignEnvelopeId && (
            <div className="flex items-start gap-4">
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  currentProposal.clientSignedAt
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700 animate-pulse'
                }`}
              >
                <User className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-900">Client Signature</h4>
                  {currentProposal.clientSignedAt ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <Clock className="h-5 w-5 text-yellow-600 animate-spin" />
                  )}
                </div>
                {currentProposal.clientSignedAt ? (
                  <div className="text-sm text-gray-600 mt-1">
                    Signed on {format(new Date(currentProposal.clientSignedAt), 'MMM dd, yyyy at h:mm a')}
                  </div>
                ) : (
                  <div className="text-sm text-yellow-700 mt-1 font-medium">
                    Waiting for client to sign...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Auto-refresh notice */}
        {currentProposal.docusignEnvelopeId && !currentProposal.clientSignedAt && (
          <div className="bg-blue-100 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
            <Clock className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-800">
              This page automatically checks for updates every 30 seconds. You'll be notified when
              the client signs the proposal.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
