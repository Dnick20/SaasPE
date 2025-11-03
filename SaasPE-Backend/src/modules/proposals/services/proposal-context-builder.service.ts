import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';

export interface PricingContext {
  selectedServices?: string[]; // Service names from catalog (if used)
  discoveryInputs: {
    clientNeeds?: string[];
    budgetRange?: string;
    toolStack?: string[];
    preferredPaymentMethod?: string;
    billingPreference?: 'fixed_fee' | 'monthly_retainer' | 'hourly';
  };
  historicalPricing?: {
    recentInvoices?: Array<{
      amount: number;
      date: string;
      description: string;
    }>;
    avgMonthlySpend?: number;
  };
}

export interface ProposalContext {
  client: {
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
    additionalContacts?: any;
  };
  transcription?: {
    transcript: string;
    extractedData?: any;
    salesTips?: any; // Json field containing { strengths, improvements, keyMoments }
  };
  contentEnrichment?: {
    recommendedProducts: Array<{
      id: string;
      name: string;
      category: string;
      description?: string;
    }>;
    customerSegments: string[];
    industryBenchmarks?: any;
  };
  pricingContext?: PricingContext;
}

/**
 * Proposal Context Builder Service
 *
 * Aggregates data from multiple sources to provide rich context for AI proposal generation:
 * - Client data from CRM (company info, contacts, budget, timeline)
 * - Transcription data with key moments and highlights
 * - Content enrichment from product libraries and customer segments (future)
 * - Discovery answers and journey metadata (future)
 */
@Injectable()
export class ProposalContextBuilderService {
  private readonly logger = new Logger(ProposalContextBuilderService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Build comprehensive context for proposal generation
   *
   * @param clientId - Client UUID
   * @param transcriptionId - Optional transcription UUID
   * @returns Aggregated context data
   */
  async buildContext(
    clientId: string,
    transcriptionId?: string,
  ): Promise<ProposalContext> {
    this.logger.log(
      `Building proposal context for client ${clientId}${
        transcriptionId ? ` with transcription ${transcriptionId}` : ''
      }`,
    );

    // Fetch client data with all enhanced fields
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: {
        companyName: true,
        industry: true,
        website: true,
        problemStatement: true,
        budgetNote: true,
        timelineNote: true,
        currentTools: true,
        deliverablesLogistics: true,
        keyMeetingsSchedule: true,
        contactFirstName: true,
        contactLastName: true,
        contactEmail: true,
        additionalContacts: true,
      },
    });

    if (!client) {
      throw new Error(`Client with ID ${clientId} not found`);
    }

    const context: ProposalContext = {
      client: {
        companyName: client.companyName,
        industry: client.industry || undefined,
        website: client.website || undefined,
        problemStatement: client.problemStatement || undefined,
        budgetNote: client.budgetNote || undefined,
        timelineNote: client.timelineNote || undefined,
        currentTools: client.currentTools || undefined,
        deliverablesLogistics: client.deliverablesLogistics || undefined,
        keyMeetingsSchedule: client.keyMeetingsSchedule || undefined,
        contactFirstName: client.contactFirstName || undefined,
        contactLastName: client.contactLastName || undefined,
        contactEmail: client.contactEmail || undefined,
        additionalContacts: client.additionalContacts || undefined,
      },
    };

    // Add transcription data if provided
    if (transcriptionId) {
      const transcription = await this.prisma.transcription.findUnique({
        where: { id: transcriptionId },
        select: {
          transcript: true,
          extractedData: true,
          salesTips: true,
        },
      });

      if (transcription && transcription.transcript) {
        context.transcription = {
          transcript: transcription.transcript,
          extractedData: transcription.extractedData,
          salesTips: transcription.salesTips,
        };
      }
    }

    // TODO: Add content enrichment from product library
    // This will be implemented when knowledge base is available
    context.contentEnrichment = {
      recommendedProducts: [],
      customerSegments: [],
      industryBenchmarks: {},
    };

    return context;
  }

  /**
   * Extract key information highlights from context for quick reference
   *
   * @param context - Full proposal context
   * @returns Structured highlights summary
   */
  extractHighlights(context: ProposalContext): {
    stakeholders: string[];
    budget: string | null;
    timeline: string | null;
    topPriorities: string[];
    technicalRequirements: string[];
  } {
    const highlights = {
      stakeholders: [] as string[],
      budget: null as string | null,
      timeline: null as string | null,
      topPriorities: [] as string[],
      technicalRequirements: [] as string[],
    };

    // Extract primary contact
    if (context.client.contactFirstName || context.client.contactLastName) {
      const contactName = [
        context.client.contactFirstName,
        context.client.contactLastName,
      ]
        .filter(Boolean)
        .join(' ');
      highlights.stakeholders.push(contactName);
    }

    // Extract additional contacts
    if (context.client.additionalContacts) {
      try {
        const contacts = Array.isArray(context.client.additionalContacts)
          ? context.client.additionalContacts
          : [];
        for (const contact of contacts) {
          if (contact.name) {
            highlights.stakeholders.push(contact.name);
          }
        }
      } catch (error) {
        this.logger.warn('Failed to parse additional contacts', error);
      }
    }

    // Extract budget
    highlights.budget = context.client.budgetNote || null;

    // Extract timeline
    highlights.timeline = context.client.timelineNote || null;

    // Extract priorities from problem statement
    if (context.client.problemStatement) {
      // Simple extraction - look for bullet points or numbered items
      const priorities = context.client.problemStatement
        .split(/\n/)
        .filter((line) => /^[-•*\d]/.test(line.trim()))
        .map((line) => line.replace(/^[-•*\d.)\s]+/, '').trim())
        .filter((line) => line.length > 0);
      highlights.topPriorities = priorities.slice(0, 5);
    }

    // Extract technical requirements from current tools
    if (context.client.currentTools) {
      highlights.technicalRequirements = context.client.currentTools;
    }

    return highlights;
  }

  /**
   * Format context as a prompt string for AI consumption
   *
   * @param context - Full proposal context
   * @returns Formatted prompt text
   */
  formatAsPrompt(context: ProposalContext): string {
    let prompt = `COMPANY INFORMATION:
- Company Name: ${context.client.companyName}`;

    if (context.client.industry) {
      prompt += `\n- Industry: ${context.client.industry}`;
    }

    if (context.client.website) {
      prompt += `\n- Website: ${context.client.website}`;
    }

    if (context.client.problemStatement) {
      prompt += `\n\nPROBLEM/CHALLENGE:
${context.client.problemStatement}`;
    }

    if (context.client.budgetNote) {
      prompt += `\n\nBUDGET CONTEXT:
${context.client.budgetNote}`;
    }

    if (context.client.timelineNote) {
      prompt += `\n\nTIMELINE REQUIREMENTS:
${context.client.timelineNote}`;
    }

    if (context.client.currentTools && context.client.currentTools.length > 0) {
      prompt += `\n\nCURRENT TOOLS/SYSTEMS:
${context.client.currentTools.join(', ')}`;
    }

    if (context.client.deliverablesLogistics) {
      prompt += `\n\nDELIVERABLES & LOGISTICS:
${context.client.deliverablesLogistics}`;
    }

    if (context.client.keyMeetingsSchedule) {
      prompt += `\n\nMEETING SCHEDULE:
${context.client.keyMeetingsSchedule}`;
    }

    if (
      context.client.contactFirstName ||
      context.client.contactLastName ||
      context.client.contactEmail
    ) {
      prompt += `\n\nPRIMARY CONTACT:`;
      if (context.client.contactFirstName || context.client.contactLastName) {
        prompt += `\n- Name: ${context.client.contactFirstName || ''}${
          context.client.contactFirstName && context.client.contactLastName
            ? ' '
            : ''
        }${context.client.contactLastName || ''}`.trim();
      }
      if (context.client.contactEmail) {
        prompt += `\n- Email: ${context.client.contactEmail}`;
      }
    }

    if (context.client.additionalContacts) {
      try {
        const contacts = Array.isArray(context.client.additionalContacts)
          ? context.client.additionalContacts
          : [];
        if (contacts.length > 0) {
          prompt += `\n\nADDITIONAL STAKEHOLDERS:`;
          for (const contact of contacts) {
            prompt += `\n- ${contact.name || 'Unknown'}${
              contact.role ? ` (${contact.role})` : ''
            }`;
          }
        }
      } catch (error) {
        this.logger.warn('Failed to format additional contacts', error);
      }
    }

    if (context.transcription?.transcript) {
      const transcriptPreview = context.transcription.transcript.substring(
        0,
        3000,
      );
      prompt += `\n\nMEETING TRANSCRIPT (excerpt):
${transcriptPreview}${
        context.transcription.transcript.length > 3000
          ? '\n... [truncated]'
          : ''
      }`;
    }

    // Extract key moments from salesTips if available
    const keyMoments = context.transcription?.salesTips?.keyMoments;
    if (keyMoments && Array.isArray(keyMoments) && keyMoments.length > 0) {
      prompt += `\n\nKEY MOMENTS FROM MEETING:`;
      for (const moment of keyMoments.slice(0, 5)) {
        prompt += `\n- [${moment.type}] ${moment.text}`;
      }
    }

    return prompt;
  }

  /**
   * Build pricing-specific context for AI pricing generation
   *
   * @param clientId - Client UUID
   * @param selectedServices - Optional array of service names from catalog
   * @returns Pricing context for AI consumption
   */
  async buildPricingContext(
    clientId: string,
    selectedServices?: string[],
  ): Promise<PricingContext> {
    this.logger.log(`Building pricing context for client ${clientId}`);

    // Fetch client data for pricing insights
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: {
        budgetNote: true,
        timelineNote: true,
        problemStatement: true,
        currentTools: true,
      },
    });

    if (!client) {
      throw new Error(`Client with ID ${clientId} not found`);
    }

    // Parse budget range from budgetNote
    let budgetRange: string | undefined;
    if (client.budgetNote) {
      // Extract dollar amounts like "$5,000" or "$5k-$10k"
      const budgetMatch = client.budgetNote.match(
        /\$[\d,]+k?(?:\s*-\s*\$[\d,]+k?)?/i,
      );
      budgetRange = budgetMatch ? budgetMatch[0] : client.budgetNote;
    }

    // Extract client needs from problem statement
    let clientNeeds: string[] = [];
    if (client.problemStatement) {
      // Extract bullet points or key phrases
      clientNeeds = client.problemStatement
        .split(/\n/)
        .filter((line) => /^[-•*\d]/.test(line.trim()))
        .map((line) => line.replace(/^[-•*\d.)\s]+/, '').trim())
        .filter((line) => line.length > 0)
        .slice(0, 5);
    }

    // Determine billing preference from timeline
    let billingPreference: 'fixed_fee' | 'monthly_retainer' | 'hourly' =
      'fixed_fee';
    if (client.timelineNote) {
      const timelineLower = client.timelineNote.toLowerCase();
      if (
        timelineLower.includes('ongoing') ||
        timelineLower.includes('retainer') ||
        timelineLower.includes('monthly')
      ) {
        billingPreference = 'monthly_retainer';
      } else if (
        timelineLower.includes('hourly') ||
        timelineLower.includes('hour')
      ) {
        billingPreference = 'hourly';
      }
    }

    const pricingContext: PricingContext = {
      selectedServices: selectedServices || [],
      discoveryInputs: {
        clientNeeds: clientNeeds.length > 0 ? clientNeeds : undefined,
        budgetRange,
        toolStack: client.currentTools || undefined,
        billingPreference,
      },
    };

    // TODO: Add historical pricing data from previous proposals/invoices
    // This will be implemented when invoice tracking is available

    return pricingContext;
  }

  /**
   * Format pricing context as a prompt string for AI consumption
   *
   * @param pricingContext - Pricing context data
   * @returns Formatted prompt text for pricing generation
   */
  formatPricingContextAsPrompt(pricingContext: PricingContext): string {
    let prompt = `PRICING CONTEXT:\n`;

    if (
      pricingContext.selectedServices &&
      pricingContext.selectedServices.length > 0
    ) {
      prompt += `\nSelected Services:\n`;
      pricingContext.selectedServices.forEach((service) => {
        prompt += `- ${service}\n`;
      });
    }

    if (pricingContext.discoveryInputs.budgetRange) {
      prompt += `\nBudget Range: ${pricingContext.discoveryInputs.budgetRange}\n`;
    }

    if (pricingContext.discoveryInputs.billingPreference) {
      prompt += `\nPreferred Billing Model: ${pricingContext.discoveryInputs.billingPreference}\n`;
    }

    if (
      pricingContext.discoveryInputs.clientNeeds &&
      pricingContext.discoveryInputs.clientNeeds.length > 0
    ) {
      prompt += `\nClient Needs:\n`;
      pricingContext.discoveryInputs.clientNeeds.forEach((need) => {
        prompt += `- ${need}\n`;
      });
    }

    if (
      pricingContext.discoveryInputs.toolStack &&
      pricingContext.discoveryInputs.toolStack.length > 0
    ) {
      prompt += `\nCurrent Tool Stack: ${pricingContext.discoveryInputs.toolStack.join(', ')}\n`;
    }

    if (pricingContext.historicalPricing?.avgMonthlySpend) {
      prompt += `\nHistorical Average Monthly Spend: $${pricingContext.historicalPricing.avgMonthlySpend.toLocaleString()}\n`;
    }

    return prompt;
  }
}
