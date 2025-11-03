'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Upload, FileAudio, Trash2, Sparkles, FileText, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranscriptions } from '@/lib/hooks/useTranscriptions';
import { formatRelativeTime } from '@/lib/utils';
import { UploadTranscriptionModal } from '@/components/transcriptions/upload-modal';
import { useCustomerJourney } from '@/lib/journey/use-customer-journey';
import { JourneyActionPanel } from '@/components/journey/JourneyActionPanel';

export default function TranscriptionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const journey = useCustomerJourney();
  const [page, setPage] = useState(1);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const { data, isLoading, error } = useTranscriptions(page, 20);

  // Auto-open upload modal if coming from discovery
  useEffect(() => {
    const fromDiscovery = searchParams.get('fromDiscovery') === 'true';
    if (fromDiscovery) {
      setUploadModalOpen(true);
    }
  }, [searchParams]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading transcriptions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-600">Error loading transcriptions</p>
      </div>
    );
  }

  const transcriptions = data?.data || [];
  const hasTranscriptions = transcriptions.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transcriptions</h1>
          <p className="text-gray-500 mt-1">
            Upload and analyze client meeting recordings
          </p>
        </div>
        <Button className="gap-2" onClick={() => setUploadModalOpen(true)}>
          <Upload className="h-4 w-4" />
          Upload Recording
        </Button>
      </div>

      {!hasTranscriptions ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileAudio className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No transcriptions yet
            </h3>
            <p className="text-sm text-gray-500 mb-4 text-center max-w-sm">
              Upload your first client meeting recording to get started with AI-powered transcription and analysis.
            </p>
            <Button className="gap-2" onClick={() => setUploadModalOpen(true)}>
              <Upload className="h-4 w-4" />
              Upload Your First Recording
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {transcriptions.map((transcription) => (
            <Card
              key={transcription.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/dashboard/transcriptions/${transcription.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <FileAudio className="h-5 w-5 text-blue-600 mt-1" />
                    <div>
                      <CardTitle className="text-lg">{transcription.fileName}</CardTitle>
                      <p className="text-sm text-gray-500 mt-1">
                        Uploaded {formatRelativeTime(transcription.created)}
                        {transcription.client && ` • ${transcription.client.companyName}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={transcription.status} />
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
              {transcription.transcript && (
                <CardContent>
                  <p className="text-sm text-gray-700 line-clamp-3">
                    {transcription.transcript}
                  </p>
                  {transcription.analyzed && transcription.extractedData && (
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <Sparkles className="h-4 w-4" />
                        <span>AI analysis complete</span>
                      </div>

                      {/* Action buttons for analyzed transcriptions */}
                      <div className="flex gap-2 pt-3 border-t">
                        {!transcription.client && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dashboard/clients/new?transcriptionId=${transcription.id}`);
                            }}
                          >
                            <Users className="h-4 w-4" />
                            Create Client
                          </Button>
                        )}
                        {transcription.client && (
                          <Button
                            size="sm"
                            className="gap-2 bg-blue-600 hover:bg-blue-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dashboard/proposals/new?clientId=${transcription.client?.id}&transcriptionId=${transcription.id}`);
                            }}
                          >
                            <FileText className="h-4 w-4" />
                            Generate Proposal
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
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

      <UploadTranscriptionModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig = {
    uploading: { label: 'Uploading', color: 'bg-blue-100 text-blue-800' },
    processing: { label: 'Processing', color: 'bg-yellow-100 text-yellow-800' },
    completed: { label: 'Completed', color: 'bg-green-100 text-green-800' },
    failed: { label: 'Failed', color: 'bg-red-100 text-red-800' },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.processing;

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}
