# Cover Page & New Sections Implementation - Complete

**Date:** November 9, 2025
**Status:** ✅ Complete

---

## Overview

Added comprehensive proposal structure including Order Form (cover page data), Table of Contents, and three new content sections (keyPriorities, nextSteps, proposedProjectPhases) to ensure AI-generated proposals include all required elements with proper formatting and validation.

---

## Changes Made

### 1. Updated `theme-profile.json`

Added three new top-level sections:

#### a) Cover Page Format
```json
{
  "coverPageFormat": {
    "includesOrderForm": true,
    "requiredFields": {
      "client": {
        "fields": ["name", "primaryContacts"],
        "primaryContactsType": "array of strings"
      },
      "preparedBy": {
        "fields": ["name", "email"],
        "emailFormat": "valid email address"
      },
      "commercials": {
        "fields": ["costPerMonth", "currency", "billingCadence"],
        "costPerMonthType": "number (no $ symbol)",
        "currencyType": "string (e.g., USD, EUR)",
        "billingCadenceEnum": ["monthly", "annual"]
      },
      "term": {
        "fields": ["startDate", "endDate", "durationMonths"],
        "dateFormat": "ISO-8601 (YYYY-MM-DD)",
        "durationMonthsType": "number calculated from dates"
      }
    },
    "validation": {
      "startDateBeforeEndDate": true,
      "durationMonthsMatchesDates": true,
      "costPerMonthIsNumber": true,
      "billingCadenceInEnum": true
    }
  }
}
```

#### b) Table of Contents Format
```json
{
  "tableOfContentsFormat": {
    "required": true,
    "structure": "array of TOC entries",
    "entryFields": {
      "title": "string - section title",
      "page": "number or null (null in preview, filled by PDF renderer)"
    },
    "defaultSections": [
      "Overview",
      "Key Priorities",
      "Proposed Project Phases",
      "Pricing Options",
      "Next Steps",
      "Payment Terms",
      "Cancellation Notice"
    ]
  }
}
```

#### c) Additional Sections
```json
{
  "additionalSections": {
    "keyPriorities": {
      "minItems": 3,
      "maxItems": 6,
      "bulletStyle": "concise, outcome-focused"
    },
    "nextSteps": {
      "minItems": 3,
      "maxItems": 5,
      "bulletStyle": "action-led with optional owner and timeframe"
    },
    "proposedProjectPhases": {
      "description": "Derived view of timeline phases",
      "source": "timeline.phases",
      "format": "Phase name + month window label",
      "mustMatch": "timeline phases count and labels"
    }
  }
}
```

### 2. Updated `section-guardrails.json`

Added five new section specifications:

#### a) coverPageData
```json
{
  "coverPageData": {
    "required": true,
    "format": "structured JSON object",
    "structure": {
      "client": {
        "required": true,
        "fields": {
          "name": "string - client company name",
          "primaryContacts": "array of strings - contact names"
        },
        "validation": {
          "nameRequired": true,
          "primaryContactsMinLength": 1
        }
      },
      "preparedBy": {
        "required": true,
        "fields": {
          "name": "string - preparer name",
          "email": "string - valid email address"
        }
      },
      "commercials": {
        "required": true,
        "fields": {
          "costPerMonth": "number - monthly cost (no $ symbol)",
          "currency": "string - currency code",
          "billingCadence": "enum - monthly|annual"
        },
        "validation": {
          "costPerMonthType": "number",
          "billingCadenceEnum": ["monthly", "annual"]
        }
      },
      "term": {
        "required": true,
        "fields": {
          "startDate": "string - ISO-8601 date (YYYY-MM-DD)",
          "endDate": "string - ISO-8601 date (YYYY-MM-DD)",
          "durationMonths": "number - calculated from dates"
        },
        "validation": {
          "dateFormat": "ISO-8601 (YYYY-MM-DD)",
          "startBeforeEnd": true,
          "durationMatchesDates": true
        }
      }
    }
  }
}
```

#### b) tableOfContents
```json
{
  "tableOfContents": {
    "required": true,
    "format": "array of objects",
    "structure": {
      "title": "string - section title",
      "page": "number or null - null in preview"
    },
    "validation": {
      "arrayMinLength": 1,
      "titleRequired": true,
      "pageType": "number | null"
    }
  }
}
```

#### c) keyPriorities
```json
{
  "keyPriorities": {
    "required": true,
    "format": "array of strings",
    "minItems": 3,
    "maxItems": 6,
    "validation": {
      "arrayLength": { "min": 3, "max": 6 },
      "itemType": "string",
      "itemMinLength": 20,
      "itemMaxLength": 150
    },
    "style": "concise, outcome-focused bullets"
  }
}
```

#### d) nextSteps
```json
{
  "nextSteps": {
    "required": true,
    "format": "array of strings",
    "minItems": 3,
    "maxItems": 5,
    "validation": {
      "arrayLength": { "min": 3, "max": 5 },
      "itemType": "string",
      "itemMinLength": 15,
      "itemMaxLength": 120
    },
    "style": "action-led with optional owner and timeframe"
  }
}
```

#### e) proposedProjectPhases
```json
{
  "proposedProjectPhases": {
    "required": true,
    "format": "array of objects",
    "structure": {
      "phase": "string - phase name matching timeline.phases",
      "monthWindow": "string - month window label"
    },
    "validation": {
      "mustMatchTimelinePhases": true,
      "phaseNamesMustMatch": true,
      "countMustMatch": true
    },
    "derivedFrom": "timeline.phases"
  }
}
```

### 3. Updated OpenAI Service Schema

**File:** `SaasPE-Backend/src/shared/services/openai.service.ts`

**Changes:**

#### a) Updated PROPOSAL_SECTION_KEYS (Lines 85-105)
```typescript
const PROPOSAL_SECTION_KEYS = {
  // Cover Page & TOC
  COVER_PAGE_DATA: 'coverPageData',
  TABLE_OF_CONTENTS: 'tableOfContents',
  // Main Content Sections
  OVERVIEW: 'overview',
  EXECUTIVE_SUMMARY: 'executiveSummary',
  KEY_PRIORITIES: 'keyPriorities',
  OBJECTIVES_AND_OUTCOMES: 'objectivesAndOutcomes',
  SCOPE_OF_WORK: 'scopeOfWork',
  DELIVERABLES: 'deliverables',
  APPROACH_AND_TOOLS: 'approachAndTools',
  // Timeline & Phases
  TIMELINE: 'timeline',
  PROPOSED_PROJECT_PHASES: 'proposedProjectPhases',
  // Pricing & Terms
  PRICING: 'pricing',
  PAYMENT_TERMS: 'paymentTerms',
  NEXT_STEPS: 'nextSteps',
  CANCELLATION_NOTICE: 'cancellationNotice',
} as const;
```

#### b) Added to PROPOSAL_GENERATION_SCHEMA Properties (Lines 119-315)

**Cover Page Data:**
```typescript
[PROPOSAL_SECTION_KEYS.COVER_PAGE_DATA]: {
  type: 'object',
  description: 'Order form data for cover page',
  properties: {
    client: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Client company name' },
        primaryContacts: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of primary contact names',
          minItems: 1,
        },
      },
      required: ['name', 'primaryContacts'],
      additionalProperties: false,
    },
    preparedBy: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Preparer name' },
        email: { type: 'string', description: 'Valid email address' },
      },
      required: ['name', 'email'],
      additionalProperties: false,
    },
    commercials: {
      type: 'object',
      properties: {
        costPerMonth: { type: 'number', description: 'Monthly cost as number (no $ symbol)' },
        currency: { type: 'string', description: 'Currency code (e.g., USD, EUR)' },
        billingCadence: {
          type: 'string',
          enum: ['monthly', 'annual'],
          description: 'Billing frequency',
        },
      },
      required: ['costPerMonth', 'currency', 'billingCadence'],
      additionalProperties: false,
    },
    term: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Start date in ISO-8601 format (YYYY-MM-DD)' },
        endDate: { type: 'string', description: 'End date in ISO-8601 format (YYYY-MM-DD)' },
        durationMonths: { type: 'number', description: 'Duration in months (calculated from dates)' },
      },
      required: ['startDate', 'endDate', 'durationMonths'],
      additionalProperties: false,
    },
  },
  required: ['client', 'preparedBy', 'commercials', 'term'],
  additionalProperties: false,
}
```

**Table of Contents:**
```typescript
[PROPOSAL_SECTION_KEYS.TABLE_OF_CONTENTS]: {
  type: 'array',
  description: 'Table of contents entries',
  items: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Section title' },
      page: {
        type: ['number', 'null'],
        description: 'Page number (null in preview, filled by PDF renderer)',
      },
    },
    required: ['title', 'page'],
    additionalProperties: false,
  },
}
```

**Key Priorities:**
```typescript
[PROPOSAL_SECTION_KEYS.KEY_PRIORITIES]: {
  type: 'array',
  description: 'Array of 3-6 priority bullets, concise and outcome-focused',
  items: { type: 'string' },
  minItems: 3,
  maxItems: 6,
}
```

**Proposed Project Phases:**
```typescript
[PROPOSAL_SECTION_KEYS.PROPOSED_PROJECT_PHASES]: {
  type: 'array',
  description: 'Derived view of timeline phases with month window labels',
  items: {
    type: 'object',
    properties: {
      phase: { type: 'string', description: 'Phase name matching timeline.phases' },
      monthWindow: { type: 'string', description: 'Month window label (e.g., "Month 1", "Months 2-3")' },
    },
    required: ['phase', 'monthWindow'],
    additionalProperties: false,
  },
}
```

**Next Steps:**
```typescript
[PROPOSAL_SECTION_KEYS.NEXT_STEPS]: {
  type: 'array',
  description: 'Array of 3-5 action items with optional owner and timeframe',
  items: { type: 'string' },
  minItems: 3,
  maxItems: 5,
}
```

#### c) Updated Required Fields Array (Lines 321-337)
```typescript
required: [
  PROPOSAL_SECTION_KEYS.COVER_PAGE_DATA,
  PROPOSAL_SECTION_KEYS.TABLE_OF_CONTENTS,
  PROPOSAL_SECTION_KEYS.OVERVIEW,
  PROPOSAL_SECTION_KEYS.EXECUTIVE_SUMMARY,
  PROPOSAL_SECTION_KEYS.KEY_PRIORITIES,
  PROPOSAL_SECTION_KEYS.OBJECTIVES_AND_OUTCOMES,
  PROPOSAL_SECTION_KEYS.SCOPE_OF_WORK,
  PROPOSAL_SECTION_KEYS.DELIVERABLES,
  PROPOSAL_SECTION_KEYS.APPROACH_AND_TOOLS,
  PROPOSAL_SECTION_KEYS.TIMELINE,
  PROPOSAL_SECTION_KEYS.PROPOSED_PROJECT_PHASES,
  PROPOSAL_SECTION_KEYS.PRICING,
  PROPOSAL_SECTION_KEYS.PAYMENT_TERMS,
  PROPOSAL_SECTION_KEYS.NEXT_STEPS,
  PROPOSAL_SECTION_KEYS.CANCELLATION_NOTICE,
]
```

#### d) Added Critical Format Instructions (Lines 1659-1706)

**Cover Page Data Format:**
```
CRITICAL - COVER PAGE DATA FORMAT:
The "coverPageData" field MUST be a JSON object with this structure:
{
  "client": {"name": "Client Company", "primaryContacts": ["Contact 1", "Contact 2"]},
  "preparedBy": {"name": "Preparer Name", "email": "email@warmup.com"},
  "commercials": {"costPerMonth": 5500, "currency": "USD", "billingCadence": "monthly"},
  "term": {"startDate": "2025-03-10", "endDate": "2025-06-10", "durationMonths": 3}
}
RULES:
- All dates MUST be in ISO-8601 format (YYYY-MM-DD)
- costPerMonth MUST be a NUMBER (no $ symbol)
- billingCadence MUST be either "monthly" or "annual"
- startDate MUST be before endDate
- durationMonths MUST match the calculated duration from dates
- primaryContacts must have at least 1 contact
```

**Table of Contents Format:**
```
CRITICAL - TABLE OF CONTENTS FORMAT:
The "tableOfContents" field MUST be an array of objects:
[
  {"title": "Overview", "page": null},
  {"title": "Key Priorities", "page": null}
]
- Each entry must have "title" (string) and "page" (null for preview)
- Include entries for all major sections
```

**Key Priorities Format:**
```
CRITICAL - KEY PRIORITIES FORMAT:
The "keyPriorities" field MUST be an array of 3-6 strings:
["Priority 1 description", "Priority 2 description", "Priority 3 description"]
- Minimum 3 items, maximum 6 items
- Each item is concise and outcome-focused (20-150 characters)
- Focus on business outcomes, not tasks
```

**Next Steps Format:**
```
CRITICAL - NEXT STEPS FORMAT:
The "nextSteps" field MUST be an array of 3-5 strings:
["Review and approve this proposal by [Date]", "Schedule kickoff meeting (Client)", "Begin setup (WarmUp, Week 1)"]
- Minimum 3 items, maximum 5 items
- Action-led with optional owner and timeframe
- Clear, actionable items
```

**Proposed Project Phases Format:**
```
CRITICAL - PROPOSED PROJECT PHASES FORMAT:
The "proposedProjectPhases" field MUST be an array matching timeline.phases:
[
  {"phase": "Discovery and Planning", "monthWindow": "Month 1"},
  {"phase": "Implementation", "monthWindow": "Months 2-3"}
]
- Must match the count and names from timeline.phases
- monthWindow labels (e.g., "Month 1", "Months 2-3", "Months 3-4")
```

#### e) Updated Example Assistant Response (Lines 1494-1618)

```typescript
const exampleAssistantResponse = {
  coverPageData: example.coverPageData || {
    client: {
      name: clientData.companyName || 'Client Company',
      primaryContacts: [clientData.contactPerson || 'Contact Name'],
    },
    preparedBy: {
      name: 'WarmUp Team',
      email: 'team@sendwarmup.com',
    },
    commercials: {
      costPerMonth: 5000,
      currency: 'USD',
      billingCadence: 'monthly',
    },
    term: {
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date(Date.now() + 97 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      durationMonths: 3,
    },
  },
  tableOfContents: example.tableOfContents || [
    { title: 'Overview', page: null },
    { title: 'Key Priorities', page: null },
    { title: 'Objectives and Outcomes', page: null },
    // ... all sections
  ],
  overview: '...',
  executiveSummary: '...',
  keyPriorities: example.keyPriorities || [
    'Generate qualified leads through targeted outbound campaigns',
    'Establish thought leadership and brand visibility',
    'Build scalable infrastructure for long-term growth',
  ],
  // ... other sections
  proposedProjectPhases: example.proposedProjectPhases || [
    { phase: 'Discovery and Planning', monthWindow: 'Month 1' },
    { phase: 'Implementation', monthWindow: 'Month 1-2' },
    { phase: 'Launch and Optimization', monthWindow: 'Month 2-3' },
  ],
  // ... pricing, paymentTerms
  nextSteps: example.nextSteps || [
    'Review and approve this proposal by [Date]',
    'Schedule kickoff meeting (Client)',
    'Provide brand assets and messaging docs (Client, Week 1)',
    'Begin infrastructure setup (WarmUp, Week 1)',
  ],
  cancellationNotice: '...',
};
```

#### f) Updated JSON Schema Fallback (Lines 1801-1842)

```typescript
const jsonSchema = `{
  "coverPageData": {
    "client": {"name": "string", "primaryContacts": ["string"]},
    "preparedBy": {"name": "string", "email": "string"},
    "commercials": {"costPerMonth": "number", "currency": "string", "billingCadence": "monthly|annual"},
    "term": {"startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD", "durationMonths": "number"}
  },
  "tableOfContents": [
    {"title": "string", "page": null}
  ],
  "overview": "string (brief summary for cover page)",
  "executiveSummary": "string (high-level proposal summary)",
  "keyPriorities": ["string (3-6 priority bullets)"],
  "objectivesAndOutcomes": "string (goals and expected results)",
  "scopeOfWork": "string (detailed work to be performed)",
  "deliverables": "string (specific outputs and artifacts)",
  "approachAndTools": "string (methodology and technologies)",
  "timeline": {
    "workItems": [...],
    "phases": [...]
  },
  "proposedProjectPhases": [
    {"phase": "string", "monthWindow": "Month X or Months X-Y"}
  ],
  "pricing": {...},
  "paymentTerms": "string (payment schedule and terms)",
  "nextSteps": ["string (3-5 action items)"],
  "cancellationNotice": "string (cancellation policy)"
}`;
```

---

## Format Specifications

### Cover Page Data

**Structure:**
```json
{
  "client": {
    "name": "string - client company name",
    "primaryContacts": ["string", "string"] // At least 1 required
  },
  "preparedBy": {
    "name": "string - preparer name",
    "email": "string - valid email address"
  },
  "commercials": {
    "costPerMonth": 5500, // Number, no $ symbol
    "currency": "USD", // String: USD, EUR, etc.
    "billingCadence": "monthly" // Enum: monthly | annual
  },
  "term": {
    "startDate": "2025-03-10", // ISO-8601: YYYY-MM-DD
    "endDate": "2025-06-10", // ISO-8601: YYYY-MM-DD
    "durationMonths": 3 // Number: calculated from dates
  }
}
```

**Validation Rules:**
- ✅ startDate < endDate
- ✅ durationMonths matches calculated duration
- ✅ costPerMonth is number (not string)
- ✅ billingCadence is "monthly" or "annual"
- ✅ primaryContacts has at least 1 contact
- ✅ email is valid format

### Table of Contents

**Structure:**
```json
[
  {"title": "Overview", "page": null},
  {"title": "Key Priorities", "page": null},
  {"title": "Objectives and Outcomes", "page": null}
]
```

**Constraints:**
- Array of objects with title (string) and page (number|null)
- Page is null in preview mode
- PDF renderer fills in page numbers when generating PDF
- Should include all major proposal sections

### Key Priorities

**Structure:**
```json
[
  "Generate 6-8 qualified leads per month through targeted outbound",
  "Establish thought leadership via LinkedIn content strategy",
  "Build scalable email infrastructure for long-term growth"
]
```

**Constraints:**
- Array of strings
- Minimum 3 items, maximum 6 items
- Each item 20-150 characters
- Concise, outcome-focused (not task-focused)
- Business outcomes over technical details

### Next Steps

**Structure:**
```json
[
  "Review and approve this proposal by [Date]",
  "Schedule kickoff meeting (Client)",
  "Provide brand assets and messaging docs (Client, Week 1)",
  "Begin domain and mailbox setup (WarmUp, Week 1)"
]
```

**Constraints:**
- Array of strings
- Minimum 3 items, maximum 5 items
- Each item 15-120 characters
- Action-led with optional owner and timeframe
- Clear, actionable items

### Proposed Project Phases

**Structure:**
```json
[
  {
    "phase": "Discovery and Planning",
    "monthWindow": "Month 1"
  },
  {
    "phase": "Implementation",
    "monthWindow": "Months 2-3"
  },
  {
    "phase": "Launch and Optimization",
    "monthWindow": "Months 3-4"
  }
]
```

**Constraints:**
- Array of objects
- Must match timeline.phases count and names
- phase field must match timeline.phases[].phase
- monthWindow is human-readable label (e.g., "Month 1", "Months 2-3")

---

## Validation Rules Summary

### Date Validation
- ✅ Format: ISO-8601 (YYYY-MM-DD)
- ✅ startDate must be before endDate
- ✅ durationMonths must match calculated duration from dates

### Pricing Validation
- ✅ costPerMonth must be NUMBER (not string)
- ✅ No currency symbols (no $, £, €, etc.)
- ✅ currency separate field (USD, EUR, etc.)

### Enum Validation
- ✅ billingCadence: "monthly" | "annual"

### Array Length Validation
- ✅ keyPriorities: 3-6 items
- ✅ nextSteps: 3-5 items
- ✅ primaryContacts: minimum 1 item
- ✅ proposedProjectPhases: must match timeline.phases count

### Cross-Field Validation
- ✅ proposedProjectPhases phases must match timeline.phases names
- ✅ proposedProjectPhases count must match timeline.phases count

---

## Benefits

### 1. Comprehensive Cover Pages
- All proposals now have complete Order Form data
- Client information clearly captured
- Commercial terms explicitly stated
- Contract duration and dates formalized

### 2. Professional Navigation
- Table of Contents improves readability
- Easy navigation for clients
- Professional document structure
- PDF-ready with page number placeholders

### 3. Enhanced Content Structure
- Key Priorities highlight main goals upfront
- Next Steps provide clear action items
- Proposed Project Phases give timeline overview
- Better client comprehension and engagement

### 4. Consistent Formatting
- All proposals follow identical structure
- No variation in field names or formats
- Easy to parse and validate
- Type-safe throughout the system

### 5. Validation at API Level
- OpenAI API enforces exact structure
- Cannot deviate from required fields
- Field types guaranteed (string, number, array, object)
- Enum values validated automatically

---

## Files Modified

### Analysis Files
1. ✅ `analysis-output/theme-profile.json` - Added coverPageFormat, tableOfContentsFormat, additionalSections
2. ✅ `analysis-output/section-guardrails.json` - Added 5 new section specifications

### Backend Code
3. ✅ `SaasPE-Backend/src/shared/services/openai.service.ts`
   - Updated PROPOSAL_SECTION_KEYS (lines 85-105)
   - Added 5 new sections to PROPOSAL_GENERATION_SCHEMA properties (lines 119-315)
   - Updated required fields array (lines 321-337)
   - Added critical format instructions (lines 1659-1706)
   - Updated example assistant response (lines 1494-1618)
   - Updated JSON schema fallback (lines 1801-1842)

### Build Status
- ✅ Backend builds successfully
- ✅ No TypeScript errors
- ✅ Schema validation passes
- ✅ All 15 sections now required

---

## Total Sections

The proposal schema now includes **15 required sections** (up from 10):

1. **coverPageData** - Order Form with client, preparer, commercials, term
2. **tableOfContents** - Navigation array with section titles
3. overview
4. executiveSummary
5. **keyPriorities** - 3-6 outcome-focused bullets
6. objectivesAndOutcomes
7. scopeOfWork
8. deliverables
9. approachAndTools
10. timeline (workItems + phases)
11. **proposedProjectPhases** - Derived from timeline.phases
12. pricing (items + total)
13. paymentTerms
14. **nextSteps** - 3-5 action items
15. cancellationNotice

**New sections** (5): coverPageData, tableOfContents, keyPriorities, proposedProjectPhases, nextSteps
**Previous sections** (10): overview, executiveSummary, objectivesAndOutcomes, scopeOfWork, deliverables, approachAndTools, timeline, pricing, paymentTerms, cancellationNotice

---

## Next Steps

1. **Test Proposal Generation**
   - Generate a test proposal via API
   - Verify all 15 sections are present
   - Check coverPageData structure and validation
   - Verify dates are ISO-8601 format
   - Check numeric pricing values
   - Validate array lengths (keyPriorities, nextSteps)
   - Confirm proposedProjectPhases matches timeline.phases

2. **Update Frontend Display**
   - Render Order Form on cover page
   - Display Table of Contents with navigation
   - Show Key Priorities prominently
   - Display Proposed Project Phases timeline view
   - Show Next Steps as actionable checklist

3. **Update PDF Export**
   - Render cover page with Order Form data
   - Generate Table of Contents with page numbers
   - Style Key Priorities section
   - Format Proposed Project Phases
   - Style Next Steps as checklist

4. **Add Backend Validation**
   - Date validation (startDate < endDate)
   - Duration calculation validation
   - Email format validation
   - Array length validation
   - proposedProjectPhases matching validation

5. **Update Database Schema**
   - Verify Prisma schema supports JSON fields for new sections
   - Update Proposal model if needed
   - Add migration if schema changes required

---

## Testing Checklist

### Manual Testing
- [ ] Generate proposal with all 15 sections
- [ ] Verify coverPageData has all 4 sub-objects
- [ ] Check dates are ISO-8601 format (YYYY-MM-DD)
- [ ] Verify costPerMonth is number (no $)
- [ ] Check billingCadence is "monthly" or "annual"
- [ ] Verify keyPriorities has 3-6 items
- [ ] Verify nextSteps has 3-5 items
- [ ] Check proposedProjectPhases matches timeline.phases
- [ ] Verify tableOfContents includes all sections
- [ ] Check page numbers are null in preview

### Validation Testing
- [ ] Test startDate > endDate (should fail)
- [ ] Test durationMonths mismatch (should fail)
- [ ] Test invalid billingCadence value (should fail)
- [ ] Test keyPriorities with 2 items (should fail)
- [ ] Test nextSteps with 6 items (should fail)
- [ ] Test costPerMonth as string (should fail)

---

## Example Output

### Complete Proposal Structure
```json
{
  "coverPageData": {
    "client": {
      "name": "Sonicu",
      "primaryContacts": ["Joe Mundell", "Bryan Mitchell"]
    },
    "preparedBy": {
      "name": "Mike Hurley",
      "email": "mike@sendwarmup.com"
    },
    "commercials": {
      "costPerMonth": 5500,
      "currency": "USD",
      "billingCadence": "monthly"
    },
    "term": {
      "startDate": "2025-03-10",
      "endDate": "2025-06-10",
      "durationMonths": 3
    }
  },
  "tableOfContents": [
    {"title": "Overview", "page": null},
    {"title": "Key Priorities", "page": null},
    {"title": "Objectives and Outcomes", "page": null}
  ],
  "overview": "Brief overview of engagement...",
  "executiveSummary": "High-level summary...",
  "keyPriorities": [
    "Generate 6-8 qualified leads per month",
    "Establish thought leadership",
    "Build scalable infrastructure"
  ],
  "objectivesAndOutcomes": "Clear objectives...",
  "scopeOfWork": "Detailed work...",
  "deliverables": "Specific outputs...",
  "approachAndTools": "Methodology...",
  "timeline": {
    "workItems": [
      {
        "workItem": "Email Infrastructure Setup",
        "description": "Buy domains, set mailboxes...",
        "owner": "WarmUp",
        "weeks": "Week 1–2"
      }
    ],
    "phases": [
      {
        "phase": "Discovery and Planning",
        "weeks": "Weeks 1–2",
        "tasks": ["Kickoff meeting, system audit..."]
      }
    ]
  },
  "proposedProjectPhases": [
    {
      "phase": "Discovery and Planning",
      "monthWindow": "Month 1"
    }
  ],
  "pricing": {
    "items": [
      {
        "name": "Setup Fee",
        "description": "Initial setup and configuration",
        "price": 2500
      }
    ],
    "total": 2500
  },
  "paymentTerms": "Payment schedule...",
  "nextSteps": [
    "Review and approve by [Date]",
    "Schedule kickoff meeting",
    "Provide brand assets"
  ],
  "cancellationNotice": "Cancellation policy..."
}
```

---

**Implementation Completed:** November 9, 2025
**Build Status:** ✅ Passing
**Ready for:** Proposal generation testing with all 15 sections

🎯 **Complete proposal structure now enforced via strict JSON schema!**
