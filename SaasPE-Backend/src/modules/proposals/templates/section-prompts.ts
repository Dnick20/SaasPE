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
 * STEP 1: Data Extraction (uses gpt-4o-mini)
 * Extracts structured insights from transcription before generation
 */
export function getExtractionPrompt(context: SectionContext): string {
  const { client, transcription } = context;

  return `Extract key insights from this sales conversation for proposal generation.

COMPANY: ${client.companyName}${client.industry ? ` (${client.industry})` : ''}

TRANSCRIPT:
${transcription?.transcript || 'No transcript available'}

Extract and return JSON with:
{
  "painPoints": ["specific pain point 1", "pain point 2"],
  "goals": ["business goal 1", "goal 2"],
  "currentSituation": {
    "tools": ["tool 1", "tool 2"],
    "challenges": ["challenge 1", "challenge 2"],
    "team": "team structure/size if mentioned"
  },
  "requirements": {
    "mustHave": ["requirement 1"],
    "niceToHave": ["requirement 2"],
    "dealBreakers": ["deal breaker 1"]
  },
  "budget": {
    "range": "budget range if mentioned",
    "flexibility": "low|medium|high",
    "constraints": ["constraint 1"]
  },
  "timeline": {
    "deadline": "deadline if mentioned",
    "urgency": "low|medium|high",
    "phases": ["phase 1 timing"]
  },
  "decisionMakers": [
    {
      "name": "person name",
      "role": "their role",
      "concerns": ["their specific concerns"]
    }
  ],
  "competitiveLandscape": {
    "currentSolutions": ["what they use now"],
    "alternatives": ["what they're considering"],
    "switchingBarriers": ["why haven't they switched"]
  },
  "successMetrics": ["metric 1", "metric 2"],
  "keyQuotes": [
    {
      "quote": "direct quote from transcript",
      "speaker": "who said it",
      "context": "what it reveals"
    }
  ]
}

Focus on extracting SPECIFIC, ACTIONABLE insights. If information isn't mentioned, use null or empty array.`;
}

/**
 * STEP 2: Overview/Title Generation (uses gpt-4o)
 */
export function getOverviewPrompt(context: SectionContext): string {
  const { client, tenantSettings } = context;

  return `Generate a compelling proposal title/overview.

CLIENT: ${client.companyName}
INDUSTRY: ${client.industry || 'Not specified'}
${tenantSettings?.companyName ? `YOUR COMPANY: ${tenantSettings.companyName}` : ''}
${tenantSettings?.valueProposition ? `YOUR VALUE PROP: ${tenantSettings.valueProposition}` : ''}

${client.problemStatement ? `CLIENT CHALLENGE:\n${client.problemStatement}` : ''}

Return JSON:
{
  "title": "Engaging, benefit-focused title (50-80 chars)",
  "subtitle": "One-line value proposition (100-150 chars)",
  "overview": "Brief 2-3 sentence overview of what this proposal offers"
}

The title should:
- Focus on CLIENT benefit, not your company
- Be specific to their industry/challenge
- Avoid generic phrases like "Digital Transformation Proposal"
- Examples: "Reducing Support Costs by 40% Through AI Automation" or "Scaling ${client.companyName}'s Revenue Operations"`;
}

/**
 * STEP 3: Executive Summary (uses gpt-4o)
 */
export function getExecutiveSummaryPrompt(
  context: SectionContext,
  extractedInsights?: any,
): string {
  const { client, tenantSettings, existingSections } = context;

  return `Generate an executive summary for a business proposal.

CLIENT: ${client.companyName}
${client.industry ? `INDUSTRY: ${client.industry}` : ''}
${existingSections?.overview ? `PROPOSAL TITLE: ${existingSections.overview}` : ''}

${tenantSettings?.idealCustomerProfile ? `IDEAL CUSTOMER PROFILE:\n${tenantSettings.idealCustomerProfile}` : ''}

${extractedInsights ? `EXTRACTED INSIGHTS:\n${JSON.stringify(extractedInsights, null, 2)}` : ''}

${client.problemStatement ? `CLIENT CHALLENGE:\n${client.problemStatement}` : ''}

Return JSON:
{
  "executiveSummary": "2-3 compelling paragraphs (300-500 words) structured as: 1) Current situation & opportunity, 2) Proposed approach & differentiation, 3) Expected outcomes & ROI"
}

The summary should:
- Lead with the business opportunity/outcome
- Reference specific insights from the conversation
- Position this as a strategic partnership, not a vendor relationship
- Quantify outcomes where possible (e.g., "reduce costs by 40%")
- Connect to the ICP to show you understand similar companies
- Be persuasive but professional, not salesy`;
}

/**
 * STEP 4: Objectives and Outcomes (uses gpt-4o)
 */
export function getObjectivesAndOutcomesPrompt(
  context: SectionContext,
  extractedInsights?: any,
): string {
  const { client } = context;

  return `Generate clear objectives and expected outcomes for this engagement.

CLIENT: ${client.companyName}
${client.industry ? `INDUSTRY: ${client.industry}` : ''}

${extractedInsights ? `EXTRACTED GOALS:\n${JSON.stringify(extractedInsights.goals, null, 2)}\n${JSON.stringify(extractedInsights.successMetrics, null, 2)}` : ''}

${client.problemStatement ? `CLIENT CHALLENGE:\n${client.problemStatement}` : ''}

Return JSON:
{
  "objectivesAndOutcomes": "2-3 paragraphs (300-400 words) covering: 1) Primary objectives (3-5 clear objectives), 2) Expected outcomes and success metrics, 3) Timeline for achieving outcomes"
}

The objectives should:
- Be specific and measurable (SMART goals)
- Align with their business goals from the conversation
- Include quantifiable success metrics where possible
- Show clear value and ROI
- Be achievable within the proposed timeline
- Address their pain points directly`;
}

/**
 * STEP 5: Scope of Work (uses gpt-4o)
 */
export function getScopeOfWorkPrompt(
  context: SectionContext,
  extractedInsights?: any,
): string {
  const { client, tenantSettings } = context;

  return `Generate a detailed scope of work description.

CLIENT: ${client.companyName}
${client.industry ? `INDUSTRY: ${client.industry}` : ''}

${tenantSettings?.services ? `YOUR SERVICES:\n${tenantSettings.services.join(', ')}` : ''}

${extractedInsights ? `REQUIREMENTS:\n${JSON.stringify(extractedInsights.requirements, null, 2)}` : ''}

Return JSON:
{
  "scopeOfWork": "3-4 paragraphs (400-500 words) covering: 1) What work will be performed, 2) What is included in scope, 3) What is explicitly out of scope, 4) Any assumptions or dependencies"
}

The scope should:
- Be clear and specific about what's included
- Define boundaries (what's NOT included)
- State assumptions (e.g., client will provide access to systems)
- List dependencies (e.g., client must complete X before we can do Y)
- Use clear, unambiguous language
- Avoid scope creep by being explicit`;
}

/**
 * STEP 6: Deliverables (uses gpt-4o)
 */
export function getDeliverablesPrompt(
  context: SectionContext,
  extractedInsights?: any,
): string {
  const { client } = context;

  return `Generate a structured list of deliverables for this project.

CLIENT: ${client.companyName}
${client.industry ? `INDUSTRY: ${client.industry}` : ''}

${extractedInsights ? `GOALS:\n${JSON.stringify(extractedInsights.goals, null, 2)}` : ''}

Return JSON:
{
  "deliverables": [
    {
      "name": "Deliverable name",
      "description": "What this deliverable includes and why it's valuable",
      "format": "Document format (e.g., PDF report, Excel spreadsheet, etc.)"
    }
  ]
}

The deliverables should:
- Be tangible and specific (not vague like "strategic planning")
- Include 5-8 key deliverables
- Show clear value for each item
- Specify format (PDF, spreadsheet, live dashboard, etc.)
- Be aligned with their goals and requirements
- Be organized logically (e.g., grouped by phase)`;
}

/**
 * STEP 7: Approach and Tools (uses gpt-4o)
 */
export function getApproachAndToolsPrompt(
  context: SectionContext,
  extractedInsights?: any,
): string {
  const { client, tenantSettings } = context;

  return `Generate a description of methodology, approach, and tools to be used.

CLIENT: ${client.companyName}
${client.industry ? `INDUSTRY: ${client.industry}` : ''}

${tenantSettings?.valueProposition ? `VALUE PROPOSITION: ${tenantSettings.valueProposition}` : ''}

${extractedInsights ? `REQUIREMENTS:\n${JSON.stringify(extractedInsights.requirements, null, 2)}` : ''}

Return JSON:
{
  "approachAndTools": "3-4 paragraphs (400-500 words) covering: 1) Methodology/process you'll follow, 2) Tools and technologies you'll use, 3) How this approach addresses their needs, 4) Why this approach is effective"
}

The approach should:
- Explain your methodology step-by-step
- Name specific tools and technologies
- Explain WHY you use these tools (benefits)
- Show how the approach fits their needs
- Highlight what makes your approach unique or better
- Build confidence through specificity`;
}

/**
 * STEP 6: Project Scope with Timeline (uses gpt-4o)
 */
export function getScopePrompt(
  context: SectionContext,
  extractedInsights?: any,
): string {
  const { client, existingSections } = context;

  return `Generate detailed project scope and deliverables.

CLIENT: ${client.companyName}
${client.industry ? `INDUSTRY: ${client.industry}` : ''}

${client.timelineNote ? `TIMELINE REQUIREMENTS: ${client.timelineNote}` : ''}

${extractedInsights?.timeline ? `TIMELINE INSIGHTS:\n${JSON.stringify(extractedInsights.timeline, null, 2)}` : ''}

${existingSections?.approachAndTools ? `SOLUTION CONTEXT:\n${existingSections.approachAndTools.substring(0, 500)}...` : ''}

Return JSON:
{
  "scope": [
    {
      "category": "Phase 1: Discovery & Strategy",
      "deliverables": ["Deliverable 1", "Deliverable 2"],
      "description": "What this phase achieves and why it's important"
    }
  ],
  "timeline": [
    {
      "phase": "Discovery & Strategy",
      "duration": "2-3 weeks",
      "milestones": ["Kickoff meeting", "Requirements doc approved"],
      "outcomes": ["Key outcome 1", "Key outcome 2"]
    }
  ]
}

The scope should:
- Be organized into 3-5 logical phases
- Include specific, tangible deliverables (not vague like "strategic planning")
- Show clear progression from discovery to implementation to optimization
- Align deliverables with their stated goals
- Include realistic timelines based on their urgency
- Add milestones for accountability
- Connect each phase to business outcomes
- Address their current tools/systems (migration, integration, etc.)`;
}

/**
 * STEP 7: Pricing (uses gpt-4o)
 */
export function getPricingPrompt(
  context: SectionContext,
  extractedInsights?: any,
): string {
  const { client, existingSections } = context;

  return `Generate pricing options with itemized breakdown.

CLIENT: ${client.companyName}
${client.industry ? `INDUSTRY: ${client.industry}` : ''}

${client.budgetNote ? `BUDGET CONTEXT: ${client.budgetNote}` : ''}

${extractedInsights?.budget ? `BUDGET INSIGHTS:\n${JSON.stringify(extractedInsights.budget, null, 2)}` : ''}

${existingSections?.scope ? `SCOPE SUMMARY:\n${JSON.stringify(existingSections.scope, null, 2).substring(0, 800)}...` : ''}

Return JSON:
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
      "paymentTerms": "50% upfront, 50% upon completion"
    },
    {
      "name": "Professional",
      "description": "Best for: mid-size companies (RECOMMENDED)",
      "items": [],
      "total": 35000,
      "recommended": true,
      "savings": "Save $5,000 vs item-by-item",
      "paymentTerms": "33% upfront, 33% midpoint, 34% completion"
    },
    {
      "name": "Enterprise",
      "description": "Best for: organizations needing full transformation",
      "items": [],
      "total": 75000,
      "recommended": false,
      "savings": "Save $15,000 vs item-by-item",
      "paymentTerms": "Quarterly payments over 12 months available"
    }
  ]
}

Pricing guidelines:
- Create 3 tiers: Starter, Professional (recommended), Enterprise
- Price based on scope complexity, not arbitrary tiers
- Include detailed line items for transparency
- Add package discounts (e.g., "Save $5k")
- Align recommended tier with their budget range
- Include payment terms for larger amounts
- Consider their industry norms (SaaS vs retail vs services)
- Show value, not just cost (link to outcomes)
- Make it easy to say yes (e.g., "Start with Starter, upgrade anytime")`;
}

/**
 * STEP 8: Payment Terms (uses gpt-4o)
 */
export function getPaymentTermsPrompt(
  context: SectionContext,
  extractedInsights?: any,
): string {
  const { client } = context;

  return `Generate professional payment terms for this engagement.

CLIENT: ${client.companyName}
${client.industry ? `INDUSTRY: ${client.industry}` : ''}

${client.budgetNote ? `BUDGET CONTEXT: ${client.budgetNote}` : ''}

${extractedInsights?.budget ? `BUDGET INSIGHTS:\n${JSON.stringify(extractedInsights.budget, null, 2)}` : ''}

Return JSON:
{
  "paymentTerms": "2-3 paragraphs covering: 1) Invoice schedule and payment timing, 2) Accepted payment methods, 3) Late payment policy"
}

The payment terms should:
- Specify when invoices will be sent (e.g., at milestones, monthly)
- State payment due date (e.g., net 30, net 15)
- List accepted payment methods (ACH, credit card, check, etc.)
- Include late payment fees if applicable (e.g., 1.5% monthly)
- Be clear and professional
- Follow industry standards for your field`;
}

/**
 * STEP 9: Cancellation Notice (uses gpt-4o)
 */
export function getCancellationNoticePrompt(
  context: SectionContext,
  extractedInsights?: any,
): string {
  const { client } = context;

  return `Generate a fair cancellation policy for this engagement.

CLIENT: ${client.companyName}
${client.industry ? `INDUSTRY: ${client.industry}` : ''}

Return JSON:
{
  "cancellationNotice": "2-3 paragraphs covering: 1) Notice period required for cancellation, 2) Client cancellation terms, 3) Agency cancellation terms"
}

The cancellation policy should:
- Specify notice period (typically 30 days)
- Explain what happens to work in progress if client cancels
- Explain refund policy for prepaid amounts
- State agency's right to cancel if needed
- Be fair to both parties
- Protect your business from sudden cancellations
- Use professional, non-threatening language`;
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
