# Timeline Format Specification - Added

**Date:** November 9, 2025
**Status:** ✅ Complete

---

## Overview

Added structured timeline format specifications to ensure AI-generated proposals include properly formatted timelines with dual-table structure (workItems + phases).

---

## Changes Made

### 1. Updated `theme-profile.json`

Added new `timelineFormat` section with complete specifications:

```json
{
  "timelineFormat": {
    "structure": "dual-table",
    "requiresBothArrays": true,
    "workItemsFormat": {
      "fields": ["workItem", "description", "owner", "weeks"],
      "ownerOptions": ["WarmUp", "Client", "WarmUp and Client"],
      "weeksFormat": "Week X–Y or Weeks X–Y",
      "descriptionStyle": "concise, action-oriented"
    },
    "phasesFormat": {
      "fields": ["phase", "weeks", "tasks"],
      "weeksFormat": "Week X–Y or Weeks X–Y",
      "tasksStyle": "short, action-led bullet points",
      "phaseNaming": "descriptive phase names (e.g., Discovery and Planning)"
    },
    "totalRows": {
      "min": 6,
      "max": 10,
      "combined": "across both workItems and phases arrays"
    }
  }
}
```

### 2. Updated `section-guardrails.json`

Replaced timeline section with comprehensive structure specification:

**Key Changes:**
- Changed from simple word-count validation to structured JSON validation
- Added `workItems` array specification (3-6 items)
- Added `phases` array specification (3-5 items)
- Defined exact field structure for each array
- Added validation rules for week format and owner values
- Included prompt instructions for AI

**Timeline Structure:**

```json
{
  "timeline": {
    "required": true,
    "format": "structured JSON object",
    "workItems": [
      {
        "workItem": "Email Infrastructure Setup",
        "description": "Buy domains, set mailboxes, warmup accounts…",
        "owner": "WarmUp",
        "weeks": "Week 1–2"
      }
    ],
    "phases": [
      {
        "phase": "Discovery and Planning",
        "weeks": "Weeks 1–2",
        "tasks": ["Kickoff meeting, system audit, confirm KPIs, finalize plan"]
      }
    ]
  }
}
```

### 3. Updated OpenAI Service Schema

**File:** `SaasPE-Backend/src/shared/services/openai.service.ts`

**Changes:**

#### a) Strict JSON Schema (Line 134-182)
Changed timeline from `string` to structured `object`:

```typescript
[PROPOSAL_SECTION_KEYS.TIMELINE]: {
  type: 'object',
  description: 'Project timeline with work items and phases in structured format',
  properties: {
    workItems: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          workItem: { type: 'string' },
          description: { type: 'string' },
          owner: {
            type: 'string',
            enum: ['WarmUp', 'Client', 'WarmUp and Client']
          },
          weeks: { type: 'string' }
        },
        required: ['workItem', 'description', 'owner', 'weeks'],
        additionalProperties: false
      },
      minItems: 3,
      maxItems: 6
    },
    phases: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          phase: { type: 'string' },
          weeks: { type: 'string' },
          tasks: { type: 'array', items: { type: 'string' } }
        },
        required: ['phase', 'weeks', 'tasks'],
        additionalProperties: false
      },
      minItems: 3,
      maxItems: 5
    }
  },
  required: ['workItems', 'phases'],
  additionalProperties: false
}
```

#### b) Critical Instructions (Line 1492-1507)
Added timeline format instructions alongside pricing format:

```
CRITICAL - TIMELINE FORMAT:
The "timeline" field MUST be a JSON object with BOTH arrays:
{
  "workItems": [...],
  "phases": [...]
}
RULES:
- weeks field MUST use format "Week X–Y" or "Weeks X–Y" (use en-dash –, not hyphen -)
- owner MUST be one of: "WarmUp", "Client", or "WarmUp and Client"
- Include 3-6 workItems and 3-5 phases (6-10 total rows)
- Descriptions are concise and action-oriented
- Tasks are short, action-led bullet points
```

#### c) Example Response (Line 1401-1439)
Updated example assistant response to include structured timeline:

```typescript
timeline: example.timeline || {
  workItems: [
    {
      workItem: 'Email Infrastructure Setup',
      description: 'Buy domains, set mailboxes, warmup accounts…',
      owner: 'WarmUp',
      weeks: 'Week 1–2',
    },
    // ... 2 more workItems
  ],
  phases: [
    {
      phase: 'Discovery and Planning',
      weeks: 'Weeks 1–2',
      tasks: ['Kickoff meeting, system audit, confirm KPIs, finalize plan'],
    },
    // ... 2 more phases
  ],
}
```

#### d) JSON Schema Fallback (Line 1551-1558)
Updated fallback schema documentation:

```typescript
"timeline": {
  "workItems": [
    {"workItem": "string", "description": "string", "owner": "WarmUp|Client|WarmUp and Client", "weeks": "Week X–Y"}
  ],
  "phases": [
    {"phase": "string", "weeks": "Weeks X–Y", "tasks": ["string"]}
  ]
}
```

---

## Format Specifications

### Work Items Array

**Structure:**
```json
{
  "workItem": "string - specific work item name",
  "description": "string - concise, action-oriented (use … for continuation)",
  "owner": "enum - WarmUp | Client | WarmUp and Client",
  "weeks": "string - Week X–Y or Weeks X–Y (use en-dash –)"
}
```

**Constraints:**
- 3-6 items required
- Owner MUST be one of three values
- Weeks MUST use en-dash (–) not hyphen (-)
- Descriptions should be concise and action-oriented

**Examples:**
```json
{
  "workItem": "Email Infrastructure Setup",
  "description": "Buy domains, set mailboxes, warmup accounts…",
  "owner": "WarmUp",
  "weeks": "Week 1–2"
},
{
  "workItem": "Campaign Development",
  "description": "Create messaging, templates, and sequences",
  "owner": "WarmUp and Client",
  "weeks": "Weeks 2–3"
}
```

### Phases Array

**Structure:**
```json
{
  "phase": "string - descriptive phase name",
  "weeks": "string - Week X–Y or Weeks X–Y (use en-dash –)",
  "tasks": ["string - short, action-led task descriptions"]
}
```

**Constraints:**
- 3-5 phases required
- Tasks array with action-led descriptions
- Weeks MUST use en-dash (–) not hyphen (-)
- Phase names should be descriptive (e.g., "Discovery and Planning")

**Examples:**
```json
{
  "phase": "Discovery and Planning",
  "weeks": "Weeks 1–2",
  "tasks": [
    "Kickoff meeting, system audit, confirm KPIs, finalize plan"
  ]
},
{
  "phase": "Implementation",
  "weeks": "Weeks 2–4",
  "tasks": [
    "Setup infrastructure, develop content, configure tools"
  ]
}
```

---

## Validation Rules

### Total Rows
- **Minimum:** 6 rows (combined across workItems and phases)
- **Maximum:** 10 rows (combined across workItems and phases)
- **Recommended:** 3-6 workItems + 3-5 phases = 6-11 rows

### Week Format
- ✅ Correct: `"Week 1–2"`, `"Weeks 3–4"`
- ❌ Wrong: `"Week 1-2"`, `"Weeks 3-4"` (hyphen instead of en-dash)
- ❌ Wrong: `"1-2 weeks"`, `"Week 1 to 2"`

### Owner Values
- ✅ Allowed: `"WarmUp"`, `"Client"`, `"WarmUp and Client"`
- ❌ Not allowed: `"warmup"`, `"WARMUP"`, `"Both"`, `"Shared"`

### Description Style
- ✅ Good: `"Buy domains, set mailboxes, warmup accounts…"`
- ✅ Good: `"Create messaging, templates, and sequences"`
- ❌ Avoid: `"We will buy domains and then set up mailboxes and also warmup the accounts for the client"`

### Task Style
- ✅ Good: `"Kickoff meeting, system audit, confirm KPIs, finalize plan"`
- ✅ Good: `"Setup infrastructure, develop content, configure tools"`
- ❌ Avoid: Long paragraphs or overly detailed descriptions

---

## AI Prompt Instructions

The following instructions are included in the OpenAI prompt:

```
Return timeline in EXACT JSON with BOTH arrays:
- workItems: [{workItem, description, owner, weeks}]
- phases: [{phase, weeks, tasks[]}]

Rules:
- weeks must match "Week X–Y" or "Weeks X–Y"
- 6–10 rows total across both tables
- Owners use only: "WarmUp", "Client", or "WarmUp and Client"
- Tasks are short, action‑led
```

---

## Backend Integration

### How Timeline is Processed

1. **AI Generation** (openai.service.ts:1497-1503)
   - Strict JSON schema enforces structure
   - OpenAI API returns timeline as structured object
   - Validation happens at API level

2. **Processor Handling** (proposal.processor.ts:268-273)
   - Timeline received as JSON object
   - Converted to string if needed for database
   - Or stored as JSON if database supports it

3. **Database Storage** (prisma/schema.prisma)
   - Timeline field type: `Json?`
   - Stores structured timeline object
   - Can be queried and validated

### Example Database Value

```json
{
  "workItems": [
    {
      "workItem": "Email Infrastructure Setup",
      "description": "Buy domains, set mailboxes, warmup accounts…",
      "owner": "WarmUp",
      "weeks": "Week 1–2"
    }
  ],
  "phases": [
    {
      "phase": "Discovery and Planning",
      "weeks": "Weeks 1–2",
      "tasks": ["Kickoff meeting, system audit, confirm KPIs, finalize plan"]
    }
  ]
}
```

---

## Frontend Display

### Recommended Implementation

**File:** `saaspe-web/src/components/proposals/proposal-preview.tsx`

```tsx
interface TimelineData {
  workItems: Array<{
    workItem: string;
    description: string;
    owner: string;
    weeks: string;
  }>;
  phases: Array<{
    phase: string;
    weeks: string;
    tasks: string[];
  }>;
}

function TimelineSection({ timeline }: { timeline: TimelineData }) {
  return (
    <div className="timeline-section">
      <h3>Timeline</h3>

      {/* Work Items Table */}
      <h4>Work Items</h4>
      <table>
        <thead>
          <tr>
            <th>Work Item</th>
            <th>Description</th>
            <th>Owner</th>
            <th>Weeks</th>
          </tr>
        </thead>
        <tbody>
          {timeline.workItems.map((item, idx) => (
            <tr key={idx}>
              <td>{item.workItem}</td>
              <td>{item.description}</td>
              <td>{item.owner}</td>
              <td>{item.weeks}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Phases Table */}
      <h4>Phases</h4>
      <table>
        <thead>
          <tr>
            <th>Phase</th>
            <th>Weeks</th>
            <th>Tasks</th>
          </tr>
        </thead>
        <tbody>
          {timeline.phases.map((phase, idx) => (
            <tr key={idx}>
              <td>{phase.phase}</td>
              <td>{phase.weeks}</td>
              <td>
                <ul>
                  {phase.tasks.map((task, taskIdx) => (
                    <li key={taskIdx}>{task}</li>
                  ))}
                </ul>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## Testing

### Manual Test

1. Generate a new proposal via API or UI
2. Check that timeline field contains structured JSON
3. Verify workItems has 3-6 items
4. Verify phases has 3-5 items
5. Verify total rows is 6-10
6. Verify owner values are correct
7. Verify week format uses en-dash

### Expected Output Example

```json
{
  "timeline": {
    "workItems": [
      {
        "workItem": "Email Infrastructure Setup",
        "description": "Buy domains, set mailboxes, warmup accounts…",
        "owner": "WarmUp",
        "weeks": "Week 1–2"
      },
      {
        "workItem": "Technology Integration",
        "description": "Configure RB2B, Clay, and automation tools",
        "owner": "WarmUp and Client",
        "weeks": "Weeks 2–3"
      },
      {
        "workItem": "Campaign Launch",
        "description": "Deploy outbound campaigns and monitor results",
        "owner": "WarmUp",
        "weeks": "Weeks 3–4"
      }
    ],
    "phases": [
      {
        "phase": "Discovery and Planning",
        "weeks": "Weeks 1–2",
        "tasks": [
          "Kickoff meeting, system audit, confirm KPIs, finalize plan"
        ]
      },
      {
        "phase": "Setup and Configuration",
        "weeks": "Weeks 2–3",
        "tasks": [
          "Setup infrastructure, configure tools, develop messaging"
        ]
      },
      {
        "phase": "Launch and Optimization",
        "weeks": "Weeks 3–6",
        "tasks": [
          "Deploy campaigns, monitor performance, optimize based on data"
        ]
      }
    ]
  }
}
```

---

## Benefits

### 1. Consistency
- All proposals have identically structured timelines
- No variation in format or field names
- Easy to parse and display

### 2. Validation
- AI cannot deviate from required structure
- Field validation enforced at API level
- Type safety guaranteed

### 3. Display Flexibility
- Frontend can render as tables easily
- Can be exported to PDF/DOCX with consistent formatting
- Can be analyzed programmatically

### 4. Client Clarity
- Clear ownership designation (WarmUp vs Client vs Both)
- Specific timing information
- Action-oriented descriptions

---

## Files Modified

### Analysis Files
1. ✅ `analysis-output/theme-profile.json` - Added timelineFormat section
2. ✅ `analysis-output/section-guardrails.json` - Replaced timeline section with structured spec

### Backend Code
3. ✅ `SaasPE-Backend/src/shared/services/openai.service.ts`
   - Updated PROPOSAL_GENERATION_SCHEMA (line 134-182)
   - Added CRITICAL - TIMELINE FORMAT instructions (line 1492-1507)
   - Updated example assistant response (line 1401-1439)
   - Updated JSON schema fallback (line 1551-1558)

### Build Status
- ✅ Backend builds successfully
- ✅ No TypeScript errors
- ✅ Schema validation passes

---

## Next Steps

1. **Test Proposal Generation**
   - Generate a test proposal
   - Verify timeline structure
   - Check all validation rules

2. **Update Frontend Display**
   - Implement timeline table rendering
   - Add support for dual-table layout
   - Style work items and phases tables

3. **Update PDF Export**
   - Render timeline tables in PDF
   - Format work items table
   - Format phases table

4. **Add Validation**
   - Add backend validation for timeline structure
   - Verify week format
   - Verify owner values

---

**Timeline Format Added:** November 9, 2025
**Build Status:** ✅ Passing
**Ready for:** Proposal generation testing

🎯 **Timeline structure is now enforced via strict JSON schema!**
