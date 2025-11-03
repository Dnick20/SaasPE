'use client';


export const dynamic = 'force-dynamic';
import { ArrowLeft, Edit, Trash2, Building2, Mail, Phone, Globe, FileText, Loader2, Linkedin } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useClient, useDeleteClient } from '@/lib/hooks/useClients';
import { formatRelativeTime } from '@/lib/utils';
import { toast } from 'sonner';
import { AxiosError } from 'axios';

interface ClientDetailPageProps {
  params: { id: string };
}

export default function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { id } = params;
  const router = useRouter();

  const { data: client, isLoading, error } = useClient(id);
  const deleteMutation = useDeleteClient();

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this client? This will also delete all associated transcriptions and proposals. This action cannot be undone.')) {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          toast.success('Client deleted successfully');
          router.push('/dashboard/clients');
        },
        onError: (error) => {
          const message = error instanceof AxiosError
            ? error.response?.data?.message || 'Failed to delete client'
            : 'Failed to delete client';
          toast.error(message);
        },
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading client...</p>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-600">Error loading client</p>
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
            onClick={() => router.push('/dashboard/clients')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{client.companyName}</h1>
            <p className="text-gray-500 mt-1">
              Created {formatRelativeTime(client.created)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/clients/${id}/edit`)}
            className="gap-2"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="gap-2"
          >
            {deleteMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete
              </>
            )}
          </Button>
          <StatusBadge status={client.status} />
        </div>
      </div>

      {/* Company Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            Company Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {client.industry && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Industry</h3>
                <p className="text-gray-900">{client.industry}</p>
              </div>
            )}
            {client.website && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Website</h3>
                <a
                  href={client.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-2"
                >
                  <Globe className="h-4 w-4" />
                  {client.website}
                </a>
              </div>
            )}
            {client.budget && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Budget</h3>
                <p className="text-gray-900">{client.budget}</p>
              </div>
            )}
            {client.timeline && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Timeline</h3>
                <p className="text-gray-900">{client.timeline}</p>
              </div>
            )}
            {client.hubspotDealId && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">HubSpot Deal ID</h3>
                <p className="text-gray-900">{client.hubspotDealId}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      {(client.contactFirstName || client.contactLastName || client.contactEmail || client.contactPhone || client.contactLinkedIn) && (
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(client.contactFirstName || client.contactLastName) && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Name</h3>
                <p className="text-gray-900">
                  {client.contactFirstName} {client.contactLastName}
                </p>
              </div>
            )}
            {client.contactEmail && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Email</h3>
                <a
                  href={`mailto:${client.contactEmail}`}
                  className="text-blue-600 hover:underline flex items-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  {client.contactEmail}
                </a>
              </div>
            )}
            {client.contactPhone && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Phone</h3>
                <a
                  href={`tel:${client.contactPhone}`}
                  className="text-blue-600 hover:underline flex items-center gap-2"
                >
                  <Phone className="h-4 w-4" />
                  {client.contactPhone}
                </a>
              </div>
            )}
            {client.contactLinkedIn && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">LinkedIn</h3>
                <a
                  href={client.contactLinkedIn}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-2"
                >
                  <Linkedin className="h-4 w-4" />
                  {client.contactLinkedIn}
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Problem Statement */}
      {client.problemStatement && (
        <Card>
          <CardHeader>
            <CardTitle>Problem Statement</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {client.problemStatement}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Current Tools */}
      {client.currentTools && client.currentTools.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Current Tools & Systems</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {client.currentTools.map((tool, index) => (
                <span
                  key={index}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium"
                >
                  {tool}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transcriptions */}
      {client.transcriptions && client.transcriptions.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Transcriptions ({client.transcriptions.length})
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/dashboard/transcriptions')}
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {client.transcriptions.map((transcription) => (
                <div
                  key={transcription.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => router.push(`/dashboard/transcriptions/${transcription.id}`)}
                >
                  <div>
                    <p className="font-medium text-gray-900">{transcription.fileName}</p>
                    <p className="text-sm text-gray-500">
                      {formatRelativeTime(transcription.created)}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    transcription.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {transcription.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Proposals */}
      {client.proposals && client.proposals.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-600" />
                Proposals ({client.proposals.length})
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/dashboard/proposals')}
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {client.proposals.map((proposal) => (
                <div
                  key={proposal.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => router.push(`/dashboard/proposals/${proposal.id}`)}
                >
                  <div>
                    <p className="font-medium text-gray-900">{proposal.title}</p>
                    <p className="text-sm text-gray-500">
                      {formatRelativeTime(proposal.created)}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    proposal.status === 'generated'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {proposal.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig = {
    prospect: { label: 'Prospect', color: 'bg-gray-100 text-gray-800' },
    qualified: { label: 'Qualified', color: 'bg-blue-100 text-blue-800' },
    proposal: { label: 'Proposal', color: 'bg-purple-100 text-purple-800' },
    negotiation: { label: 'Negotiation', color: 'bg-yellow-100 text-yellow-800' },
    won: { label: 'Won', color: 'bg-green-100 text-green-800' },
    lost: { label: 'Lost', color: 'bg-red-100 text-red-800' },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.prospect;

  return (
    <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}
