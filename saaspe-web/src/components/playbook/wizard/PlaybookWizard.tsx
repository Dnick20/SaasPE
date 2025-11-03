'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Save, Loader2 } from 'lucide-react';
import { ICPDefinitionStep } from './ICPDefinitionStep';
import { ScriptGenerationStep } from './ScriptGenerationStep';
import { ReviewScriptsStep } from './ReviewScriptsStep';
import { CampaignStructureStep } from './CampaignStructureStep';
import { useCreatePlaybook } from '@/lib/hooks/usePlaybooks';
import { useCustomerJourney } from '@/lib/journey/use-customer-journey';
import { playbooksApi } from '@/lib/api/endpoints/playbooks';
import { toast } from 'sonner';

interface PlaybookWizardProps {
  clientId: string;
  clientName?: string;
  proposalId?: string;
}

type WizardStep = 'icp' | 'generate' | 'review' | 'campaign';

const STEPS: { id: WizardStep; title: string }[] = [
  { id: 'icp', title: 'Define ICP' },
  { id: 'generate', title: 'Generate Scripts' },
  { id: 'review', title: 'Review & Edit' },
  { id: 'campaign', title: 'Campaign Structure' },
];

export function PlaybookWizard({ clientId, clientName, proposalId }: PlaybookWizardProps) {
  const router = useRouter();
  const createPlaybook = useCreatePlaybook();
  const journey = useCustomerJourney();

  const [currentStep, setCurrentStep] = useState<WizardStep>('icp');
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const [playbookData, setPlaybookData] = useState({
    // ICP data
    targetICP: {
      industry: '',
      companySize: '',
      roles: [] as string[],
      painPoints: [] as string[],
    },

    // Script generation settings
    tone: '',
    ctas: [] as string[],

    // Generated scripts
    emailScript: {
      subject: '',
      body: '',
      ctaText: '',
      followUpSequence: [] as string[],
      variants: [] as string[],
      followUps: [] as string[],
    },
    linkedInScript: {
      connectionRequest: '',
      firstMessage: '',
      followUpMessage: '',
      inMail: '',
      messageSequence: [] as string[],
    },
    coldCallScript: {
      opener: '',
      discovery: [] as string[],
      objectionHandling: {} as Record<string, string>,
      close: '',
    },

    // Campaign structure
    campaignCount: 1,
    structure: {
      phases: ['Awareness', 'Consideration', 'Decision'],
      touchpoints: 7,
      cadence: 'Day 1, Day 3, Day 7, Day 14',
    },
    campaignStrategy: {
      channels: [] as string[],
      touchpoints: 7,
      cadence: {} as Record<string, number>,
    },
  });

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  const handleGenerateScripts = async () => {
    setIsGenerating(true);

    try {
      const { targetICP, tone, ctas } = playbookData;

      // Call real AI script generation endpoint
      const scripts = await playbooksApi.generateScripts({
        targetICP,
        tone,
        ctas,
        clientContext: clientName ? {
          companyName: clientName,
        } : undefined,
      });

      // Update playbook data with generated scripts
      setPlaybookData({
        ...playbookData,
        emailScript: {
          subject: scripts.emailScript.subject || '',
          body: scripts.emailScript.body || '',
          ctaText: scripts.emailScript.ctaText || '',
          followUpSequence: scripts.emailScript.followUpSequence || [],
          variants: scripts.emailScript.variants || [],
          followUps: scripts.emailScript.followUps || [],
          ...(scripts.emailScript.ctaUrl && { ctaUrl: scripts.emailScript.ctaUrl }),
        },
        linkedInScript: {
          connectionRequest: scripts.linkedInScript.connectionRequest || '',
          firstMessage: scripts.linkedInScript.firstMessage || '',
          followUpMessage: scripts.linkedInScript.followUpMessage || '',
          inMail: scripts.linkedInScript.inMail || '',
          messageSequence: scripts.linkedInScript.messageSequence || [],
        },
        coldCallScript: scripts.coldCallScript,
      });

      setHasGenerated(true);
      toast.success('Scripts generated successfully with AI!');
    } catch (error) {
      console.error('Failed to generate scripts:', error);
      toast.error('Failed to generate scripts. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNext = () => {
    const stepIndex = STEPS.findIndex((s) => s.id === currentStep);
    if (stepIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[stepIndex + 1].id);
    }
  };

  const handlePrevious = () => {
    const stepIndex = STEPS.findIndex((s) => s.id === currentStep);
    if (stepIndex > 0) {
      setCurrentStep(STEPS[stepIndex - 1].id);
    }
  };

  const handleSave = async () => {
    try {
      const playbook = await createPlaybook.mutateAsync({
        clientId,
        proposalId,
        targetICP: playbookData.targetICP,
        emailScript: playbookData.emailScript,
        linkedInScript: playbookData.linkedInScript,
        coldCallScript: playbookData.coldCallScript,
        tone: playbookData.tone,
        structure: playbookData.structure,
        ctas: playbookData.ctas,
        campaignCount: playbookData.campaignCount,
        campaignStrategy: playbookData.campaignStrategy,
      });

      toast.success('Playbook created successfully!');

      // Mark journey step complete
      if (journey.currentStep === 'playbook' && !journey.isStepComplete('playbook')) {
        journey.markStepComplete('playbook', {
          playbookId: playbook.id,
        });
      }

      // Redirect to playbook view
      router.push(`/dashboard/clients/${clientId}`);
    } catch (error) {
      console.error('Failed to create playbook:', error);
      toast.error('Failed to create playbook. Please try again.');
    }
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case 'icp':
        return playbookData.targetICP.roles.length > 0 && playbookData.targetICP.painPoints.length > 0;
      case 'generate':
        return hasGenerated;
      case 'review':
        return true;
      case 'campaign':
        return playbookData.campaignStrategy.channels && playbookData.campaignStrategy.channels.length > 0;
      default:
        return true;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Create Playbook</h1>
        {clientName && (
          <p className="text-gray-500 mt-1">For {clientName}</p>
        )}
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`
                    px-4 py-2 rounded-md text-sm font-medium transition-all
                    ${
                      currentStep === step.id
                        ? 'bg-blue-600 text-white'
                        : currentStepIndex > index
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }
                  `}
                >
                  {step.title}
                </div>
                {index < STEPS.length - 1 && (
                  <ChevronRight className="h-4 w-4 mx-1 text-gray-400" />
                )}
              </div>
            ))}
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step Content */}
      <div className="min-h-[500px]">
        {currentStep === 'icp' && (
          <ICPDefinitionStep
            data={playbookData.targetICP}
            onChange={(targetICP) => setPlaybookData({ ...playbookData, targetICP: targetICP as any })}
          />
        )}

        {currentStep === 'generate' && (
          <ScriptGenerationStep
            data={playbookData}
            onChange={(data) => setPlaybookData({ ...playbookData, ...data })}
            onGenerateScripts={handleGenerateScripts}
            isGenerating={isGenerating}
            hasGenerated={hasGenerated}
          />
        )}

        {currentStep === 'review' && (
          <ReviewScriptsStep
            data={playbookData}
            onChange={(data) => setPlaybookData({ ...playbookData, ...data })}
          />
        )}

        {currentStep === 'campaign' && (
          <CampaignStructureStep
            data={playbookData}
            onChange={(data) => setPlaybookData({ ...playbookData, ...data })}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-6 border-t">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStepIndex === 0}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>

        <div className="flex items-center gap-2">
          {currentStepIndex < STEPS.length - 1 ? (
            <Button
              onClick={handleNext}
              disabled={!canProceedToNext()}
            >
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSave}
              disabled={createPlaybook.isPending || !canProceedToNext()}
              className="bg-green-600 hover:bg-green-700"
            >
              {createPlaybook.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Playbook
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
