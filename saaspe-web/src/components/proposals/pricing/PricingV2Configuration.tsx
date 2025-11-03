'use client';

import { useState, useEffect } from 'react';
import {
  Sparkles,
  FileText,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Wand2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PricingOptionCard } from './PricingOptionCard';
import { PricingNotesPanel } from './PricingNotesPanel';
import {
  ProposalPricingOption,
  ProposalPricingLineItem,
  ProposalPricingNote,
  BillingCadence,
  LineItemType,
  UnitType,
  NoteType,
} from '@/lib/api/endpoints/proposals';
import {
  useAddPricingOption,
  useUpdatePricingOption,
  useDeletePricingOption,
  useAddLineItem,
  useUpdateLineItem,
  useDeleteLineItem,
  useAddPricingNote,
  useUpdatePricingNote,
  useDeletePricingNote,
  useSeedPricingBlueprints,
} from '@/lib/hooks/useProposals';

interface PricingV2ConfigurationProps {
  proposalId: string;
  clientId?: string;
  pricingOptions?: ProposalPricingOption[];
  pricingNotes?: ProposalPricingNote[];
  onDataChange?: () => void;
  readonly?: boolean;
}

type PricingMode = 'ai' | 'template' | 'manual';

export function PricingV2Configuration({
  proposalId,
  clientId,
  pricingOptions = [],
  pricingNotes = [],
  onDataChange,
  readonly = false,
}: PricingV2ConfigurationProps) {
  const [pricingMode, setPricingMode] = useState<PricingMode>('manual');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Mutations
  const addPricingOption = useAddPricingOption();
  const updatePricingOption = useUpdatePricingOption();
  const deletePricingOption = useDeletePricingOption();
  const addLineItem = useAddLineItem();
  const updateLineItem = useUpdateLineItem();
  const deleteLineItem = useDeleteLineItem();
  const addPricingNote = useAddPricingNote();
  const updatePricingNote = useUpdatePricingNote();
  const deletePricingNote = useDeletePricingNote();
  const seedBlueprints = useSeedPricingBlueprints();

  // Validation
  useEffect(() => {
    const errors: string[] = [];

    if (pricingOptions.length === 0) {
      errors.push('At least one pricing option is required');
    }

    pricingOptions.forEach((option, index) => {
      if (option.lineItems.length === 0) {
        errors.push(`Option ${index + 1} must have at least one line item`);
      }
      if (option.summary.length < 50) {
        errors.push(`Option ${index + 1} summary must be at least 50 characters`);
      }
    });

    setValidationErrors(errors);
  }, [pricingOptions]);

  const handleAddPricingOption = async (data: Partial<ProposalPricingOption>) => {
    try {
      await addPricingOption.mutateAsync({
        proposalId,
        data: {
          label: data.label || 'New Option',
          billingCadence: data.billingCadence || BillingCadence.FIXED_FEE,
          summary: data.summary || 'Add a detailed description of this pricing option (min 50 characters)',
          tierType: data.tierType,
          paymentTerms: data.paymentTerms,
          cancellationNotice: data.cancellationNotice,
          isRecommended: data.isRecommended || false,
          sortOrder: pricingOptions.length,
          lineItems: data.lineItems || [
            {
              lineType: LineItemType.CORE,
              description: 'Add line item description (min 20 characters)',
              amount: 0,
              unitType: UnitType.FIXED,
              sortOrder: 0,
            },
          ],
        },
      });
      onDataChange?.();
    } catch (error) {
      console.error('Failed to add pricing option:', error);
      alert('Failed to add pricing option. Please try again.');
    }
  };

  const handleUpdatePricingOption = async (
    optionId: string,
    updates: Partial<ProposalPricingOption>
  ) => {
    try {
      await updatePricingOption.mutateAsync({
        proposalId,
        optionId,
        data: updates,
      });
      onDataChange?.();
    } catch (error) {
      console.error('Failed to update pricing option:', error);
      alert('Failed to update pricing option. Please try again.');
    }
  };

  const handleDeletePricingOption = async (optionId: string) => {
    if (!confirm('Are you sure you want to delete this pricing option?')) {
      return;
    }

    try {
      await deletePricingOption.mutateAsync({ proposalId, optionId });
      onDataChange?.();
    } catch (error) {
      console.error('Failed to delete pricing option:', error);
      alert('Failed to delete pricing option. Please try again.');
    }
  };

  const handleAddLineItem = async (
    optionId: string,
    lineItem: Partial<ProposalPricingLineItem>
  ) => {
    try {
      await addLineItem.mutateAsync({
        proposalId,
        optionId,
        data: {
          lineType: lineItem.lineType || LineItemType.CORE,
          description: lineItem.description || '',
          amount: lineItem.amount || 0,
          unitType: lineItem.unitType || UnitType.FIXED,
          hoursIncluded: lineItem.hoursIncluded,
          requiresApproval: lineItem.requiresApproval || false,
          notes: lineItem.notes,
          sortOrder: lineItem.sortOrder,
        },
      });
      onDataChange?.();
    } catch (error) {
      console.error('Failed to add line item:', error);
      alert('Failed to add line item. Please try again.');
    }
  };

  const handleUpdateLineItem = async (
    optionId: string,
    lineItemId: string,
    updates: Partial<ProposalPricingLineItem>
  ) => {
    try {
      await updateLineItem.mutateAsync({
        proposalId,
        optionId,
        lineItemId,
        data: updates,
      });
      onDataChange?.();
    } catch (error) {
      console.error('Failed to update line item:', error);
      alert('Failed to update line item. Please try again.');
    }
  };

  const handleDeleteLineItem = async (optionId: string, lineItemId: string) => {
    try {
      await deleteLineItem.mutateAsync({ proposalId, optionId, lineItemId });
      onDataChange?.();
    } catch (error) {
      console.error('Failed to delete line item:', error);
      alert('Failed to delete line item. Please try again.');
    }
  };

  const handleToggleRecommended = async (optionId: string) => {
    const option = pricingOptions.find((opt) => opt.id === optionId);
    if (!option) return;

    try {
      // If marking as recommended, unmark all others first
      if (!option.isRecommended) {
        for (const opt of pricingOptions) {
          if (opt.isRecommended && opt.id !== optionId) {
            await updatePricingOption.mutateAsync({
              proposalId,
              optionId: opt.id,
              data: { isRecommended: false },
            });
          }
        }
      }

      // Toggle current option
      await updatePricingOption.mutateAsync({
        proposalId,
        optionId,
        data: { isRecommended: !option.isRecommended },
      });
      onDataChange?.();
    } catch (error) {
      console.error('Failed to toggle recommended:', error);
      alert('Failed to update recommended status. Please try again.');
    }
  };

  const handleAddPricingNote = async (note: Partial<ProposalPricingNote>) => {
    try {
      await addPricingNote.mutateAsync({
        proposalId,
        data: {
          noteType: note.noteType || NoteType.GENERAL,
          content: note.content || '',
          sortOrder: pricingNotes.length,
        },
      });
      onDataChange?.();
    } catch (error) {
      console.error('Failed to add pricing note:', error);
      alert('Failed to add pricing note. Please try again.');
    }
  };

  const handleUpdatePricingNote = async (
    noteId: string,
    updates: Partial<ProposalPricingNote>
  ) => {
    try {
      await updatePricingNote.mutateAsync({
        proposalId,
        noteId,
        data: updates,
      });
      onDataChange?.();
    } catch (error) {
      console.error('Failed to update pricing note:', error);
      alert('Failed to update pricing note. Please try again.');
    }
  };

  const handleDeletePricingNote = async (noteId: string) => {
    try {
      await deletePricingNote.mutateAsync({ proposalId, noteId });
      onDataChange?.();
    } catch (error) {
      console.error('Failed to delete pricing note:', error);
      alert('Failed to delete pricing note. Please try again.');
    }
  };

  const handleGenerateWithAI = async () => {
    setIsGeneratingAI(true);
    try {
      // TODO: Implement AI pricing generation endpoint
      alert('AI pricing generation will be implemented in a future update');
    } catch (error) {
      console.error('Failed to generate pricing with AI:', error);
      alert('Failed to generate pricing. Please try again.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleLoadTemplate = async (templateType: string) => {
    try {
      const result = await seedBlueprints.mutateAsync();
      const template = result.templates.find((t: any) => t.label.toLowerCase().includes(templateType));

      if (template) {
        await handleAddPricingOption({
          label: template.label,
          billingCadence: template.billingCadence,
          summary: template.summary,
          tierType: template.tierType,
          paymentTerms: template.paymentTerms,
          cancellationNotice: template.cancellationNotice,
          lineItems: template.coreServices,
        });
      }
    } catch (error) {
      console.error('Failed to load template:', error);
      alert('Failed to load template. Please try again.');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Pricing Configuration (V2)
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Create narrative-style pricing options with VAF-aligned formatting
            </p>
          </div>

          {/* Validation Status */}
          {!readonly && (
            <div>
              {validationErrors.length === 0 ? (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Valid
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {validationErrors.length} Issue{validationErrors.length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Validation Errors */}
        {validationErrors.length > 0 && !readonly && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index} className="text-sm">
                    {error}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Pricing Mode Selection */}
        {!readonly && pricingOptions.length === 0 && (
          <div className="space-y-4">
            <Label>How would you like to create pricing?</Label>
            <Tabs value={pricingMode} onValueChange={(value) => setPricingMode(value as PricingMode)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="ai">
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI Generate
                </TabsTrigger>
                <TabsTrigger value="template">
                  <Wand2 className="w-4 h-4 mr-2" />
                  Use Template
                </TabsTrigger>
                <TabsTrigger value="manual">
                  <FileText className="w-4 h-4 mr-2" />
                  Manual
                </TabsTrigger>
              </TabsList>

              {/* AI Generation Tab */}
              <TabsContent value="ai" className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-6 text-center space-y-4">
                  <div className="h-16 w-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto">
                    <Sparkles className="h-8 w-8 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold mb-2">AI-Powered Pricing Generation</h3>
                    <p className="text-sm text-gray-600 max-w-md mx-auto mb-4">
                      Our AI will analyze the client's needs, budget, and project scope to generate
                      tailored pricing options with narrative descriptions.
                    </p>
                    <Button
                      onClick={handleGenerateWithAI}
                      disabled={isGeneratingAI}
                      className="gap-2"
                    >
                      {isGeneratingAI ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Generate Pricing with AI
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Template Tab */}
              <TabsContent value="template" className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-6 space-y-4">
                  <div>
                    <Label htmlFor="template-select">Select a Template</Label>
                    <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                      <SelectTrigger id="template-select">
                        <SelectValue placeholder="Choose a pricing template" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sprint">Diagnostic Sprint (Fixed Fee)</SelectItem>
                        <SelectItem value="retainer">Monthly Retainer (Tiered)</SelectItem>
                        <SelectItem value="hourly">Hourly Consulting</SelectItem>
                        <SelectItem value="custom">Custom Package</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedTemplate && (
                    <Button
                      onClick={() => handleLoadTemplate(selectedTemplate)}
                      className="w-full gap-2"
                    >
                      <Wand2 className="w-4 h-4" />
                      Load Template
                    </Button>
                  )}
                </div>
              </TabsContent>

              {/* Manual Tab */}
              <TabsContent value="manual" className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-6 text-center space-y-4">
                  <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
                    <FileText className="h-8 w-8 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold mb-2">Create Pricing Manually</h3>
                    <p className="text-sm text-gray-600 max-w-md mx-auto mb-4">
                      Build your pricing options from scratch with full control over every detail.
                    </p>
                    <Button onClick={() => handleAddPricingOption({})} className="gap-2">
                      <Plus className="w-4 h-4" />
                      Add First Pricing Option
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Pricing Options Display */}
        {pricingOptions.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Pricing Options</h3>
              {!readonly && (
                <Button size="sm" onClick={() => handleAddPricingOption({})} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Option
                </Button>
              )}
            </div>

            <div className="space-y-6">
              {pricingOptions.map((option) => (
                <PricingOptionCard
                  key={option.id}
                  option={option}
                  onUpdate={handleUpdatePricingOption}
                  onDelete={handleDeletePricingOption}
                  onAddLineItem={handleAddLineItem}
                  onUpdateLineItem={handleUpdateLineItem}
                  onDeleteLineItem={handleDeleteLineItem}
                  onToggleRecommended={handleToggleRecommended}
                  readonly={readonly}
                />
              ))}
            </div>
          </div>
        )}

        {/* Pricing Notes */}
        <PricingNotesPanel
          notes={pricingNotes}
          onAddNote={handleAddPricingNote}
          onUpdateNote={handleUpdatePricingNote}
          onDeleteNote={handleDeletePricingNote}
          readonly={readonly}
        />
      </CardContent>
    </Card>
  );
}
