'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Users, Trash2, Building2, Mail, Phone, Globe, ArrowRight, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useClients } from '@/lib/hooks/useClients';
import { formatRelativeTime } from '@/lib/utils';
import { useCustomerJourney } from '@/lib/journey/use-customer-journey';
import { JourneyActionPanel } from '@/components/journey/JourneyActionPanel';

export default function ClientsPage() {
  const router = useRouter();
  const journey = useCustomerJourney();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const { data, isLoading, error } = useClients(page, 20, statusFilter);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading clients...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-600">Error loading clients</p>
      </div>
    );
  }

  const clients = data?.data || [];
  const hasClients = clients.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500 mt-1">
            Manage your client relationships and pipeline
          </p>
        </div>
        <div className="flex gap-2">
          {journey.currentStep === 'client' && !journey.isStepComplete('client') && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => router.push('/dashboard/transcriptions?fromDiscovery=true')}
            >
              <Upload className="h-4 w-4" />
              Upload Transcription
            </Button>
          )}
          <Button className="gap-2" onClick={() => router.push('/dashboard/clients/new')}>
            <Plus className="h-4 w-4" />
            Add Client
          </Button>
        </div>
      </div>

      {/* Journey Action Panel - Show if on client step */}
      {journey.currentStep === 'client' && !journey.isStepComplete('client') && !hasClients && (
        <JourneyActionPanel
          title="Create Your First Client"
          description="Upload a transcription to automatically create a client profile, or add client details manually"
          icon="👥"
          primaryAction={{
            label: 'Upload Transcription',
            onClick: () => router.push('/dashboard/transcriptions?fromDiscovery=true'),
          }}
          secondaryAction={{
            label: 'Add Manually',
            onClick: () => router.push('/dashboard/clients/new'),
          }}
        />
      )}

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={statusFilter === undefined ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter(undefined)}
        >
          All
        </Button>
        {['prospect', 'qualified', 'proposal', 'negotiation', 'won', 'lost'].map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(status)}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Button>
        ))}
      </div>

      {!hasClients ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No clients yet
            </h3>
            <p className="text-sm text-gray-500 mb-4 text-center max-w-sm">
              Add your first client to start tracking opportunities and building proposals.
            </p>
            <Button className="gap-2" onClick={() => router.push('/dashboard/clients/new')}>
              <Plus className="h-4 w-4" />
              Add Your First Client
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {clients.map((client) => (
            <Card
              key={client.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/dashboard/clients/${client.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Building2 className="h-5 w-5 text-blue-600 mt-1" />
                    <div>
                      <CardTitle className="text-lg">{client.companyName}</CardTitle>
                      <p className="text-sm text-gray-500 mt-1">
                        {client.industry || 'No industry specified'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={client.status} />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Implement delete
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {/* Contact Info */}
                  {(client.contactFirstName || client.contactLastName) && (
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Contact:</span>{' '}
                      {client.contactFirstName} {client.contactLastName}
                    </p>
                  )}
                  {client.contactEmail && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="h-3.5 w-3.5" />
                      <span>{client.contactEmail}</span>
                    </div>
                  )}
                  {client.contactPhone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-3.5 w-3.5" />
                      <span>{client.contactPhone}</span>
                    </div>
                  )}
                  {client.website && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Globe className="h-3.5 w-3.5" />
                      <a
                        href={client.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-600 hover:underline"
                      >
                        {client.website}
                      </a>
                    </div>
                  )}

                  {/* Problem Statement */}
                  {client.problemStatement && (
                    <p className="text-sm text-gray-700 line-clamp-2 mt-3 pt-3 border-t">
                      <span className="font-medium">Problem:</span> {client.problemStatement}
                    </p>
                  )}

                  {/* Related Data */}
                  {(client.transcriptions?.length || client.proposals?.length) && (
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-3 pt-3 border-t">
                      {client.transcriptions && client.transcriptions.length > 0 && (
                        <span>{client.transcriptions.length} transcription(s)</span>
                      )}
                      {client.proposals && client.proposals.length > 0 && (
                        <span>{client.proposals.length} proposal(s)</span>
                      )}
                    </div>
                  )}

                  {/* Continue Journey Button */}
                  <div className="mt-3 pt-3 border-t">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/proposals/new?clientId=${client.id}`);
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      size="sm"
                    >
                      Continue Journey
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>

                  <p className="text-xs text-gray-400 mt-2">
                    Created {formatRelativeTime(client.created)}
                  </p>
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
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}
