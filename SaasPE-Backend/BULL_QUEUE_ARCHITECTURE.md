# Bull Queue Architecture & Patterns

**Last Updated:** October 29, 2025
**Status:** Production-ready

---

## Overview

This document describes the Bull queue architecture used in the SaasPE backend for background job processing, specifically for proposal generation.

## Why Bull Queues?

Bull is a Redis-based queue for Node.js that provides:
- **Asynchronous Processing**: Long-running tasks don't block API requests
- **Reliability**: Jobs are persisted in Redis and can be retried on failure
- **Scalability**: Multiple workers can process jobs in parallel
- **Monitoring**: Built-in job progress tracking and statistics

---

## Architecture

```
┌─────────────┐
│   Client    │
│  (Frontend) │
└──────┬──────┘
       │ HTTP POST
       ▼
┌─────────────────────────────────┐
│  ProposalsController            │
│  /api/v1/proposals/generate     │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  ProposalsService                │
│  - Creates proposal record       │
│  - Enqueues job                  │
│  - Returns jobId to client       │
└──────┬──────────────────────────┘
       │ proposalQueue.add(JOB_NAME, data)
       ▼
┌─────────────────────────────────┐
│  Bull Queue ('proposal')         │
│  - Stores job in Redis           │
│  - Manages job lifecycle         │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  ProposalProcessor               │
│  @Process(JOB_NAME)              │
│  - Receives job                  │
│  - Generates content with AI     │
│  - Updates proposal status       │
└─────────────────────────────────┘
```

---

## Critical Pattern: Job Name Consistency

### The Problem

**Symptom:** Jobs are enqueued but never processed, proposals stuck in "generating" status.

**Root Cause:** Mismatch between job name used when enqueueing and job name in @Process decorator.

```typescript
// ❌ WRONG - Mismatched names
// Service (enqueuing)
await this.proposalQueue.add('generate-from-transcription', data);

// Processor (handling)
@Process('generate')  // <-- Different name!
async handleGenerate(job: Job) { ... }

// Result: Job sits in queue forever, never processed
```

### The Solution

Use centralized constants to prevent typos:

```typescript
// ✅ CORRECT - Using constants

// 1. Define in constants/job-names.ts
export const PROPOSAL_GENERATE_JOB = 'generate' as const;

// 2. Use when enqueueing (service)
await this.proposalQueue.add(PROPOSAL_GENERATE_JOB, data);

// 3. Use in processor decorator
@Process(PROPOSAL_GENERATE_JOB)
async handleGenerate(job: Job) { ... }

// Result: Type-safe, impossible to mismatch
```

---

## Implementation Guide

### Step 1: Define Job Name Constants

**File:** `src/modules/proposals/constants/job-names.ts`

```typescript
/**
 * All job names for proposal queue
 * ALWAYS use these constants, never hard-code strings
 */
export const PROPOSAL_GENERATE_JOB = 'generate' as const;

export const PROPOSAL_JOB_NAMES = [
  PROPOSAL_GENERATE_JOB,
] as const;

export type ProposalJobName = (typeof PROPOSAL_JOB_NAMES)[number];

export interface GenerateProposalJobData {
  proposalId: string;
  tenantId: string;
  sections: string[];
  customInstructions?: string;
}
```

### Step 2: Enqueue Jobs (Service)

**File:** `src/modules/proposals/proposals.service.ts`

```typescript
import {
  PROPOSAL_GENERATE_JOB,
  type GenerateProposalJobData,
} from './constants/job-names';

@Injectable()
export class ProposalsService {
  constructor(
    @InjectQueue('proposal') private proposalQueue: Queue,
  ) {}

  async generateProposal(id: string, tenantId: string, dto: GenerateProposalDto) {
    // Create proposal record
    const proposal = await this.prisma.proposal.create({ ... });

    // Enqueue job with type safety
    const job = await this.proposalQueue.add<GenerateProposalJobData>(
      PROPOSAL_GENERATE_JOB,  // ← Use constant
      {
        proposalId: id,
        tenantId,
        sections: dto.sections,
      },
    );

    return {
      id,
      jobId: String(job.id),
      status: 'generating',
    };
  }
}
```

### Step 3: Process Jobs (Processor)

**File:** `src/modules/proposals/processors/proposal.processor.ts`

```typescript
import {
  PROPOSAL_GENERATE_JOB,
  type GenerateProposalJobData,
} from '../constants/job-names';

@Processor('proposal')
export class ProposalProcessor implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private openaiService: OpenAIService,
  ) {}

  // Runtime validation on startup
  onModuleInit() {
    this.logger.log('Validating proposal queue job handlers...');
    // Logs all registered handlers for verification
  }

  @Process(PROPOSAL_GENERATE_JOB)  // ← Use same constant
  async handleGenerate(job: Job<GenerateProposalJobData>): Promise<any> {
    const { proposalId, tenantId, sections } = job.data;

    this.logger.log(`Starting job ${job.id} for proposal ${proposalId}`);

    try {
      // Get proposal data
      const proposal = await this.prisma.proposal.findFirst({ ... });

      // Generate content with AI
      const content = await this.openaiService.generateProposalContent({ ... });

      // Update proposal
      await this.prisma.proposal.update({
        where: { id: proposalId },
        data: { status: 'ready', ...content },
      });

      return { success: true, proposalId };
    } catch (error) {
      this.logger.error(`Job ${job.id} failed:`, error);

      // Revert status on failure
      await this.prisma.proposal.update({
        where: { id: proposalId },
        data: { status: 'draft' },
      });

      throw error;  // Triggers Bull retry
    }
  }
}
```

### Step 4: Add Test for Job Handler Integrity

**File:** `src/modules/proposals/processors/proposal.processor.spec.ts`

```typescript
import { PROPOSAL_JOB_NAMES } from '../constants/job-names';

describe('Job Handler Registration (CRITICAL)', () => {
  it('should have @Process handlers for all defined job names', () => {
    const expectedHandlers = {
      [PROPOSAL_GENERATE_JOB]: 'handleGenerate',
    };

    const missingHandlers = [];

    for (const jobName of PROPOSAL_JOB_NAMES) {
      const expectedMethod = expectedHandlers[jobName];
      if (!processor[expectedMethod]) {
        missingHandlers.push(jobName);
      }
    }

    if (missingHandlers.length > 0) {
      fail(`Missing @Process handlers for: ${missingHandlers.join(', ')}`);
    }
  });
});
```

---

## Adding New Job Types

### ✅ Correct Process

1. **Add constant** to `constants/job-names.ts`:
   ```typescript
   export const PROPOSAL_REGENERATE_JOB = 'regenerate' as const;

   export const PROPOSAL_JOB_NAMES = [
     PROPOSAL_GENERATE_JOB,
     PROPOSAL_REGENERATE_JOB,  // Add here
   ] as const;
   ```

2. **Add handler** to `proposal.processor.ts`:
   ```typescript
   @Process(PROPOSAL_REGENERATE_JOB)
   async handleRegenerate(job: Job<RegenerateJobData>) {
     // Implementation
   }
   ```

3. **Update test** in `proposal.processor.spec.ts`:
   ```typescript
   const expectedHandlers = {
     [PROPOSAL_GENERATE_JOB]: 'handleGenerate',
     [PROPOSAL_REGENERATE_JOB]: 'handleRegenerate',  // Add here
   };
   ```

4. **Use when enqueueing**:
   ```typescript
   await this.proposalQueue.add(PROPOSAL_REGENERATE_JOB, data);
   ```

### ❌ Common Mistakes

```typescript
// ❌ WRONG - Hard-coded string
await this.proposalQueue.add('regenerate', data);

// ❌ WRONG - Typo in processor
@Process('regenrate')  // Missing 'e'
async handleRegenerate(job: Job) { ... }

// ❌ WRONG - Forgetting to add handler
// Added constant, but no @Process method

// ❌ WRONG - Forgetting to update test
// Tests won't catch missing handler
```

---

## Debugging Job Issues

### Check if jobs are being enqueued

```bash
# Redis CLI
redis-cli

# List all keys
keys *

# Check proposal queue
smembers "bull:proposal:waiting"
smembers "bull:proposal:active"
smembers "bull:proposal:completed"
smembers "bull:proposal:failed"
```

### Check job data

```bash
# Get job details
hgetall "bull:proposal:123"  # Replace 123 with job ID
```

### Monitor logs

```bash
# Backend logs should show:
# ✅ "Validating proposal queue job handlers..."
# ✅ "All 2 proposal job handlers registered correctly"
# ✅ "Starting proposal generation job 123 for proposal abc"
```

### Common Error Messages

```
❌ "Missing Bull queue handlers for jobs: generate-from-transcription"
→ Fix: Add @Process('generate-from-transcription') handler

❌ "Proposal stuck in 'generating' status"
→ Fix: Check job name matches between service and processor

❌ "Job 123 failed: Proposal not found"
→ Fix: Ensure proposal record created before enqueueing job
```

---

## Best Practices

### 1. Always Use Constants
```typescript
// ✅ GOOD
await this.proposalQueue.add(PROPOSAL_GENERATE_JOB, data);

// ❌ BAD
await this.proposalQueue.add('generate', data);
```

### 2. Type Your Job Data
```typescript
// ✅ GOOD
await this.proposalQueue.add<GenerateProposalJobData>(
  PROPOSAL_GENERATE_JOB,
  { proposalId, tenantId, sections }
);

// ❌ BAD
await this.proposalQueue.add(PROPOSAL_GENERATE_JOB, { data: 'anything' });
```

### 3. Handle Errors Gracefully
```typescript
// ✅ GOOD
try {
  // Process job
} catch (error) {
  this.logger.error(`Job failed:`, error);
  await this.revertProposalStatus(proposalId);
  throw error;  // Let Bull retry
}

// ❌ BAD
try {
  // Process job
} catch (error) {
  // Swallow error silently
  return { success: false };
}
```

### 4. Log Progress
```typescript
// ✅ GOOD
this.logger.log(`Starting job ${job.id} for proposal ${proposalId}`);
this.logger.log(`Generated ${sections.length} sections`);
this.logger.log(`Job ${job.id} completed. Cost: $${cost}`);

// ❌ BAD
// No logging - impossible to debug
```

### 5. Test Job Handlers
```typescript
// ✅ GOOD
it('should have handlers for all job names', () => {
  // Verify handlers exist
});

// ❌ BAD
// No tests for job registration
```

---

## Monitoring & Observability

### CloudWatch Metrics

Track these metrics for queue health:

```typescript
await this.metrics.trackQueueMetrics(
  processing: queue.getActiveCount(),
  waiting: queue.getWaitingCount(),
  failed: queue.getFailedCount(),
);
```

### Sentry Error Tracking

Jobs failures are automatically captured by Sentry:

```typescript
@Process(PROPOSAL_GENERATE_JOB)
async handleGenerate(job: Job) {
  try {
    // Process
  } catch (error) {
    Sentry.captureException(error, {
      tags: { jobId: job.id, proposalId: job.data.proposalId },
    });
    throw error;
  }
}
```

### Health Checks

Add a health endpoint to verify queue connectivity:

```typescript
@Get('health/queue')
async checkQueueHealth() {
  const isReady = await this.proposalQueue.isReady();
  const activeCount = await this.proposalQueue.getActiveCount();
  const waitingCount = await this.proposalQueue.getWaitingCount();

  return {
    status: isReady ? 'healthy' : 'unhealthy',
    active: activeCount,
    waiting: waitingCount,
  };
}
```

---

## Troubleshooting

### Issue: Jobs not processing

**Symptoms:**
- Proposals stuck in "generating" status
- Queue has jobs in waiting, but they never move to active

**Diagnosis:**
```bash
# Check if worker is running
ps aux | grep node

# Check Redis connection
redis-cli ping

# Check queue status
redis-cli smembers "bull:proposal:waiting"
```

**Fixes:**
1. Verify job name matches between enqueue and @Process
2. Check processor is registered in module providers
3. Ensure Redis is running
4. Restart backend to reload workers

### Issue: Jobs failing repeatedly

**Symptoms:**
- Jobs in "failed" queue
- Proposals reverting to "draft" status

**Diagnosis:**
Check logs for error messages:
```
Job 123 failed: OpenAI API error
Job 123 failed: Proposal abc not found
```

**Fixes:**
1. Verify proposal record exists before enqueueing
2. Check OpenAI API key is valid
3. Verify database connection
4. Check job data structure matches expected interface

### Issue: Memory leaks

**Symptoms:**
- Backend memory usage grows over time
- Redis memory usage grows

**Diagnosis:**
```bash
# Check Redis memory
redis-cli info memory

# Check completed jobs
redis-cli zcard "bull:proposal:completed"
```

**Fixes:**
1. Configure job retention:
   ```typescript
   await this.proposalQueue.add(JOB_NAME, data, {
     removeOnComplete: 1000,  // Keep last 1000
     removeOnFail: 5000,      // Keep last 5000 failures
   });
   ```

2. Clean old jobs periodically:
   ```typescript
   await this.proposalQueue.clean(24 * 3600 * 1000);  // 24 hours
   ```

---

## Migration Guide

If you have existing hard-coded job names:

### Before
```typescript
// proposals.service.ts
await this.proposalQueue.add('generate', data);
await this.proposalQueue.add('generate-from-transcription', data);

// proposal.processor.ts
@Process('generate')
async handleGenerate() { ... }

@Process('generate-proposal-from-transcription')
async handleLegacy() { ... }
```

### After
```typescript
// constants/job-names.ts
export const PROPOSAL_GENERATE_JOB = 'generate' as const;
export const PROPOSAL_GENERATE_FROM_TRANSCRIPTION_JOB =
  'generate-proposal-from-transcription' as const;

// proposals.service.ts
import { PROPOSAL_GENERATE_JOB } from './constants/job-names';
await this.proposalQueue.add(PROPOSAL_GENERATE_JOB, data);

// proposal.processor.ts
import { PROPOSAL_GENERATE_JOB } from '../constants/job-names';

@Process(PROPOSAL_GENERATE_JOB)
async handleGenerate() { ... }
```

---

## References

- **Bull Documentation:** https://github.com/OptimalBits/bull
- **NestJS Bull Module:** https://docs.nestjs.com/techniques/queues
- **Redis Documentation:** https://redis.io/documentation

---

**Last Updated:** October 29, 2025
**Maintained by:** SaasPE Backend Team
