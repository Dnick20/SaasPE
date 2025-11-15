'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Sparkles, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateProposal, useUpdateProposal } from '@/lib/hooks/useProposals';
import { useClient } from '@/lib/hooks/useClients';

const proposalSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  term: z.string().optional(),
  termMonths: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  preparedBy: z.string().optional(),
  preparedFor: z.string().optional(),
  executiveSummary: z.string().optional(),
  objectivesAndOutcomes: z.string().optional(),
  scopeOfWork: z.string().optional(),
  deliverables: z.string().optional(),
  approachAndTools: z.string().optional(),
  paymentTerms: z.string().optional(),
  cancellationNotice: z.string().optional(),
  timeline: z.string().optional(),
  pricingItems: z.array(
    z.object({
      name: z.string().min(1, 'Item name is required'),
      description: z.string().optional(),
      price: z.number().min(0, 'Price must be positive'),
    })
  ).min(1, 'Add at least one pricing item'),
});

type ProposalFormData = z.infer<typeof proposalSchema>;

interface CreateProposalFormProps {
  clientId?: string;
}

export function CreateProposalForm({ clientId }: CreateProposalFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { data: client } = useClient(clientId);
  const createProposal = useCreateProposal();
  const updateProposal = useUpdateProposal();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProposalFormData>({
    resolver: zodResolver(proposalSchema),
    defaultValues: {
      title: '',
      term: '12',
      termMonths: 12,
      startDate: '',
      endDate: '',
      preparedBy: '',
      preparedFor: '',
      executiveSummary: '',
      objectivesAndOutcomes: '',
      scopeOfWork: '',
      deliverables: '',
      approachAndTools: '',
      paymentTerms: '',
      cancellationNotice: '',
      timeline: '',
      pricingItems: [{ name: '', description: '', price: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'pricingItems',
  });

  const pricingItems = watch('pricingItems');
  const totalPrice = pricingItems.reduce((sum, item) => sum + (item.price || 0), 0);

  const startDate = useWatch({ control, name: 'startDate' });
  const termMonths = useWatch({ control, name: 'termMonths' });

  // Auto-calculate end date when start date or term changes
  useEffect(() => {
    if (startDate && termMonths) {
      const start = new Date(startDate);
      const end = new Date(start);
      end.setMonth(end.getMonth() + termMonths);
      setValue('endDate', end.toISOString().split('T')[0]);
    }
  }, [startDate, termMonths, setValue]);

  const onSubmit = async (data: ProposalFormData) => {
    try {
      setError(null);

      if (!clientId) {
        setError('Client ID is required. Please select a client first.');
        return;
      }

      // Step 1: Create proposal draft
      const proposal = await createProposal.mutateAsync({
        clientId: clientId,
        title: data.title,
      });

      // Step 2: Update proposal with full content (including all Step 2 fields)
      await updateProposal.mutateAsync({
        id: proposal.id,
        data: {
          // Cover page metadata (stored in coverPageData JSON field)
          coverPageData: {
            term: data.term,
            termMonths: data.termMonths,
            startDate: data.startDate,
            endDate: data.endDate,
            preparedBy: data.preparedBy,
            preparedFor: data.preparedFor,
          },

          // Content sections
          executiveSummary: data.executiveSummary,
          objectivesAndOutcomes: data.objectivesAndOutcomes,
          scopeOfWork: data.scopeOfWork,
          deliverables: data.deliverables,
          approachAndTools: data.approachAndTools,
          paymentTerms: data.paymentTerms,
          cancellationNotice: data.cancellationNotice,
          timeline: data.timeline,

          // Pricing
          pricing: {
            items: data.pricingItems.map(item => ({
              name: item.name,
              description: item.description || '',
              price: item.price,
            })),
            total: totalPrice,
          },
        },
      });

      router.push('/dashboard/proposals');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create proposal');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Proposal Title *</Label>
            <Input
              id="title"
              {...register('title')}
              placeholder="e.g., Digital Marketing Strategy for ABC Corp"
            />
            {errors.title && (
              <p className="text-sm text-red-600 mt-1">{errors.title.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="term">Contract Term (Months)</Label>
              <Select
                onValueChange={(value) => {
                  if (value === 'other') {
                    setValue('term', 'other');
                    setValue('termMonths', undefined);
                  } else {
                    const months = parseInt(value);
                    setValue('term', value);
                    setValue('termMonths', months);
                  }
                }}
                defaultValue="12"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select contract term" />
                </SelectTrigger>
                <SelectContent>
                  {[3, 6, 9, 12, 15, 18, 21, 24].map((months) => (
                    <SelectItem key={months} value={months.toString()}>
                      {months} months
                    </SelectItem>
                  ))}
                  <SelectItem value="other">Other (specify below)</SelectItem>
                </SelectContent>
              </Select>
              {termMonths === undefined && (
                <Input
                  type="number"
                  placeholder="Enter custom months"
                  className="mt-2"
                  min="1"
                  onChange={(e) => {
                    const months = parseInt(e.target.value);
                    if (!isNaN(months)) {
                      setValue('termMonths', months);
                      setValue('term', `${months}`);
                    }
                  }}
                />
              )}
            </div>
            <div>
              <Label htmlFor="preparedBy">Prepared By</Label>
              <Input
                id="preparedBy"
                {...register('preparedBy')}
                placeholder="Your name"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Project Start Date</Label>
              <Input
                id="startDate"
                type="date"
                {...register('startDate')}
              />
            </div>
            <div>
              <Label htmlFor="endDate">Project End Date</Label>
              <Input
                id="endDate"
                type="date"
                {...register('endDate')}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="preparedFor">Prepared For (Client Contact)</Label>
            {client && (client.contactFirstName || client.contactLastName) ? (
              <Select
                onValueChange={(value) => setValue('preparedFor', value)}
                defaultValue={
                  client.contactFirstName && client.contactLastName
                    ? `${client.contactFirstName} ${client.contactLastName}`
                    : client.contactFirstName || client.contactLastName || ''
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select client contact" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    value={
                      client.contactFirstName && client.contactLastName
                        ? `${client.contactFirstName} ${client.contactLastName}`
                        : client.contactFirstName || client.contactLastName || ''
                    }
                  >
                    {client.contactFirstName && client.contactLastName
                      ? `${client.contactFirstName} ${client.contactLastName}`
                      : client.contactFirstName || client.contactLastName}
                    {client.contactEmail && ` (${client.contactEmail})`}
                  </SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="preparedFor"
                {...register('preparedFor')}
                placeholder="Client contact name"
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Content Sections */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Content</CardTitle>
            <Button type="button" variant="outline" size="sm" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Generate with AI
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="executiveSummary">Executive Summary</Label>
            <textarea
              id="executiveSummary"
              {...register('executiveSummary')}
              className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              placeholder="Brief overview of the proposal..."
            />
          </div>

          <div>
            <Label htmlFor="objectivesAndOutcomes">Objectives & Outcomes</Label>
            <textarea
              id="objectivesAndOutcomes"
              {...register('objectivesAndOutcomes')}
              className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              placeholder="Define the goals and expected outcomes..."
            />
          </div>

          <div>
            <Label htmlFor="scopeOfWork">Scope of Work</Label>
            <textarea
              id="scopeOfWork"
              {...register('scopeOfWork')}
              className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              placeholder="Define the boundaries and extent of work to be performed..."
            />
          </div>

          <div>
            <Label htmlFor="deliverables">Deliverables</Label>
            <textarea
              id="deliverables"
              {...register('deliverables')}
              className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              placeholder="List the specific outputs and tangible items..."
            />
          </div>

          <div>
            <Label htmlFor="approachAndTools">Approach & Tools</Label>
            <textarea
              id="approachAndTools"
              {...register('approachAndTools')}
              className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              placeholder="Describe the methodology and tools that will be used..."
            />
          </div>

          <div>
            <Label htmlFor="paymentTerms">Payment Terms</Label>
            <textarea
              id="paymentTerms"
              {...register('paymentTerms')}
              className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              placeholder="Define the payment schedule and billing terms..."
            />
          </div>

          <div>
            <Label htmlFor="cancellationNotice">Cancellation Notice</Label>
            <textarea
              id="cancellationNotice"
              {...register('cancellationNotice')}
              className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              placeholder="Define the cancellation policy and notice requirements..."
            />
          </div>

          <div>
            <Label htmlFor="timeline">Timeline</Label>
            <textarea
              id="timeline"
              {...register('timeline')}
              className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              placeholder="e.g., Phase 1 (Weeks 1-4): Discovery and research..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader>
          <CardTitle>Pricing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="p-4 border border-gray-200 rounded-lg space-y-3">
              <div className="flex items-start justify-between">
                <h4 className="text-sm font-medium text-gray-900">Item {index + 1}</h4>
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor={`pricingItems.${index}.name`}>Item Name *</Label>
                  <Input
                    {...register(`pricingItems.${index}.name`)}
                    placeholder="e.g., SEO Optimization"
                  />
                  {errors.pricingItems?.[index]?.name && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.pricingItems[index]?.name?.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor={`pricingItems.${index}.price`}>Price (USD) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...register(`pricingItems.${index}.price`, {
                      valueAsNumber: true,
                    })}
                    placeholder="0.00"
                  />
                  {errors.pricingItems?.[index]?.price && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.pricingItems[index]?.price?.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor={`pricingItems.${index}.description`}>Description</Label>
                <Input
                  {...register(`pricingItems.${index}.description`)}
                  placeholder="Brief description of this item..."
                />
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={() => append({ name: '', description: '', price: 0 })}
            className="w-full gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Pricing Item
          </Button>

          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-gray-900">Total</span>
              <span className="text-2xl font-bold text-gray-900">
                ${totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Proposal'}
        </Button>
      </div>
    </form>
  );
}
