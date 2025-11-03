/**
 * Optimized AI Prompt Templates for Proposal Sections
 *
 * These templates are designed to:
 * 1. Extract maximum value from transcription + client data
 * 2. Work efficiently with gpt-4o-mini for extraction and gpt-4o for generation
 * 3. Support both full auto-fill and individual section regeneration
 * 4. Include ICP (Ideal Customer Profile) data from tenant settings
 */

export interface SectionContext {
  client: {
    companyName: string;
    industry?: string;
    website?: string;
    contactFirstName?: string;
    contactLastName?: string;
    problemStatement?: string;
    budgetNote?: string;
    timelineNote?: string;
    currentTools?: string[];
  };
  transcription?: {
    transcript: string;
    extractedData?: any;
    keyMoments?: any;
  };
  tenantSettings?: {
    idealCustomerProfile?: string;
    companyName?: string;
    valueProposition?: string;
    services?: string[];
  };
  existingSections?: {
    overview?: string;
    executiveSummary?: string;
    objectivesAndOutcomes?: string;
    scopeOfWork?: string;
    deliverables?: any;
    approachAndTools?: string;
    scope?: any;
    pricing?: any;
    paymentTerms?: string;
    cancellationNotice?: string;
  };
}

/**
 * STEP 1: Data Extraction with Confidence Scoring (uses gpt-4o-mini)
 * Extracts structured insights from transcription with quality tracking per IR v2.0.31
 */
export function getExtractionPrompt(context: SectionContext): string {
  const { client, transcription } = context;

  return `Extract key insights from this sales conversation for proposal generation. You must include confidence scores and source citations for quality tracking.

COMPANY: ${client.companyName}${client.industry ? ` (${client.industry})` : ''}

TRANSCRIPT:
${transcription?.transcript || 'No transcript available'}

Extract and return JSON with CONFIDENCE SCORES (0.0-1.0) and SOURCE CITATIONS for each field:

Confidence Scoring Guidelines:
- 0.9-1.0: Explicitly stated, multiple confirmations, direct quotes available
- 0.7-0.8: Clearly implied, supported by context, single clear mention
- 0.5-0.6: Inferred from conversation, partial information
- 0.3-0.4: Weak inference, ambiguous, conflicting signals
- 0.0-0.2: Guessing, no real evidence, assumption-based

Return this exact JSON structure:
{
  "painPoints": {
    "items": ["specific pain point 1", "pain point 2"],
    "confidence": 0.85,
    "sources": [{"quote": "relevant quote", "speaker": "person", "context": "what it reveals"}]
  },
  "goals": {
    "items": ["business goal 1", "goal 2"],
    "confidence": 0.75,
    "sources": [{"quote": "relevant quote", "speaker": "person", "context": "what it reveals"}]
  },
  "currentSituation": {
    "tools": ["tool 1", "tool 2"],
    "challenges": ["challenge 1", "challenge 2"],
    "team": "team structure/size if mentioned or 'unknown'",
    "confidence": 0.80,
    "sources": [{"quote": "relevant quote", "context": "evidence"}]
  },
  "requirements": {
    "mustHave": ["requirement 1"],
    "niceToHave": ["requirement 2"],
    "dealBreakers": ["deal breaker 1"],
    "confidence": 0.70,
    "sources": [{"quote": "relevant quote", "context": "evidence"}]
  },
  "budget": {
    "range": "budget range if mentioned or 'unknown'",
    "flexibility": "low|medium|high|unknown",
    "constraints": ["constraint 1"],
    "confidence": 0.65,
    "sources": [{"quote": "relevant quote", "context": "evidence"}]
  },
  "timeline": {
    "deadline": "deadline if mentioned or 'unknown'",
    "urgency": "low|medium|high|unknown",
    "phases": ["phase 1 timing"],
    "confidence": 0.75,
    "sources": [{"quote": "relevant quote", "context": "evidence"}]
  },
  "decisionMakers": {
    "people": [
      {
        "name": "person name or 'unknown'",
        "role": "their role",
        "concerns": ["their specific concerns"]
      }
    ],
    "confidence": 0.70,
    "sources": [{"quote": "relevant quote", "context": "evidence"}]
  },
  "competitiveLandscape": {
    "currentSolutions": ["what they use now"],
    "alternatives": ["what they're considering"],
    "switchingBarriers": ["why haven't they switched"],
    "confidence": 0.60,
    "sources": [{"quote": "relevant quote", "context": "evidence"}]
  },
  "successMetrics": {
    "items": ["metric 1", "metric 2"],
    "confidence": 0.80,
    "sources": [{"quote": "relevant quote", "context": "evidence"}]
  },
  "overallConfidence": 0.75
}

CRITICAL RULES:
1. Base ALL extractions on ACTUAL transcript content - never invent or assume
2. Use "unknown" for missing information instead of making assumptions
3. Include at least one source quote for each section with confidence >= 0.6
4. Be conservative with confidence scores - it's better to mark something 0.5 than falsely claim 0.9
5. The overallConfidence should be the weighted average across all sections
6. If transcript is empty or unhelpful, return all items as empty arrays with confidence 0.0

Focus on extracting SPECIFIC, ACTIONABLE, VERIFIABLE insights that can be traced back to the conversation.`;
}

/**
 * STEP 2: Overview/Title Generation with Confidence (uses gpt-4o)
 */
export function getOverviewPrompt(context: SectionContext): string {
  const { client, tenantSettings } = context;

  return `Generate a compelling proposal title/overview with quality scoring.

CLIENT: ${client.companyName}
INDUSTRY: ${client.industry || 'Not specified'}
${tenantSettings?.companyName ? `YOUR COMPANY: ${tenantSettings.companyName}` : ''}
${tenantSettings?.valueProposition ? `YOUR VALUE PROP: ${tenantSettings.valueProposition}` : ''}

${client.problemStatement ? `CLIENT CHALLENGE:\n${client.problemStatement}` : ''}

Return JSON with confidence scoring:
{
  "title": "Engaging, benefit-focused title (50-80 chars)",
  "subtitle": "One-line value proposition (100-150 chars)",
  "overview": "Brief 2-3 sentence overview of what this proposal offers",
  "confidence": {
    "overall": 0.85,
    "dataAvailability": 0.90,
    "specificity": 0.80,
    "personalization": 0.85
  },
  "reasoning": "Brief explanation of confidence score and what data was used"
}

Quality Criteria:
- Title must be 50-80 characters and focus on CLIENT benefit
- Must be specific to their industry/challenge, NOT generic
- Avoid phrases like "Digital Transformation Proposal" or "Business Solutions"
- Use quantifiable outcomes when possible (e.g., "40% cost reduction")
- Examples: "Reducing Support Costs by 40% Through AI Automation" or "Scaling ${client.companyName}'s Revenue Operations"

Confidence Guidelines:
- High (0.8+): Strong client data, clear challenge, specific industry context
- Medium (0.6-0.8): Basic client info, general challenge, some industry knowledge
- Low (<0.6): Minimal client data, no challenge stated, generic approach`;
}

/**
 * STEP 3: Executive Summary with Quality Tracking (uses gpt-4o)
 */
export function getExecutiveSummaryPrompt(
  context: SectionContext,
  extractedInsights?: any,
): string {
  const { client, tenantSettings, existingSections } = context;

  return `Generate an executive summary for a business proposal with quality tracking.

CLIENT: ${client.companyName}
${client.industry ? `INDUSTRY: ${client.industry}` : ''}
${existingSections?.overview ? `PROPOSAL TITLE: ${existingSections.overview}` : ''}

${tenantSettings?.idealCustomerProfile ? `IDEAL CUSTOMER PROFILE:\n${tenantSettings.idealCustomerProfile}` : ''}

${extractedInsights ? `EXTRACTED INSIGHTS (with confidence scores):\n${JSON.stringify(extractedInsights, null, 2)}` : ''}

${client.problemStatement ? `CLIENT CHALLENGE:\n${client.problemStatement}` : ''}

Return JSON with confidence tracking:
{
  "executiveSummary": "2-3 compelling paragraphs (300-500 words) structured as: 1) Current situation & opportunity, 2) Proposed approach & differentiation, 3) Expected outcomes & ROI",
  "confidence": {
    "overall": 0.85,
    "insightGrounding": 0.80,
    "specificity": 0.85,
    "outcomeQuantification": 0.75
  },
  "sources": [
    {"insight": "specific insight referenced", "confidence": 0.85, "location": "painPoints.items[0]"}
  ],
  "reasoning": "Explanation of confidence score and which insights were used"
}

Quality Criteria:
- Must be 300-500 words across 2-3 paragraphs
- Lead with business opportunity/outcome, not your company intro
- Reference SPECIFIC insights from conversation (cite sources)
- Include quantifiable outcomes where available from insights
- Position as strategic partnership, not vendor transaction
- Connect to ICP if available to demonstrate domain expertise
- Be persuasive but professional - avoid superlatives and hype

Confidence Scoring:
- insightGrounding: How well is this grounded in extracted insights vs generic?
- specificity: How specific vs generic is the summary?
- outcomeQuantification: Are outcomes quantified or vague?
- overall: Weighted average

Source Tracking:
- Reference specific insights used (e.g., "painPoints.items[0]" or "goals.items[1]")
- Include confidence score of the source insight`;
}

/**
 * STEP 4: Objectives and Outcomes with SMART Validation (uses gpt-4o)
 */
export function getObjectivesAndOutcomesPrompt(
  context: SectionContext,
  extractedInsights?: any,
): string {
  const { client } = context;

  return `Generate clear, measurable objectives and expected outcomes with quality validation.

CLIENT: ${client.companyName}
${client.industry ? `INDUSTRY: ${client.industry}` : ''}

${extractedInsights ? `EXTRACTED GOALS (with confidence):\n${JSON.stringify(extractedInsights.goals, null, 2)}\n\nSUCCESS METRICS:\n${JSON.stringify(extractedInsights.successMetrics, null, 2)}` : ''}

${client.problemStatement ? `CLIENT CHALLENGE:\n${client.problemStatement}` : ''}

Return JSON with SMART validation:
{
  "objectivesAndOutcomes": "2-3 paragraphs (300-400 words) covering: 1) Primary objectives (3-5 clear objectives), 2) Expected outcomes and success metrics, 3) Timeline for achieving outcomes",
  "confidence": {
    "overall": 0.85,
    "goalAlignment": 0.90,
    "measurability": 0.80,
    "achievability": 0.85
  },
  "sources": [
    {"insight": "goal referenced", "confidence": 0.85, "location": "goals.items[0]"}
  ],
  "smartValidation": {
    "specific": true,
    "measurable": true,
    "achievable": true,
    "relevant": true,
    "timeBound": true
  },
  "reasoning": "Explanation of how objectives meet SMART criteria and align with extracted goals"
}

Quality Criteria (SMART Goals):
- Specific: Clear, unambiguous objectives (not "improve efficiency")
- Measurable: Include quantifiable success metrics with targets
- Achievable: Realistic within proposed scope and timeline
- Relevant: Directly address extracted pain points and goals
- Time-Bound: Include timeline for achieving each outcome

Source Requirements:
- Every objective must trace back to extracted goals or pain points
- Cite confidence scores from source insights
- Flag objectives with <0.6 confidence as "needs validation"

Confidence Scoring:
- goalAlignment: How well do objectives align with extracted goals?
- measurability: Are success metrics quantifiable?
- achievability: Are objectives realistic given scope?`;
}

/**
 * STEP 5: Scope of Work with Boundary Validation (uses gpt-4o)
 */
export function getScopeOfWorkPrompt(
  context: SectionContext,
  extractedInsights?: any,
): string {
  const { client, tenantSettings } = context;

  return `Generate a detailed, legally-sound scope of work with clear boundaries.

CLIENT: ${client.companyName}
${client.industry ? `INDUSTRY: ${client.industry}` : ''}

${tenantSettings?.services ? `YOUR SERVICES:\n${tenantSettings.services.join(', ')}` : ''}

${extractedInsights ? `REQUIREMENTS (with confidence):\n${JSON.stringify(extractedInsights.requirements, null, 2)}` : ''}

Return JSON with completeness validation:
{
  "scopeOfWork": "3-4 paragraphs (400-500 words) covering: 1) What work will be performed, 2) What is included in scope, 3) What is explicitly out of scope, 4) Any assumptions or dependencies",
  "confidence": {
    "overall": 0.85,
    "requirementsCoverage": 0.90,
    "boundaryClarity": 0.80,
    "assumptionValidity": 0.85
  },
  "sources": [
    {"requirement": "must-have referenced", "confidence": 0.90, "location": "requirements.mustHave[0]"}
  ],
  "scopeBoundaries": {
    "inclusions": ["specific deliverable 1", "deliverable 2"],
    "exclusions": ["what's NOT included 1", "exclusion 2"],
    "assumptions": ["client will provide X", "assumption 2"],
    "dependencies": ["client must complete Y before Z"]
  },
  "reasoning": "Explanation of how scope addresses requirements and why boundaries are set"
}

Quality Criteria:
- Must explicitly state what IS and what IS NOT included
- Every must-have requirement should be addressed or explicitly excluded
- State ALL assumptions (client access, data availability, etc.)
- List ALL dependencies (blocking factors, prerequisites)
- Use unambiguous language ("will deliver X" not "may provide X")
- Protect against scope creep with clear exclusions

Confidence Scoring:
- requirementsCoverage: % of must-have requirements addressed
- boundaryClarity: How clear are inclusion/exclusion boundaries?
- assumptionValidity: Are assumptions realistic based on insights?

Source Requirements:
- Map each inclusion/exclusion to extracted requirements
- Flag requirements with <0.6 confidence for client review`;
}

/**
 * STEP 6: Deliverables with Tangibility Validation (uses gpt-4o)
 */
export function getDeliverablesPrompt(
  context: SectionContext,
  extractedInsights?: any,
): string {
  const { client } = context;

  return `Generate a structured, tangible list of deliverables with quality validation.

CLIENT: ${client.companyName}
${client.industry ? `INDUSTRY: ${client.industry}` : ''}

${extractedInsights ? `GOALS (with confidence):\n${JSON.stringify(extractedInsights.goals, null, 2)}` : ''}

Return JSON with tangibility validation:
{
  "deliverables": [
    {
      "name": "Specific deliverable name",
      "description": "What this deliverable includes and why it's valuable",
      "format": "Exact format (PDF report, Excel spreadsheet, live dashboard URL, etc.)",
      "confidence": 0.85
    }
  ],
  "confidence": {
    "overall": 0.85,
    "tangibility": 0.90,
    "goalAlignment": 0.85,
    "specificity": 0.80
  },
  "sources": [
    {"goal": "goal that drives this deliverable", "confidence": 0.85, "location": "goals.items[0]"}
  ],
  "reasoning": "Explanation of how deliverables address client goals"
}

Quality Criteria (Tangibility Check):
- Each deliverable must be TANGIBLE (not vague like "strategic planning")
- Include 5-8 key deliverables minimum
- Specify EXACT format for each (PDF report, Excel file, live dashboard, API endpoint, etc.)
- Show clear business value, not just technical outputs
- Align with extracted goals (cite sources)
- Organize logically (e.g., by phase or category)

Anti-Patterns to AVOID:
- Vague deliverables: "Strategy document" → Use: "30-page market entry strategy with competitive analysis"
- Missing format: "Report" → Use: "PDF report with interactive charts (Tableau link)"
- Feature descriptions instead of outcomes: "Dashboard" → Use: "Real-time revenue dashboard tracking 15 KPIs"

Confidence Scoring:
- tangibility: Are deliverables concrete and measurable?
- goalAlignment: Do deliverables map to extracted goals?
- specificity: Are formats and contents clearly defined?`;
}

/**
 * STEP 7: Approach and Tools with Justification (uses gpt-4o)
 */
export function getApproachAndToolsPrompt(
  context: SectionContext,
  extractedInsights?: any,
): string {
  const { client, tenantSettings } = context;

  return `Generate a detailed methodology and tools description with benefit justification.

CLIENT: ${client.companyName}
${client.industry ? `INDUSTRY: ${client.industry}` : ''}

${tenantSettings?.valueProposition ? `VALUE PROPOSITION: ${tenantSettings.valueProposition}` : ''}

${extractedInsights ? `REQUIREMENTS (with confidence):\n${JSON.stringify(extractedInsights.requirements, null, 2)}\n\nCURRENT TOOLS:\n${JSON.stringify(extractedInsights.currentSituation, null, 2)}` : ''}

Return JSON with justification tracking:
{
  "approachAndTools": "3-4 paragraphs (400-500 words) covering: 1) Methodology/process you'll follow, 2) Tools and technologies you'll use, 3) How this approach addresses their needs, 4) Why this approach is effective",
  "confidence": {
    "overall": 0.85,
    "methodologyClarity": 0.90,
    "toolJustification": 0.80,
    "needsAlignment": 0.85
  },
  "toolsListed": [
    {"name": "Tool name", "purpose": "what it does", "benefit": "why it matters to client"}
  ],
  "sources": [
    {"requirement": "need this addresses", "confidence": 0.85, "location": "requirements.mustHave[0]"}
  ],
  "reasoning": "Explanation of why this approach and these tools are chosen"
}

Quality Criteria:
- Name SPECIFIC tools and technologies (not "industry-standard tools")
- Explain methodology step-by-step in chronological order
- For EACH tool, explain: what it does + WHY it benefits the client
- Address their current tools/systems (integration, migration, etc.)
- Highlight what makes your approach unique or superior
- Build confidence through specificity and expertise demonstration

Tool Naming Rules:
- ✅ Good: "Salesforce CRM for pipeline tracking", "Tableau for data visualization"
- ❌ Bad: "CRM system", "analytics platform", "industry tools"

Confidence Scoring:
- methodologyClarity: Is the step-by-step process clear?
- toolJustification: Is each tool's benefit explained?
- needsAlignment: Does approach address extracted requirements?`;
}

/**
 * STEP 8: Project Scope with Timeline and Milestones (uses gpt-4o)
 */
export function getScopePrompt(
  context: SectionContext,
  extractedInsights?: any,
): string {
  const { client, existingSections } = context;

  return `Generate detailed project timeline with realistic milestones and accountability.

CLIENT: ${client.companyName}
${client.industry ? `INDUSTRY: ${client.industry}` : ''}

${client.timelineNote ? `TIMELINE REQUIREMENTS: ${client.timelineNote}` : ''}

${extractedInsights?.timeline ? `TIMELINE INSIGHTS (with confidence):\n${JSON.stringify(extractedInsights.timeline, null, 2)}` : ''}

${existingSections?.approachAndTools ? `SOLUTION CONTEXT:\n${existingSections.approachAndTools.substring(0, 500)}...` : ''}

Return JSON with timeline realism validation:
{
  "scope": [
    {
      "category": "Phase 1: Discovery & Strategy",
      "deliverables": ["Deliverable 1", "Deliverable 2"],
      "description": "What this phase achieves and why it's important",
      "confidence": 0.85
    }
  ],
  "timeline": [
    {
      "phase": "Discovery & Strategy",
      "duration": "2-3 weeks",
      "milestones": ["Kickoff meeting", "Requirements doc approved"],
      "outcomes": ["Key outcome 1", "Key outcome 2"],
      "confidence": 0.80
    }
  ],
  "confidence": {
    "overall": 0.85,
    "timelineRealism": 0.90,
    "phaseLogic": 0.85,
    "urgencyAlignment": 0.80
  },
  "sources": [
    {"insight": "timeline constraint referenced", "confidence": 0.85, "location": "timeline.deadline"}
  ],
  "reasoning": "Explanation of timeline realism and phase sequencing"
}

Quality Criteria:
- Organize into 3-5 logical phases (Discovery → Implementation → Optimization)
- Each phase must have specific, tangible deliverables
- Include realistic durations based on extracted urgency and deadlines
- Add concrete milestones (not vague like "progress review")
- Connect each phase to business outcomes
- Show clear progression and dependencies between phases

Timeline Realism Check:
- If client urgency is "high", durations should be aggressive but achievable
- If deadline is mentioned, ensure total duration fits within constraint
- Flag timelines with <0.7 confidence for client discussion
- Account for client dependencies (e.g., "client provides data access by Week 2")

Confidence Scoring:
- timelineRealism: Are durations achievable given scope?
- phaseLogic: Do phases flow logically with proper dependencies?
- urgencyAlignment: Does timeline match extracted urgency?`;
}

/**
 * STEP 9: Pricing with Budget Alignment (uses gpt-4o)
 */
export function getPricingPrompt(
  context: SectionContext,
  extractedInsights?: any,
): string {
  const { client, existingSections } = context;

  return `Generate transparent, value-based pricing options aligned with budget.

CLIENT: ${client.companyName}
${client.industry ? `INDUSTRY: ${client.industry}` : ''}

${client.budgetNote ? `BUDGET CONTEXT: ${client.budgetNote}` : ''}

${extractedInsights?.budget ? `BUDGET INSIGHTS (with confidence):\n${JSON.stringify(extractedInsights.budget, null, 2)}` : ''}

${existingSections?.scope ? `SCOPE SUMMARY:\n${JSON.stringify(existingSections.scope, null, 2).substring(0, 800)}...` : ''}

Return JSON with budget alignment validation:
{
  "pricingOptions": [
    {
      "name": "Starter",
      "description": "Best for: smaller teams getting started",
      "items": [
        {
          "name": "Discovery & Strategy Phase",
          "description": "What's included in detail",
          "price": 5000
        }
      ],
      "total": 15000,
      "recommended": false,
      "savings": null,
      "paymentTerms": "50% upfront, 50% upon completion",
      "confidence": 0.85
    }
  ],
  "confidence": {
    "overall": 0.85,
    "budgetAlignment": 0.90,
    "valueJustification": 0.80,
    "transparencyScore": 0.95
  },
  "sources": [
    {"insight": "budget constraint referenced", "confidence": 0.85, "location": "budget.range"}
  ],
  "reasoning": "Explanation of pricing rationale and budget fit"
}

Quality Criteria:
- Create 3 tiers: Starter, Professional (recommended), Enterprise
- Price based on actual scope complexity, not arbitrary multiples
- Include detailed line items for transparency in at least one tier
- Add package discounts with savings amount (e.g., "Save $5,000")
- Align RECOMMENDED tier with extracted budget range
- Include payment terms appropriate to price (monthly for >$50k)
- Use industry-appropriate pricing (SaaS vs consulting vs productized)
- Connect pricing to outcomes/ROI, not just deliverables

Budget Alignment Rules:
- If budget range is "unknown", offer balanced tiers
- If budget range is specified, ensure recommended tier falls within ±20%
- If budget flexibility is "low", emphasize payment terms and phasing
- Flag pricing with <0.7 budgetAlignment for review

Confidence Scoring:
- budgetAlignment: Does pricing fit extracted budget constraints?
- valueJustification: Is value/ROI clearly connected to price?
- transparencyScore: Are line items and inclusions clear?`;
}

/**
 * STEP 10: Payment Terms with Industry Standards (uses gpt-4o)
 */
export function getPaymentTermsPrompt(
  context: SectionContext,
  extractedInsights?: any,
): string {
  const { client } = context;

  return `Generate professional, legally-sound payment terms aligned with industry standards.

CLIENT: ${client.companyName}
${client.industry ? `INDUSTRY: ${client.industry}` : ''}

${client.budgetNote ? `BUDGET CONTEXT: ${client.budgetNote}` : ''}

${extractedInsights?.budget ? `BUDGET INSIGHTS (with confidence):\n${JSON.stringify(extractedInsights.budget, null, 2)}` : ''}

Return JSON with standards compliance:
{
  "paymentTerms": "2-3 paragraphs covering: 1) Invoice schedule and payment timing, 2) Accepted payment methods, 3) Late payment policy",
  "confidence": {
    "overall": 0.95,
    "standardsCompliance": 1.0,
    "clarity": 0.95,
    "fairness": 0.90
  },
  "termsBreakdown": {
    "invoiceSchedule": "e.g., Monthly on 1st of month",
    "paymentDue": "e.g., Net 30",
    "acceptedMethods": ["ACH", "Wire", "Credit Card", "Check"],
    "lateFee": "e.g., 1.5% per month on overdue balances"
  },
  "reasoning": "Explanation of why these terms are appropriate for client and industry"
}

Quality Criteria:
- Specify exact invoice schedule (monthly, milestone-based, upfront+completion, etc.)
- State clear payment due date (Net 15, Net 30, Due on Receipt)
- List ALL accepted payment methods (ACH, wire, credit card, check)
- Include late payment policy with specific fees (e.g., 1.5% monthly interest)
- Use professional, non-threatening language
- Follow industry standards (consulting: Net 30, SaaS: upfront, productized: 50/50)

Industry Standards:
- Consulting/Agency: Net 30 with monthly invoicing
- SaaS/Software: 100% upfront or monthly subscription
- Large Projects (>$50k): 33/33/34 split at milestones
- Retainers: First+last month upfront, then monthly

Confidence Scoring:
- standardsCompliance: Do terms follow industry best practices?
- clarity: Are terms unambiguous and easy to understand?
- fairness: Are terms balanced for both parties?`;
}

/**
 * STEP 11: Cancellation Policy with Fairness Balance (uses gpt-4o)
 */
export function getCancellationNoticePrompt(
  context: SectionContext,
  extractedInsights?: any,
): string {
  const { client } = context;

  return `Generate a fair, legally-sound cancellation policy that protects both parties.

CLIENT: ${client.companyName}
${client.industry ? `INDUSTRY: ${client.industry}` : ''}

Return JSON with fairness validation:
{
  "cancellationNotice": "2-3 paragraphs covering: 1) Notice period required for cancellation, 2) Client cancellation terms, 3) Agency cancellation terms",
  "confidence": {
    "overall": 0.95,
    "fairness": 0.95,
    "clarity": 1.0,
    "legalSoundness": 0.90
  },
  "policyBreakdown": {
    "noticePeriod": "e.g., 30 days written notice",
    "clientCancellationTerms": "What happens to work in progress, refund policy",
    "agencyCancellationTerms": "Agency's right to cancel with notice",
    "workInProgress": "How unfinished work is handled"
  },
  "reasoning": "Explanation of why this policy is fair and appropriate"
}

Quality Criteria:
- Specify exact notice period (typically 30 days, minimum 14 days)
- Explain what happens to work in progress (client pays for completed work)
- State refund policy for prepaid amounts (prorated refund for unused services)
- Include agency's right to cancel with same notice period (mutual fairness)
- Address intellectual property (who owns work completed before cancellation)
- Use professional, non-threatening, relationship-preserving language
- Protect business from sudden cancellations while being client-friendly

Standard Components:
- Notice Period: 30 days written notice required by either party
- Work in Progress: Client pays for work completed through cancellation date
- Refunds: Prorated refund for unused prepaid services (if applicable)
- IP Ownership: Completed deliverables belong to client after payment
- Agency Rights: Agency may cancel with same notice if client breaches terms

Tone Requirements:
- ✅ Good: "Either party may terminate with 30 days written notice"
- ❌ Bad: "We reserve the right to terminate immediately without notice"
- ✅ Good: "Client will receive deliverables completed through cancellation date"
- ❌ Bad: "All work product remains our property upon cancellation"

Confidence Scoring:
- fairness: Is policy balanced for both client and agency?
- clarity: Are terms crystal clear with no ambiguity?
- legalSoundness: Does policy protect business interests appropriately?`;
}

/**
 * Utility: Get section-specific system prompt
 */
export function getSectionSystemPrompt(section: string): string {
  const commonInstructions = `You are an expert business proposal writer with 15+ years experience.
Your proposals have a 65% close rate because they are:
- Deeply personalized to each client's situation
- Focused on business outcomes, not features
- Written in clear, professional language
- Grounded in specific insights from conversations
- Structured to build confidence and trust

CRITICAL: Return ONLY valid JSON matching the exact schema requested. No markdown, no extra text.`;

  const sectionSpecific = {
    overview: 'Focus on creating a compelling, benefit-driven title that captures attention.',
    executiveSummary: 'Write an executive summary that executives want to forward to their team.',
    objectivesAndOutcomes: 'Define clear, measurable objectives aligned with their business goals.',
    scopeOfWork: 'Clearly define what work will be performed and what is out of scope.',
    deliverables: 'List specific, tangible deliverables with clear value propositions.',
    approachAndTools: 'Explain your unique methodology and the tools you use to deliver results.',
    scope: 'Break down the timeline into clear phases with specific milestones.',
    pricing: 'Present transparent pricing that makes it easy to say yes at the right tier.',
    paymentTerms: 'Create professional payment terms that protect both parties.',
    cancellationNotice: 'Draft a fair cancellation policy that sets clear expectations.',
  };

  return `${commonInstructions}\n\n${sectionSpecific[section] || ''}`;
}

/**
 * Utility: Combine multiple sections into full proposal
 */
export function getFullProposalCompositionPrompt(
  context: SectionContext,
  extractedInsights?: any,
): string {
  return `Generate a complete business proposal with all sections.

${getOverviewPrompt(context)}

---

${getExecutiveSummaryPrompt(context, extractedInsights)}

---

${getObjectivesAndOutcomesPrompt(context, extractedInsights)}

---

${getScopeOfWorkPrompt(context, extractedInsights)}

---

${getDeliverablesPrompt(context, extractedInsights)}

---

${getApproachAndToolsPrompt(context, extractedInsights)}

---

${getScopePrompt(context, extractedInsights)}

---

${getPricingPrompt(context, extractedInsights)}

---

${getPaymentTermsPrompt(context, extractedInsights)}

---

${getCancellationNoticePrompt(context, extractedInsights)}

Return a single JSON object combining all sections:
{
  "title": "...",
  "subtitle": "...",
  "overview": "...",
  "executiveSummary": "...",
  "objectivesAndOutcomes": "...",
  "scopeOfWork": "...",
  "deliverables": [...],
  "approachAndTools": "...",
  "timeline": [...],
  "pricingOptions": [...],
  "paymentTerms": "...",
  "cancellationNotice": "..."
}`;
}
