/**
 * Proposal Data Normalizers
 * Helper functions to convert legacy string data into structured JSON arrays
 */

import type {
  ScopeOfWorkItem,
  DeliverableItem,
  ProposedProjectPhase,
  isScopeOfWorkArray,
  isDeliverablesArray,
  isTimelineArray,
} from '@/types/proposal';

/**
 * Normalize scope of work data
 * Converts legacy strings into structured ScopeOfWorkItem arrays
 */
export function normalizeScopeOfWork(value: unknown): ScopeOfWorkItem[] {
  // Already a structured array
  if (Array.isArray(value)) {
    return value.map(ensureScopeItemStructure);
  }

  // Legacy string format - parse into structure
  if (typeof value === 'string' && value.trim()) {
    return parseTextToScopeItems(value);
  }

  // Null, undefined, or empty
  return [];
}

/**
 * Normalize deliverables data
 * Converts legacy strings into structured DeliverableItem arrays
 */
export function normalizeDeliverables(value: unknown): DeliverableItem[] {
  // Already a structured array
  if (Array.isArray(value)) {
    return value.map(ensureDeliverableStructure);
  }

  // Legacy string format - parse into structure
  if (typeof value === 'string' && value.trim()) {
    return parseTextToDeliverables(value);
  }

  // Null, undefined, or empty
  return [];
}

/**
 * Normalize timeline/phases data
 * Converts legacy timeline arrays to new ProposedProjectPhase schema
 */
export function normalizeTimeline(value: unknown): ProposedProjectPhase[] {
  // Already a structured array - ensure it matches new schema
  if (Array.isArray(value)) {
    return value.map(ensurePhaseSchema);
  }

  // Legacy string format - parse into structure
  if (typeof value === 'string' && value.trim()) {
    return parseTextToPhases(value);
  }

  // Null, undefined, or empty
  return [];
}

/**
 * Ensure scope item has all required fields
 */
function ensureScopeItemStructure(item: any): ScopeOfWorkItem {
  if (typeof item === 'string') {
    return {
      title: item,
      objective: undefined,
      keyActivities: [],
      outcome: undefined,
    };
  }

  return {
    title: item.title || item.workItem || '',
    objective: item.objective || item.description || undefined,
    keyActivities: Array.isArray(item.keyActivities)
      ? item.keyActivities
      : Array.isArray(item.activities)
      ? item.activities
      : [],
    outcome: item.outcome || item.result || undefined,
  };
}

/**
 * Ensure deliverable has all required fields
 */
function ensureDeliverableStructure(item: any): DeliverableItem {
  if (typeof item === 'string') {
    return {
      name: item,
      description: undefined,
    };
  }

  return {
    name: item.name || item.title || '',
    description: item.description || item.details || undefined,
  };
}

/**
 * Ensure phase has all required fields per new schema
 */
function ensurePhaseSchema(phase: any): ProposedProjectPhase {
  // Handle string phase
  if (typeof phase === 'string') {
    return {
      phase: phase,
      commitment: '',
      window: '',
      focus: '',
      bullets: [],
      estimatedHours: { perMonth: 0, perWeek: 0 },
    };
  }

  return {
    phase: phase.phase || phase.title || phase.name || '',
    commitment: phase.commitment || phase.weeks || phase.timing || '',
    window: phase.window || phase.duration || '',
    focus: phase.focus || phase.objective || phase.description || '',
    bullets: Array.isArray(phase.bullets)
      ? phase.bullets
      : Array.isArray(phase.tasks)
      ? phase.tasks
      : Array.isArray(phase.keyActivities)
      ? phase.keyActivities
      : [],
    estimatedHours: phase.estimatedHours || {
      perMonth: phase.hoursPerMonth || 0,
      perWeek: phase.hoursPerWeek || phase.hours || 0,
    },
  };
}

/**
 * Parse plain text into structured scope items
 */
function parseTextToScopeItems(text: string): ScopeOfWorkItem[] {
  const items: ScopeOfWorkItem[] = [];

  // Split by double newlines or common separators
  const sections = text.split(/\n\n+|---+/).filter((s) => s.trim());

  for (const section of sections) {
    const lines = section.split('\n').filter((l) => l.trim());
    if (lines.length === 0) continue;

    const item: ScopeOfWorkItem = {
      title: lines[0].replace(/^#+\s*/, '').replace(/^\d+\.\s*/, '').trim(),
      objective: undefined,
      keyActivities: [],
      outcome: undefined,
    };

    let currentField: 'objective' | 'activities' | 'outcome' | null = null;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();

      // Detect field headers
      if (/^objective:/i.test(line)) {
        currentField = 'objective';
        item.objective = line.replace(/^objective:\s*/i, '');
      } else if (/^key activities:/i.test(line) || /^activities:/i.test(line)) {
        currentField = 'activities';
        item.keyActivities = [];
      } else if (/^outcome:/i.test(line)) {
        currentField = 'outcome';
        item.outcome = line.replace(/^outcome:\s*/i, '');
      } else if (line.match(/^[-•*]\s+/)) {
        // Bullet point
        const activity = line.replace(/^[-•*]\s+/, '');
        if (currentField === 'activities' && item.keyActivities) {
          item.keyActivities.push(activity);
        }
      } else {
        // Continue previous field
        if (currentField === 'objective' && item.objective) {
          item.objective += ' ' + line;
        } else if (currentField === 'outcome' && item.outcome) {
          item.outcome += ' ' + line;
        }
      }
    }

    items.push(item);
  }

  return items.length > 0 ? items : [{ title: text.substring(0, 100) }];
}

/**
 * Parse plain text into deliverable items
 */
function parseTextToDeliverables(text: string): DeliverableItem[] {
  const lines = text.split('\n').filter((l) => l.trim());

  return lines.map((line) => {
    const cleaned = line.replace(/^[-•*\d.]+\s*/, '').trim();
    return { name: cleaned };
  });
}

/**
 * Parse plain text into timeline phases
 */
function parseTextToPhases(text: string): ProposedProjectPhase[] {
  const phases: ProposedProjectPhase[] = [];
  const sections = text.split(/\n\n+/).filter((s) => s.trim());

  for (const section of sections) {
    const lines = section.split('\n').filter((l) => l.trim());
    if (lines.length === 0) continue;

    const phase: ProposedProjectPhase = {
      phase: lines[0].replace(/^#+\s*/, '').replace(/^\d+\.\s*/, '').trim(),
      commitment: '',
      window: '',
      focus: '',
      bullets: [],
      estimatedHours: { perMonth: 0, perWeek: 0 },
    };

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.match(/^[-•*]\s+/)) {
        phase.bullets.push(line.replace(/^[-•*]\s+/, ''));
      } else if (!phase.focus) {
        phase.focus = line;
      }
    }

    phases.push(phase);
  }

  return phases.length > 0 ? phases : [];
}

/**
 * Validate scope of work item
 */
export function validateScopeItem(item: ScopeOfWorkItem): string | null {
  if (!item.title || !item.title.trim()) {
    return 'Title is required';
  }

  if (item.title.length < 3) {
    return 'Title must be at least 3 characters';
  }

  return null;
}

/**
 * Validate deliverable item
 */
export function validateDeliverable(item: DeliverableItem): string | null {
  if (!item.name || !item.name.trim()) {
    return 'Name is required';
  }

  if (item.name.length < 3) {
    return 'Name must be at least 3 characters';
  }

  return null;
}

/**
 * Validate timeline phase
 */
export function validatePhase(phase: ProposedProjectPhase): string | null {
  if (!phase.phase || !phase.phase.trim()) {
    return 'Phase name is required';
  }

  if (!phase.commitment || !phase.commitment.trim()) {
    return 'Commitment/timing is required';
  }

  if (!phase.focus || !phase.focus.trim()) {
    return 'Focus/objective is required';
  }

  if (phase.estimatedHours.perWeek < 0 || phase.estimatedHours.perMonth < 0) {
    return 'Hours cannot be negative';
  }

  return null;
}
