'use client';

import { useRouter } from 'next/navigation';
import { Plus, BookOpen, Trash2, Mail, MessageSquare, Phone, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePlaybooks, useDeletePlaybook } from '@/lib/hooks/usePlaybooks';
import { formatRelativeTime } from '@/lib/utils';
import { toast } from 'sonner';

export default function PlaybooksPage() {
  const router = useRouter();
  const { data: playbooks, isLoading, error } = usePlaybooks();
  const deletePlaybook = useDeletePlaybook();

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this playbook?')) {
      return;
    }

    try {
      await deletePlaybook.mutateAsync(id);
      toast.success('Playbook deleted successfully');
    } catch (error) {
      toast.error('Failed to delete playbook');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading playbooks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-600">Error loading playbooks</p>
      </div>
    );
  }

  const hasPlaybooks = playbooks && playbooks.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Playbooks</h1>
          <p className="text-gray-500 mt-1">
            Manage your campaign playbooks and outreach scripts
          </p>
        </div>
        <Button className="gap-2" onClick={() => router.push('/dashboard/clients')}>
          <Plus className="h-4 w-4" />
          Create Playbook
        </Button>
      </div>

      {!hasPlaybooks ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No playbooks yet
            </h3>
            <p className="text-sm text-gray-500 mb-4 text-center max-w-sm">
              Create your first playbook to generate AI-powered scripts and campaign strategies for your clients.
            </p>
            <Button className="gap-2" onClick={() => router.push('/dashboard/clients')}>
              <Plus className="h-4 w-4" />
              Create Your First Playbook
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {playbooks.map((playbook) => (
            <Card
              key={playbook.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/dashboard/playbooks/${playbook.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <BookOpen className="h-5 w-5 text-blue-600 mt-1" />
                    <div>
                      <CardTitle className="text-lg">
                        {playbook.targetICP.industry || 'General'} Playbook
                      </CardTitle>
                      <p className="text-sm text-gray-500 mt-1">
                        {playbook.tone.charAt(0).toUpperCase() + playbook.tone.slice(1)} tone
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleDelete(playbook.id, e)}
                    disabled={deletePlaybook.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Target Audience */}
                  {playbook.targetICP.roles && playbook.targetICP.roles.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Target Roles</p>
                      <div className="flex flex-wrap gap-1">
                        {playbook.targetICP.roles.slice(0, 3).map((role, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full"
                          >
                            {role}
                          </span>
                        ))}
                        {playbook.targetICP.roles.length > 3 && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                            +{playbook.targetICP.roles.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Scripts Available */}
                  <div className="flex items-center gap-4 text-xs text-gray-600 pt-3 border-t">
                    <div className="flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      <span>Email</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>LinkedIn</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      <span>Cold Call</span>
                    </div>
                  </div>

                  {/* Campaign Info */}
                  <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t">
                    <span>{playbook.campaignCount} campaign(s)</span>
                    <span>{playbook.ctas.length} CTAs</span>
                  </div>

                  {/* Documents */}
                  {(playbook.googleDocUrl || playbook.pdfUrl) && (
                    <div className="flex items-center gap-2 text-xs text-gray-600 pt-3 border-t">
                      {playbook.googleDocUrl && (
                        <a
                          href={playbook.googleDocUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-blue-600 hover:underline"
                        >
                          Google Doc
                        </a>
                      )}
                      {playbook.pdfUrl && (
                        <a
                          href={playbook.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-blue-600 hover:underline"
                        >
                          PDF
                        </a>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Created {formatRelativeTime(playbook.created)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
