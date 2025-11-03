/**
 * Bull Queue Job Name Constants
 *
 * Centralized definition of all job names used in the proposal queue.
 * This prevents typos and mismatches between job enqueueing and processing.
 *
 * IMPORTANT: When adding a new job type:
 * 1. Add the constant here
 * 2. Add a @Process(JOB_NAME) handler in proposal.processor.ts
 * 3. Add a test in proposal.processor.spec.ts
 * 4. Update PROPOSAL_JOB_NAMES array below
 */

/**
 * Standard proposal generation job
 * Used for both manual and transcription-based proposal generation
 */
export const PROPOSAL_GENERATE_JOB = 'generate' as const;

/**
 * Legacy job name for transcription-based proposals
 * @deprecated Use PROPOSAL_GENERATE_JOB instead
 * Kept for backwards compatibility with queued jobs
 */
export const PROPOSAL_GENERATE_FROM_TRANSCRIPTION_JOB =
  'generate-proposal-from-transcription' as const;

/**
 * All valid job names for the proposal queue
 * Used for runtime validation
 */
export const PROPOSAL_JOB_NAMES = [
  PROPOSAL_GENERATE_JOB,
  PROPOSAL_GENERATE_FROM_TRANSCRIPTION_JOB,
] as const;

/**
 * Type for all valid proposal job names
 */
export type ProposalJobName = (typeof PROPOSAL_JOB_NAMES)[number];

/**
 * Validate that a job name is supported
 */
export function isValidProposalJobName(
  name: string,
): name is ProposalJobName {
  return PROPOSAL_JOB_NAMES.includes(name as ProposalJobName);
}

/**
 * Job data interfaces for type safety
 */
export interface GenerateProposalJobData {
  proposalId: string;
  tenantId: string;
  sections: string[];
  templateId?: string;
  customInstructions?: string;
}

/**
 * Map of job names to their data types
 * Ensures type safety when enqueueing jobs
 */
export interface ProposalJobDataMap {
  [PROPOSAL_GENERATE_JOB]: GenerateProposalJobData;
  [PROPOSAL_GENERATE_FROM_TRANSCRIPTION_JOB]: GenerateProposalJobData;
}
