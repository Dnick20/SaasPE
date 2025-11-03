'use client';

import { useState, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FileAudio, Calendar, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const proposalSchema = z.object({
  title: z.string().min(1, 'Proposal title is required'),
  term: z.string().optional(),
  termMonths: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  preparedBy: z.string().optional(),
  preparedFor: z.string().optional(),
});

type ProposalFormData = z.infer<typeof proposalSchema>;

interface Transcription {
  id: string;
  title: string;
  status: string;
  duration: number;
  created: string;
  transcript?: string;
}

interface Client {
  id: string;
  companyName: string;
  contactFirstName?: string;
  contactLastName?: string;
  contactEmail?: string;
}

interface TranscriptionSelectorProps {
  clientId: string;
  selectedTranscriptionId: string | null;
  onTranscriptionSelect: (transcriptionId: string) => void;
  onGenerate: (data: {
    transcriptionId: string;
    title: string;
    coverPageData?: {
      term?: string;
      startDate?: string;
      endDate?: string;
      preparedBy?: string;
      preparedFor?: string;
    };
  }) => void;
  onCancel: () => void;
}

export function TranscriptionSelector({
  clientId,
  selectedTranscriptionId,
  onTranscriptionSelect,
  onGenerate,
  onCancel,
}: TranscriptionSelectorProps) {
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [client, setClient] = useState<Client | null>(null);

  const {
    register,
    handleSubmit,
    control,
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
    },
  });

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [transcriptionsRes, clientRes] = await Promise.all([
          fetch(`/api/v1/transcriptions?clientId=${clientId}&status=completed&limit=50`, {
            credentials: 'include',
          }),
          fetch(`/api/v1/clients/${clientId}`, {
            credentials: 'include',
          }),
        ]);

        if (!transcriptionsRes.ok) {
          throw new Error('Failed to fetch transcriptions');
        }
        if (!clientRes.ok) {
          throw new Error('Failed to fetch client');
        }

        const [transcriptionsData, clientData] = await Promise.all([
          transcriptionsRes.json(),
          clientRes.json(),
        ]);

        setTranscriptions(transcriptionsData.data || []);
        setClient(clientData);

        // Auto-fill proposal title based on client company name
        if (clientData?.companyName) {
          setValue('title', `Proposal for ${clientData.companyName}`);
        }

        // Auto-fill preparedFor with client contact info
        if (clientData.contactFirstName || clientData.contactLastName) {
          const fullName = [clientData.contactFirstName, clientData.contactLastName]
            .filter(Boolean)
            .join(' ');
          setValue('preparedFor', fullName);
        }

        // Set default start date to today
        const today = new Date().toISOString().split('T')[0];
        setValue('startDate', today);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [clientId, setValue]);

  const onSubmit = (data: ProposalFormData) => {
    if (!selectedTranscriptionId) {
      setError('Please select a transcription first');
      return;
    }

    onGenerate({
      transcriptionId: selectedTranscriptionId,
      title: data.title,
      coverPageData: {
        term: data.term,
        startDate: data.startDate,
        endDate: data.endDate,
        preparedBy: data.preparedBy,
        preparedFor: data.preparedFor,
      },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && transcriptions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <Button variant="outline" onClick={onCancel}>
          Go Back
        </Button>
      </div>
    );
  }

  if (transcriptions.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <FileAudio className="h-12 w-12 text-gray-400 mx-auto" />
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Completed Transcriptions Found
          </h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            You need to upload and transcribe a meeting recording before you can generate a proposal from it.
            Upload a recording from the Transcriptions page.
          </p>
        </div>
        <Button variant="outline" onClick={onCancel}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Step 1: Select Transcription */}
      <div>
        <Label className="text-base font-semibold mb-4 block">
          Step 1: Select Meeting Transcription
        </Label>
        <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
          {transcriptions.map((transcription) => (
            <Card
              key={transcription.id}
              className={`cursor-pointer transition-all p-4 ${
                selectedTranscriptionId === transcription.id
                  ? 'border-2 border-blue-600 bg-blue-50'
                  : 'border border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => onTranscriptionSelect(transcription.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      selectedTranscriptionId === transcription.id
                        ? 'bg-blue-600'
                        : 'bg-gray-100'
                    }`}
                  >
                    {selectedTranscriptionId === transcription.id ? (
                      <CheckCircle2 className="h-6 w-6 text-white" />
                    ) : (
                      <FileAudio
                        className={`h-6 w-6 ${
                          selectedTranscriptionId === transcription.id
                            ? 'text-white'
                            : 'text-gray-600'
                        }`}
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">
                      {transcription.title}
                    </h4>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {Math.floor(transcription.duration / 60)} min
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(transcription.created).toLocaleDateString()}
                      </span>
                    </div>
                    {transcription.transcript && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                        {transcription.transcript.substring(0, 150)}...
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Step 2: Proposal Details */}
      {selectedTranscriptionId && (
        <div className="space-y-4 pt-6 border-t border-gray-200">
          <Label className="text-base font-semibold block">
            Step 2: Proposal Details
          </Label>

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
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!selectedTranscriptionId || isSubmitting}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isSubmitting ? 'Generating...' : 'Generate Proposal with AI'}
        </Button>
      </div>
    </form>
  );
}
