'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronRight, ChevronLeft, Mail, Users, Calendar, CheckCircle, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCreateCampaign } from '@/lib/hooks/useCampaigns';
import { useMailboxes } from '@/lib/hooks/useMailboxes';
import { EmailGuidelines } from './EmailGuidelines';
import { ScheduleSelector } from './ScheduleSelector';
import { CampaignRulesChecklist } from './CampaignRulesChecklist';
import { companyProfileApi } from '@/lib/api/endpoints/company-profile';
import { useCustomerJourney } from '@/lib/journey/use-customer-journey';

const campaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required'),
  mailbox: z.string().email('Valid email address required'),
  emailSteps: z.array(
    z.object({
      subject: z.string().min(1, 'Subject is required'),
      body: z.string().min(1, 'Email body is required'),
      delayDays: z.number().min(0, 'Delay must be 0 or more days'),
    })
  ).min(1, 'Add at least one email step'),
  contacts: z.array(
    z.object({
      email: z.string().email('Valid email required'),
      name: z.string().min(1, 'Name is required'),
      company: z.string().optional(),
    })
  ).min(1, 'Add at least one contact'),
  sendDays: z.array(z.number()).min(1, 'Select at least one day'),
  sendTimeStart: z.string().regex(/^\d{2}:\d{2}$/, 'Valid time required (HH:MM)'),
  sendTimeEnd: z.string().regex(/^\d{2}:\d{2}$/, 'Valid time required (HH:MM)'),
  timezone: z.string().min(1, 'Timezone is required'),
});

type CampaignFormData = z.infer<typeof campaignSchema>;

const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
];

const STEPS = [
  { id: 1, name: 'Basic Info', icon: Mail },
  { id: 2, name: 'Email Sequence', icon: Mail },
  { id: 3, name: 'Contacts', icon: Users },
  { id: 4, name: 'Schedule', icon: Calendar },
  { id: 5, name: 'Review', icon: CheckCircle },
];

interface CampaignWizardProps {
  initialClientId?: string;
  initialProposalId?: string;
}

export function CampaignWizard({ initialClientId, initialProposalId }: CampaignWizardProps = {}) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [guidelinesAcknowledged, setGuidelinesAcknowledged] = useState(false);
  const [rulesAcknowledged, setRulesAcknowledged] = useState(false);
  const [companyDefaults, setCompanyDefaults] = useState<any>(null);
  const [journeyDataUsed, setJourneyDataUsed] = useState<{
    mailbox?: boolean;
    companyName?: boolean;
  }>({});
  const createCampaign = useCreateCampaign();
  const { data: mailboxesData } = useMailboxes(1, 100, 'ACTIVE');
  const [selectedMailboxIds, setSelectedMailboxIds] = useState<string[]>([]);
  const [rotationPolicy, setRotationPolicy] = useState<'round_robin' | 'weighted'>('round_robin');

  // Get customer journey data (wrapped in try-catch for safety)
  let journey: ReturnType<typeof useCustomerJourney> | null = null;
  try {
    journey = useCustomerJourney();
  } catch (err) {
    console.warn('Journey context not available, using defaults');
  }

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: '',
      mailbox: '',
      emailSteps: [{ subject: '', body: '', delayDays: 0 }],
      contacts: [{ email: '', name: '', company: '' }],
      sendDays: [1, 2, 3, 4, 5], // Monday-Friday by default
      sendTimeStart: '09:00',
      sendTimeEnd: '17:00',
      timezone: 'America/New_York',
    },
  });

  const { fields: emailSteps, append: appendEmailStep, remove: removeEmailStep } = useFieldArray({
    control,
    name: 'emailSteps',
  });

  const { fields: contacts, append: appendContact, remove: removeContact } = useFieldArray({
    control,
    name: 'contacts',
  });

  const watchedData = watch();
  const selectedDays = watch('sendDays') || [];

  // Load company defaults and journey data on mount
  useEffect(() => {
    const loadDefaults = async () => {
      try {
        const defaults = await companyProfileApi.getDefaults();
        setCompanyDefaults(defaults);

        // Auto-fill from journey metadata if available
        if (journey?.metadata) {
          const used: { mailbox?: boolean; companyName?: boolean } = {};

          // Auto-fill first connected mailbox
          if (journey.metadata.connectedMailboxIds && journey.metadata.connectedMailboxIds.length > 0) {
            const firstMailbox = journey.metadata.connectedMailboxIds[0];
            setValue('mailbox', firstMailbox);
            used.mailbox = true;
            console.log('Auto-filled mailbox from journey:', firstMailbox);
          }

          // Auto-fill company name if available
          if (journey.metadata.companyName && !watch('name')) {
            setValue('name', `${journey.metadata.companyName} Campaign`);
            used.companyName = true;
            console.log('Auto-filled campaign name from journey:', journey.metadata.companyName);
          }

          setJourneyDataUsed(used);
        }
      } catch (error) {
        console.error('Failed to load company defaults:', error);
      }
    };
    loadDefaults();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleDay = (day: number) => {
    const current = selectedDays;
    if (current.includes(day)) {
      setValue('sendDays', current.filter(d => d !== day));
    } else {
      setValue('sendDays', [...current, day]);
    }
  };

  const onSubmit = async (data: CampaignFormData) => {
    try {
      setError(null);

      // For MVP: Use mailbox email as mailboxId (will be created if needed)
      // In production, this would be selected from a dropdown of existing mailboxes
      const campaignData = {
        name: data.name,
        mailboxId: data.mailbox, // Using email as ID for MVP
        sequence: data.emailSteps.map((step, index) => ({
          step: index + 1,
          subject: step.subject,
          body: step.body,
          delayDays: step.delayDays,
          aiPersonalization: false, // Can be enhanced later
        })),
        contacts: data.contacts.map(contact => {
          const nameParts = contact.name.split(' ');
          return {
            email: contact.email,
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
            company: contact.company,
          };
        }),
        schedule: {
          sendDays: data.sendDays.map(d => d.toString()),
          sendTimeStart: data.sendTimeStart,
          sendTimeEnd: data.sendTimeEnd,
          timezone: data.timezone,
        },
      };

      // Track journey data acceptance for analytics
      if (Object.keys(journeyDataUsed).length > 0) {
        console.log('Journey data acceptance:', {
          fieldsAutoFilled: Object.keys(journeyDataUsed).filter(k => journeyDataUsed[k as keyof typeof journeyDataUsed]),
          journeyContext: {
            hasProposal: !!journey?.metadata?.firstProposalId,
            hasClient: !!journey?.metadata?.firstClientId,
            hasICP: !!journey?.metadata?.targetICP,
            hasTone: !!journey?.metadata?.preferredTone,
          },
        });
      }

      const scheduleWithPool = {
        ...campaignData.schedule,
        mailboxPool: selectedMailboxIds,
        rotationPolicy,
      } as any;
      await createCampaign.mutateAsync({ ...campaignData, schedule: scheduleWithPool });
      router.push('/dashboard/campaigns');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign');
    }
  };

  const nextStep = () => setCurrentStep(Math.min(currentStep + 1, STEPS.length));
  const prevStep = () => setCurrentStep(Math.max(currentStep - 1, 1));

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;

          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`
                    flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors
                    ${isActive ? 'border-blue-600 bg-blue-600 text-white' : ''}
                    ${isCompleted ? 'border-green-600 bg-green-600 text-white' : ''}
                    ${!isActive && !isCompleted ? 'border-gray-300 text-gray-400' : ''}
                  `}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span
                  className={`
                    text-xs mt-2 font-medium
                    ${isActive ? 'text-blue-600' : ''}
                    ${isCompleted ? 'text-green-600' : ''}
                    ${!isActive && !isCompleted ? 'text-gray-400' : ''}
                  `}
                >
                  {step.name}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`
                    h-0.5 flex-1 mx-2 transition-colors
                    ${isCompleted ? 'bg-green-600' : 'bg-gray-200'}
                  `}
                />
              )}
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Step 1: Basic Info */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              {journey?.metadata && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800 font-medium">Campaign Context</p>
                  <div className="mt-1 space-y-1 text-xs text-blue-700">
                    {journey.metadata.firstClientName && (
                      <p>• Client: {journey.metadata.firstClientName}</p>
                    )}
                    {journey.metadata.firstProposalId && (
                      <p>
                        • <a
                            href={`/dashboard/proposals/${journey.metadata.firstProposalId}`}
                            className="text-blue-600 hover:text-blue-800 underline"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            View Linked Proposal
                          </a>
                      </p>
                    )}
                    {journey.metadata.targetICP && (
                      <p>• Target: {journey.metadata.targetICP}</p>
                    )}
                    {journey.metadata.preferredTone && (
                      <p>• Tone: {journey.metadata.preferredTone}</p>
                    )}
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Campaign Name *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="e.g., Q1 2025 Outreach"
                />
                {errors.name && (
                  <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
                )}
                {journeyDataUsed.companyName && (
                  <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                    <span>✓</span> Auto-filled from company profile
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="mailbox">Sending Email Address *</Label>
                <Input
                  id="mailbox"
                  type="email"
                  {...register('mailbox')}
                  placeholder="sales@yourcompany.com"
                />
                {errors.mailbox && (
                  <p className="text-sm text-red-600 mt-1">{errors.mailbox.message}</p>
                )}
                {journeyDataUsed.mailbox ? (
                  <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                    <span>✓</span> Auto-filled from connected email accounts
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">
                    This email will be used to send campaign messages
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Email Sequence */}
        {currentStep === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8">
              <Card>
                <CardHeader>
                  <CardTitle>Email Sequence</CardTitle>
                  {(journey?.metadata || companyDefaults) && (
                    <div className="mt-2 space-y-2">
                      {(journey?.metadata?.preferredTone || companyDefaults?.preferredTone) && (
                        <div className="flex items-start gap-2">
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Tone:</span> {journey?.metadata?.preferredTone || companyDefaults?.preferredTone}
                          </p>
                          {journey?.metadata?.preferredTone && (
                            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">from journey</span>
                          )}
                        </div>
                      )}
                      {(journey?.metadata?.targetICP || companyDefaults?.targetICP) && (
                        <div className="flex items-start gap-2">
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Target ICP:</span> {journey?.metadata?.targetICP || companyDefaults?.targetICP}
                          </p>
                          {journey?.metadata?.targetICP && (
                            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">from journey</span>
                          )}
                        </div>
                      )}
                      {companyDefaults?.enrichmentData?.valueProposition && (
                        <p className="text-xs text-gray-600 italic">
                          Your value proposition: {companyDefaults.enrichmentData.valueProposition}
                        </p>
                      )}
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {emailSteps.map((field, index) => (
                    <div key={field.id} className="p-4 border border-gray-200 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900">
                          Email {index + 1} {index === 0 && '(Initial Contact)'}
                        </h4>
                        {emailSteps.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeEmailStep(index)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        )}
                      </div>

                      {index > 0 && (
                        <div>
                          <Label htmlFor={`emailSteps.${index}.delayDays`}>
                            Delay (days after previous email)
                          </Label>
                          <Input
                            type="number"
                            {...register(`emailSteps.${index}.delayDays`, {
                              valueAsNumber: true,
                            })}
                            placeholder="3"
                          />
                        </div>
                      )}

                      <div>
                        <Label htmlFor={`emailSteps.${index}.subject`}>Subject Line *</Label>
                        <Input
                          {...register(`emailSteps.${index}.subject`)}
                          placeholder="Quick question about your marketing"
                        />
                        {errors.emailSteps?.[index]?.subject && (
                          <p className="text-sm text-red-600 mt-1">
                            {errors.emailSteps[index]?.subject?.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor={`emailSteps.${index}.body`}>Email Body *</Label>
                        <textarea
                          {...register(`emailSteps.${index}.body`)}
                          className="w-full min-h-[120px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                          placeholder="Hi {{name}},&#10;&#10;I noticed that {{company}}..."
                        />
                        {errors.emailSteps?.[index]?.body && (
                          <p className="text-sm text-red-600 mt-1">
                            {errors.emailSteps[index]?.body?.message}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Use {"{{name}}"} and {"{{company}}"} for personalization
                        </p>
                      </div>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => appendEmailStep({ subject: '', body: '', delayDays: 3 })}
                    className="w-full gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Follow-up Email
                  </Button>
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-4">
              <EmailGuidelines onAcknowledgmentChange={setGuidelinesAcknowledged} />
            </div>
          </div>
        )}

        {/* Step 3: Contacts */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Contact List</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {contacts.map((field, index) => (
                <div key={field.id} className="p-4 border border-gray-200 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900">Contact {index + 1}</h4>
                    {contacts.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeContact(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor={`contacts.${index}.email`}>Email *</Label>
                      <Input
                        type="email"
                        {...register(`contacts.${index}.email`)}
                        placeholder="john@company.com"
                      />
                      {errors.contacts?.[index]?.email && (
                        <p className="text-sm text-red-600 mt-1">
                          {errors.contacts[index]?.email?.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor={`contacts.${index}.name`}>Name *</Label>
                      <Input
                        {...register(`contacts.${index}.name`)}
                        placeholder="John Doe"
                      />
                      {errors.contacts?.[index]?.name && (
                        <p className="text-sm text-red-600 mt-1">
                          {errors.contacts[index]?.name?.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor={`contacts.${index}.company`}>Company</Label>
                    <Input
                      {...register(`contacts.${index}.company`)}
                      placeholder="Acme Corp"
                    />
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={() => appendContact({ email: '', name: '', company: '' })}
                className="w-full gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Contact
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Schedule */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <ScheduleSelector
              value={{
                sendDays: watch('sendDays'),
                sendTimeStart: watch('sendTimeStart'),
                sendTimeEnd: watch('sendTimeEnd'),
                timezone: watch('timezone'),
              }}
              onChange={(schedule) => {
                setValue('sendDays', schedule.sendDays);
                setValue('sendTimeStart', schedule.sendTimeStart);
                setValue('sendTimeEnd', schedule.sendTimeEnd);
                setValue('timezone', schedule.timezone);
              }}
            />

            <Card>
              <CardHeader>
                <CardTitle>Mailbox Pool & Rotation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">Select one or more mailboxes to rotate sending. We will honor per‑mailbox limits and warmup caps.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-auto border rounded p-3">
                    {mailboxesData?.data?.mailboxes?.map((m: { id: string; email: string }) => (
                      <label key={m.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedMailboxIds.includes(m.id)}
                          onChange={(e) => {
                            setSelectedMailboxIds((prev) =>
                              e.target.checked ? [...prev, m.id] : prev.filter((id) => id !== m.id),
                            );
                          }}
                        />
                        <span>{m.email}</span>
                      </label>
                    )) || <p className="text-sm text-gray-500">No active mailboxes found.</p>}
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" checked={rotationPolicy === 'round_robin'} onChange={() => setRotationPolicy('round_robin')} />
                    Round robin
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" checked={rotationPolicy === 'weighted'} onChange={() => setRotationPolicy('weighted')} />
                    Weighted by remaining allowance
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 5: Review */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Review Campaign</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Basic Info</h3>
                  <p className="text-sm text-gray-600">Name: {watchedData.name}</p>
                  <p className="text-sm text-gray-600">Mailbox: {watchedData.mailbox}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Email Sequence</h3>
                  <p className="text-sm text-gray-600">
                    {watchedData.emailSteps?.length || 0} email(s) configured
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Contacts</h3>
                  <p className="text-sm text-gray-600">
                    {watchedData.contacts?.length || 0} contact(s) added
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Schedule</h3>
                  <p className="text-sm text-gray-600">
                    {watchedData.sendTimeStart} - {watchedData.sendTimeEnd} ({watchedData.timezone})
                  </p>
                  <p className="text-sm text-gray-600">
                    Days: {DAYS_OF_WEEK.filter(d => selectedDays.includes(d.value)).map(d => d.label).join(', ')}
                  </p>
                </div>
              </CardContent>
            </Card>

            <CampaignRulesChecklist
              onAcknowledge={() => setRulesAcknowledged(true)}
              disabled={!guidelinesAcknowledged}
            />
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>

          {currentStep < STEPS.length ? (
            <Button type="button" onClick={nextStep} className="gap-2">
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" disabled={isSubmitting || !rulesAcknowledged}>
              {isSubmitting ? 'Creating Campaign...' : 'Create Campaign'}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
