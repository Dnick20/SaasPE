'use client';

import { ArrowLeft, Edit, Trash2, BookOpen, Mail, MessageSquare, Phone, Loader2, Download, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePlaybook, useDeletePlaybook } from '@/lib/hooks/usePlaybooks';
import { formatRelativeTime } from '@/lib/utils';
import { toast } from 'sonner';

interface PlaybookDetailPageProps {
  params: { id: string };
}

export default function PlaybookDetailPage({ params }: PlaybookDetailPageProps) {
  const { id } = params;
  const router = useRouter();

  const { data: playbook, isLoading, error } = usePlaybook(id);
  const deleteMutation = useDeletePlaybook();

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this playbook? This action cannot be undone.')) {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          toast.success('Playbook deleted successfully');
          router.push('/dashboard/playbooks');
        },
        onError: () => {
          toast.error('Failed to delete playbook');
        },
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !playbook) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-600">Error loading playbook</p>
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
            onClick={() => router.push('/dashboard/playbooks')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {playbook.targetICP.industry || 'General'} Playbook
            </h1>
            <p className="text-gray-500 mt-1">
              Created {formatRelativeTime(playbook.created)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {playbook.googleDocUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(playbook.googleDocUrl, '_blank')}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Google Doc
            </Button>
          )}
          {playbook.pdfUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(playbook.pdfUrl, '_blank')}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              PDF
            </Button>
          )}
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
        </div>
      </div>

      {/* ICP Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            Target ICP
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {playbook.targetICP.industry && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Industry</h3>
                <p className="text-gray-900">{playbook.targetICP.industry}</p>
              </div>
            )}
            {playbook.targetICP.companySize && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Company Size</h3>
                <p className="text-gray-900">{playbook.targetICP.companySize}</p>
              </div>
            )}
            {playbook.targetICP.roles && playbook.targetICP.roles.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Target Roles</h3>
                <div className="flex flex-wrap gap-2">
                  {playbook.targetICP.roles.map((role, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {playbook.targetICP.painPoints && playbook.targetICP.painPoints.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Pain Points</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  {playbook.targetICP.painPoints.map((point, idx) => (
                    <li key={idx} className="text-sm">{point}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Campaign Strategy */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Strategy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Tone</h3>
              <p className="text-gray-900 capitalize">{playbook.tone}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Campaign Count</h3>
              <p className="text-gray-900">{playbook.campaignCount}</p>
            </div>
            {playbook.ctas && playbook.ctas.length > 0 && (
              <div className="md:col-span-3">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Call-to-Actions</h3>
                <div className="flex flex-wrap gap-2">
                  {playbook.ctas.map((cta, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full"
                    >
                      {cta}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {playbook.campaignStrategy.channels && playbook.campaignStrategy.channels.length > 0 && (
              <div className="md:col-span-3">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Channels</h3>
                <div className="flex flex-wrap gap-2">
                  {playbook.campaignStrategy.channels.map((channel: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full"
                    >
                      {channel}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Scripts */}
      <Card>
        <CardHeader>
          <CardTitle>Outreach Scripts</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="email" className="gap-2">
                <Mail className="h-4 w-4" />
                Email
              </TabsTrigger>
              <TabsTrigger value="linkedin" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                LinkedIn
              </TabsTrigger>
              <TabsTrigger value="coldcall" className="gap-2">
                <Phone className="h-4 w-4" />
                Cold Call
              </TabsTrigger>
            </TabsList>

            {/* Email Script */}
            <TabsContent value="email" className="space-y-4 mt-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Subject Line</h3>
                <div className="p-3 bg-gray-50 rounded-md">
                  <p className="text-gray-900">{playbook.emailScript.subject}</p>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Email Body</h3>
                <div className="p-3 bg-gray-50 rounded-md whitespace-pre-wrap">
                  <p className="text-gray-900">{playbook.emailScript.body}</p>
                </div>
              </div>
              {playbook.emailScript.variants && playbook.emailScript.variants.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Variants</h3>
                  <div className="space-y-2">
                    {playbook.emailScript.variants.map((variant, idx) => (
                      <div key={idx} className="p-3 bg-blue-50 rounded-md">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{variant}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {playbook.emailScript.followUps && playbook.emailScript.followUps.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Follow-ups</h3>
                  <div className="space-y-2">
                    {playbook.emailScript.followUps.map((followup, idx) => (
                      <div key={idx} className="p-3 bg-green-50 rounded-md">
                        <p className="text-xs font-medium text-green-700 mb-1">Follow-up {idx + 1}</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{followup}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* LinkedIn Script */}
            <TabsContent value="linkedin" className="space-y-4 mt-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Connection Request</h3>
                <div className="p-3 bg-gray-50 rounded-md">
                  <p className="text-gray-900 whitespace-pre-wrap">{playbook.linkedInScript.connectionRequest}</p>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">InMail Message</h3>
                <div className="p-3 bg-gray-50 rounded-md">
                  <p className="text-gray-900 whitespace-pre-wrap">{playbook.linkedInScript.inMail}</p>
                </div>
              </div>
              {playbook.linkedInScript.messageSequence && playbook.linkedInScript.messageSequence.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Message Sequence</h3>
                  <div className="space-y-2">
                    {playbook.linkedInScript.messageSequence.map((message, idx) => (
                      <div key={idx} className="p-3 bg-blue-50 rounded-md">
                        <p className="text-xs font-medium text-blue-700 mb-1">Message {idx + 1}</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Cold Call Script */}
            <TabsContent value="coldcall" className="space-y-4 mt-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Opener</h3>
                <div className="p-3 bg-gray-50 rounded-md">
                  <p className="text-gray-900 whitespace-pre-wrap">{playbook.coldCallScript.opener}</p>
                </div>
              </div>
              {playbook.coldCallScript.discovery && playbook.coldCallScript.discovery.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Discovery Questions</h3>
                  <ul className="space-y-2">
                    {playbook.coldCallScript.discovery.map((question, idx) => (
                      <li key={idx} className="p-3 bg-blue-50 rounded-md">
                        <p className="text-sm text-gray-700">{question}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {playbook.coldCallScript.objectionHandling && Object.keys(playbook.coldCallScript.objectionHandling).length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Objection Handling</h3>
                  <div className="space-y-2">
                    {Object.entries(playbook.coldCallScript.objectionHandling).map(([objection, response], idx) => (
                      <div key={idx} className="p-3 bg-yellow-50 rounded-md">
                        <p className="text-xs font-medium text-yellow-700 mb-1">Objection: {objection}</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{response}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Close</h3>
                <div className="p-3 bg-green-50 rounded-md">
                  <p className="text-gray-900 whitespace-pre-wrap">{playbook.coldCallScript.close}</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
