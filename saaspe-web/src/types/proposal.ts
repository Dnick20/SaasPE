/**
 * Proposal Type Definitions
 * Centralized types for proposal data structures
 */

export interface ProposedProjectPhase {
  phase: string;                    // e.g., "Discovery and Planning"
  commitment: string;               // e.g., "Weeks 1-2"
  window?: string;                  // e.g., "2 weeks" (optional)
  focus: string;                    // Main objective of this phase
  bullets: string[];                // Key activities/tasks
  estimatedHours: {
    perMonth: number;
    perWeek: number;
  };
}

export interface ScopeOfWorkItem {
  title: string;                    // Required: Work item title
  objective?: string;               // Optional: What this aims to achieve
  keyActivities?: string[];         // Optional: List of activities
  outcome?: string;                 // Optional: Expected result
}

export interface DeliverableItem {
  name: string;                     // Required: Deliverable name
  description?: string;             // Optional: Additional details
}

export interface PricingOption {
  id?: string;
  name: string;
  description?: string;
  price: number;
  billingFrequency?: 'one-time' | 'monthly' | 'quarterly' | 'annually';
  features?: string[];
  isRecommended?: boolean;
}

export interface Proposal {
  id: string;
  clientId: string;
  title: string;
  status: 'draft' | 'generating' | 'ready' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'signed';

  // Structured content fields (support both new JSON arrays and legacy strings)
  scopeOfWork?: ScopeOfWorkItem[] | string;
  deliverables?: DeliverableItem[] | string;
  timeline?: ProposedProjectPhase[] | string;
  proposedProjectPhases?: ProposedProjectPhase[]; // Explicit field for new schema

  // Text content fields
  executiveSummary?: string;
  objectivesAndOutcomes?: string;
  proposedApproach?: string;
  approachAndTools?: string;
  paymentTerms?: string;
  cancellationPolicy?: string;
  coverPageData?: {
    summary?: string;
    [key: string]: any;
  };

  // Pricing
  pricing?: {
    items: Array<{ name: string; description?: string; price: number }>;
    total: number;
  };
  pricingOptions?: PricingOption[];

  // Metadata
  transcriptionId?: string;
  generationMethod?: 'transcription' | 'manual' | 'ai';
  gdocId?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  sentAt?: Date | string;
  viewedAt?: Date | string;
  acceptedAt?: Date | string;
  clientSignedAt?: Date | string;

  // Relations
  client?: {
    id: string;
    name: string;
    email?: string;
  };
}

/**
 * Type guard to check if value is a structured scope of work array
 */
export function isScopeOfWorkArray(value: unknown): value is ScopeOfWorkItem[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        'title' in item &&
        typeof item.title === 'string'
    )
  );
}

/**
 * Type guard to check if value is a structured deliverables array
 */
export function isDeliverablesArray(value: unknown): value is DeliverableItem[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        'name' in item &&
        typeof item.name === 'string'
    )
  );
}

/**
 * Type guard to check if value is a structured timeline/phases array
 */
export function isTimelineArray(value: unknown): value is ProposedProjectPhase[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        'phase' in item &&
        typeof item.phase === 'string'
    )
  );
}
