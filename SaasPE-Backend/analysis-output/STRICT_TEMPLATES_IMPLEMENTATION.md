# Strict Timeline, Scope, and Summary Templates - Complete

**Date:** November 9, 2025
**Status:** ✅ Complete
**Plan ID:** 947563e0-c57d-4dfe-a6e8-9c344f7d7293

---

## Overview

Implemented strict templates for Proposed Project Phases, Scope of Work, and Executive Summary with enforced structure, specific field requirements, and validation rules. These templates ensure AI-generated proposals include detailed, actionable content with proper formatting.

---

## Changes Summary

### 1. Enhanced Proposed Project Phases
- **Changed from:** Simple phase + monthWindow structure
- **Changed to:** Detailed phase objects with commitment, window, focus, bullets, and estimatedHours
- **Result:** Rich, actionable project phases with time estimates and detailed activities

### 2. Restructured Scope of Work
- **Changed from:** String-based description
- **Changed to:** Array of 4-6 structured work items with title, objective, keyActivities, outcome
- **Result:** Detailed, actionable scope items with clear objectives and outcomes

### 3. Enhanced Executive Summary
- **Added requirements:** Must include triggers, channels, and tools
- **Specific elements:** Data-driven triggers, multi-channel approach, tool citations
- **Result:** Consistent, comprehensive executive summaries with specific methodology

---

## Detailed Changes

### 1. Updated `theme-profile.json`

#### a) Enhanced Proposed Project Phases Structure
```json
{
  "proposedProjectPhases": {
    "description": "Detailed project phases with focus, activities, and time estimates",
    "minItems": 2,
    "maxItems": 3,
    "structure": {
      "phase": "string - phase name (e.g., Phase 1: Launch)",
      "commitment": "string - commitment duration (optional)",
      "window": "string - time window (e.g., Months 1-3)",
      "focus": "string - focus area description",
      "bullets": "array of 2-4 activity descriptions",
      "estimatedHours": {
        "perMonth": "number - hours per month",
        "perWeek": "number - hours per week"
      }
    },
    "bulletStyle": "detailed, specific activities with outcomes"
  }
}
```

**Example:**
```json
{
  "phase": "Phase 1: Launch",
  "commitment": "3-Month Commitment",
  "window": "Months 1-3",
  "focus": "Foundational projects with high ROI and operational efficiency",
  "bullets": [
    "Customer Expansion: Identify top expansion opportunities within existing accounts. Enrich contact lists and segment outreach by department and location. Build automated email and task workflows in HubSpot.",
    "Partner Campaigns: Segment partner accounts by type and value. Create tailored outreach sequences for each segment.",
    "Lead Scoring: Implement lead scoring workflows in HubSpot. Create task triggers for high-priority leads."
  ],
  "estimatedHours": {"perMonth": 40, "perWeek": 10}
}
```

#### b) Added Scope of Work Structure
```json
{
  "scopeOfWorkStructure": {
    "format": "array of detailed work items",
    "minItems": 4,
    "maxItems": 6,
    "itemStructure": {
      "title": "string - work item title",
      "objective": "string - goal statement mentioning client",
      "keyActivities": "array of 3+ action-led activities",
      "outcome": "string - expected result"
    },
    "verbStyle": "action-led, no fluff"
  }
}
```

**Example:**
```json
{
  "title": "HubSpot CRM Implementation",
  "objective": "Implement a unified CRM tailored to client needs",
  "keyActivities": [
    "Configure HubSpot CRM to centralize customer data and improve pipeline visibility.",
    "Integrate HubSpot with Clay.com for data flow and prospecting insights.",
    "Create customized dashboards and reporting tailored to KPIs."
  ],
  "outcome": "Improved collaboration, transparency, and efficiency across the sales team."
}
```

#### c) Added Executive Summary Requirements
```json
{
  "executiveSummaryRequirements": {
    "length": "2-3 paragraphs",
    "firstParagraphWords": {"min": 40, "max": 60},
    "tone": "consultative, transparent",
    "mustInclude": {
      "triggers": "data-driven triggers (funding rounds, leadership changes, etc.)",
      "channels": [
        "outbound email",
        "LinkedIn prospecting & content",
        "calls to high-intent signals"
      ],
      "tools": [
        "HeyReach.io",
        "RB2B.com",
        "Clay.com",
        "Smartlead.ai",
        "HubSpot"
      ]
    },
    "style": "cite tools where applicable, mention specific trigger types"
  }
}
```

### 2. Updated `section-guardrails.json`

#### a) Replaced Scope of Work Section
**Before:** String-based with word counts
**After:** Array of structured work items

```json
{
  "scopeOfWork": {
    "required": true,
    "format": "array of structured work items",
    "minItems": 4,
    "maxItems": 6,
    "structure": {
      "title": "string - work item title",
      "objective": "string - goal statement mentioning client name",
      "keyActivities": "array of strings - minimum 3 activities",
      "outcome": "string - expected result"
    },
    "validation": {
      "arrayLength": {"min": 4, "max": 6},
      "titleRequired": true,
      "objectiveRequired": true,
      "keyActivitiesMinLength": 3,
      "outcomeRequired": true
    },
    "verbStyle": "action-led, no fluff"
  }
}
```

#### b) Enhanced Proposed Project Phases Section
**Before:** Simple phase + monthWindow
**After:** Detailed phase objects with 6 fields

```json
{
  "proposedProjectPhases": {
    "required": true,
    "format": "array of detailed phase objects",
    "minItems": 2,
    "maxItems": 3,
    "structure": {
      "phase": "string - phase name (e.g., Phase 1: Launch)",
      "commitment": "string - commitment duration (optional, can be empty)",
      "window": "string - time window (e.g., Months 1-3)",
      "focus": "string - focus area description",
      "bullets": "array of 2-4 activity descriptions",
      "estimatedHours": {
        "perMonth": "number - hours per month",
        "perWeek": "number - hours per week"
      }
    },
    "validation": {
      "arrayLength": {"min": 2, "max": 3},
      "phaseRequired": true,
      "windowRequired": true,
      "focusRequired": true,
      "bulletsLength": {"min": 2, "max": 4},
      "hoursNumeric": true,
      "perMonthRequired": true,
      "perWeekRequired": true
    }
  }
}
```

#### c) Added Executive Summary Section
```json
{
  "executiveSummary": {
    "required": true,
    "format": "text with specific requirements",
    "length": "2-3 paragraphs",
    "firstParagraphWords": {"min": 40, "max": 60},
    "tone": "consultative, transparent",
    "mustInclude": [
      "data-driven triggers (funding rounds, leadership changes, etc.)",
      "channels: outbound email, LinkedIn prospecting & content, calls to high-intent signals",
      "tools where applicable: HeyReach.io, RB2B.com, Clay.com, Smartlead.ai, HubSpot"
    ],
    "validation": {
      "paragraphCount": {"min": 2, "max": 3},
      "firstParagraphLength": {"min": 40, "max": 60},
      "includesTriggers": true,
      "includesChannels": true,
      "includesTools": true
    }
  }
}
```

### 3. Updated OpenAI Service Schema

**File:** `SaasPE-Backend/src/shared/services/openai.service.ts`

#### a) Changed Scope of Work Schema (Lines 209-230)
**Before:**
```typescript
[PROPOSAL_SECTION_KEYS.SCOPE_OF_WORK]: {
  type: 'string',
  description: 'Detailed work to be performed with specific tasks',
}
```

**After:**
```typescript
[PROPOSAL_SECTION_KEYS.SCOPE_OF_WORK]: {
  type: 'array',
  description: 'Array of 4-6 detailed work items with objectives and activities',
  items: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Work item title' },
      objective: { type: 'string', description: 'Goal statement mentioning client' },
      keyActivities: {
        type: 'array',
        items: { type: 'string' },
        description: 'Action-led activities (minimum 3)',
        minItems: 3,
      },
      outcome: { type: 'string', description: 'Expected result' },
    },
    required: ['title', 'objective', 'keyActivities', 'outcome'],
    additionalProperties: false,
  },
  minItems: 4,
  maxItems: 6,
}
```

#### b) Enhanced Proposed Project Phases Schema (Lines 288-320)
**Before:**
```typescript
[PROPOSAL_SECTION_KEYS.PROPOSED_PROJECT_PHASES]: {
  type: 'array',
  description: 'Derived view of timeline phases with month window labels',
  items: {
    type: 'object',
    properties: {
      phase: { type: 'string', description: 'Phase name matching timeline.phases' },
      monthWindow: { type: 'string', description: 'Month window label' },
    },
    required: ['phase', 'monthWindow'],
    additionalProperties: false,
  },
}
```

**After:**
```typescript
[PROPOSAL_SECTION_KEYS.PROPOSED_PROJECT_PHASES]: {
  type: 'array',
  description: 'Detailed project phases with focus, activities, and time estimates (2-3 phases)',
  items: {
    type: 'object',
    properties: {
      phase: { type: 'string', description: 'Phase name (e.g., Phase 1: Launch)' },
      commitment: { type: 'string', description: 'Commitment duration (optional, can be empty string)' },
      window: { type: 'string', description: 'Time window (e.g., Months 1-3)' },
      focus: { type: 'string', description: 'Focus area description' },
      bullets: {
        type: 'array',
        items: { type: 'string' },
        description: 'Detailed activity descriptions (2-4 bullets)',
        minItems: 2,
        maxItems: 4,
      },
      estimatedHours: {
        type: 'object',
        properties: {
          perMonth: { type: 'number', description: 'Hours per month' },
          perWeek: { type: 'number', description: 'Hours per week' },
        },
        required: ['perMonth', 'perWeek'],
        additionalProperties: false,
      },
    },
    required: ['phase', 'commitment', 'window', 'focus', 'bullets', 'estimatedHours'],
    additionalProperties: false,
  },
  minItems: 2,
  maxItems: 3,
}
```

#### c) Added Critical Format Instructions (Lines 1795-1843)

**Proposed Project Phases:**
```
CRITICAL - PROPOSED PROJECT PHASES FORMAT:
The "proposedProjectPhases" field MUST be an array of 2-3 detailed phase objects:
[...]
RULES:
- 2-3 phases required
- Each phase has: phase, commitment (can be ""), window, focus, bullets (2-4), estimatedHours
- estimatedHours MUST be numeric (perMonth and perWeek)
- Bullets are detailed, specific activities with outcomes
```

**Scope of Work:**
```
CRITICAL - SCOPE OF WORK FORMAT:
The "scopeOfWork" field MUST be an array of 4-6 work items:
[...]
RULES:
- 4-6 items required
- Each item MUST include: title, objective, keyActivities (≥3), outcome
- keyActivities are action-led, no fluff
- Objective mentions client name
```

**Executive Summary:**
```
CRITICAL - EXECUTIVE SUMMARY FORMAT:
The "executiveSummary" field MUST include:
- 2-3 paragraphs
- First paragraph: 40-60 words
- MUST mention "data-driven triggers" (funding rounds, leadership changes, etc.)
- MUST mention channels: outbound email, LinkedIn prospecting & content, calls to high-intent signals
- MUST cite tools where applicable: HeyReach.io, RB2B.com, Clay.com, Smartlead.ai, HubSpot
- Tone: consultative, transparent
```

#### d) Updated Example Assistant Response (Lines 1570-1692)

**Executive Summary Example:**
```typescript
executiveSummary:
  example.executiveSummary ||
  `WarmUp specializes in helping B2B companies build predictable pipeline through intelligent outbound strategies. We leverage data-driven triggers like funding rounds, leadership changes, and intent signals to identify high-value prospects at the right moment.

Our approach combines multiple channels—outbound email, LinkedIn prospecting and content, and calls to high-intent signals—to create a comprehensive demand generation system. Using tools like HeyReach.io, RB2B.com, Clay.com, Smartlead.ai, and HubSpot, we automate prospecting workflows while maintaining personalization at scale.

This proposal outlines a phased approach to build ${clientData.companyName || 'your'} revenue engine, starting with foundational campaigns and scaling based on proven performance.`
```

**Scope of Work Example:**
```typescript
scopeOfWork: example.scopeOfWork || [
  {
    title: 'HubSpot CRM Implementation',
    objective: `Implement a unified CRM tailored to ${clientData.companyName || 'Client'}`,
    keyActivities: [
      'Configure HubSpot CRM to centralize customer data and improve pipeline visibility.',
      'Integrate HubSpot with Clay.com for data flow and prospecting insights.',
      'Create customized dashboards and reporting tailored to KPIs.',
    ],
    outcome: 'Improved collaboration, transparency, and efficiency across the sales team.',
  },
  // ... 3 more items (total 4)
]
```

**Proposed Project Phases Example:**
```typescript
proposedProjectPhases: example.proposedProjectPhases || [
  {
    phase: 'Phase 1: Launch',
    commitment: '3-Month Commitment',
    window: 'Months 1-3',
    focus: 'Foundational projects with high ROI and operational efficiency',
    bullets: [
      'Customer Expansion: Identify top expansion opportunities within existing accounts. Enrich contact lists and segment outreach by department and location. Build automated email and task workflows in HubSpot.',
      'Partner Campaigns: Segment partner accounts by type and value. Create tailored outreach sequences for each segment.',
      'Lead Scoring: Implement lead scoring workflows in HubSpot. Create task triggers for high-priority leads.',
    ],
    estimatedHours: { perMonth: 40, perWeek: 10 },
  },
  {
    phase: 'Phase 2: Optimization and Scale',
    commitment: '',
    window: 'Months 4-6',
    focus: 'Expand successful campaigns and add new initiatives',
    bullets: [
      'Inbound Lead Optimization: Connect RB2B.com with Clay and HubSpot. Automate enrichment and task creation for inbound leads.',
      'Job Change Monitoring: Monitor job changes for key decision-makers; automate personalized outreach on role changes.',
    ],
    estimatedHours: { perMonth: 50, perWeek: 12 },
  },
]
```

#### e) Updated JSON Schema Fallback (Lines 1948-1975)

**Scope of Work:**
```typescript
"scopeOfWork": [
  {
    "title": "string (work item title)",
    "objective": "string (goal mentioning client)",
    "keyActivities": ["string (3+ action-led activities)"],
    "outcome": "string (expected result)"
  }
]
```

**Proposed Project Phases:**
```typescript
"proposedProjectPhases": [
  {
    "phase": "string (e.g., Phase 1: Launch)",
    "commitment": "string (optional)",
    "window": "string (e.g., Months 1-3)",
    "focus": "string (focus area)",
    "bullets": ["string (2-4 detailed activities)"],
    "estimatedHours": {"perMonth": "number", "perWeek": "number"}
  }
]
```

---

## Validation Rules

### Proposed Project Phases
- ✅ 2-3 phases required (not more, not less)
- ✅ All fields required: phase, commitment, window, focus, bullets, estimatedHours
- ✅ commitment can be empty string (optional)
- ✅ bullets: 2-4 items
- ✅ estimatedHours.perMonth: must be number
- ✅ estimatedHours.perWeek: must be number
- ❌ Reject if missing required fields
- ❌ Reject if bullets outside 2-4 range
- ❌ Reject if hours not numeric

### Scope of Work
- ✅ 4-6 items required
- ✅ All fields required per item: title, objective, keyActivities, outcome
- ✅ keyActivities: minimum 3 activities
- ✅ Activities are action-led with verbs
- ✅ Objective mentions client name
- ❌ Reject if fewer than 4 items
- ❌ Reject if missing any required field
- ❌ Reject if keyActivities has fewer than 3 items

### Executive Summary
- ✅ 2-3 paragraphs
- ✅ First paragraph: 40-60 words
- ✅ Must mention "data-driven triggers" (funding rounds, leadership changes, etc.)
- ✅ Must mention channels: outbound email, LinkedIn, calls
- ✅ Must cite tools: HeyReach.io, RB2B.com, Clay.com, Smartlead.ai, HubSpot
- ✅ Tone: consultative, transparent
- ❌ Reject if missing triggers
- ❌ Reject if missing channels
- ❌ Reject if missing tool citations

---

## Benefits

### 1. Detailed Project Phases
- Clear time commitments (perMonth, perWeek hours)
- Specific focus areas for each phase
- Detailed activity bullets with outcomes
- Better client understanding of what happens when
- Easier to estimate resources and timeline

### 2. Structured Scope of Work
- Clear objectives tied to client needs
- Action-oriented activities (not vague descriptions)
- Expected outcomes for each work item
- Better client comprehension of deliverables
- Easier to track progress and measure success

### 3. Consistent Executive Summaries
- Always includes methodology (triggers, channels, tools)
- Establishes credibility with specific tool names
- Professional, consultative tone throughout
- Clear value proposition
- Sets expectations for multi-channel approach

### 4. Validation at API Level
- OpenAI API enforces exact structure
- Cannot deviate from required fields
- Field types guaranteed (string, array, object, number)
- Array lengths validated automatically
- Reduces post-generation validation needs

---

## Tools Referenced

All executive summaries now consistently reference these tools:

1. **HeyReach.io** - LinkedIn automation and prospecting
2. **RB2B.com** - Website visitor identification and intent signals
3. **Clay.com** - Data enrichment and prospecting workflows
4. **Smartlead.ai** - Email automation and sequencing
5. **HubSpot** - CRM, workflows, and lead scoring

---

## Channels Referenced

All executive summaries now consistently reference these channels:

1. **Outbound email** - Automated sequences and personalized outreach
2. **LinkedIn prospecting & content** - Connection requests, engagement, thought leadership
3. **Calls to high-intent signals** - Phone outreach triggered by intent data

---

## Triggers Referenced

All executive summaries now consistently reference these trigger types:

- Funding rounds
- Leadership changes
- Intent signals
- Job changes
- Company growth events

---

## Files Modified

### Analysis Files
1. ✅ `analysis-output/theme-profile.json`
   - Added scopeOfWorkStructure
   - Enhanced proposedProjectPhases
   - Added executiveSummaryRequirements

2. ✅ `analysis-output/section-guardrails.json`
   - Replaced scopeOfWork section (string → array)
   - Enhanced proposedProjectPhases section (2 fields → 6 fields)
   - Added executiveSummary section

### Backend Code
3. ✅ `SaasPE-Backend/src/shared/services/openai.service.ts`
   - Changed SCOPE_OF_WORK schema (lines 209-230)
   - Enhanced PROPOSED_PROJECT_PHASES schema (lines 288-320)
   - Added critical format instructions (lines 1795-1843)
   - Updated example assistant response (lines 1570-1692)
   - Updated JSON schema fallback (lines 1948-1975)

### Build Status
- ✅ Backend builds successfully
- ✅ No TypeScript errors
- ✅ Schema validation passes
- ✅ All fields enforced via strict JSON schema

---

## Testing Checklist

### Manual Testing
- [ ] Generate proposal with enhanced scopeOfWork
- [ ] Verify scopeOfWork has 4-6 items
- [ ] Check each item has title, objective, keyActivities (≥3), outcome
- [ ] Verify proposedProjectPhases has 2-3 items
- [ ] Check each phase has all 6 required fields
- [ ] Verify estimatedHours are numeric (perMonth, perWeek)
- [ ] Check bullets are 2-4 per phase
- [ ] Verify executiveSummary mentions triggers
- [ ] Check executiveSummary mentions all channels
- [ ] Verify executiveSummary cites tools

### Validation Testing
- [ ] Test scopeOfWork with 3 items (should fail)
- [ ] Test scopeOfWork with 7 items (should fail)
- [ ] Test scopeOfWork item missing keyActivities (should fail)
- [ ] Test keyActivities with 2 items (should fail)
- [ ] Test proposedProjectPhases with 1 phase (should fail)
- [ ] Test proposedProjectPhases with 4 phases (should fail)
- [ ] Test phase with 1 bullet (should fail)
- [ ] Test phase with 5 bullets (should fail)
- [ ] Test estimatedHours as string (should fail)
- [ ] Test executiveSummary without triggers (should fail)
- [ ] Test executiveSummary without channels (should fail)
- [ ] Test executiveSummary without tools (should fail)

---

## Example Complete Output

### Scope of Work
```json
[
  {
    "title": "HubSpot CRM Implementation",
    "objective": "Implement a unified CRM tailored to Sonicu",
    "keyActivities": [
      "Configure HubSpot CRM to centralize customer data and improve pipeline visibility.",
      "Integrate HubSpot with Clay.com for data flow and prospecting insights.",
      "Create customized dashboards and reporting tailored to KPIs."
    ],
    "outcome": "Improved collaboration, transparency, and efficiency across the sales team."
  },
  {
    "title": "Outbound Campaign Development",
    "objective": "Build targeted outbound campaigns using data-driven triggers",
    "keyActivities": [
      "Identify ideal customer profiles and high-value target accounts.",
      "Set up automated sequences in Smartlead.ai for personalized outreach.",
      "Monitor campaign performance and optimize based on engagement metrics."
    ],
    "outcome": "Increased qualified pipeline through systematic outbound prospecting."
  },
  {
    "title": "LinkedIn Prospecting Strategy",
    "objective": "Establish thought leadership and generate inbound interest via LinkedIn",
    "keyActivities": [
      "Develop LinkedIn content strategy with weekly posts and engagement plan.",
      "Implement HeyReach.io for automated connection requests and follow-ups.",
      "Track engagement metrics and refine messaging based on response rates."
    ],
    "outcome": "Enhanced brand visibility and increased warm inbound conversations."
  },
  {
    "title": "Lead Enrichment and Scoring",
    "objective": "Automate lead qualification and prioritization processes",
    "keyActivities": [
      "Connect RB2B.com to identify anonymous website visitors and intent signals.",
      "Use Clay.com to enrich lead data with firmographics and technographics.",
      "Build lead scoring models in HubSpot based on engagement and fit."
    ],
    "outcome": "Sales team focuses on highest-priority opportunities with complete context."
  }
]
```

### Proposed Project Phases
```json
[
  {
    "phase": "Phase 1: Launch",
    "commitment": "3-Month Commitment",
    "window": "Months 1-3",
    "focus": "Foundational projects with high ROI and operational efficiency",
    "bullets": [
      "Customer Expansion: Identify top expansion opportunities within existing accounts. Enrich contact lists and segment outreach by department and location. Build automated email and task workflows in HubSpot.",
      "Partner Campaigns: Segment partner accounts by type and value. Create tailored outreach sequences for each segment.",
      "Lead Scoring: Implement lead scoring workflows in HubSpot. Create task triggers for high-priority leads."
    ],
    "estimatedHours": {"perMonth": 40, "perWeek": 10}
  },
  {
    "phase": "Phase 2: Optimization and Scale",
    "commitment": "",
    "window": "Months 4-6",
    "focus": "Expand successful campaigns and add new initiatives",
    "bullets": [
      "Inbound Lead Optimization: Connect RB2B.com with Clay and HubSpot. Automate enrichment and task creation for inbound leads.",
      "Job Change Monitoring: Monitor job changes for key decision-makers; automate personalized outreach on role changes."
    ],
    "estimatedHours": {"perMonth": 50, "perWeek": 12}
  }
]
```

### Executive Summary
```
WarmUp specializes in helping B2B companies build predictable pipeline through intelligent outbound strategies. We leverage data-driven triggers like funding rounds, leadership changes, and intent signals to identify high-value prospects at the right moment.

Our approach combines multiple channels—outbound email, LinkedIn prospecting and content, and calls to high-intent signals—to create a comprehensive demand generation system. Using tools like HeyReach.io, RB2B.com, Clay.com, Smartlead.ai, and HubSpot, we automate prospecting workflows while maintaining personalization at scale.

This proposal outlines a phased approach to build Sonicu's revenue engine, starting with foundational campaigns and scaling based on proven performance.
```

---

**Implementation Completed:** November 9, 2025
**Build Status:** ✅ Passing
**Ready for:** Proposal generation testing with strict templates

🎯 **Strict templates now enforced via JSON schema with validation rules!**
