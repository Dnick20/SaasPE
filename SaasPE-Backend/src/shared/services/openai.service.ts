import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { Readable } from 'stream';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { PrismaService } from '../database/prisma.service';
import { LeadIntake, LeadIntakeSchema } from '../schemas/leadIntake.schema';
import {
  extractorSystemPrompt,
  extractorUserTemplate,
} from '../prompts/leadIntake.prompts';

interface TranscriptionResult {
  text: string;
  language: string;
  duration: number;
  confidence: number;
}

interface AnalysisResult {
  problemStatement?: string;
  budget?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  timeline?: string;
  stakeholders?: Array<{
    name: string;
    role?: string;
    email?: string;
  }>;
  painPoints?: string[];
  desiredOutcomes?: string[];
  technicalRequirements?: string[];
  companyName?: string;
  industry?: string;
  companySize?: string;
  currentSolutions?: string[];
  decisionMakers?: string[];
  nextSteps?: string[];
  urgency?: string;
  confidence: number;
}

interface ClientContactInfo {
  companyName?: string;
  contactFirstName?: string;
  contactLastName?: string;
  contactEmail?: string;
  contactPhone?: string;
  confidence: number;
}

interface DiscoveryContext {
  targetICP?: string;
  tone?: string;
  painPoints?: string[];
}

interface ProposalContent {
  executiveSummary?: string;
  problemStatement?: string;
  proposedSolution?: string;
  scope?: string;
  timeline?: string;
  pricing?: string;
  [key: string]: any;
  // Token usage metadata (optional, added when available)
  _metadata?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    model?: string;
    contextPackUsed?: boolean;
    tokenSavings?: number;
  };
}

/**
 * Canonical proposal section keys - single source of truth
 * Used across prompts, validation, and database mapping
 */
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

/**
 * Strict JSON Schema for OpenAI response_format enforcement
 * Guarantees all 9 required fields are present with correct types
 */
const PROPOSAL_GENERATION_SCHEMA = {
  type: 'json_schema',
  json_schema: {
    name: 'proposal_generation',
    strict: true,
    schema: {
      type: 'object',
      properties: {
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
        },
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
        },
        [PROPOSAL_SECTION_KEYS.OVERVIEW]: {
          type: 'string',
          description: 'Brief overview summary for cover page (2-3 sentences)',
        },
        [PROPOSAL_SECTION_KEYS.EXECUTIVE_SUMMARY]: {
          type: 'string',
          description: 'High-level proposal summary emphasizing value and ROI',
        },
        [PROPOSAL_SECTION_KEYS.KEY_PRIORITIES]: {
          type: 'array',
          description: 'Array of 3-6 priority bullets, concise and outcome-focused',
          items: { type: 'string' },
          minItems: 3,
          maxItems: 6,
        },
        [PROPOSAL_SECTION_KEYS.OBJECTIVES_AND_OUTCOMES]: {
          type: 'string',
          description: 'Clear objectives and expected business outcomes',
        },
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
        },
        [PROPOSAL_SECTION_KEYS.DELIVERABLES]: {
          type: 'string',
          description: 'Specific outputs and tangible artifacts (list format)',
        },
        [PROPOSAL_SECTION_KEYS.APPROACH_AND_TOOLS]: {
          type: 'string',
          description: 'Methodology, approach, and technologies to be used',
        },
        [PROPOSAL_SECTION_KEYS.TIMELINE]: {
          type: 'object',
          description: 'Project timeline with work items and phases in structured format',
          properties: {
            workItems: {
              type: 'array',
              description: 'Specific work items with ownership and timing',
              items: {
                type: 'object',
                properties: {
                  workItem: { type: 'string', description: 'Work item name' },
                  description: { type: 'string', description: 'Concise, action-oriented description' },
                  owner: {
                    type: 'string',
                    enum: ['WarmUp', 'Client', 'WarmUp and Client'],
                    description: 'Responsible party'
                  },
                  weeks: { type: 'string', description: 'Timeline in format "Week X–Y" or "Weeks X–Y"' },
                },
                required: ['workItem', 'description', 'owner', 'weeks'],
                additionalProperties: false,
              },
              minItems: 3,
              maxItems: 6,
            },
            phases: {
              type: 'array',
              description: 'Project phases with tasks',
              items: {
                type: 'object',
                properties: {
                  phase: { type: 'string', description: 'Phase name (e.g., Discovery and Planning)' },
                  weeks: { type: 'string', description: 'Timeline in format "Week X–Y" or "Weeks X–Y"' },
                  tasks: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Short, action-led tasks for this phase'
                  },
                },
                required: ['phase', 'weeks', 'tasks'],
                additionalProperties: false,
              },
              minItems: 3,
              maxItems: 5,
            },
          },
          required: ['workItems', 'phases'],
          additionalProperties: false,
        },
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
        },
        [PROPOSAL_SECTION_KEYS.PRICING]: {
          type: 'object',
          description: 'Pricing breakdown with line items and total',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Service or item name' },
                  description: { type: 'string', description: 'What is included' },
                  price: { type: 'number', description: 'Price as number (no currency symbols)' },
                },
                required: ['name', 'description', 'price'],
                additionalProperties: false,
              },
            },
            total: { type: 'number', description: 'Total price (sum of all items)' },
          },
          required: ['items', 'total'],
          additionalProperties: false,
        },
        [PROPOSAL_SECTION_KEYS.PAYMENT_TERMS]: {
          type: 'string',
          description: 'Payment schedule and terms of engagement',
        },
        [PROPOSAL_SECTION_KEYS.NEXT_STEPS]: {
          type: 'array',
          description: 'Array of 3-5 action items with optional owner and timeframe',
          items: { type: 'string' },
          minItems: 3,
          maxItems: 5,
        },
        [PROPOSAL_SECTION_KEYS.CANCELLATION_NOTICE]: {
          type: 'string',
          description: 'Cancellation policy and notice requirements',
        },
      },
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
      ],
      additionalProperties: false,
    },
  },
};

/**
 * OpenAI Service
 *
 * Handles all OpenAI API integrations:
 * - Whisper API for audio/video transcription
 * - GPT-4 for content analysis and generation
 */
@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private readonly client: OpenAI;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    const apiKey = this.config.get('OPENAI_API_KEY');

    if (!apiKey) {
      this.logger.warn(
        'OPENAI_API_KEY not configured. OpenAI features will not work.',
      );
    }

    // Configure axios with retry logic
    axiosRetry(axios, {
      retries: 4,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        // Retry on 429 (rate limit), 500, 503 errors
        return (
          axiosRetry.isNetworkOrIdempotentRequestError(error) ||
          error.response?.status === 429 ||
          error.response?.status === 500 ||
          error.response?.status === 503
        );
      },
    });

    this.client = new OpenAI({
      apiKey,
    });

    this.logger.log('OpenAI Service initialized with retry logic');
  }

  /**
   * Transcribe audio/video file using OpenAI Whisper
   * Supports: mp3, mp4, mpeg, mpga, m4a, wav, webm
   * Max file size: 25MB (API limit)
   */
  async transcribeAudio(
    fileBuffer: Buffer,
    fileName: string,
  ): Promise<TranscriptionResult> {
    try {
      this.logger.log(`Starting transcription for file: ${fileName}`);

      // Convert buffer to a File-like object
      // We need to convert the Buffer to Uint8Array for Blob compatibility
      const uint8Array = new Uint8Array(fileBuffer);
      const blob = new Blob([uint8Array], {
        type: this.getContentType(fileName),
      });
      const file = new File([blob], fileName, {
        type: this.getContentType(fileName),
      });

      // Call Whisper API
      const response = await this.client.audio.transcriptions.create({
        file: file,
        model: 'whisper-1',
        response_format: 'verbose_json', // Get detailed response with timestamps
        language: 'en', // Default to English, can be auto-detected
      });

      this.logger.log(
        `Transcription completed for ${fileName}. Duration: ${response.duration}s`,
      );

      // Calculate average confidence (Whisper doesn't provide this, so we estimate)
      // In production, you might use the segments data to calculate actual confidence
      const confidence = 0.85; // Default confidence estimate

      return {
        text: response.text,
        language: response.language || 'en',
        duration: response.duration || 0,
        confidence,
      };
    } catch (error) {
      this.logger.error(`Transcription failed for ${fileName}:`, error);
      throw error;
    }
  }

  /**
   * Analyze a transcript using GPT-4 to extract structured data
   * Extracts: client details, problem statement, budget, timeline, stakeholders, etc.
   */
  async analyzeTranscript(transcript: string): Promise<AnalysisResult> {
    try {
      this.logger.log(
        `Starting AI analysis of transcript (${transcript.length} chars)`,
      );

      const systemPrompt = `You are an expert business analyst specializing in sales discovery calls and client meetings.
Your task is to analyze meeting transcripts and extract key business information in a structured format.

Extract the following information if present:
- Problem Statement: What problem is the client trying to solve?
- Budget: Any mentioned budget constraints or ranges (with currency)
- Timeline: Project timeline or deadlines mentioned
- Stakeholders: People mentioned with their roles and contact info
- Pain Points: Current challenges the client is facing
- Desired Outcomes: What the client wants to achieve
- Technical Requirements: Any specific technical needs mentioned
- Company Information: Company name, industry, size
- Current Solutions: Tools/systems they currently use
- Decision Makers: Who has authority to approve the project
- Next Steps: Any agreed-upon action items
- Urgency: How urgent is this project (low/medium/high)

Return ONLY a valid JSON object with these fields. Use null for any information not found in the transcript.
Be conservative - only extract information that is clearly stated. Include a confidence score (0-1) for your extraction.`;

      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini', // Optimized for structured extraction (98% cost savings vs gpt-4-turbo)
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: `Please analyze this meeting transcript and extract structured information:\n\n${transcript}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3, // Lower temperature for more consistent extraction
      });

      const analysisText = response.choices[0].message.content;

      if (!analysisText) {
        throw new Error('No analysis content received from GPT-4');
      }

      const analysisData = JSON.parse(analysisText);

      this.logger.log('AI analysis completed successfully');

      return analysisData as AnalysisResult;
    } catch (error) {
      this.logger.error('AI analysis failed:', error);
      throw error;
    }
  }

  /**
   * Generate proposal content using GPT-4 with few-shot learning
   * Learns from past won proposals to improve quality over time
   */
  async generateProposalContent(
    clientData: any,
    transcriptData: any,
    sections: string[],
    wonProposalExamples?: any[],
  ): Promise<Record<string, string>> {
    try {
      this.logger.log(
        `Generating proposal content for sections: ${sections.join(', ')} with ${wonProposalExamples?.length || 0} examples`,
      );

      // Build system prompt with industry context
      const systemPrompt = `You are an expert proposal writer for ${clientData.industry || 'digital'} agencies.
You write professional, compelling proposals that:
- Emphasize clear value and ROI
- Address client pain points directly
- Use benefit-focused language
- Include specific, actionable solutions
- Follow industry best practices

Your proposals have a track record of winning deals by understanding client needs and presenting tailored solutions.`;

      // Build message array for few-shot learning
      const messages: any[] = [{ role: 'system', content: systemPrompt }];

      // Add few-shot examples if available
      if (wonProposalExamples && wonProposalExamples.length > 0) {
        this.logger.log(
          `Including ${wonProposalExamples.length} winning proposal examples for learning`,
        );

        // Add 3-5 examples (best practices from research)
        const examplesToUse = wonProposalExamples.slice(0, 5);

        for (const example of examplesToUse) {
          // User message: The input that led to a won proposal
          const exampleUserPrompt = `Client: ${example.client.companyName}
Industry: ${example.client.industry || 'Not specified'}
${
  example.transcription?.transcript
    ? `Meeting Notes:\n${example.transcription.transcript.substring(0, 500)}...`
    : ''
}
${
  example.client.problemStatement
    ? `Problem: ${example.client.problemStatement}`
    : ''
}
${
  example.client.budget
    ? `Budget: ${JSON.stringify(example.client.budget)}`
    : ''
}

Generate a proposal.`;

          messages.push({
            role: 'user',
            content: exampleUserPrompt,
          });

          // Assistant message: The winning proposal content
          const exampleAssistantResponse = {
            executiveSummary:
              example.executiveSummary ||
              'Professional executive summary highlighting value proposition.',
            problemStatement:
              example.problemStatement ||
              'Clear articulation of client challenges.',
            proposedSolution:
              example.proposedSolution ||
              'Tailored solution addressing all pain points.',
            scope: example.scope || 'Detailed scope of work and deliverables.',
            timeline: example.timeline || 'Realistic timeline with milestones.',
            pricing: example.pricing || 'Transparent pricing structure.',
          };

          messages.push({
            role: 'assistant',
            content: JSON.stringify(exampleAssistantResponse, null, 2),
          });
        }

        this.logger.log('Few-shot examples added to context');
      }

      // Add the actual task for the new proposal
      const currentTaskPrompt = `Now generate a new proposal with these sections: overview, ${sections.join(', ')}

Client Information:
- Company: ${clientData.companyName}
- Industry: ${clientData.industry || 'Not specified'}
- Problem: ${clientData.problemStatement || 'Not specified'}
- Budget: ${clientData.budget ? JSON.stringify(clientData.budget) : 'Not specified'}
- Timeline: ${clientData.timeline || 'Not specified'}
- Current Tools: ${clientData.currentTools?.join(', ') || 'None mentioned'}

${
  transcriptData?.transcript
    ? `Meeting Transcript:\n${transcriptData.transcript}`
    : 'No transcript available'
}

${
  transcriptData?.extractedData
    ? `Extracted Insights:\n${JSON.stringify(transcriptData.extractedData, null, 2)}`
    : ''
}

Generate a compelling proposal following the format of the winning examples above. Return a JSON object with keys for each section:
- executiveSummary: 2-3 paragraphs highlighting the opportunity and our unique value
- problemStatement: 1-2 paragraphs clearly articulating the client's challenges
- proposedSolution: 3-4 paragraphs detailing our tailored approach
- scope: Bullet points or paragraphs outlining specific deliverables
- timeline: Clear phases or milestones with timeframes
- pricing: Transparent pricing breakdown (can be a string or structured object)

Make it persuasive, professional, and tailored to ${clientData.companyName}.`;

      messages.push({
        role: 'user',
        content: currentTaskPrompt,
      });

      // Call GPT-4 with few-shot context
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o', // Optimized for complex generation (75% cost savings vs gpt-4-turbo)
        messages,
        response_format: { type: 'json_object' },
        temperature: 0.7, // Some creativity while maintaining consistency
        max_tokens: 4000, // Allow for comprehensive proposals
      });

      const contentText = response.choices[0].message.content;

      if (!contentText) {
        throw new Error('No content received from GPT-4');
      }

      const content = JSON.parse(contentText);

      this.logger.log(
        `Proposal content generated successfully. Tokens used: ${response.usage?.total_tokens}`,
      );

      return content;
    } catch (error) {
      this.logger.error('Proposal generation failed:', error);
      throw error;
    }
  }

  /**
   * Extract key moments and sales insights from a transcript
   * Identifies: decisions, action items, pain points, buying signals, objections
   */
  async extractKeyMoments(transcript: string): Promise<any> {
    try {
      this.logger.log(
        `Extracting key moments from transcript (${transcript.length} chars)`,
      );

      const systemPrompt = `You are an expert sales coach and conversation analyst.
Your task is to analyze sales discovery calls and meeting transcripts to identify:

1. KEY MOMENTS:
   - Important decisions made
   - Turning points in the conversation
   - Breakthrough insights or realizations
   - Budget/timeline commitments
   - Buying signals (explicit or implicit)

2. ACTION ITEMS:
   - Commitments made by either party
   - Next steps agreed upon
   - Follow-up tasks

3. PAIN POINTS:
   - Problems mentioned by the client
   - Challenges they're facing
   - Frustrations expressed

4. OBJECTIONS & CONCERNS:
   - Hesitations or doubts raised
   - Questions about price, timeline, or feasibility
   - Competitive concerns

5. STRENGTHS:
   - What went well in the conversation
   - Rapport-building moments
   - Effective responses

6. IMPROVEMENTS:
   - What could have been done better
   - Missed opportunities
   - Better ways to handle objections

Return a JSON object with this structure:
{
  "keyMoments": [
    {
      "timestamp": "approximate time or context",
      "type": "decision|insight|commitment|buying_signal",
      "description": "what happened",
      "importance": "high|medium|low"
    }
  ],
  "actionItems": [
    {
      "owner": "client|agency|both",
      "task": "description",
      "deadline": "mentioned deadline or null"
    }
  ],
  "painPoints": ["list of pain points mentioned"],
  "buyingSignals": ["list of positive buying signals"],
  "objections": [
    {
      "concern": "the objection",
      "handled": true|false,
      "response": "how it was addressed or null"
    }
  ],
  "strengths": ["what went well"],
  "improvements": ["what could be better"],
  "nextCallTips": ["specific tips for the next conversation"]
}`;

      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini', // Optimized for structured extraction (98% cost savings vs gpt-4-turbo)
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: `Analyze this sales/discovery call transcript and extract key moments and insights:\n\n${transcript}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.4, // Balanced between accuracy and insight
      });

      const analysisText = response.choices[0].message.content;

      if (!analysisText) {
        throw new Error('No key moments content received from GPT-4');
      }

      const keyMoments = JSON.parse(analysisText);

      this.logger.log(
        `Key moments extracted successfully. Tokens used: ${response.usage?.total_tokens}`,
      );

      return keyMoments;
    } catch (error) {
      this.logger.error('Key moments extraction failed:', error);
      throw error;
    }
  }

  /**
   * Moderate transcript content for safety before extraction
   * Returns true if content is safe, false if flagged
   */
  async moderateContent(content: string): Promise<boolean> {
    try {
      const moderation = await this.client.moderations.create({
        model: 'omni-moderation-latest',
        input: content,
      });

      const flagged = moderation.results?.[0]?.flagged || false;

      if (flagged) {
        this.logger.warn('Transcript flagged by moderation');
      }

      return !flagged;
    } catch (error) {
      this.logger.error('Moderation check failed:', error);
      // Allow processing to continue if moderation fails (don't block on moderation errors)
      return true;
    }
  }

  /**
   * Extract comprehensive lead intake data from transcript using structured outputs
   * Uses GPT-4o-mini with JSON schema for reliable extraction
   */
  async extractLeadIntake(transcript: string): Promise<LeadIntake> {
    try {
      this.logger.log(
        `Extracting lead intake from transcript (${transcript.length} chars) using GPT-4o-mini`,
      );

      // Optional: Moderate content first
      const isSafe = await this.moderateContent(transcript);
      if (!isSafe) {
        throw new Error('Transcript flagged by moderation. Cannot process.');
      }

      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini', // Fast, cheap, and accurate for structured extraction
        messages: [
          {
            role: 'system',
            content: extractorSystemPrompt,
          },
          {
            role: 'user',
            content: extractorUserTemplate(transcript),
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: LeadIntakeSchema,
        },
        temperature: 0.1, // Low temperature for precise extraction
      });

      const extractedText = response.choices[0].message.content;

      if (!extractedText) {
        throw new Error('No content received from GPT-4o-mini');
      }

      const extractedData = JSON.parse(extractedText) as LeadIntake;

      this.logger.log(
        `Lead intake extracted successfully. Tokens used: ${response.usage?.total_tokens}`,
      );

      return extractedData;
    } catch (error) {
      this.logger.error('Lead intake extraction failed:', error);
      throw error;
    }
  }

  /**
   * @deprecated Use extractLeadIntake instead for comprehensive extraction
   * Extract client contact information from transcript using GPT-3.5-turbo (cost-effective)
   * Extracts: company name, contact name, email, phone
   */
  async extractClientInfo(transcript: string): Promise<ClientContactInfo> {
    try {
      this.logger.log(
        `Extracting client contact info from transcript (${transcript.length} chars) using GPT-3.5-turbo`,
      );

      const systemPrompt = `You are an expert at extracting contact information from meeting transcripts.
Your task is to identify and extract client contact details from sales calls and discovery meetings.

Extract the following information if clearly mentioned:
- Company Name: The name of the client's company
- Contact First Name: First name of the primary contact person
- Contact Last Name: Last name of the primary contact person
- Contact Email: Email address of the contact
- Contact Phone: Phone number of the contact

Return ONLY a valid JSON object with these exact field names:
- companyName (string or null)
- contactFirstName (string or null)
- contactLastName (string or null)
- contactEmail (string or null)
- contactPhone (string or null)
- confidence (number 0-1)

Be conservative - only extract information that is explicitly stated in the transcript.
If contact information is not mentioned, return null for that field.`;

      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo', // Using cheaper model for simple extraction
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: `Extract client contact information from this transcript:\n\n${transcript}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1, // Very low temperature for precise extraction
      });

      const extractedText = response.choices[0].message.content;

      if (!extractedText) {
        throw new Error('No content received from GPT-3.5');
      }

      const extractedData = JSON.parse(extractedText);

      this.logger.log(
        `Client info extracted successfully. Tokens used: ${response.usage?.total_tokens}`,
      );

      return extractedData as ClientContactInfo;
    } catch (error) {
      this.logger.error('Client info extraction failed:', error);
      throw error;
    }
  }

  /**
   * Record feedback on AI-generated content
   * Stores positive/negative feedback to improve future generations
   */
  async recordFeedback(params: {
    tenantId: string;
    generationType: string;
    generationId: string;
    promptUsed: string;
    outputGenerated: string;
    modelUsed: string;
    userRating?: number;
    wasEdited?: boolean;
    editedVersion?: string;
    feedback?: string;
    outcome?: string;
    inputContext?: Record<string, any>;
  }): Promise<void> {
    try {
      await this.prisma.aIGenerationFeedback.create({
        data: {
          tenantId: params.tenantId,
          generationType: params.generationType,
          generationId: params.generationId,
          promptUsed: params.promptUsed,
          outputGenerated: params.outputGenerated,
          modelUsed: params.modelUsed,
          userRating: params.userRating,
          wasEdited: params.wasEdited || false,
          editedVersion: params.editedVersion,
          feedback: params.feedback,
          outcome: params.outcome,
          inputContext: params.inputContext || {},
        },
      });

      this.logger.log(
        `Recorded feedback for ${params.generationType} ${params.generationId}`,
      );
    } catch (error) {
      this.logger.error('Failed to record feedback:', error);
      throw error;
    }
  }

  /**
   * Record an error pattern when AI generation fails
   * Helps identify common failure modes to prevent future errors
   */
  async recordErrorPattern(params: {
    errorType: string;
    description: string;
    examplePrompt: string;
    correctOutput: string;
    incorrectOutput: string;
    fixInstructions: string;
    preventionTip: string;
  }): Promise<void> {
    try {
      // Check if this error pattern already exists
      const existingPattern = await this.prisma.aIErrorPattern.findFirst({
        where: {
          errorType: params.errorType,
          description: params.description,
        },
      });

      if (existingPattern) {
        // Increment occurrence count
        await this.prisma.aIErrorPattern.update({
          where: { id: existingPattern.id },
          data: {
            occurrences: { increment: 1 },
            lastSeen: new Date(),
          },
        });

        this.logger.log(
          `Updated error pattern occurrence count: ${params.errorType}`,
        );
      } else {
        // Create new error pattern
        await this.prisma.aIErrorPattern.create({
          data: {
            errorType: params.errorType,
            description: params.description,
            examplePrompt: params.examplePrompt,
            correctOutput: params.correctOutput,
            incorrectOutput: params.incorrectOutput,
            fixInstructions: params.fixInstructions,
            preventionTip: params.preventionTip,
            occurrences: 1,
          },
        });

        this.logger.log(`Recorded new error pattern: ${params.errorType}`);
      }
    } catch (error) {
      this.logger.error('Failed to record error pattern:', error);
      // Don't throw - error logging should not break the main flow
    }
  }

  /**
   * Get learning insights from feedback and error patterns
   * Returns data to improve AI prompt engineering
   */
  async getLearningInsights(tenantId: string): Promise<{
    positiveFeedback: any[];
    negativeFeedback: any[];
    commonErrors: any[];
    improvementSuggestions: string[];
  }> {
    try {
      // Get recent positive feedback (high ratings or won deals, last 50)
      const positiveFeedback = await this.prisma.aIGenerationFeedback.findMany({
        where: {
          tenantId,
          OR: [{ userRating: { gte: 4 } }, { outcome: 'won_deal' }],
        },
        orderBy: { created: 'desc' },
        take: 50,
      });

      // Get recent negative feedback (low ratings or lost deals, last 50)
      const negativeFeedback = await this.prisma.aIGenerationFeedback.findMany({
        where: {
          tenantId,
          OR: [{ userRating: { lte: 2 } }, { outcome: 'lost_deal' }],
        },
        orderBy: { created: 'desc' },
        take: 50,
      });

      // Get most common error patterns (top 10)
      const commonErrors = await this.prisma.aIErrorPattern.findMany({
        orderBy: { occurrences: 'desc' },
        take: 10,
      });

      // Generate improvement suggestions based on patterns
      const improvementSuggestions = this.generateImprovementSuggestions(
        negativeFeedback,
        commonErrors,
      );

      return {
        positiveFeedback,
        negativeFeedback,
        commonErrors,
        improvementSuggestions,
      };
    } catch (error) {
      this.logger.error('Failed to get learning insights:', error);
      throw error;
    }
  }

  /**
   * Generate improvement suggestions based on feedback patterns
   */
  private generateImprovementSuggestions(
    negativeFeedback: any[],
    commonErrors: any[],
  ): string[] {
    const suggestions: string[] = [];

    // Analyze negative feedback patterns
    const negativeComments = negativeFeedback
      .filter((f) => f.feedback)
      .map((f) => f.feedback.toLowerCase());

    if (negativeComments.some((c) => c.includes('too generic'))) {
      suggestions.push(
        'Add more specific details and examples tailored to the client',
      );
    }

    if (negativeComments.some((c) => c.includes('too long'))) {
      suggestions.push('Make content more concise and scannable');
    }

    if (negativeComments.some((c) => c.includes('tone'))) {
      suggestions.push('Adjust tone to be more professional or conversational');
    }

    // Analyze section-specific feedback
    const problemSections = negativeFeedback.filter(
      (f) => f.sectionName === 'problemStatement',
    );
    if (problemSections.length > 3) {
      suggestions.push(
        'Improve problem statement clarity - focus on client pain points',
      );
    }

    const pricingSections = negativeFeedback.filter(
      (f) => f.sectionName === 'pricing',
    );
    if (pricingSections.length > 3) {
      suggestions.push('Make pricing more transparent and justify the value');
    }

    // Analyze common errors
    for (const error of commonErrors) {
      if (error.errorType === 'TOKEN_LIMIT_EXCEEDED' && error.occurrences > 5) {
        suggestions.push('Reduce input context length or use summarization');
      }

      if (error.errorType === 'INVALID_JSON' && error.occurrences > 3) {
        suggestions.push(
          'Add JSON validation examples to the prompt for more reliable parsing',
        );
      }

      if (
        error.errorType === 'MISSING_REQUIRED_FIELD' &&
        error.occurrences > 3
      ) {
        suggestions.push(
          'Strengthen prompt instructions for required fields with explicit examples',
        );
      }
    }

    return suggestions;
  }

  /**
   * Create ContextPack using gpt-4o-mini
   * Extracts structured context from transcript with ~60% token reduction
   * This is the recommended approach over summarizeTranscript
   */
  async createContextPack(transcript: string): Promise<{
    painPoints: string[];
    desiredOutcomes: string[];
    budgetConstraints: string;
    timelineConstraints: string;
    stakeholders: string[];
    technicalRequirements: string[];
    currentSolutions: string[];
    keyDecisions: string[];
    meetingHighlights: string;
    originalLength: number;
    contextPackLength: number;
    tokenSavings: number;
  }> {
    this.logger.log(
      `Creating ContextPack from transcript (${transcript.length} chars)`,
    );

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini', // Cost-effective model for extraction
        messages: [
          {
            role: 'system',
            content: `You are an expert at extracting structured business context from meeting transcripts.
Extract key information into a structured format that will be used for proposal generation.
Focus on client pain points, requirements, budget, timeline, and decision criteria.
Be precise and preserve all critical business details.`,
          },
          {
            role: 'user',
            content: `Extract structured context from this meeting transcript:

${transcript}

Return a JSON object with these fields:
- painPoints: Array of client problems and challenges mentioned
- desiredOutcomes: Array of what the client wants to achieve
- budgetConstraints: Budget information (string, include ranges if mentioned)
- timelineConstraints: Timeline information (string, include deadlines)
- stakeholders: Array of people involved and their roles
- technicalRequirements: Array of technical needs or constraints
- currentSolutions: Array of tools/systems they currently use
- keyDecisions: Array of decisions made or pending
- meetingHighlights: Brief summary of the most important takeaways (2-3 sentences max)

If any field has no relevant information, return an empty array or empty string.`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3, // Lower temperature for factual extraction
        max_tokens: 1500,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('Empty response from gpt-4o-mini');
      }

      const contextPack = JSON.parse(content);
      const contextPackLength = JSON.stringify(contextPack).length;
      const tokenSavings = Math.round(
        ((transcript.length - contextPackLength) / transcript.length) * 100,
      );

      this.logger.log(
        `ContextPack created: ${contextPackLength} chars (${tokenSavings}% reduction)`,
      );

      return {
        ...contextPack,
        originalLength: transcript.length,
        contextPackLength,
        tokenSavings,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create ContextPack: ${error.message}`,
        error.stack,
      );
      // Fallback to basic summarization if ContextPack fails
      const summarized = await this.summarizeTranscript(transcript);
      return {
        painPoints: [],
        desiredOutcomes: [],
        budgetConstraints: '',
        timelineConstraints: '',
        stakeholders: [],
        technicalRequirements: [],
        currentSolutions: [],
        keyDecisions: [],
        meetingHighlights: summarized,
        originalLength: transcript.length,
        contextPackLength: summarized.length,
        tokenSavings: Math.round(
          ((transcript.length - summarized.length) / transcript.length) * 100,
        ),
      };
    }
  }

  /**
   * Summarize transcript if it exceeds token limits
   * Uses GPT-4o-mini for cost-effective summarization
   * NOTE: Consider using createContextPack() instead for better structure
   */
  private async summarizeTranscript(
    transcript: string,
    maxChars: number = 8000,
  ): Promise<string> {
    if (transcript.length <= maxChars) {
      return transcript;
    }

    this.logger.log(
      `Summarizing transcript from ${transcript.length} to ~${maxChars} chars`,
    );

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert at summarizing meeting transcripts.
Preserve all key business information: problems, solutions, budget, timeline, stakeholders, pain points, and decisions.
Be concise but comprehensive.`,
          },
          {
            role: 'user',
            content: `Summarize this meeting transcript, preserving all important business details:\n\n${transcript}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      const summary = response.choices[0].message.content || transcript;

      this.logger.log(
        `Transcript summarized. Original: ${transcript.length} chars, Summary: ${summary.length} chars. Tokens used: ${response.usage?.total_tokens}`,
      );

      return summary;
    } catch (error) {
      this.logger.error('Transcript summarization failed:', error);
      // Return truncated version as fallback
      return transcript.substring(0, maxChars);
    }
  }

  /**
   * Log AI operation to audit log
   */
  private async logAIOperation(params: {
    userId: string;
    operation: string;
    prompt: string;
    response?: string;
    error?: string;
    tokensUsed?: number;
  }): Promise<void> {
    try {
      await this.prisma.aIAuditLog.create({
        data: {
          userId: params.userId,
          operation: params.operation,
          prompt: params.prompt,
          response: params.response,
          error: params.error,
          tokensUsed: params.tokensUsed,
        },
      });
    } catch (error) {
      // Don't throw - audit logging should not break main flow
      this.logger.error('Failed to log AI operation:', error);
    }
  }

  /**
   * Parse JSON with fallback retry
   */
  private async parseJSONWithFallback(
    jsonString: string,
    schema: string,
    retryPrompt?: string,
  ): Promise<any> {
    try {
      return JSON.parse(jsonString);
    } catch (parseError) {
      this.logger.warn(
        'Initial JSON parse failed, attempting retry with explicit schema',
      );

      if (retryPrompt) {
        // Retry with explicit schema in prompt
        const response = await this.client.chat.completions.create({
          model: 'gpt-4o', // Optimized for reliable recovery (75% cost savings vs gpt-4-turbo)
          messages: [
            {
              role: 'system',
              content: `You MUST respond with valid JSON matching this exact schema:\n${schema}`,
            },
            {
              role: 'user',
              content: retryPrompt,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
        });

        const retryContent = response.choices[0].message.content;
        if (!retryContent) {
          throw new Error('No content in retry response');
        }

        return JSON.parse(retryContent);
      }

      throw parseError;
    }
  }

  /**
   * Enhanced proposal generation with adaptive learning
   * Uses feedback and error patterns to improve output quality
   */
  async generateProposalContentWithLearning(
    tenantId: string,
    clientData: any,
    transcriptData: any,
    sections: string[],
    wonProposalExamples?: any[],
    discoveryContext?: DiscoveryContext,
    maxTokens: number = 4000,
  ): Promise<ProposalContent> {
    try {
      // Use ContextPack if enabled (recommended for token reduction)
      const useContextPack = process.env.ENABLE_CONTEXT_PACK !== 'false'; // Enabled by default
      let processedTranscript = transcriptData?.transcript || '';
      let contextPack: any = null;

      if (processedTranscript.length > 8000) {
        if (useContextPack) {
          this.logger.log('Using ContextPack for token reduction');
          contextPack = await this.createContextPack(processedTranscript);
          this.logger.log(
            `ContextPack stats: ${contextPack.tokenSavings}% token reduction`,
          );
          // Don't need full transcript anymore
          processedTranscript = '';
        } else {
          this.logger.log('Using legacy summarization (ContextPack disabled)');
          processedTranscript =
            await this.summarizeTranscript(processedTranscript);
        }
      }

      // Get learning insights to improve generation
      const insights = await this.getLearningInsights(tenantId);

      this.logger.log(
        `Using adaptive learning: ${insights.positiveFeedback.length} positive examples, ${insights.improvementSuggestions.length} improvement tips`,
      );

      // Enhance system prompt with learning insights and discovery context
      let systemPrompt = `You are an expert proposal writer for ${clientData.industry || 'digital'} agencies.
You write professional, compelling proposals that:
- Emphasize clear value and ROI
- Address client pain points directly
- Use benefit-focused language
- Include specific, actionable solutions
- Follow industry best practices

Your proposals have a track record of winning deals by understanding client needs and presenting tailored solutions.`;

      // Add discovery context if provided
      if (discoveryContext) {
        systemPrompt += `\n\nDISCOVERY CONTEXT:`;
        if (discoveryContext.targetICP) {
          systemPrompt += `\n- Target ICP: ${discoveryContext.targetICP}`;
        }
        if (discoveryContext.tone) {
          systemPrompt += `\n- Use a ${discoveryContext.tone} tone`;
        }
        if (
          discoveryContext.painPoints &&
          discoveryContext.painPoints.length > 0
        ) {
          systemPrompt += `\n- Address these pain points: ${discoveryContext.painPoints.join(', ')}`;
        }
      }

      // Add improvement suggestions from learning
      if (insights.improvementSuggestions.length > 0) {
        systemPrompt += `\n\nIMPORTANT IMPROVEMENTS based on recent feedback:
${insights.improvementSuggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
      }

      // Build message array
      const messages: any[] = [{ role: 'system', content: systemPrompt }];

      // Add few-shot examples - prioritize proposals with positive feedback
      const examplesWithFeedback = wonProposalExamples?.map((example) => {
        const feedback = insights.positiveFeedback.find(
          (f) =>
            f.generationType === 'proposal' && f.generationId === example.id,
        );
        return {
          ...example,
          hasFeedback: !!feedback,
          rating: feedback?.userRating,
        };
      });

      const sortedExamples =
        examplesWithFeedback?.sort(
          (a, b) => (b.rating || 0) - (a.rating || 0),
        ) || [];

      const examplesToUse = sortedExamples.slice(0, 5);

      for (const example of examplesToUse) {
        const exampleUserPrompt = `Client: ${example.client.companyName}
Industry: ${example.client.industry || 'Not specified'}
${
  example.transcription?.transcript
    ? `Meeting Notes:\n${example.transcription.transcript.substring(0, 500)}...`
    : ''
}
${
  example.client.problemStatement
    ? `Problem: ${example.client.problemStatement}`
    : ''
}
${
  example.client.budget
    ? `Budget: ${JSON.stringify(example.client.budget)}`
    : ''
}

Generate a proposal.`;

        messages.push({ role: 'user', content: exampleUserPrompt });

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
            { title: 'Scope of Work', page: null },
            { title: 'Deliverables', page: null },
            { title: 'Approach and Tools', page: null },
            { title: 'Timeline', page: null },
            { title: 'Proposed Project Phases', page: null },
            { title: 'Pricing', page: null },
            { title: 'Payment Terms', page: null },
            { title: 'Next Steps', page: null },
            { title: 'Cancellation Notice', page: null },
          ],
          overview:
            example.coverPageData?.summary ||
            'Brief overview of the engagement and value proposition.',
          executiveSummary:
            example.executiveSummary ||
            `WarmUp specializes in helping B2B companies build predictable pipeline through intelligent outbound strategies. We leverage data-driven triggers like funding rounds, leadership changes, and intent signals to identify high-value prospects at the right moment.

Our approach combines multiple channels—outbound email, LinkedIn prospecting and content, and calls to high-intent signals—to create a comprehensive demand generation system. Using tools like HeyReach.io, RB2B.com, Clay.com, Smartlead.ai, and HubSpot, we automate prospecting workflows while maintaining personalization at scale.

This proposal outlines a phased approach to build ${clientData.companyName || 'your'} revenue engine, starting with foundational campaigns and scaling based on proven performance.`,
          keyPriorities: example.keyPriorities || [
            'Generate qualified leads through targeted outbound campaigns',
            'Establish thought leadership and brand visibility',
            'Build scalable infrastructure for long-term growth',
          ],
          objectivesAndOutcomes:
            example.objectivesAndOutcomes ||
            'Clear objectives and expected business outcomes.',
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
            {
              title: 'Outbound Campaign Development',
              objective: 'Build targeted outbound campaigns using data-driven triggers',
              keyActivities: [
                'Identify ideal customer profiles and high-value target accounts.',
                'Set up automated sequences in Smartlead.ai for personalized outreach.',
                'Monitor campaign performance and optimize based on engagement metrics.',
              ],
              outcome: 'Increased qualified pipeline through systematic outbound prospecting.',
            },
            {
              title: 'LinkedIn Prospecting Strategy',
              objective: 'Establish thought leadership and generate inbound interest via LinkedIn',
              keyActivities: [
                'Develop LinkedIn content strategy with weekly posts and engagement plan.',
                'Implement HeyReach.io for automated connection requests and follow-ups.',
                'Track engagement metrics and refine messaging based on response rates.',
              ],
              outcome: 'Enhanced brand visibility and increased warm inbound conversations.',
            },
            {
              title: 'Lead Enrichment and Scoring',
              objective: 'Automate lead qualification and prioritization processes',
              keyActivities: [
                'Connect RB2B.com to identify anonymous website visitors and intent signals.',
                'Use Clay.com to enrich lead data with firmographics and technographics.',
                'Build lead scoring models in HubSpot based on engagement and fit.',
              ],
              outcome: 'Sales team focuses on highest-priority opportunities with complete context.',
            },
          ],
          deliverables:
            example.deliverables ||
            'List of specific deliverables and tangible outputs.',
          approachAndTools:
            example.approachAndTools ||
            'Methodology, approach, and tools to be used.',
          timeline: example.timeline || {
            workItems: [
              {
                workItem: 'Email Infrastructure Setup',
                description: 'Buy domains, set mailboxes, warmup accounts…',
                owner: 'WarmUp',
                weeks: 'Week 1–2',
              },
              {
                workItem: 'Campaign Development',
                description: 'Create messaging, templates, and sequences',
                owner: 'WarmUp and Client',
                weeks: 'Weeks 2–3',
              },
              {
                workItem: 'Launch and Optimization',
                description: 'Deploy campaigns and monitor performance',
                owner: 'WarmUp',
                weeks: 'Weeks 3–4',
              },
            ],
            phases: [
              {
                phase: 'Discovery and Planning',
                weeks: 'Weeks 1–2',
                tasks: ['Kickoff meeting, system audit, confirm KPIs, finalize plan'],
              },
              {
                phase: 'Implementation',
                weeks: 'Weeks 2–4',
                tasks: ['Setup infrastructure, develop content, configure tools'],
              },
              {
                phase: 'Launch and Optimization',
                weeks: 'Weeks 4–6',
                tasks: ['Deploy campaigns, monitor results, optimize performance'],
              },
            ],
          },
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
          ],
          pricing: example.pricing || 'Transparent pricing structure.',
          paymentTerms:
            example.paymentTerms ||
            'Payment schedule and terms of engagement.',
          nextSteps: example.nextSteps || [
            'Review and approve this proposal by [Date]',
            'Schedule kickoff meeting (Client)',
            'Provide brand assets and messaging docs (Client, Week 1)',
            'Begin infrastructure setup (WarmUp, Week 1)',
          ],
          cancellationNotice:
            example.cancellationNotice ||
            'Cancellation policy and notice requirements.',
        };

        messages.push({
          role: 'assistant',
          content: JSON.stringify(exampleAssistantResponse, null, 2),
        });
      }

      // Add current task
      let contextSection = '';
      if (contextPack) {
        // Use structured ContextPack data
        contextSection = `Meeting Context (Extracted):
${
  contextPack.painPoints?.length
    ? `\nClient Pain Points:\n${contextPack.painPoints.map((p: string) => `- ${p}`).join('\n')}`
    : ''
}
${
  contextPack.desiredOutcomes?.length
    ? `\nDesired Outcomes:\n${contextPack.desiredOutcomes.map((o: string) => `- ${o}`).join('\n')}`
    : ''
}
${contextPack.budgetConstraints ? `\nBudget: ${contextPack.budgetConstraints}` : ''}
${contextPack.timelineConstraints ? `\nTimeline: ${contextPack.timelineConstraints}` : ''}
${
  contextPack.stakeholders?.length
    ? `\nStakeholders:\n${contextPack.stakeholders.map((s: string) => `- ${s}`).join('\n')}`
    : ''
}
${
  contextPack.technicalRequirements?.length
    ? `\nTechnical Requirements:\n${contextPack.technicalRequirements.map((t: string) => `- ${t}`).join('\n')}`
    : ''
}
${
  contextPack.currentSolutions?.length
    ? `\nCurrent Solutions:\n${contextPack.currentSolutions.map((s: string) => `- ${s}`).join('\n')}`
    : ''
}
${
  contextPack.keyDecisions?.length
    ? `\nKey Decisions:\n${contextPack.keyDecisions.map((d: string) => `- ${d}`).join('\n')}`
    : ''
}
${contextPack.meetingHighlights ? `\nMeeting Highlights: ${contextPack.meetingHighlights}` : ''}`;
      } else if (processedTranscript) {
        // Fallback to transcript/summary
        contextSection = `Meeting Transcript:\n${processedTranscript}`;
      } else {
        contextSection = 'No transcript available';
      }

      const currentTaskPrompt = `Now generate a new proposal with these sections: ${sections.join(', ')}

Client Information:
- Company: ${clientData.companyName}
- Industry: ${clientData.industry || 'Not specified'}
- Problem: ${clientData.problemStatement || 'Not specified'}
- Budget: ${clientData.budget ? JSON.stringify(clientData.budget) : 'Not specified'}
- Timeline: ${clientData.timeline || 'Not specified'}
- Current Tools: ${clientData.currentTools?.join(', ') || 'None mentioned'}

${contextSection}

${
  transcriptData?.extractedData
    ? `Extracted Insights:\n${JSON.stringify(transcriptData.extractedData, null, 2)}`
    : ''
}

CRITICAL - PRICING FORMAT:
The "pricing" field MUST be a JSON object with the following structure:
{
  "items": [
    {"name": "Service Name", "description": "What's included", "price": 5000}
  ],
  "total": 5000
}
- Each item.price must be a NUMBER (not string, no $ symbol)
- Total must equal the sum of all item prices
- Example: {"items": [{"name": "Setup Fee", "description": "Initial setup and configuration", "price": 2500}, {"name": "Monthly Retainer", "description": "Ongoing support and management", "price": 5000}], "total": 7500}

CRITICAL - TIMELINE FORMAT:
The "timeline" field MUST be a JSON object with BOTH arrays:
{
  "workItems": [
    {"workItem": "Email Infrastructure Setup", "description": "Buy domains, set mailboxes, warmup accounts…", "owner": "WarmUp", "weeks": "Week 1–2"}
  ],
  "phases": [
    {"phase": "Discovery and Planning", "weeks": "Weeks 1–2", "tasks": ["Kickoff meeting, system audit, confirm KPIs, finalize plan"]}
  ]
}
RULES:
- weeks field MUST use format "Week X–Y" or "Weeks X–Y" (use en-dash –, not hyphen -)
- owner MUST be one of: "WarmUp", "Client", or "WarmUp and Client"
- Include 3-6 workItems and 3-5 phases (6-10 total rows)
- Descriptions are concise and action-oriented
- Tasks are short, action-led bullet points

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

CRITICAL - TABLE OF CONTENTS FORMAT:
The "tableOfContents" field MUST be an array of objects:
[
  {"title": "Overview", "page": null},
  {"title": "Key Priorities", "page": null}
]
- Each entry must have "title" (string) and "page" (null for preview)
- Include entries for all major sections

CRITICAL - KEY PRIORITIES FORMAT:
The "keyPriorities" field MUST be an array of 3-6 strings:
["Priority 1 description", "Priority 2 description", "Priority 3 description"]
- Minimum 3 items, maximum 6 items
- Each item is concise and outcome-focused (20-150 characters)
- Focus on business outcomes, not tasks

CRITICAL - NEXT STEPS FORMAT:
The "nextSteps" field MUST be an array of 3-5 strings:
["Review and approve this proposal by [Date]", "Schedule kickoff meeting (Client)", "Begin setup (WarmUp, Week 1)"]
- Minimum 3 items, maximum 5 items
- Action-led with optional owner and timeframe
- Clear, actionable items

CRITICAL - PROPOSED PROJECT PHASES FORMAT:
The "proposedProjectPhases" field MUST be an array of 2-3 detailed phase objects:
[
  {
    "phase": "Phase 1: Launch",
    "commitment": "3-Month Commitment",
    "window": "Months 1-3",
    "focus": "Foundational projects with high ROI and operational efficiency",
    "bullets": [
      "Customer Expansion: Identify top expansion opportunities...",
      "Partner Campaigns: Segment partner accounts by type..."
    ],
    "estimatedHours": {"perMonth": 40, "perWeek": 10}
  }
]
RULES:
- 2-3 phases required
- Each phase has: phase, commitment (can be ""), window, focus, bullets (2-4), estimatedHours
- estimatedHours MUST be numeric (perMonth and perWeek)
- Bullets are detailed, specific activities with outcomes

CRITICAL - SCOPE OF WORK FORMAT:
The "scopeOfWork" field MUST be an array of 4-6 work items:
[
  {
    "title": "HubSpot CRM Implementation",
    "objective": "Implement a unified CRM tailored to <Client>",
    "keyActivities": [
      "Configure HubSpot CRM to centralize customer data and improve pipeline visibility.",
      "Integrate HubSpot with Clay.com for data flow and prospecting insights.",
      "Create customized dashboards and reporting tailored to KPIs."
    ],
    "outcome": "Improved collaboration, transparency, and efficiency across the sales team."
  }
]
RULES:
- 4-6 items required
- Each item MUST include: title, objective, keyActivities (≥3), outcome
- keyActivities are action-led, no fluff
- Objective mentions client name

CRITICAL - EXECUTIVE SUMMARY FORMAT:
The "executiveSummary" field MUST include:
- 2-3 paragraphs
- First paragraph: 40-60 words
- MUST mention "data-driven triggers" (funding rounds, leadership changes, etc.)
- MUST mention channels: outbound email, LinkedIn prospecting & content, calls to high-intent signals
- MUST cite tools where applicable: HeyReach.io, RB2B.com, Clay.com, Smartlead.ai, HubSpot
- Tone: consultative, transparent

Generate a compelling proposal following the format of the winning examples above. Return a JSON object with keys for each section.`;

      messages.push({ role: 'user', content: currentTaskPrompt });

      // Call GPT-4 with enhanced context and STRICT JSON schema enforcement
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o', // Optimized for complex generation (75% cost savings vs gpt-4-turbo)
        messages,
        response_format: PROPOSAL_GENERATION_SCHEMA as any, // Enforce exact field names and types
        temperature: 0.7,
        max_tokens: maxTokens,
      });

      const contentText = response.choices[0].message.content;

      if (!contentText) {
        const errorMsg = 'No content received from GPT-4';
        this.logger.error('Empty response from GPT-4', {
          model: 'gpt-4o',
          sections,
        });

        // Log to audit log
        await this.logAIOperation({
          userId: tenantId,
          operation: 'proposal_generation',
          prompt: systemPrompt + '\n\n' + currentTaskPrompt,
          error: errorMsg,
          tokensUsed: response.usage?.total_tokens,
        });

        throw new Error(errorMsg);
      }

      // Parse JSON with fallback
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
  "scopeOfWork": [
    {
      "title": "string (work item title)",
      "objective": "string (goal mentioning client)",
      "keyActivities": ["string (3+ action-led activities)"],
      "outcome": "string (expected result)"
    }
  ],
  "deliverables": "string (specific outputs and artifacts)",
  "approachAndTools": "string (methodology and technologies)",
  "timeline": {
    "workItems": [
      {"workItem": "string", "description": "string", "owner": "WarmUp|Client|WarmUp and Client", "weeks": "Week X–Y"}
    ],
    "phases": [
      {"phase": "string", "weeks": "Weeks X–Y", "tasks": ["string"]}
    ]
  },
  "proposedProjectPhases": [
    {
      "phase": "string (e.g., Phase 1: Launch)",
      "commitment": "string (optional)",
      "window": "string (e.g., Months 1-3)",
      "focus": "string (focus area)",
      "bullets": ["string (2-4 detailed activities)"],
      "estimatedHours": {"perMonth": "number", "perWeek": "number"}
    }
  ],
  "pricing": {
    "items": [
      {
        "name": "string (service name)",
        "description": "string (what's included)",
        "price": "number (price in USD, no currency symbols)"
      }
    ],
    "total": "number (sum of all item prices)"
  },
  "paymentTerms": "string (payment schedule and terms)",
  "nextSteps": ["string (3-5 action items)"],
  "cancellationNotice": "string (cancellation policy)"
}`;

      let content: ProposalContent;
      try {
        content = await this.parseJSONWithFallback(
          contentText,
          jsonSchema,
          currentTaskPrompt,
        );
      } catch (parseError) {
        this.logger.error('Failed to parse GPT-4 response as JSON', {
          rawResponse: contentText.substring(0, 500),
        });

        // Log parsing error to audit log
        await this.logAIOperation({
          userId: tenantId,
          operation: 'proposal_generation',
          prompt: systemPrompt + '\n\n' + currentTaskPrompt,
          response: contentText.substring(0, 1000),
          error: `JSON Parse Error: ${parseError.message}`,
          tokensUsed: response.usage?.total_tokens,
        });

        throw parseError;
      }

      // Structured logging: AI generation with token metrics
      this.logger.log('Proposal content generated with learning', {
        tenantId,
        tokens: {
          prompt: response.usage?.prompt_tokens,
          completion: response.usage?.completion_tokens,
          total: response.usage?.total_tokens,
        },
        model: 'gpt-4o',
        contextPackUsed: useContextPack && !!contextPack,
        contextPackSavings: contextPack?.tokenSavings,
        sectionsGenerated: Object.keys(content).length,
        event: 'openai_proposal_generated',
      });

      // Log successful operation to audit log
      await this.logAIOperation({
        userId: tenantId,
        operation: 'proposal_generation',
        prompt: systemPrompt + '\n\n' + currentTaskPrompt,
        response: JSON.stringify(content).substring(0, 1000),
        tokensUsed: response.usage?.total_tokens,
      });

      // Attach metadata for processor
      content._metadata = {
        promptTokens: response.usage?.prompt_tokens,
        completionTokens: response.usage?.completion_tokens,
        totalTokens: response.usage?.total_tokens,
        model: 'gpt-4o',
        contextPackUsed: useContextPack && !!contextPack,
        tokenSavings: contextPack?.tokenSavings,
      };

      return content;
    } catch (error) {
      this.logger.error('Proposal generation with learning failed:', error, {
        clientData: {
          companyName: clientData.companyName,
          industry: clientData.industry,
        },
        sections,
        transcriptLength: transcriptData?.transcript?.length || 0,
      });

      // Log error to audit log
      await this.logAIOperation({
        userId: tenantId,
        operation: 'proposal_generation',
        prompt: 'Error during proposal generation',
        error: error.message || 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Generate playbook scripts (email, LinkedIn, cold call) based on ICP data
   * Uses GPT-4 to create personalized outreach scripts
   */
  async generatePlaybookScripts(params: {
    targetICP: {
      industry?: string;
      companySize?: string;
      roles?: string[];
      painPoints?: string[];
      [key: string]: any;
    };
    tone: string;
    ctas: string[];
    clientContext?: {
      companyName?: string;
      problemStatement?: string;
      currentTools?: string[];
    };
  }): Promise<{
    emailScript: {
      subject: string;
      body: string;
      ctaText: string;
      ctaUrl?: string;
      followUpSequence?: string[];
    };
    linkedInScript: {
      connectionRequest: string;
      firstMessage: string;
      followUpMessage: string;
    };
    coldCallScript: {
      opener: string;
      discovery: string[];
      objectionHandling: Record<string, string>;
      close: string;
    };
  }> {
    try {
      this.logger.log(
        `Generating playbook scripts for ${params.targetICP.industry || 'industry'} targeting ${params.targetICP.roles?.join(', ') || 'roles'}`,
      );

      const systemPrompt = `You are an expert sales copywriter and outreach strategist specializing in B2B cold outreach.
Your task is to generate highly personalized, effective outreach scripts for email, LinkedIn, and cold calling.

Your scripts should:
- Be conversational and ${params.tone} in tone
- Address specific pain points directly
- Lead with value, not features
- Include clear calls-to-action
- Follow best practices for each channel
- Avoid generic language and templates
- Be concise and scannable
- Create curiosity without being clickbait

Target Audience Profile:
- Industry: ${params.targetICP.industry || 'Not specified'}
- Company Size: ${params.targetICP.companySize || 'Not specified'}
- Target Roles: ${params.targetICP.roles?.join(', ') || 'Decision makers'}
- Pain Points: ${params.targetICP.painPoints?.join(', ') || 'Operational challenges'}

Call-to-Actions to use: ${params.ctas.join(', ')}

${
  params.clientContext?.companyName
    ? `Client Context: ${params.clientContext.companyName}${params.clientContext.problemStatement ? ` - ${params.clientContext.problemStatement}` : ''}`
    : ''
}`;

      const userPrompt = `Generate a complete set of outreach scripts for this target audience.

Return a JSON object with this exact structure:
{
  "emailScript": {
    "subject": "Compelling subject line (40-60 characters)",
    "body": "Email body (150-200 words max)",
    "ctaText": "Clear call-to-action text (e.g., 'Schedule a call', 'Download guide')",
    "ctaUrl": "Optional URL for the CTA button (e.g., calendly link)",
    "followUpSequence": ["2-3 follow-up email bodies for non-responders"]
  },
  "linkedInScript": {
    "connectionRequest": "Connection request message (max 300 characters)",
    "firstMessage": "First message after connection accepted (150-200 words)",
    "followUpMessage": "Follow-up message if no response (150-200 words)"
  },
  "coldCallScript": {
    "opener": "Opening statement (30-60 seconds)",
    "discovery": ["5-7 discovery questions to ask"],
    "objectionHandling": {
      "Not interested": "Response to 'not interested'",
      "Too busy": "Response to 'too busy'",
      "Already have a solution": "Response to 'we already have a solution'",
      "Send me information": "Response to 'send me information'"
    },
    "close": "Closing statement to secure next step"
  }
}

Make each script unique, personalized, and effective. Use merge tags like [First Name], [Company Name], and [Pain Point] where appropriate.`;

      const response = await this.client.chat.completions.create({
        model: 'gpt-4o', // Optimized for creative generation (75% cost savings vs gpt-4-turbo)
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.8, // Higher creativity for diverse script options
        max_tokens: 3000,
      });

      const scriptsText = response.choices[0].message.content;

      if (!scriptsText) {
        throw new Error('No script content received from GPT-4');
      }

      const scripts = JSON.parse(scriptsText);

      this.logger.log(
        `Playbook scripts generated successfully. Tokens used: ${response.usage?.total_tokens}`,
      );

      return scripts;
    } catch (error) {
      this.logger.error('Playbook script generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate complete proposal from transcription with data extraction
   * This method extracts key data points from the transcription and generates a full proposal
   */
  async generateProposalFromTranscription(
    transcription: any,
    client: any,
    coverPageData?: any,
  ): Promise<{
    executiveSummary: string;
    problemStatement: string;
    proposedSolution: string;
    scope: string;
    timeline: string;
    extractedData: {
      budget?: any;
      timeline?: string;
      painPoints?: string[];
      desiredOutcomes?: string[];
      stakeholders?: any[];
    };
  }> {
    try {
      this.logger.log(
        `Generating proposal from transcription ${transcription.id}`,
      );

      const systemPrompt = `You are an expert proposal writer and business analyst.
Your task is to analyze a meeting transcription and generate a professional, compelling proposal.

You must:
1. EXTRACT key data points from the transcription (budget, timeline, pain points, desired outcomes)
2. GENERATE proposal sections that are:
   - Tailored to the client's specific needs
   - Professional and persuasive
   - Benefit-focused and ROI-driven
   - Clear and well-structured

Return a JSON object with:
- executiveSummary: 2-3 paragraphs summarizing the opportunity and value proposition
- problemStatement: 1-2 paragraphs articulating the client's challenges from the transcript
- proposedSolution: 3-4 paragraphs detailing your tailored approach to solve their problems
- scope: Detailed bullet points of deliverables and scope of work
- timeline: Clear phases and milestones based on the client's needs
- extractedData: Object with:
  - budget: {min, max, currency} if mentioned
  - timeline: Timeline requirements from the transcript
  - painPoints: Array of key pain points identified
  - desiredOutcomes: Array of outcomes the client wants
  - stakeholders: Array of {name, role} for people mentioned`;

      const userPrompt = `Client Information:
- Company: ${client.companyName}
- Industry: ${client.industry || 'Not specified'}
- Contact: ${client.contactFirstName || ''} ${client.contactLastName || ''}

Meeting Transcription:
${transcription.transcript}

${coverPageData ? `Cover Page Data:\n${JSON.stringify(coverPageData, null, 2)}` : ''}

Generate a complete proposal that demonstrates deep understanding of the client's needs from this conversation.
Extract all relevant data points and create compelling, tailored content for each section.`;

      const response = await this.client.chat.completions.create({
        model: 'gpt-4o', // Optimized for complex generation (75% cost savings vs gpt-4-turbo)
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 4000,
      });

      const contentText = response.choices[0].message.content;

      if (!contentText) {
        throw new Error('No content received from GPT-4');
      }

      const result = JSON.parse(contentText);

      this.logger.log(
        `Proposal generated from transcription. Tokens used: ${response.usage?.total_tokens}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        'Proposal generation from transcription failed:',
        error,
      );
      throw error;
    }
  }

  /**
   * Generic chat completion method for custom use cases
   * Exposes OpenAI client for services that need custom completions
   */
  async createChatCompletion(params: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    response_format?: { type: 'json_object' | 'text' };
    temperature?: number;
    max_tokens?: number;
  }): Promise<any> {
    try {
      const response = await this.client.chat.completions.create({
        model: params.model,
        messages: params.messages as any,
        response_format: params.response_format,
        temperature: params.temperature || 0.7,
        max_tokens: params.max_tokens,
      });

      return response;
    } catch (error) {
      this.logger.error('Chat completion failed:', error);
      throw error;
    }
  }

  /**
   * Get content type for audio/video files
   */
  private getContentType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();

    if (!extension) {
      return 'application/octet-stream';
    }

    const contentTypes: Record<string, string> = {
      mp3: 'audio/mpeg',
      mp4: 'video/mp4',
      mpeg: 'video/mpeg',
      mpga: 'audio/mpeg',
      m4a: 'audio/mp4',
      wav: 'audio/wav',
      webm: 'audio/webm',
    };

    return contentTypes[extension] || 'application/octet-stream';
  }
}
