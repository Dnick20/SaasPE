// @ts-nocheck
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  FileText,
  AlertCircle,
  Lightbulb,
  Target,
  CheckSquare,
  Calendar,
  DollarSign,
  Save,
  Eye,
  Loader2,
  FileDown,
  Trash2,
  Download,
  Sparkles,
  RotateCw,
  Package,
  Wrench,
  CreditCard,
  XCircle
} from 'lucide-react';
import { PricingOptionsBuilder } from './pricing-options-builder';
import { pricingCatalogApi, PricingCatalogItem } from '@/lib/api/endpoints/pricingCatalog';
import { TimelineBuilder, TimelinePhase } from './TimelineBuilder';
import { proposalsApi } from '@/lib/api/endpoints/proposals';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { downloadPdfFromUrl } from '@/lib/download-helpers';
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

const phaseSchema = z.object({
  title: z.string().min(1),
  start: z.string().optional(),
  end: z.string().optional(),
  status: z.enum(['planned', 'in_progress', 'complete']).optional(),
  notes: z.string().optional(),
});

const proposalSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  executiveSummary: z.string().optional(),
  objectivesAndOutcomes: z.string().optional(),
  scopeOfWork: z.string().optional(),
  deliverables: z.string().optional(),
  approachAndTools: z.string().optional(),
  paymentTerms: z.string().optional(),
  cancellationNotice: z.string().optional(),
  timeline: z.union([z.string(), z.array(phaseSchema)]).optional(),
});

type ProposalFormData = z.infer<typeof proposalSchema>;

interface ProposalEditorProps {
  proposal: {
    id: string;
    status: string;
    [key: string]: unknown;
  };
}

export function ProposalEditor({ proposal }: ProposalEditorProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [saving, setSaving] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingGDoc, setExportingGDoc] = useState(false);
  const [exportingWord, setExportingWord] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pricingOptions, setPricingOptions] = useState(proposal.pricingOptions || []);
  const [catalog, setCatalog] = useState<PricingCatalogItem[]>([]);
  const [quickItems, setQuickItems] = useState<Array<{ id: string; qty: number }>>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<ProposalFormData>({
    resolver: zodResolver(proposalSchema),
    defaultValues: {
      title: (proposal.title as string) || '',
      executiveSummary: (proposal.executiveSummary as string) || '',
      objectivesAndOutcomes: (proposal.objectivesAndOutcomes as string) || '',
      scopeOfWork: (proposal.scopeOfWork as string) || '',
      deliverables: (proposal.deliverables as string) || '',
      approachAndTools: (proposal.approachAndTools as string) || '',
      paymentTerms: (proposal.paymentTerms as string) || '',
      cancellationNotice: (proposal.cancellationNotice as string) || '',
      timeline: Array.isArray(proposal.timeline) ? proposal.timeline : ((proposal.timeline as string) || ''),
    },
  });
  // Debounced partial save for sections
  const savingRef = useRef(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const timelineValue = watch('timeline');
  const timelinePhases: TimelinePhase[] = Array.isArray(timelineValue) ? timelineValue as TimelinePhase[] : [];

  const saveSectionsPartial = useCallback(
    (fields?: Partial<ProposalFormData>) => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(async () => {
        try {
          savingRef.current = true;
          const payload: Partial<ProposalFormData> = fields ?? {
            executiveSummary: (document.getElementById('executiveSummary') as HTMLTextAreaElement)?.value,
            objectivesAndOutcomes: (document.getElementById('objectivesAndOutcomes') as HTMLTextAreaElement)?.value,
            scopeOfWork: (document.getElementById('scopeOfWork') as HTMLTextAreaElement)?.value,
            deliverables: (document.getElementById('deliverables') as HTMLTextAreaElement)?.value,
            approachAndTools: (document.getElementById('approachAndTools') as HTMLTextAreaElement)?.value,
            paymentTerms: (document.getElementById('paymentTerms') as HTMLTextAreaElement)?.value,
            cancellationNotice: (document.getElementById('cancellationNotice') as HTMLTextAreaElement)?.value,
            timeline: Array.isArray(timelineValue) ? timelineValue : timelinePhases,
          };
          await proposalsApi.updateSections(proposal.id, payload as any);
          toast.success('Saved');
        } catch (e) {
          // Non-blocking toast
          toast.error('Autosave failed');
        } finally {
          savingRef.current = false;
        }
      }, 600);
    },
    [proposal.id, timelinePhases, timelineValue]
  );

  const isLocked = proposal.status === 'sent' || proposal.status === 'signed' || !!proposal.clientSignedAt;

  // Load company profile defaults (ICP) for side panel
  const { data: companyDefaults } = useQuery({
    queryKey: ['company-profile', 'defaults'],
    queryFn: async () => {
      const resp = await fetch('/api/v1/company-profile/defaults', { credentials: 'include' });
      if (!resp.ok) return null;
      return resp.json();
    },
  });

  // Load pricing catalog for quick pricing
  useEffect(() => {
    pricingCatalogApi
      .list()
      .then(setCatalog)
      .catch(() => setCatalog([]));
  }, []);

  const onSave = async (data: ProposalFormData) => {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`/api/v1/proposals/${proposal.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...data,
          timeline: Array.isArray(data.timeline) ? data.timeline : timelinePhases,
          pricingOptions: pricingOptions,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save proposal');
      }

      // Create a revision snapshot after successful save
      try {
        await fetch(`/api/v1/proposals/${proposal.id}/revisions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ changeNote: 'Manual save' }),
        });
      } catch (e) {
        // Non-blocking: log to console but do not interrupt UX
        console.warn('Failed to create revision snapshot', e);
      }

      // Show success message
      alert('Proposal saved successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save proposal');
    } finally {
      setSaving(false);
    }
  };

  const onPreview = async () => {
    // First save the proposal
    await handleSubmit(onSave)();

    // Then redirect to preview
    router.push(`/dashboard/proposals/${proposal.id}/preview`);
  };

  const onExportPdf = async () => {
    try {
      setExportingPdf(true);

      // Use the new Blob download endpoint
      const pdfUrl = `/api/v1/proposals/${proposal.id}/pdf`;

      // Generate filename from proposal data
      const clientName = (proposal.client as any)?.companyName || 'Client';
      const proposalTitle = (proposal.title as string) || 'Proposal';
      const filename = `${clientName.replace(/[^a-zA-Z0-9]/g, '-')}-${proposalTitle.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`;

      // Download PDF as Blob
      await downloadPdfFromUrl(pdfUrl, filename);

      toast.success('PDF downloaded successfully!');
    } catch (err) {
      toast.error('Failed to download PDF');
      console.error('PDF download error:', err);
    } finally {
      setExportingPdf(false);
    }
  };

  const onExportGDoc = async () => {
    try {
      setExportingGDoc(true);
      // Check Google status first
      const statusResp = await fetch('/api/v1/auth/google/status', { credentials: 'include' });
      const status = statusResp.ok ? await statusResp.json() : { data: { connected: false } };
      if (!status?.data?.connected) {
        const confirmConnect = window.confirm('To export to Google Docs, connect your Google account. Connect now?');
        if (confirmConnect) {
          window.location.href = '/api/v1/auth/google/authorize';
        }
        return;
      }

      const result = await proposalsApi.exportGDoc(proposal.id);

      // Open Google Doc in new window
      window.open(result.docUrl, '_blank');
      toast.success('Exported to Google Docs successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export to Google Docs';
      toast.error(errorMessage);
      console.error('Google Docs export error:', err);
    } finally {
      setExportingGDoc(false);
    }
  };

  const onRefreshGDoc = async () => {
    try {
      setExportingGDoc(true);
      const result = await proposalsApi.refreshGDoc(proposal.id);
      window.open(result.docUrl, '_blank');
      toast.success('Google Doc refreshed successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh Google Doc';
      toast.error(errorMessage);
      console.error('Google Docs refresh error:', err);
    } finally {
      setExportingGDoc(false);
    }
  };

  const onImportGDoc = async () => {
    try {
      setExportingGDoc(true);
      const result = await proposalsApi.importGDoc(proposal.id);
      toast.success(result.message);
      // Reload to reflect imported content
      router.refresh?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import from Google Doc';
      toast.error(errorMessage);
      console.error('Google Docs import error:', err);
    } finally {
      setExportingGDoc(false);
    }
  };

  const onExportWord = async () => {
    try {
      setExportingWord(true);

      const response = await fetch(`/api/v1/proposals/${proposal.id}/export/word`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to export Word document');
      }

      // Get the blob from the response
      const blob = await response.blob();

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Generate filename
      const clientName = (proposal.client as any)?.companyName || 'Client';
      const proposalTitle = (proposal.title as string) || 'Proposal';
      a.download = `${clientName.replace(/[^a-zA-Z0-9]/g, '-')}-${proposalTitle.replace(/[^a-zA-Z0-9]/g, '-')}.docx`;

      document.body.appendChild(a);
      a.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Word document downloaded successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export Word document';
      toast.error(errorMessage);
      console.error('Word export error:', err);
    } finally {
      setExportingWord(false);
    }
  };

  const onDelete = async () => {
    try {
      setDeleting(true);
      await proposalsApi.delete(proposal.id);
      toast.success('Proposal deleted successfully');
      router.push('/dashboard/proposals');
    } catch (err) {
      toast.error('Failed to delete proposal');
      console.error('Delete error:', err);
      setDeleting(false);
    }
  };

  const onAutoFill = async () => {
    try {
      setAutoFilling(true);
      setError(null);

      const response = await fetch(`/api/v1/proposals/${proposal.id}/auto-fill`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to auto-fill proposal');
      }

      const data = await response.json();

      // Update form values with generated content
      setValue('title', data.title || '');
      setValue('executiveSummary', data.executiveSummary || '');
      setValue('objectivesAndOutcomes', data.objectivesAndOutcomes || '');
      setValue('scopeOfWork', data.scopeOfWork || '');
      setValue('deliverables', data.deliverables || '');
      setValue('approachAndTools', data.approachAndTools || '');
      setValue('paymentTerms', data.paymentTerms || '');
      setValue('cancellationNotice', data.cancellationNotice || '');
      setValue('timeline', data.timeline || []);
      setPricingOptions(data.pricing || []);

      toast.success('Proposal auto-filled successfully! Review and edit as needed.');

      // Auto-save after auto-fill
      saveSectionsPartial();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to auto-fill proposal';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Auto-fill error:', err);
    } finally {
      setAutoFilling(false);
    }
  };

  const onRegenerateSection = async (section: string) => {
    try {
      setRegeneratingSection(section);
      setError(null);

      const response = await fetch(`/api/v1/proposals/${proposal.id}/sections/${section}/generate`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to regenerate ${section}`);
      }

      const result = await response.json();
      const data = result.data;

      // Update the specific section
      switch (section) {
        case 'overview':
          setValue('title', data.title || '');
          break;
        case 'executiveSummary':
          setValue('executiveSummary', data.executiveSummary || '');
          break;
        case 'objectivesAndOutcomes':
          setValue('objectivesAndOutcomes', data.objectivesAndOutcomes || '');
          break;
        case 'scopeOfWork':
          setValue('scopeOfWork', data.scopeOfWork || '');
          setValue('timeline', data.timeline || []);
          break;
        case 'deliverables':
          setValue('deliverables', data.deliverables || '');
          break;
        case 'approachAndTools':
          setValue('approachAndTools', data.approachAndTools || '');
          break;
        case 'paymentTerms':
          setValue('paymentTerms', data.paymentTerms || '');
          break;
        case 'cancellationNotice':
          setValue('cancellationNotice', data.cancellationNotice || '');
          break;
        case 'pricing':
          setPricingOptions(data.pricingOptions || []);
          break;
      }

      toast.success(`${section} regenerated successfully!`);

      // Auto-save after regeneration
      saveSectionsPartial();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to regenerate ${section}`;
      toast.error(errorMessage);
      console.error(`Regenerate ${section} error:`, err);
    } finally {
      setRegeneratingSection(null);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-6">
      {/* Header Actions */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  proposal.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                  proposal.status === 'generating' ? 'bg-blue-100 text-blue-800' :
                  proposal.status === 'ready' ? 'bg-green-100 text-green-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {proposal.status}
                </span>
                {proposal.generationMethod === 'transcription' && (
                  <span className="text-xs text-blue-600 font-medium">
                    AI-Generated
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Auto-Fill Button - Only show if proposal has linked transcription */}
              {proposal.transcriptionId ? (
                <>
                  <Button
                    type="button"
                    variant="default"
                    onClick={onAutoFill}
                    disabled={autoFilling || saving || isLocked}
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {autoFilling ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    Auto-Fill from Transcription
                  </Button>
                  <div className="h-6 w-px bg-gray-300 mx-1" />
                </>
              ) : null}
              <Button
                type="button"
                variant="outline"
                onClick={onExportPdf}
                disabled={exportingPdf || saving}
                size="sm"
              >
                {exportingPdf ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4 mr-2" />
                )}
                Export PDF
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onExportGDoc}
                disabled={exportingGDoc || saving}
                size="sm"
              >
                {exportingGDoc ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Google Docs
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onExportWord}
                disabled={exportingWord || saving}
                size="sm"
              >
                {exportingWord ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                Export Word
              </Button>
              {proposal.gdocId ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onRefreshGDoc}
                  disabled={exportingGDoc || saving}
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Refresh GDoc
                </Button>
              ) : null}
              {proposal.gdocId ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onImportGDoc}
                  disabled={exportingGDoc || saving}
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Import from GDoc
                </Button>
              ) : null}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={deleting}
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Proposal?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the proposal
                      &quot;{proposal.title as string}&quot; and all associated data.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onDelete}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {deleting ? 'Deleting...' : 'Delete Proposal'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <div className="h-6 w-px bg-gray-300 mx-1" />
              <Button
                type="submit"
                disabled={isLocked || !isDirty || saving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {isLocked ? 'Locked' : 'Save'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLocked && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="py-4">
            <div className="text-sm text-yellow-900">
              This proposal has been sent or signed and is read-only. To make changes, create a copy and edit the new draft.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabbed Editor */}
      <Card>
        <CardHeader>
          <CardTitle>Proposal Content</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-9">
              <TabsTrigger value="overview" className="text-xs">
                <FileText className="h-4 w-4 mr-1" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="executive" className="text-xs">
                <Lightbulb className="h-4 w-4 mr-1" />
                Executive
              </TabsTrigger>
              <TabsTrigger value="objectives" className="text-xs">
                <Target className="h-4 w-4 mr-1" />
                Objectives
              </TabsTrigger>
              <TabsTrigger value="scope" className="text-xs">
                <CheckSquare className="h-4 w-4 mr-1" />
                Scope
              </TabsTrigger>
              <TabsTrigger value="deliverables" className="text-xs">
                <Package className="h-4 w-4 mr-1" />
                Deliverables
              </TabsTrigger>
              <TabsTrigger value="approach" className="text-xs">
                <Wrench className="h-4 w-4 mr-1" />
                Approach
              </TabsTrigger>
              <TabsTrigger value="payment" className="text-xs">
                <CreditCard className="h-4 w-4 mr-1" />
                Payment
              </TabsTrigger>
              <TabsTrigger value="cancellation" className="text-xs">
                <XCircle className="h-4 w-4 mr-1" />
                Cancellation
              </TabsTrigger>
              <TabsTrigger value="pricing" className="text-xs">
                <DollarSign className="h-4 w-4 mr-1" />
                Pricing
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4 mt-6">
              <div>
                <Label htmlFor="title">Proposal Title *</Label>
                <Input
                  id="title"
                  {...register('title')}
                  placeholder="e.g., Digital Marketing Strategy for ABC Corp"
                  className="text-lg font-medium"
                />
                {errors.title && (
                  <p className="text-sm text-red-600 mt-1">{errors.title.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 mb-1">Client</p>
                  <p className="text-lg font-semibold text-blue-700">
                    {(proposal.client as any)?.companyName || 'N/A'}
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm font-medium text-green-900 mb-1">Created</p>
                  <p className="text-lg font-semibold text-green-700">
                    {new Date(proposal.created as string).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="overview">Overview</Label>
                <p className="text-sm text-gray-500 mb-2">High-level summary placed on the cover page</p>
                <Textarea
                  id="overview"
                  defaultValue={(proposal.coverPageData as any)?.summary || ''}
                  rows={8}
                  className="resize-y"
                  placeholder="Brief overview for the cover page"
                  onBlur={async (e) => {
                    try {
                      await proposalsApi.update(proposal.id, {
                        coverPageData: { ...((proposal.coverPageData as any) || {}), summary: e.target.value },
                      } as any);
                      toast.success('Overview saved');
                    } catch {
                      toast.error('Failed to save overview');
                    }
                  }}
                />
              </div>

              {proposal.generationMethod === 'transcription' && (
                <Card className="bg-purple-50 border-purple-200">
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <Lightbulb className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-purple-900 mb-1">
                          AI-Generated Content
                        </h4>
                        <p className="text-sm text-purple-700">
                          This proposal was generated from a meeting transcription using AI.
                          All sections have been automatically populated based on the conversation.
                          Feel free to edit and refine any section to match your needs.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Executive Summary Tab */}
            <TabsContent value="executive" className="space-y-4 mt-6">
              {companyDefaults?.targetICP && (
                <div className="p-3 bg-gray-50 border rounded text-xs text-gray-700">
                  <div className="font-medium mb-1">ICP (from Settings)</div>
                  <pre className="whitespace-pre-wrap">{JSON.stringify(companyDefaults.targetICP, null, 2)}</pre>
                </div>
              )}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="executiveSummary">Executive Summary</Label>
                  {proposal.transcriptionId && !isLocked && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onRegenerateSection('executiveSummary')}
                      disabled={regeneratingSection === 'executiveSummary'}
                    >
                      {regeneratingSection === 'executiveSummary' ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <RotateCw className="h-3 w-3 mr-1" />
                      )}
                      Regenerate with AI
                    </Button>
                  )}
                </div>
                <p className="text-sm text-gray-500 mb-2">
                  A brief overview highlighting the opportunity and your unique value proposition
                </p>
                <Textarea
                  id="executiveSummary"
                  {...register('executiveSummary')}
                  rows={12}
                  className="resize-y"
                  placeholder="Write a compelling executive summary that captures the essence of your proposal..."
                  onBlur={() => saveSectionsPartial({ executiveSummary: (document.getElementById('executiveSummary') as HTMLTextAreaElement)?.value })}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Recommended: 2-3 paragraphs
                </p>
              </div>
            </TabsContent>

            {/* Objectives & Outcomes Tab */}
            <TabsContent value="objectives" className="space-y-4 mt-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="objectivesAndOutcomes">Objectives & Outcomes</Label>
                  {proposal.transcriptionId && !isLocked && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onRegenerateSection('objectivesAndOutcomes')}
                      disabled={regeneratingSection === 'objectivesAndOutcomes'}
                    >
                      {regeneratingSection === 'objectivesAndOutcomes' ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <RotateCw className="h-3 w-3 mr-1" />
                      )}
                      Regenerate with AI
                    </Button>
                  )}
                </div>
                <p className="text-sm text-gray-500 mb-2">
                  Define the goals and expected outcomes of this project
                </p>
                <Textarea
                  id="objectivesAndOutcomes"
                  {...register('objectivesAndOutcomes')}
                  rows={12}
                  className="resize-y"
                  placeholder="Describe the objectives and expected outcomes for this project..."
                  onBlur={() => saveSectionsPartial({ objectivesAndOutcomes: (document.getElementById('objectivesAndOutcomes') as HTMLTextAreaElement)?.value })}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Recommended: Clear, measurable goals and expected outcomes
                </p>
              </div>
            </TabsContent>

            {/* Scope of Work Tab */}
            <TabsContent value="scope" className="space-y-4 mt-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="scopeOfWork">Scope of Work</Label>
                  {proposal.transcriptionId && !isLocked && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onRegenerateSection('scopeOfWork')}
                      disabled={regeneratingSection === 'scopeOfWork'}
                    >
                      {regeneratingSection === 'scopeOfWork' ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <RotateCw className="h-3 w-3 mr-1" />
                      )}
                      Regenerate with AI
                    </Button>
                  )}
                </div>
                <p className="text-sm text-gray-500 mb-2">
                  Define the boundaries and extent of work to be performed
                </p>
                <Textarea
                  id="scopeOfWork"
                  {...register('scopeOfWork')}
                  rows={12}
                  className="resize-y"
                  placeholder="Describe the scope of work, what's included and excluded from this project..."
                  onBlur={() => saveSectionsPartial({ scopeOfWork: (document.getElementById('scopeOfWork') as HTMLTextAreaElement)?.value })}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Recommended: Clear boundaries of what will and won't be done
                </p>
              </div>

              <div>
                <Label htmlFor="timeline">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Project Timeline
                </Label>
                <TimelineBuilder
                  value={timelinePhases}
                  onChange={(phases) => {
                    setValue('timeline', phases);
                    saveSectionsPartial({ timeline: phases as any });
                  }}
                />
              </div>
            </TabsContent>

            {/* Deliverables Tab */}
            <TabsContent value="deliverables" className="space-y-4 mt-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="deliverables">Deliverables</Label>
                  {proposal.transcriptionId && !isLocked && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onRegenerateSection('deliverables')}
                      disabled={regeneratingSection === 'deliverables'}
                    >
                      {regeneratingSection === 'deliverables' ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <RotateCw className="h-3 w-3 mr-1" />
                      )}
                      Regenerate with AI
                    </Button>
                  )}
                </div>
                <p className="text-sm text-gray-500 mb-2">
                  List the specific outputs and tangible items that will be delivered
                </p>
                <Textarea
                  id="deliverables"
                  {...register('deliverables')}
                  rows={12}
                  className="resize-y"
                  placeholder="List all deliverables, documents, and outputs that will be provided..."
                  onBlur={() => saveSectionsPartial({ deliverables: (document.getElementById('deliverables') as HTMLTextAreaElement)?.value })}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Recommended: Clear list of tangible outputs with specifications
                </p>
              </div>
            </TabsContent>

            {/* Approach & Tools Tab */}
            <TabsContent value="approach" className="space-y-4 mt-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="approachAndTools">Approach & Tools</Label>
                  {proposal.transcriptionId && !isLocked && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onRegenerateSection('approachAndTools')}
                      disabled={regeneratingSection === 'approachAndTools'}
                    >
                      {regeneratingSection === 'approachAndTools' ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <RotateCw className="h-3 w-3 mr-1" />
                      )}
                      Regenerate with AI
                    </Button>
                  )}
                </div>
                <p className="text-sm text-gray-500 mb-2">
                  Describe the methodology and tools that will be used
                </p>
                <Textarea
                  id="approachAndTools"
                  {...register('approachAndTools')}
                  rows={12}
                  className="resize-y"
                  placeholder="Explain the approach, methodology, and tools that will be used in this project..."
                  onBlur={() => saveSectionsPartial({ approachAndTools: (document.getElementById('approachAndTools') as HTMLTextAreaElement)?.value })}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Recommended: Specific methodologies and technology stack
                </p>
              </div>
            </TabsContent>

            {/* Payment Terms Tab */}
            <TabsContent value="payment" className="space-y-4 mt-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="paymentTerms">Payment Terms</Label>
                  {proposal.transcriptionId && !isLocked && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onRegenerateSection('paymentTerms')}
                      disabled={regeneratingSection === 'paymentTerms'}
                    >
                      {regeneratingSection === 'paymentTerms' ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <RotateCw className="h-3 w-3 mr-1" />
                      )}
                      Regenerate with AI
                    </Button>
                  )}
                </div>
                <p className="text-sm text-gray-500 mb-2">
                  Define the payment schedule and billing terms
                </p>
                <Textarea
                  id="paymentTerms"
                  {...register('paymentTerms')}
                  rows={12}
                  className="resize-y"
                  placeholder="Describe payment terms, schedule, methods, and any applicable late fees..."
                  onBlur={() => saveSectionsPartial({ paymentTerms: (document.getElementById('paymentTerms') as HTMLTextAreaElement)?.value })}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Recommended: Clear payment schedule and accepted payment methods
                </p>
              </div>
            </TabsContent>

            {/* Cancellation Notice Tab */}
            <TabsContent value="cancellation" className="space-y-4 mt-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="cancellationNotice">Cancellation Notice</Label>
                  {proposal.transcriptionId && !isLocked && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onRegenerateSection('cancellationNotice')}
                      disabled={regeneratingSection === 'cancellationNotice'}
                    >
                      {regeneratingSection === 'cancellationNotice' ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <RotateCw className="h-3 w-3 mr-1" />
                      )}
                      Regenerate with AI
                    </Button>
                  )}
                </div>
                <p className="text-sm text-gray-500 mb-2">
                  Define the cancellation policy and notice requirements
                </p>
                <Textarea
                  id="cancellationNotice"
                  {...register('cancellationNotice')}
                  rows={12}
                  className="resize-y"
                  placeholder="Describe cancellation policy, notice period, and any applicable fees..."
                  onBlur={() => saveSectionsPartial({ cancellationNotice: (document.getElementById('cancellationNotice') as HTMLTextAreaElement)?.value })}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Recommended: Clear notice period and cancellation terms
                </p>
              </div>
            </TabsContent>

            {/* Pricing Tab */}
            <TabsContent value="pricing" className="space-y-4 mt-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Pricing Options</Label>
                  {proposal.transcriptionId && !isLocked && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onRegenerateSection('pricing')}
                      disabled={regeneratingSection === 'pricing'}
                    >
                      {regeneratingSection === 'pricing' ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <RotateCw className="h-3 w-3 mr-1" />
                      )}
                      Regenerate with AI
                    </Button>
                  )}
                </div>
                <PricingOptionsBuilder
                  options={pricingOptions}
                  onChange={setPricingOptions}
                />
              </div>

              {/* Quick Pricing from Catalog */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Pricing (Catalog)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {catalog.length === 0 ? (
                    <p className="text-sm text-gray-500">No catalog items. Add some in Settings → Pricing Catalog.</p>
                  ) : (
                    <div className="space-y-2">
                      {catalog.map((item) => {
                        const selected = quickItems.find((q) => q.id === item.id);
                        return (
                          <div key={item.id} className="flex items-center justify-between p-2 border rounded">
                            <div className="text-sm">
                              <div className="font-medium">{item.name}</div>
                              <div className="text-gray-500">
                                ${item.unitPrice.toFixed(2)} {item.billingPeriod ? `/${item.billingPeriod}` : ''} · {item.type}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                className="w-24"
                                min={0}
                                value={selected?.qty ?? 0}
                                onChange={(e) => {
                                  const qty = Number(e.target.value || 0);
                                  setQuickItems((prev) => {
                                    const idx = prev.findIndex((q) => q.id === item.id);
                                    if (idx === -1 && qty > 0) return [...prev, { id: item.id, qty }];
                                    if (idx !== -1) {
                                      const copy = [...prev];
                                      if (qty <= 0) copy.splice(idx, 1);
                                      else copy[idx] = { id: item.id, qty };
                                      return copy;
                                    }
                                    return prev;
                                  });
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={async () => {
                        const items = quickItems
                          .map((q) => {
                            const base = catalog.find((c) => c.id === q.id);
                            if (!base) return null;
                            return {
                              name: base.name,
                              type: base.type,
                              unitPrice: base.unitPrice,
                              quantity: q.qty,
                              billingPeriod: base.billingPeriod,
                              taxPct: base.taxPct,
                            };
                          })
                          .filter(Boolean) as Array<{ name: string; type: string; unitPrice: number; quantity: number; billingPeriod?: string; taxPct?: number }>;
                        try {
                          const updated = await proposalsApi.updatePricing(proposal.id, { items });
                          toast.success('Pricing updated');
                          // Refresh page state
                          setQuickItems([]);
                        } catch {
                          toast.error('Failed to update pricing');
                        }
                      }}
                      disabled={quickItems.length === 0}
                    >
                      Save Pricing
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Bottom Actions */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {isDirty ? 'You have unsaved changes' : 'All changes saved'}
            </p>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dashboard/proposals')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!isDirty || saving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
