/**
 * Customer Journey Types
 * Defines the structure for the onboarding journey flow
 */

export type JourneyStep =
  | 'discovery'     // Company profile & ICP definition
  | 'client'        // First client creation
  | 'proposal'      // First proposal generation
  | 'playbook'      // Playbook creation (scripts & campaign structure)
  | 'mailboxes'     // Email account connection
  | 'warmup'        // Email warmup setup
  | 'campaign'      // First campaign creation
  | 'complete';     // Journey finished

export interface JourneyMetadata {
  // Client-scoping
  clientId?: string;  // Current client for this journey instance

  // Discovery step
  companyProfileId?: string;
  companyName?: string;
  website?: string;
  industry?: string;
  targetICP?: string;
  preferredTone?: string;

  // Client step
  firstClientId?: string;
  firstClientName?: string;
  firstTranscriptionId?: string;

  // Proposal step
  firstProposalId?: string;

  // Playbook step
  playbookId?: string;
  playbookGoogleDocUrl?: string;

  // Mailboxes step
  connectedMailboxIds?: string[];

  // Warmup step
  warmupConfigured?: boolean;

  // Campaign step
  firstCampaignId?: string;

  // Tracking
  skippedSteps?: JourneyStep[];
  lastCompletedAt?: Date;
}

export interface NextAction {
  label: string;
  route: string;
  description?: string;
  icon?: string;
}

export interface JourneyState {
  currentStep: JourneyStep;
  completedSteps: Set<JourneyStep>;
  metadata: JourneyMetadata;
  nextAction: NextAction;
  isComplete: boolean;
  progressPercentage: number;
}

export interface JourneyContextValue extends JourneyState {
  // Actions
  goToNextStep: () => void;
  goToStep: (step: JourneyStep) => void;
  markStepComplete: (step: JourneyStep, metadata?: Partial<JourneyMetadata>) => void;
  skipStep: (step: JourneyStep) => void;
  resetJourney: () => void;
  updateMetadata: (metadata: Partial<JourneyMetadata>) => void;

  // Utilities
  isStepComplete: (step: JourneyStep) => boolean;
  canAccessStep: (step: JourneyStep) => boolean;
  getProgress: () => number;
}

export const JOURNEY_STEPS: JourneyStep[] = [
  'discovery',
  'client',
  'proposal',
  'playbook',
  'mailboxes',
  'warmup',
  'campaign',
  'complete',
];

export const JOURNEY_STEP_LABELS: Record<JourneyStep, string> = {
  discovery: 'Discovery',
  client: 'First Client',
  proposal: 'First Proposal',
  playbook: 'Create Playbook',
  mailboxes: 'Connect Email',
  warmup: 'Email Warmup',
  campaign: 'First Campaign',
  complete: 'Complete',
};

export const JOURNEY_STEP_ROUTES: Record<JourneyStep, string> = {
  discovery: '/dashboard/onboarding',
  client: '/dashboard/clients',
  proposal: '/dashboard/proposals',
  playbook: '/dashboard/playbooks/new',
  mailboxes: '/dashboard/integrations',
  warmup: '/dashboard/warmup',
  campaign: '/dashboard/campaigns',
  complete: '/dashboard',
};
