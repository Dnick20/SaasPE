'use client';

import { ArrowLeft, Sparkles, FileText, Download, CheckCircle, Loader2, Trophy, Trash2, UserPlus, Wand2, Link2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transcriptionsApi } from '@/lib/api/endpoints/transcriptions';
import { clientsApi } from '@/lib/api/endpoints/clients';
import { formatRelativeTime } from '@/lib/utils';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { AxiosError } from 'axios';

interface TranscriptionDetailPageProps {
  params: { id: string };
}

export default function TranscriptionDetailPage({ params }: TranscriptionDetailPageProps) {
  const { id } = params;
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: transcription, isLoading, error } = useQuery({
    queryKey: ['transcription', id],
    queryFn: () => transcriptionsApi.getOne(id),
  });

  const handleCreateProposal = () => {
    // Navigate to the proposal creation page with transcription info pre-filled
    const clientId = transcription?.client?.id || '';
    const params = new URLSearchParams({
      transcriptionId: id,
      ...(clientId && { clientId }),
    });
    router.push(`/dashboard/proposals/new?${params.toString()}`);
  };

  const updateLearningMutation = useMutation({
    mutationFn: (data: { wonBusiness?: boolean; isExample?: boolean }) =>
      transcriptionsApi.updateLearning(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transcription', id] });
      toast.success('Updated successfully');
    },
    onError: (error) => {
      const message = error instanceof AxiosError
        ? error.response?.data?.message || 'Failed to update'
        : 'Failed to update';
      toast.error(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => transcriptionsApi.delete(id),
    onSuccess: () => {
      toast.success('Transcription deleted successfully');
      router.push('/dashboard/transcriptions');
    },
    onError: (error) => {
      const message = error instanceof AxiosError
        ? error.response?.data?.message || 'Failed to delete transcription'
        : 'Failed to delete transcription';
      toast.error(message);
    },
  });

  const createClientMutation = useMutation({
    mutationFn: async (clientData: {
      companyName: string;
      industry?: string;
      website?: string;
      budgetNote?: string;
      timelineNote?: string;
      status?: 'prospect' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
      hubspotDealId?: string;
      contactFirstName?: string;
      contactLastName?: string;
      contactEmail?: string;
      contactPhone?: string;
      contactLinkedIn?: string;
      additionalContacts?: any;
      problemStatement?: string;
      currentTools?: string[];
      deliverablesLogistics?: string;
      keyMeetingsSchedule?: string;
    }) => {
      const client = await clientsApi.create(clientData);
      await transcriptionsApi.associateClient(id, client.id);
      return client;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transcription', id] });
      toast.success('Client created and associated successfully');
      setShowCreateClientDialog(false);
      // Reset form and provenance
      setClientFormData({
        companyName: '',
        industry: '',
        website: '',
        budgetNote: '',
        timelineNote: '',
        status: 'prospect',
        hubspotDealId: '',
        contactFirstName: '',
        contactLastName: '',
        contactEmail: '',
        contactPhone: '',
        contactLinkedIn: '',
        additionalContacts: [],
        problemStatement: '',
        currentToolsSystemsCsv: '',
        deliverablesLogistics: '',
        keyMeetingsSchedule: '',
      });
      setProvenanceData(null);
    },
    onError: (error) => {
      const message = error instanceof AxiosError
        ? error.response?.data?.message || 'Failed to create client'
        : 'Failed to create client';
      toast.error(message);
    },
  });

  const [showCreateClientDialog, setShowCreateClientDialog] = useState(false);
  const [showSelectClientDialog, setShowSelectClientDialog] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [clientFormData, setClientFormData] = useState({
    // Company info
    companyName: '',
    industry: '',
    website: '',
    budgetNote: '',
    timelineNote: '',
    status: 'prospect' as 'prospect' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost',
    hubspotDealId: '',
    // Primary contact
    contactFirstName: '',
    contactLastName: '',
    contactEmail: '',
    contactPhone: '',
    contactLinkedIn: '',
    // Alt contacts
    additionalContacts: [] as Array<{
      role_or_note: string;
      first_name: string;
      last_name: string;
      email: string;
    }>,
    // Business details
    problemStatement: '',
    currentToolsSystemsCsv: '',
    deliverablesLogistics: '',
    keyMeetingsSchedule: '',
  });

  // Provenance data from extraction (display only)
  const [provenanceData, setProvenanceData] = useState<{
    transcript_date: string;
    confidence_notes: string;
    missing_fields: string[];
  } | null>(null);
  const [isExtractingClientInfo, setIsExtractingClientInfo] = useState(false);

  // Fetch all clients for selection
  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.getAll(1, 100), // Fetch first 100 clients
  });

  // Associate selected client mutation
  const associateClientMutation = useMutation({
    mutationFn: (clientId: string) => transcriptionsApi.associateClient(id, clientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transcription', id] });
      toast.success('Client associated successfully');
      setShowSelectClientDialog(false);
      setSelectedClientId('');
    },
    onError: (error) => {
      const message = error instanceof AxiosError
        ? error.response?.data?.message || 'Failed to associate client'
        : 'Failed to associate client';
      toast.error(message);
    },
  });

  const extractClientInfoMutation = useMutation({
    mutationFn: () => transcriptionsApi.extractClientInfo(id),
    onSuccess: (data) => {
      // Update form with extracted LeadIntake data
      setClientFormData({
        // Company info
        companyName: data.company?.name || '',
        industry: data.company?.industry || '',
        website: data.company?.website || '',
        budgetNote: data.company?.budget_note || '',
        timelineNote: data.company?.timeline_note || '',
        status: (data.company?.status?.toLowerCase() || 'prospect') as any,
        hubspotDealId: data.company?.hubspot_deal_id || '',
        // Primary contact
        contactFirstName: data.primary_contact?.first_name || '',
        contactLastName: data.primary_contact?.last_name || '',
        contactEmail: data.primary_contact?.email || '',
        contactPhone: data.primary_contact?.phone || '',
        contactLinkedIn: data.primary_contact?.linkedin_url || '',
        // Alt contacts
        additionalContacts: data.alt_contacts || [],
        // Business details
        problemStatement: data.business_details?.problem_statement || '',
        currentToolsSystemsCsv: data.business_details?.current_tools_systems_csv || '',
        deliverablesLogistics: data.business_details?.deliverables_logistics || '',
        keyMeetingsSchedule: data.business_details?.key_meetings_schedule || '',
      });

      // Store provenance data
      if (data.provenance) {
        setProvenanceData({
          transcript_date: data.provenance.transcript_date || '',
          confidence_notes: data.provenance.confidence_notes || '',
          missing_fields: data.provenance.missing_fields || [],
        });
      }

      toast.success('Client info extracted successfully from transcript');
      setIsExtractingClientInfo(false);
    },
    onError: (error) => {
      const message = error instanceof AxiosError
        ? error.response?.data?.message || 'Failed to extract client info'
        : 'Failed to extract client info';
      toast.error(message);
      setIsExtractingClientInfo(false);
    },
  });

  const handleAutoFill = async () => {
    setIsExtractingClientInfo(true);
    extractClientInfoMutation.mutate();
  };

  const analyzeMutation = useMutation({
    mutationFn: () => transcriptionsApi.analyze(id),
    onSuccess: () => {
      toast.success('Analysis started! This may take a few minutes...');
      queryClient.invalidateQueries({ queryKey: ['transcription', id] });
    },
    onError: (error) => {
      const message = error instanceof AxiosError
        ? error.response?.data?.message || 'Failed to start analysis'
        : 'Failed to start analysis';
      toast.error(message);
    },
  });

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this transcription? This action cannot be undone.')) {
      deleteMutation.mutate();
    }
  };

  const handleExportTranscript = () => {
    if (!transcription?.transcript) {
      toast.error('No transcript available to export');
      return;
    }

    // Create a blob with the transcript content
    const blob = new Blob([transcription.transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    // Create a download link and trigger it
    const link = document.createElement('a');
    link.href = url;
    link.download = `${transcription.fileName.replace(/\.[^/.]+$/, '')}_transcript.txt`;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Transcript exported successfully');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading transcription...</p>
      </div>
    );
  }

  if (error || !transcription) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-600">Error loading transcription</p>
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
            onClick={() => router.push('/dashboard/transcriptions')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{transcription.fileName}</h1>
            <p className="text-gray-500 mt-1">
              Uploaded {formatRelativeTime(transcription.created)}
              {transcription.client && ` • ${transcription.client.companyName}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
          <StatusBadge status={transcription.status} />
        </div>
      </div>

      {/* Action Buttons */}
      {transcription.status === 'completed' && transcription.transcript && (
        <div className="flex gap-3">
          {!transcription.client && (
            <Dialog open={showCreateClientDialog} onOpenChange={setShowCreateClientDialog}>
              <DialogTrigger asChild>
                <Button variant="default" className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Create Client from Transcription
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Client from Transcription</DialogTitle>
                </DialogHeader>

                {/* Auto-fill button */}
                <div className="flex justify-end mb-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAutoFill}
                    disabled={isExtractingClientInfo}
                    className="gap-2"
                  >
                    {isExtractingClientInfo ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Extracting...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4" />
                        Auto-Fill from Transcript
                      </>
                    )}
                  </Button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();

                    // Convert CSV string to array for currentTools
                    const currentToolsArray = clientFormData.currentToolsSystemsCsv
                      ? clientFormData.currentToolsSystemsCsv.split(',').map(t => t.trim()).filter(Boolean)
                      : undefined;

                    createClientMutation.mutate({
                      companyName: clientFormData.companyName,
                      industry: clientFormData.industry || undefined,
                      website: clientFormData.website || undefined,
                      budgetNote: clientFormData.budgetNote || undefined,
                      timelineNote: clientFormData.timelineNote || undefined,
                      status: clientFormData.status,
                      hubspotDealId: clientFormData.hubspotDealId || undefined,
                      contactFirstName: clientFormData.contactFirstName || undefined,
                      contactLastName: clientFormData.contactLastName || undefined,
                      contactEmail: clientFormData.contactEmail || undefined,
                      contactPhone: clientFormData.contactPhone || undefined,
                      contactLinkedIn: clientFormData.contactLinkedIn || undefined,
                      additionalContacts: clientFormData.additionalContacts.length > 0
                        ? clientFormData.additionalContacts
                        : undefined,
                      problemStatement: clientFormData.problemStatement || undefined,
                      currentTools: currentToolsArray,
                      deliverablesLogistics: clientFormData.deliverablesLogistics || undefined,
                      keyMeetingsSchedule: clientFormData.keyMeetingsSchedule || undefined,
                    });
                  }}
                  className="space-y-6"
                >
                  {/* Provenance Section - Display Missing Fields */}
                  {provenanceData && provenanceData.missing_fields.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-amber-900 mb-2">
                        Missing Information
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {provenanceData.missing_fields.map((field, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 text-xs bg-amber-100 text-amber-800 rounded"
                          >
                            {field}
                          </span>
                        ))}
                      </div>
                      {provenanceData.confidence_notes && (
                        <p className="text-xs text-amber-700 mt-2">
                          Note: {provenanceData.confidence_notes}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Company Information Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                      Company Information
                    </h3>

                    <div>
                      <Label htmlFor="companyName">Company Name *</Label>
                      <Input
                        id="companyName"
                        value={clientFormData.companyName}
                        onChange={(e) => setClientFormData({ ...clientFormData, companyName: e.target.value })}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="industry">Industry</Label>
                        <Input
                          id="industry"
                          value={clientFormData.industry}
                          onChange={(e) => setClientFormData({ ...clientFormData, industry: e.target.value })}
                          placeholder="e.g., Sales efficiency, Technology"
                        />
                      </div>
                      <div>
                        <Label htmlFor="website">Website</Label>
                        <Input
                          id="website"
                          type="url"
                          value={clientFormData.website}
                          onChange={(e) => setClientFormData({ ...clientFormData, website: e.target.value })}
                          placeholder="https://example.com"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="status">Status</Label>
                        <Select
                          value={clientFormData.status}
                          onValueChange={(value: any) => setClientFormData({ ...clientFormData, status: value })}
                        >
                          <SelectTrigger id="status">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="prospect">Prospect</SelectItem>
                            <SelectItem value="qualified">Qualified</SelectItem>
                            <SelectItem value="proposal">Proposal</SelectItem>
                            <SelectItem value="negotiation">Negotiation</SelectItem>
                            <SelectItem value="won">Won</SelectItem>
                            <SelectItem value="lost">Lost</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="hubspotDealId">HubSpot Deal ID</Label>
                        <Input
                          id="hubspotDealId"
                          value={clientFormData.hubspotDealId}
                          onChange={(e) => setClientFormData({ ...clientFormData, hubspotDealId: e.target.value })}
                          placeholder="Optional"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="budgetNote">Budget Note</Label>
                      <Textarea
                        id="budgetNote"
                        value={clientFormData.budgetNote}
                        onChange={(e) => setClientFormData({ ...clientFormData, budgetNote: e.target.value })}
                        placeholder="e.g., Clay $800/mo + 20 hours"
                        rows={2}
                      />
                    </div>

                    <div>
                      <Label htmlFor="timelineNote">Timeline Note</Label>
                      <Textarea
                        id="timelineNote"
                        value={clientFormData.timelineNote}
                        onChange={(e) => setClientFormData({ ...clientFormData, timelineNote: e.target.value })}
                        placeholder="e.g., Complete project by Q2 2025"
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* Primary Contact Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                      Primary Contact
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="contactFirstName">First Name</Label>
                        <Input
                          id="contactFirstName"
                          value={clientFormData.contactFirstName}
                          onChange={(e) => setClientFormData({ ...clientFormData, contactFirstName: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="contactLastName">Last Name</Label>
                        <Input
                          id="contactLastName"
                          value={clientFormData.contactLastName}
                          onChange={(e) => setClientFormData({ ...clientFormData, contactLastName: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="contactEmail">Email</Label>
                        <Input
                          id="contactEmail"
                          type="email"
                          value={clientFormData.contactEmail}
                          onChange={(e) => setClientFormData({ ...clientFormData, contactEmail: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="contactPhone">Phone</Label>
                        <Input
                          id="contactPhone"
                          value={clientFormData.contactPhone}
                          onChange={(e) => setClientFormData({ ...clientFormData, contactPhone: e.target.value })}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="contactLinkedIn">LinkedIn URL</Label>
                      <Input
                        id="contactLinkedIn"
                        type="url"
                        value={clientFormData.contactLinkedIn}
                        onChange={(e) => setClientFormData({ ...clientFormData, contactLinkedIn: e.target.value })}
                        placeholder="https://linkedin.com/in/username"
                      />
                    </div>
                  </div>

                  {/* Alternative Contacts Section */}
                  {clientFormData.additionalContacts.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                        Additional Contacts ({clientFormData.additionalContacts.length})
                      </h3>
                      <div className="space-y-3">
                        {clientFormData.additionalContacts.map((contact, idx) => (
                          <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-gray-600">Role:</span>{' '}
                                <span className="font-medium">{contact.role_or_note || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Name:</span>{' '}
                                <span className="font-medium">
                                  {contact.first_name} {contact.last_name}
                                </span>
                              </div>
                              {contact.email && (
                                <div className="col-span-2">
                                  <span className="text-gray-600">Email:</span>{' '}
                                  <span className="font-medium">{contact.email}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Business Details Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                      Business Details
                    </h3>

                    <div>
                      <Label htmlFor="problemStatement">Problem Statement</Label>
                      <Textarea
                        id="problemStatement"
                        value={clientFormData.problemStatement}
                        onChange={(e) => setClientFormData({ ...clientFormData, problemStatement: e.target.value })}
                        placeholder="2-4 sentences summarizing the main business challenge or goal"
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="currentTools">Current Tools & Systems</Label>
                      <Input
                        id="currentTools"
                        value={clientFormData.currentToolsSystemsCsv}
                        onChange={(e) => setClientFormData({ ...clientFormData, currentToolsSystemsCsv: e.target.value })}
                        placeholder="e.g., Salesforce, HubSpot, Gmail (comma-separated)"
                      />
                    </div>

                    <div>
                      <Label htmlFor="deliverables">Deliverables & Logistics</Label>
                      <Textarea
                        id="deliverables"
                        value={clientFormData.deliverablesLogistics}
                        onChange={(e) => setClientFormData({ ...clientFormData, deliverablesLogistics: e.target.value })}
                        placeholder="Describe who sends what, file formats, workflows, etc."
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="meetings">Key Meetings Schedule</Label>
                      <Textarea
                        id="meetings"
                        value={clientFormData.keyMeetingsSchedule}
                        onChange={(e) => setClientFormData({ ...clientFormData, keyMeetingsSchedule: e.target.value })}
                        placeholder="e.g., • Weekly sync: Mondays 10am EST"
                        rows={3}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCreateClientDialog(false)}
                      disabled={createClientMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createClientMutation.isPending}>
                      {createClientMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Creating...
                        </>
                      ) : (
                        'Create Client'
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
          {!transcription.client && (
            <Dialog open={showSelectClientDialog} onOpenChange={setShowSelectClientDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Link2 className="h-4 w-4" />
                  Link Existing Client
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Link Existing Client</DialogTitle>
                </DialogHeader>

                {clientsData && clientsData.data.length > 0 ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="client-select">Select Client</Label>
                      <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                        <SelectTrigger id="client-select">
                          <SelectValue placeholder="Choose a client..." />
                        </SelectTrigger>
                        <SelectContent>
                          {clientsData.data.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.companyName}
                              {client.contactFirstName && ` - ${client.contactFirstName} ${client.contactLastName || ''}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowSelectClientDialog(false);
                          setSelectedClientId('');
                        }}
                        disabled={associateClientMutation.isPending}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => {
                          if (selectedClientId) {
                            associateClientMutation.mutate(selectedClientId);
                          }
                        }}
                        disabled={!selectedClientId || associateClientMutation.isPending}
                      >
                        {associateClientMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Linking...
                          </>
                        ) : (
                          'Link Client'
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      No clients found. You need to create a client first before you can link one to this transcription.
                    </p>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowSelectClientDialog(false)}
                      >
                        Close
                      </Button>
                      <Button
                        onClick={() => {
                          setShowSelectClientDialog(false);
                          setShowCreateClientDialog(true);
                        }}
                      >
                        Create New Client
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          )}
          <Button
            className="gap-2"
            onClick={handleCreateProposal}
          >
            <FileText className="h-4 w-4" />
            Create Proposal
          </Button>
          {!transcription.analyzed && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => analyzeMutation.mutate()}
              disabled={analyzeMutation.isPending}
            >
              {analyzeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Analyze Transcript
                </>
              )}
            </Button>
          )}
          <Button variant="outline" className="gap-2" onClick={handleExportTranscript}>
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      )}

      {/* Transcript Card */}
      {transcription.transcript && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Full Transcript
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {transcription.transcript}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Analysis Results */}
      {transcription.analyzed && transcription.extractedData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              AI Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {transcription.extractedData.problemStatement && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Problem Statement</h3>
                <p className="text-gray-700">{transcription.extractedData.problemStatement}</p>
              </div>
            )}

            {transcription.extractedData.budget && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Budget</h3>
                <p className="text-gray-700">
                  {transcription.extractedData.budget.min && transcription.extractedData.budget.max ? (
                    <>
                      {transcription.extractedData.budget.currency ?? 'USD'}{' '}
                      {transcription.extractedData.budget.min.toLocaleString()} -{' '}
                      {transcription.extractedData.budget.max.toLocaleString()}
                    </>
                  ) : (
                    transcription.extractedData.budget.currency ?? 'Not specified'
                  )}
                </p>
              </div>
            )}

            {transcription.extractedData.timeline && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Timeline</h3>
                <p className="text-gray-700">{transcription.extractedData.timeline}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* File Info */}
      <Card>
        <CardHeader>
          <CardTitle>File Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-500">File Size</span>
            <span className="font-medium">{(transcription.fileSize / (1024 * 1024)).toFixed(2)} MB</span>
          </div>
          {transcription.duration && (
            <div className="flex justify-between">
              <span className="text-gray-500">Duration</span>
              <span className="font-medium">{transcription.duration}s</span>
            </div>
          )}
          {transcription.language && (
            <div className="flex justify-between">
              <span className="text-gray-500">Language</span>
              <span className="font-medium">{transcription.language}</span>
            </div>
          )}
          {transcription.confidence && (
            <div className="flex justify-between">
              <span className="text-gray-500">Confidence</span>
              <span className="font-medium">{(transcription.confidence * 100).toFixed(1)}%</span>
            </div>
          )}
          <div className="pt-3 border-t mt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-600" />
                <Label htmlFor="won-business" className="text-gray-700 font-medium cursor-pointer">
                  Won Business
                </Label>
              </div>
              <Switch
                id="won-business"
                checked={transcription.wonBusiness}
                onCheckedChange={(checked) =>
                  updateLearningMutation.mutate({ wonBusiness: checked })
                }
                disabled={updateLearningMutation.isPending}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Mark this transcription if it led to won business for ML learning
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig = {
    uploading: { label: 'Uploading', color: 'bg-blue-100 text-blue-800' },
    processing: { label: 'Processing', color: 'bg-yellow-100 text-yellow-800' },
    completed: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    failed: { label: 'Failed', color: 'bg-red-100 text-red-800' },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.processing;
  const Icon = 'icon' in config ? config.icon : undefined;

  return (
    <span className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 ${config.color}`}>
      {Icon && <Icon className="h-4 w-4" />}
      {config.label}
    </span>
  );
}
