import { Injectable, Logger } from '@nestjs/common';
import { OpenAIService } from '../../../shared/services/openai.service';

interface Client {
  id: string;
  companyName: string;
  industry?: string;
  website?: string;
  problemStatement?: string;
  budgetNote?: string;
  timelineNote?: string;
  currentTools?: string[];
  deliverablesLogistics?: string;
  keyMeetingsSchedule?: string;
  contactFirstName?: string;
  contactLastName?: string;
  contactEmail?: string;
}

interface Transcription {
  transcript?: string;
  extractedData?: any;
}

interface ComposedProposal {
  title: string;
  executiveSummary: string;
  problemStatement: string;
  proposedSolution: string;
  scope: Array<{
    category: string;
    deliverables: string[];
    description: string;
  }>;
  timeline: Array<{
    phase: string;
    duration: string;
    milestones: string[];
    startDate?: string;
    endDate?: string;
  }>;
  pricingOptions: Array<{
    name: string;
    description: string;
    items: Array<{
      name: string;
      description: string;
      price: number;
    }>;
    total: number;
    recommended?: boolean;
  }>;
}

/**
 * AI Proposal Composer Service
 *
 * Uses client data and optional transcription to generate comprehensive,
 * professional proposal content using GPT-4o-mini.
 */
@Injectable()
export class ProposalComposerService {
  private readonly logger = new Logger(ProposalComposerService.name);

  constructor(private openaiService: OpenAIService) {}

  /**
   * Compose a complete proposal from client data and optional transcription
   */
  async composeFromClient(
    client: Client,
    transcription?: Transcription,
  ): Promise<ComposedProposal> {
    this.logger.log(`Composing proposal for client: ${client.companyName}`);

    const prompt = this.buildCompositionPrompt(client, transcription);

    try {
      // Use OpenAI to generate structured proposal content
      const response = await this.openaiService[
        'client'
      ].chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(),
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      });

      const generatedContent = response.choices[0].message.content;
      if (!generatedContent) {
        throw new Error('No content received from OpenAI');
      }
      const parsedProposal = JSON.parse(generatedContent) as ComposedProposal;

      // Validate and enhance the generated content
      return this.validateAndEnhance(parsedProposal, client);
    } catch (error) {
      this.logger.error(
        `Failed to compose proposal: ${error.message}`,
        error.stack,
      );
      throw new Error(`Proposal composition failed: ${error.message}`);
    }
  }

  /**
   * System prompt that defines the AI's role and output format
   */
  private getSystemPrompt(): string {
    return `You are an expert business proposal writer specializing in SaaS and agency services.
Your task is to generate comprehensive, professional proposals that are:

1. CLIENT-FOCUSED: Address specific client needs and challenges
2. SOLUTION-ORIENTED: Present clear, actionable solutions
3. PROFESSIONALLY WRITTEN: Use clear, concise business language
4. STRUCTURED: Follow a logical flow from problem to solution
5. VALUE-DRIVEN: Emphasize ROI and business outcomes

OUTPUT FORMAT: Valid JSON matching this exact structure:
{
  "title": "Proposal Title",
  "executiveSummary": "2-3 paragraphs summarizing the opportunity, your solution, and expected outcomes",
  "problemStatement": "Detailed description of client challenges and business impact",
  "proposedSolution": "Comprehensive solution description with methodology and approach",
  "scope": [
    {
      "category": "Category name (e.g., 'Discovery & Strategy')",
      "deliverables": ["Deliverable 1", "Deliverable 2"],
      "description": "What this phase achieves"
    }
  ],
  "timeline": [
    {
      "phase": "Phase name",
      "duration": "2-4 weeks",
      "milestones": ["Key milestone 1", "Key milestone 2"]
    }
  ],
  "pricingOptions": [
    {
      "name": "Starter",
      "description": "Best for getting started",
      "items": [
        {
          "name": "Item name",
          "description": "What's included",
          "price": 5000
        }
      ],
      "total": 5000,
      "recommended": false
    }
  ]
}

IMPORTANT: Return ONLY the JSON object, no additional text or markdown.`;
  }

  /**
   * Build the detailed prompt with all client information
   */
  private buildCompositionPrompt(
    client: Client,
    transcription?: Transcription,
  ): string {
    let prompt = `Generate a professional business proposal for the following client:

COMPANY INFORMATION:
- Company Name: ${client.companyName}`;

    if (client.industry) {
      prompt += `\n- Industry: ${client.industry}`;
    }

    if (client.website) {
      prompt += `\n- Website: ${client.website}`;
    }

    // Add problem statement
    if (client.problemStatement) {
      prompt += `\n\nPROBLEM/CHALLENGE:
${client.problemStatement}`;
    }

    // Add budget context
    if (client.budgetNote) {
      prompt += `\n\nBUDGET CONTEXT:
${client.budgetNote}`;
    }

    // Add timeline requirements
    if (client.timelineNote) {
      prompt += `\n\nTIMELINE REQUIREMENTS:
${client.timelineNote}`;
    }

    // Add current tools/systems
    if (client.currentTools && client.currentTools.length > 0) {
      prompt += `\n\nCURRENT TOOLS/SYSTEMS:
${client.currentTools.join(', ')}`;
    }

    // Add deliverables/logistics info
    if (client.deliverablesLogistics) {
      prompt += `\n\nDELIVERABLES & LOGISTICS:
${client.deliverablesLogistics}`;
    }

    // Add meetings schedule
    if (client.keyMeetingsSchedule) {
      prompt += `\n\nMEETING SCHEDULE:
${client.keyMeetingsSchedule}`;
    }

    // Add primary contact info
    if (client.contactFirstName || client.contactEmail) {
      prompt += `\n\nPRIMARY CONTACT:`;
      if (client.contactFirstName) {
        prompt += `\n- Name: ${client.contactFirstName}${client.contactLastName ? ' ' + client.contactLastName : ''}`;
      }
      if (client.contactEmail) {
        prompt += `\n- Email: ${client.contactEmail}`;
      }
    }

    // Add transcription context if available
    if (transcription?.transcript) {
      const transcriptPreview = transcription.transcript.substring(0, 3000);
      prompt += `\n\nMEETING TRANSCRIPT (excerpt):
${transcriptPreview}
${transcription.transcript.length > 3000 ? '... [truncated]' : ''}`;
    }

    prompt += `\n\nGENERATE:
1. An engaging executive summary that positions this as a strategic partnership
2. A detailed problem statement that shows deep understanding of their challenges
3. A comprehensive solution with clear methodology
4. Scope organized into logical phases with specific deliverables
5. Timeline with 3-5 phases, each with duration and milestones
6. Three pricing tiers (Starter, Professional, Enterprise) with itemized breakdowns

Make the proposal professional, compelling, and tailored to their specific needs.`;

    return prompt;
  }

  /**
   * Validate and enhance the AI-generated content
   */
  private validateAndEnhance(
    proposal: ComposedProposal,
    client: Client,
  ): ComposedProposal {
    // Ensure title includes company name
    if (!proposal.title.includes(client.companyName)) {
      proposal.title = `${client.companyName} - ${proposal.title}`;
    }

    // Ensure we have at least basic scope
    if (!proposal.scope || proposal.scope.length === 0) {
      proposal.scope = [
        {
          category: 'Project Delivery',
          deliverables: [
            'Initial consultation and requirements gathering',
            'Solution implementation',
            'Testing and quality assurance',
            'Training and documentation',
          ],
          description: 'Complete project delivery and implementation',
        },
      ];
    }

    // Ensure we have a timeline
    if (!proposal.timeline || proposal.timeline.length === 0) {
      proposal.timeline = [
        {
          phase: 'Discovery & Planning',
          duration: '1-2 weeks',
          milestones: ['Requirements finalized', 'Project plan approved'],
        },
        {
          phase: 'Implementation',
          duration: '4-6 weeks',
          milestones: ['Core features deployed', 'Testing completed'],
        },
        {
          phase: 'Launch & Support',
          duration: '2 weeks',
          milestones: ['Go-live', 'Training completed'],
        },
      ];
    }

    // Ensure we have pricing options
    if (!proposal.pricingOptions || proposal.pricingOptions.length === 0) {
      proposal.pricingOptions = this.generateDefaultPricing(client);
    }

    // Mark middle option as recommended if none is marked
    if (
      proposal.pricingOptions.length >= 3 &&
      !proposal.pricingOptions.some((opt) => opt.recommended)
    ) {
      proposal.pricingOptions[1].recommended = true;
    }

    return proposal;
  }

  /**
   * Generate default pricing if AI didn't provide good options
   */
  private generateDefaultPricing(
    client: Client,
  ): ComposedProposal['pricingOptions'] {
    // Try to extract budget from budget note
    const budgetMatch = client.budgetNote?.match(/\$?([\d,]+)/);
    const baseBudget = budgetMatch
      ? parseInt(budgetMatch[1].replace(/,/g, ''))
      : 10000;

    return [
      {
        name: 'Starter',
        description: 'Essential features to get started',
        items: [
          {
            name: 'Email Campaign',
            description: 'Initial campaign setup and send (single segment)',
            price: Math.round(baseBudget * 0.35),
          },
          {
            name: 'Messaging & Engagement',
            description: 'Baseline messaging framework and outreach cadence',
            price: Math.round(baseBudget * 0.2),
          },
          {
            name: 'Response Management System',
            description: 'Lead routing, SLAs, basic reply handling',
            price: Math.round(baseBudget * 0.2),
          },
        ],
        total: Math.round(baseBudget * 0.75),
        recommended: false,
      },
      {
        name: 'Professional',
        description: 'Recommended for most businesses',
        items: [
          {
            name: 'Email Campaign',
            description: 'Multi-segment campaigns with A/B testing and warm-up',
            price: Math.round(baseBudget * 0.35),
          },
          {
            name: 'Playbook Creation',
            description: 'ICP, scripts, objection handling playbooks',
            price: Math.round(baseBudget * 0.2),
          },
          {
            name: 'Geographic Targeting',
            description: 'Region and segment-specific personalization',
            price: Math.round(baseBudget * 0.15),
          },
          {
            name: 'Messaging & Engagement',
            description: 'Advanced messaging matrix and sequencing',
            price: Math.round(baseBudget * 0.15),
          },
          {
            name: 'Response Management System',
            description: 'Triage workflows, SLA dashboards, canned replies',
            price: Math.round(baseBudget * 0.1),
          },
        ],
        total: baseBudget,
        recommended: true,
      },
      {
        name: 'Enterprise',
        description: 'Maximum value and customization',
        items: [
          {
            name: 'Email Campaign (Advanced)',
            description: 'Deliverability optimization, multi-domain strategy, throttling',
            price: Math.round(baseBudget * 0.45),
          },
          {
            name: 'Data Management Enhancement',
            description: 'Enrichment, deduplication, validation workflows',
            price: Math.round(baseBudget * 0.2),
          },
          {
            name: 'CRM/PM Integrations',
            description: 'HubSpot/Notion integration and dashboards',
            price: Math.round(baseBudget * 0.15),
          },
          {
            name: 'Executive Reporting & KPIs',
            description: 'Dashboards, forecasts, and weekly exec summaries',
            price: Math.round(baseBudget * 0.15),
          },
        ],
        total: Math.round(baseBudget * 1.25),
        recommended: false,
      },
    ];
  }

  /**
   * Generate account hierarchy section with organizational structure
   */
  async generateAccountHierarchy(
    client: Client,
    transcription?: Transcription,
  ): Promise<any> {
    this.logger.log(
      `Generating account hierarchy for client: ${client.companyName}`,
    );

    const prompt = `Based on the following client information, generate an account hierarchy and organizational structure:

COMPANY: ${client.companyName}
${client.industry ? `INDUSTRY: ${client.industry}` : ''}

PRIMARY CONTACT:
${client.contactFirstName || ''} ${client.contactLastName || ''}
${client.contactEmail || ''}

${
  transcription?.transcript
    ? `MEETING TRANSCRIPT (excerpt):
${transcription.transcript.substring(0, 2000)}`
    : ''
}

Generate a JSON object with this structure:
{
  "primaryContact": "Name and Title",
  "stakeholders": [
    {
      "name": "Stakeholder Name",
      "role": "Title/Role",
      "department": "Department",
      "influence": "high|medium|low"
    }
  ],
  "decisionMakers": ["Name 1", "Name 2"],
  "organizationChart": {
    "description": "Brief description of organizational structure",
    "reportingLines": ["Description of reporting relationships"]
  }
}`;

    try {
      const response = await this.openaiService[
        'client'
      ].chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert at analyzing organizational structures and stakeholder relationships. Return ONLY valid JSON.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.5,
      });

      const content = response.choices[0].message.content;
      return content ? JSON.parse(content) : null;
    } catch (error) {
      this.logger.error('Failed to generate account hierarchy', error);
      return null;
    }
  }

  /**
   * Generate KPI forecast with projected metrics
   */
  async generateKPIForecast(
    client: Client,
    scope: any,
    timeline: any,
  ): Promise<any> {
    this.logger.log(
      `Generating KPI forecast for client: ${client.companyName}`,
    );

    const prompt = `Based on the following project information, generate realistic KPI forecasts:

COMPANY: ${client.companyName}
${client.industry ? `INDUSTRY: ${client.industry}` : ''}
${client.budgetNote ? `BUDGET: ${client.budgetNote}` : ''}
${client.timelineNote ? `TIMELINE: ${client.timelineNote}` : ''}

PROJECT SCOPE: ${JSON.stringify(scope)}
PROJECT TIMELINE: ${JSON.stringify(timeline)}

Generate a JSON object with projected KPIs:
{
  "metrics": [
    {
      "name": "Metric Name",
      "baseline": "Current value or 'Unknown'",
      "projected": "Projected value",
      "timeframe": "6 months",
      "methodology": "How we'll achieve this"
    }
  ],
  "roi": {
    "investment": 50000,
    "projectedReturn": 150000,
    "timeframe": "12 months",
    "assumptions": ["Key assumption 1", "Key assumption 2"]
  }
}`;

    try {
      const response = await this.openaiService[
        'client'
      ].chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert at forecasting business metrics and ROI. Return ONLY valid JSON with realistic, industry-appropriate projections.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.6,
      });

      const content = response.choices[0].message.content;
      return content ? JSON.parse(content) : null;
    } catch (error) {
      this.logger.error('Failed to generate KPI forecast', error);
      return null;
    }
  }

  /**
   * Generate team roster with member bios
   */
  async generateTeamRoster(client: Client, scope: any): Promise<any> {
    this.logger.log(`Generating team roster for client: ${client.companyName}`);

    const prompt = `Based on the following project information, generate a recommended team roster:

COMPANY: ${client.companyName}
${client.industry ? `INDUSTRY: ${client.industry}` : ''}
PROJECT SCOPE: ${JSON.stringify(scope)}

Generate a JSON object with this structure:
{
  "members": [
    {
      "name": "Team Member Name",
      "role": "Project Manager",
      "bio": "Brief professional bio highlighting relevant experience",
      "skills": ["Skill 1", "Skill 2", "Skill 3"],
      "allocation": "Full-time" or "Part-time (50%)",
      "certifications": ["Certification 1", "Certification 2"]
    }
  ],
  "teamStructure": "Description of how the team is organized"
}`;

    try {
      const response = await this.openaiService[
        'client'
      ].chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert at assembling project teams. Return ONLY valid JSON with realistic team member profiles.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      });

      const content = response.choices[0].message.content;
      return content ? JSON.parse(content) : null;
    } catch (error) {
      this.logger.error('Failed to generate team roster', error);
      return null;
    }
  }

  /**
   * Generate appendix with supporting materials
   */
  async generateAppendix(client: Client, pricingOptions: any): Promise<any> {
    this.logger.log(`Generating appendix for client: ${client.companyName}`);

    const prompt = `Based on the following client and project information, generate an appendix with supporting materials:

COMPANY: ${client.companyName}
${client.industry ? `INDUSTRY: ${client.industry}` : ''}

Generate a JSON object with this structure:
{
  "caseStudies": [
    {
      "title": "Relevant Case Study Title",
      "industry": "Industry",
      "challenge": "What problem was solved",
      "solution": "How we solved it",
      "results": "Measurable outcomes"
    }
  ],
  "certifications": ["Certification 1", "Certification 2"],
  "awards": ["Award 1", "Award 2"],
  "references": [
    {
      "company": "Company Name",
      "contactName": "Reference Name",
      "role": "Their Role",
      "testimonial": "Quote or recommendation"
    }
  ],
  "technicalDocumentation": [
    {
      "title": "Document Title",
      "description": "What this document covers",
      "type": "whitepaper|datasheet|guide"
    }
  ],
  "paymentTerms": {
    "schedule": "Payment schedule description",
    "methods": ["Payment method 1", "Payment method 2"],
    "cancellationPolicy": "Cancellation policy description"
  }
}`;

    try {
      const response = await this.openaiService[
        'client'
      ].chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert at creating professional proposal appendices with relevant supporting materials. Return ONLY valid JSON.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      });

      const content = response.choices[0].message.content;
      return content ? JSON.parse(content) : null;
    } catch (error) {
      this.logger.error('Failed to generate appendix', error);
      return null;
    }
  }

  /**
   * Compose a complete enhanced proposal with all V2 sections
   */
  async composeEnhancedProposal(
    client: Client,
    transcription?: Transcription,
  ): Promise<
    ComposedProposal & {
      accountHierarchy: any;
      kpiForecast: any;
      teamRoster: any;
      appendix: any;
    }
  > {
    this.logger.log(
      `Composing enhanced proposal for client: ${client.companyName}`,
    );

    // Generate base proposal content
    const baseProposal = await this.composeFromClient(client, transcription);

    // Generate enhanced sections
    const [accountHierarchy, kpiForecast, teamRoster, appendix] =
      await Promise.all([
        this.generateAccountHierarchy(client, transcription),
        this.generateKPIForecast(
          client,
          baseProposal.scope,
          baseProposal.timeline,
        ),
        this.generateTeamRoster(client, baseProposal.scope),
        this.generateAppendix(client, baseProposal.pricingOptions),
      ]);

    return {
      ...baseProposal,
      accountHierarchy,
      kpiForecast,
      teamRoster,
      appendix,
    };
  }
}
