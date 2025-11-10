# Journey System Quick Start Guide

## Installation

First, install the missing dependency:

```bash
npm install @radix-ui/react-radio-group
```

## Using the Journey System

### 1. Access Journey State

```typescript
import { useCustomerJourney } from '@/lib/journey/use-customer-journey';

function MyComponent() {
  const journey = useCustomerJourney();

  // Current state
  console.log(journey.currentStep);        // 'discovery' | 'client' | etc.
  console.log(journey.completedSteps);     // Set<JourneyStep>
  console.log(journey.progressPercentage); // 0-100
  console.log(journey.isComplete);         // boolean

  // Metadata
  console.log(journey.metadata.companyName);
  console.log(journey.metadata.firstClientId);

  // Actions
  journey.goToNextStep();
  journey.markStepComplete('client', { firstClientId: '123' });
  journey.skipStep('warmup');
  journey.updateMetadata({ companyName: 'New Name' });
}
```

### 2. Mark Steps Complete

When a user completes a key action, mark the step complete:

```typescript
// After client creation
journey.markStepComplete('client', {
  firstClientId: clientId,
  firstClientName: clientName,
});

// After proposal generation
journey.markStepComplete('proposal', {
  firstProposalId: proposalId,
});

// After playbook creation
journey.markStepComplete('playbook', {
  playbookId: playbookId,
  playbookGoogleDocUrl: docUrl,
});
```

### 3. Use Journey Action Panels

Add contextual CTAs to guide users:

```typescript
import { JourneyActionPanel } from '@/components/journey/JourneyActionPanel';
import { useCustomerJourney } from '@/lib/journey/use-customer-journey';
import { useRouter } from 'next/navigation';

function ClientsPage() {
  const router = useRouter();
  const journey = useCustomerJourney();

  return (
    <div>
      {!journey.isStepComplete('proposal') && (
        <JourneyActionPanel
          title="Create Your First Proposal"
          description="You've added a client! Now generate an AI-powered proposal."
          icon="📄"
          primaryAction={{
            label: "Create Proposal",
            onClick: () => router.push('/dashboard/proposals/new')
          }}
          secondaryAction={{
            label: "Skip for now",
            onClick: () => journey.skipStep('proposal')
          }}
        />
      )}

      {/* Your regular page content */}
    </div>
  );
}
```

### 4. Check Step Completion

```typescript
// Check if user can access a feature
if (journey.isStepComplete('discovery')) {
  // Show advanced features
}

// Check if step is accessible
if (journey.canAccessStep('campaign')) {
  // Allow access
}

// Get next action
const nextAction = journey.nextAction;
console.log(nextAction.label);       // "Create First Client"
console.log(nextAction.route);       // "/dashboard/clients"
console.log(nextAction.description); // "Add your first client to get started"
```

## API Usage

### Journey API

```typescript
import { journeyApi } from '@/lib/api/endpoints/journey';

// Get current status
const state = await journeyApi.getStatus();

// Complete a step
await journeyApi.completeStep('client', {
  firstClientId: '123',
  firstClientName: 'Acme Corp'
});

// Skip a step
await journeyApi.skipStep('warmup');

// Update metadata
await journeyApi.updateMetadata({
  companyName: 'New Company Name'
});
```

### Company Profile API

```typescript
import { companyProfileApi } from '@/lib/api/endpoints/company-profile';

// Get profile
const profile = await companyProfileApi.get();

// Create profile
const newProfile = await companyProfileApi.create({
  companyName: 'Acme Corp',
  website: 'https://acme.com',
  industry: 'Technology',
  targetICP: 'B2B SaaS founders',
  preferredTone: 'professional'
});

// Analyze website
const analysis = await companyProfileApi.analyzeWebsite('https://acme.com');
console.log(analysis.data.description);
console.log(analysis.data.services);
console.log(analysis.data.industry);
```

## Journey Steps

1. **discovery** - Company profile & ICP definition
2. **client** - First client creation
3. **proposal** - First proposal generation
4. **playbook** - Playbook creation (scripts & campaign structure)
5. **mailboxes** - Email account connection
6. **warmup** - Email warmup setup
7. **campaign** - First campaign creation
8. **complete** - Journey finished

## Journey Metadata Fields

```typescript
interface JourneyMetadata {
  // Discovery
  companyProfileId?: string;
  companyName?: string;
  website?: string;
  industry?: string;
  targetICP?: string;
  preferredTone?: string;

  // Client
  firstClientId?: string;
  firstClientName?: string;
  firstTranscriptionId?: string;

  // Proposal
  firstProposalId?: string;

  // Playbook
  playbookId?: string;
  playbookGoogleDocUrl?: string;

  // Mailboxes
  connectedMailboxIds?: string[];

  // Warmup
  warmupConfigured?: boolean;

  // Campaign
  firstCampaignId?: string;

  // Tracking
  skippedSteps?: JourneyStep[];
  lastCompletedAt?: Date;
}
```

## Common Patterns

### Pattern 1: Redirect to Next Step After Action

```typescript
async function handleCreateClient(data) {
  const client = await createClient(data);

  journey.markStepComplete('client', {
    firstClientId: client.id,
    firstClientName: client.name,
  });

  // Auto-redirect to next step
  journey.goToNextStep();
}
```

### Pattern 2: Conditional UI Based on Journey

```typescript
function Dashboard() {
  const journey = useCustomerJourney();

  return (
    <div>
      {journey.currentStep === 'discovery' && (
        <OnboardingWelcome />
      )}

      {journey.isStepComplete('discovery') && !journey.isStepComplete('client') && (
        <CreateClientPrompt />
      )}

      {journey.isComplete && (
        <SuccessDashboard />
      )}
    </div>
  );
}
```

### Pattern 3: Progress Indicator

```typescript
function CustomProgressBar() {
  const journey = useCustomerJourney();

  return (
    <div>
      <div className="text-sm text-gray-600 mb-2">
        Onboarding Progress: {journey.progressPercentage}%
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all"
          style={{ width: `${journey.progressPercentage}%` }}
        />
      </div>
    </div>
  );
}
```

## Debugging

### View Journey State

Open browser console and type:

```javascript
// Access journey context from React DevTools
// or add debug logging in your component

console.log('Current Step:', journey.currentStep);
console.log('Completed:', Array.from(journey.completedSteps));
console.log('Metadata:', journey.metadata);
console.log('Progress:', journey.progressPercentage + '%');
```

### Reset Journey (Development Only)

```typescript
journey.resetJourney(); // Resets to 'discovery' step
```

## Troubleshooting

### Journey State Not Loading
- Check that component is wrapped in `JourneyProvider`
- Verify API endpoint `/api/v1/journey` is responding
- Check browser console for errors

### Steps Not Completing
- Ensure `markStepComplete()` is called after action
- Verify API endpoint `/api/v1/journey/complete-step` exists
- Check that metadata is being passed correctly

### Progress Banner Not Showing
- Journey must not be complete (`journey.isComplete === false`)
- Must not be on `/dashboard/onboarding` page
- Check that JourneyProgress component is rendered in layout

### Sidebar Badges Not Appearing
- Verify journey is active (`!journey.isComplete`)
- Check that route mapping in `getStepForRoute()` is correct
- Ensure sidebar is using `useCustomerJourney()` hook

## Best Practices

1. **Always mark steps complete**: Call `markStepComplete()` after significant actions
2. **Provide skip options**: Allow users to skip non-critical steps
3. **Use metadata**: Store IDs and context for future reference
4. **Show progress**: Use progress indicators to motivate completion
5. **Test thoroughly**: Test all step transitions and edge cases
6. **Handle errors**: Gracefully handle API failures
7. **Respect user choice**: Don't force linear progression if not necessary

## Example: Complete Flow

```typescript
// 1. User completes discovery
function DiscoveryWizard() {
  const journey = useCustomerJourney();

  async function handleComplete(data) {
    const profile = await companyProfileApi.create(data);

    journey.markStepComplete('discovery', {
      companyProfileId: profile.data.id,
      companyName: data.companyName,
      website: data.website,
      industry: data.industry,
      targetICP: data.targetICP,
      preferredTone: data.preferredTone,
    });

    journey.goToNextStep(); // Goes to 'client' step
  }
}

// 2. User creates client
function ClientForm() {
  const journey = useCustomerJourney();

  async function handleSubmit(data) {
    const client = await createClient(data);

    journey.markStepComplete('client', {
      firstClientId: client.id,
      firstClientName: client.name,
    });

    journey.goToNextStep(); // Goes to 'proposal' step
  }
}

// 3. User generates proposal
function ProposalGenerator() {
  const journey = useCustomerJourney();

  async function handleGenerate() {
    const proposal = await generateProposal({
      clientId: journey.metadata.firstClientId,
    });

    journey.markStepComplete('proposal', {
      firstProposalId: proposal.id,
    });

    journey.goToNextStep(); // Goes to 'playbook' step
  }
}
```

---

For more details, see:
- Main implementation: `/src/lib/journey/journey-context.tsx`
- Types: `/src/lib/journey/types.ts`
- Components: `/src/components/journey/`
- Full documentation: `/FRONTEND_JOURNEY_IMPLEMENTATION_SUMMARY.md`
