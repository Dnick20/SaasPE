'use client';

import { useState } from 'react';
import {
  Mail,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Clock,
  X,
  MessageSquare,
  Sparkles,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { repliesApi, type Reply } from '@/lib/api/endpoints/replies';
import { formatDistanceToNow } from 'date-fns';

export default function RepliesPage() {
  const queryClient = useQueryClient();
  const [selectedClassification, setSelectedClassification] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [selectedReply, setSelectedReply] = useState<Reply | null>(null);
  const [generatedResponse, setGeneratedResponse] = useState<string | null>(null);

  // Fetch replies
  const { data: replies, isLoading } = useQuery({
    queryKey: ['replies', page, selectedClassification],
    queryFn: () => repliesApi.getAll(page, 20, selectedClassification as any),
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['replies-stats'],
    queryFn: () => repliesApi.getStats(),
  });

  // Update classification mutation
  const updateClassificationMutation = useMutation({
    mutationFn: ({ id, classification }: { id: string; classification: any }) =>
      repliesApi.updateClassification(id, classification),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['replies'] });
      queryClient.invalidateQueries({ queryKey: ['replies-stats'] });
    },
  });

  // Generate response mutation
  const generateResponseMutation = useMutation({
    mutationFn: (id: string) => repliesApi.generateResponse(id),
    onSuccess: (data) => {
      setGeneratedResponse(data.suggestedResponse);
    },
  });

  // Batch classify mutation
  const batchClassifyMutation = useMutation({
    mutationFn: () => repliesApi.batchClassify(50),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['replies'] });
      queryClient.invalidateQueries({ queryKey: ['replies-stats'] });
    },
  });

  const getClassificationBadge = (classification?: string) => {
    const badges: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string; icon: any }> = {
      interested: { variant: 'default', label: 'Interested', icon: ThumbsUp },
      not_interested: { variant: 'secondary', label: 'Not Interested', icon: ThumbsDown },
      out_of_office: { variant: 'outline', label: 'Out of Office', icon: Clock },
      unsubscribe: { variant: 'destructive', label: 'Unsubscribe', icon: X },
    };

    if (!classification) {
      return <Badge variant="outline">Unclassified</Badge>;
    }

    const config = badges[classification] || { variant: 'outline' as const, label: classification, icon: MessageSquare };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reply Inbox</h1>
        <p className="text-gray-500 mt-1">
          Manage and respond to campaign replies
        </p>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Replies</CardTitle>
              <Mail className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Interested</CardTitle>
              <ThumbsUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.interested}</div>
              <p className="text-xs text-gray-500 mt-1">
                {stats.interestedRate}% interest rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Not Interested</CardTitle>
              <ThumbsDown className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.notInterested}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Out of Office</CardTitle>
              <Clock className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.outOfOffice}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Unclassified</CardTitle>
              <Filter className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.unclassified}</div>
              {stats.unclassified > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-7 text-xs"
                  onClick={() => batchClassifyMutation.mutate()}
                  disabled={batchClassifyMutation.isPending}
                >
                  {batchClassifyMutation.isPending ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      Classifying...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3 mr-1" />
                      Auto-classify
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Tabs value={selectedClassification || 'all'} onValueChange={(v) => setSelectedClassification(v === 'all' ? undefined : v)}>
        <TabsList>
          <TabsTrigger value="all">All Replies</TabsTrigger>
          <TabsTrigger value="interested">Interested</TabsTrigger>
          <TabsTrigger value="not_interested">Not Interested</TabsTrigger>
          <TabsTrigger value="out_of_office">Out of Office</TabsTrigger>
          <TabsTrigger value="unsubscribe">Unsubscribe</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Replies List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List Column */}
        <div className="lg:col-span-2 space-y-3">
          {!replies || replies.data.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                No replies found
              </CardContent>
            </Card>
          ) : (
            <>
              {replies.data.map((reply) => (
                <Card
                  key={reply.id}
                  className={`cursor-pointer transition-colors hover:border-blue-300 ${
                    selectedReply?.id === reply.id ? 'border-blue-500 bg-blue-50' : ''
                  }`}
                  onClick={() => {
                    setSelectedReply(reply);
                    setGeneratedResponse(null);
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900">
                            {reply.recipientName || reply.recipientEmail}
                          </span>
                          {getClassificationBadge(reply.replyClassification)}
                        </div>
                        {reply.Contact?.company && (
                          <p className="text-sm text-gray-500">{reply.Contact.company}</p>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 text-right">
                        {reply.repliedAt && formatDistanceToNow(new Date(reply.repliedAt), { addSuffix: true })}
                      </div>
                    </div>

                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Re: {reply.subject}
                    </p>

                    <p className="text-sm text-gray-600 line-clamp-2">
                      {reply.replyBody}
                    </p>

                    <div className="mt-2 text-xs text-gray-500">
                      Campaign: {reply.campaign.name}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Pagination */}
              {replies.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-gray-600">
                    Page {replies.pagination.page} of {replies.pagination.totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((prev) => Math.min(replies.pagination.totalPages, prev + 1))}
                      disabled={page === replies.pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Detail Column */}
        <div className="lg:col-span-1">
          {selectedReply ? (
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="text-lg">Reply Details</CardTitle>
                <CardDescription>
                  {selectedReply.recipientName || selectedReply.recipientEmail}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Contact Info */}
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Contact</p>
                  <p className="text-sm">{selectedReply.recipientEmail}</p>
                  {selectedReply.Contact?.company && (
                    <p className="text-sm text-gray-500">{selectedReply.Contact.company}</p>
                  )}
                </div>

                {/* Campaign */}
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Campaign</p>
                  <p className="text-sm">{selectedReply.campaign.name}</p>
                </div>

                {/* Original Subject */}
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Original Subject</p>
                  <p className="text-sm">{selectedReply.subject}</p>
                </div>

                {/* Reply Body */}
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Reply</p>
                  <div className="p-3 bg-gray-50 rounded border text-sm whitespace-pre-wrap">
                    {selectedReply.replyBody}
                  </div>
                </div>

                {/* Classification */}
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Classification</p>
                  <div className="flex flex-wrap gap-2">
                    {['interested', 'not_interested', 'out_of_office', 'unsubscribe'].map((classification) => (
                      <Button
                        key={classification}
                        variant={selectedReply.replyClassification === classification ? 'default' : 'outline'}
                        size="sm"
                        onClick={() =>
                          updateClassificationMutation.mutate({
                            id: selectedReply.id,
                            classification: classification as any,
                          })
                        }
                        disabled={updateClassificationMutation.isPending}
                      >
                        {classification.replace('_', ' ')}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* AI Response Generator */}
                <div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => generateResponseMutation.mutate(selectedReply.id)}
                    disabled={generateResponseMutation.isPending}
                  >
                    {generateResponseMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate AI Response
                      </>
                    )}
                  </Button>
                </div>

                {/* Generated Response */}
                {generatedResponse && (
                  <Alert className="bg-blue-50 border-blue-200">
                    <Sparkles className="h-4 w-4 text-blue-600" />
                    <AlertDescription>
                      <p className="text-sm font-medium text-blue-900 mb-2">Suggested Response:</p>
                      <div className="text-sm text-blue-800 whitespace-pre-wrap">
                        {generatedResponse}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2"
                        onClick={() => {
                          navigator.clipboard.writeText(generatedResponse);
                        }}
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Copy to Clipboard
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                Select a reply to view details
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
