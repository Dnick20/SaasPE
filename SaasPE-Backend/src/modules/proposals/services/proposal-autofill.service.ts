import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { OpenAIService } from '../../../shared/services/openai.service';
import { ConfidenceScoringService, SectionQuality } from '../../../shared/services/confidence-scoring.service';
import { MultiPassExtractionService } from '../../../shared/services/multi-pass-extraction.service';
import {
  SectionContext,
  getExtractionPrompt,
  getOverviewPrompt,
  getExecutiveSummaryPrompt,
  getObjectivesAndOutcomesPrompt,
  getScopeOfWorkPrompt,
  getDeliverablesPrompt,
  getApproachAndToolsPrompt,
  getScopePrompt,
  getPricingPrompt,
  getPaymentTermsPrompt,
  getCancellationNoticePrompt,
  getSectionSystemPrompt,
} from '../templates/section-prompts';

/**
 * Proposal Auto-Fill Service
 *
 * Handles AI-powered auto-filling of proposal sections from transcription and client data.
 * Uses optimized prompts and model selection (gpt-4o-mini for extraction, gpt-4o for generation).
 */
@Injectable()
export class ProposalAutofillService {
  private readonly logger = new Logger(ProposalAutofillService.name);

  constructor(
    private prisma: PrismaService,
    private openai: OpenAIService,
    private confidenceScoring: ConfidenceScoringService,
    private multiPass: MultiPassExtractionService,
  ) {}

  /**
   * Auto-fill all sections of a proposal from transcription and client data
   */
  async autoFillProposal(
    tenantId: string,
    userId: string,
    proposalId: string,
  ): Promise<any> {
    this.logger.log(`Auto-filling proposal ${proposalId} for tenant ${tenantId}`);

    // Fetch proposal with transcription and client data
    const proposal = await this.prisma.proposal.findFirst({
      where: { id: proposalId, tenantId },
      include: {
        client: true,
        transcription: true,
      },
    });

    if (!proposal) {
      throw new NotFoundException(`Proposal ${proposalId} not found`);
    }

    if (!proposal.transcription) {
      throw new BadRequestException('No transcription linked to this proposal');
    }

    // Fetch tenant settings for ICP and value proposition
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        name: true,
        // Add these fields to tenant model if they don't exist
        // idealCustomerProfile: true,
        // valueProposition: true,
        // services: true,
      },
    });

    // Build context for AI generation
    const context: SectionContext = {
      client: {
        companyName: proposal.client.companyName,
        industry: proposal.client.industry || undefined,
        website: proposal.client.website || undefined,
        contactFirstName: proposal.client.contactFirstName || undefined,
        contactLastName: proposal.client.contactLastName || undefined,
        problemStatement: proposal.client.problemStatement || undefined,
        budgetNote: proposal.client.budgetNote || undefined,
        timelineNote: proposal.client.timelineNote || undefined,
        currentTools: proposal.client.currentTools || undefined,
      },
      transcription: {
        transcript: proposal.transcription.transcript || '',
        extractedData: proposal.transcription.extractedData,
        keyMoments: proposal.transcription.salesTips,
      },
      tenantSettings: {
        companyName: tenant?.name,
        // idealCustomerProfile: tenant?.idealCustomerProfile,
        // valueProposition: tenant?.valueProposition,
        // services: tenant?.services,
      },
    };

    // Check if Phase 2 multi-pass extraction is enabled
    const usePhase2 = process.env.ENABLE_PHASE2_MULTIPASS === 'true';

    let overview, executiveSummary, objectivesAndOutcomes, scopeOfWork, deliverables;
    let approachAndTools, scopeAndTimeline, pricing, paymentTerms, cancellationNotice;
    let multiPassResult: any;

    if (usePhase2) {
      // PHASE 2: Multi-pass extraction with gap filling
      this.logger.log('Phase 2: Starting multi-pass extraction (3 passes)');

      multiPassResult = await this.multiPass.extractWithMultiPass(
        context.transcription?.transcript || '',
        context
      );

      this.logger.log(`Multi-pass complete: Overall confidence ${(multiPassResult.overallConfidence * 100).toFixed(0)}%, ` +
        `Coverage ${(multiPassResult.coverageScore * 100).toFixed(0)}%, ` +
        `Cost $${multiPassResult.totalCost.toFixed(3)}, ` +
        `Duration ${(multiPassResult.totalDuration / 1000).toFixed(1)}s`);

      // Map multi-pass results to section format
      const sections = multiPassResult.finalSections;
      overview = { title: sections.overview?.content || 'Proposal Overview' };
      executiveSummary = { executiveSummary: sections.executiveSummary?.content || '' };
      objectivesAndOutcomes = { objectivesAndOutcomes: sections.objectivesAndOutcomes?.content || '' };
      scopeOfWork = { scopeOfWork: sections.scopeOfWork?.content || '' };
      deliverables = { deliverables: sections.deliverables?.content || '' };
      approachAndTools = { approachAndTools: sections.approachAndTools?.content || '' };
      scopeAndTimeline = { timeline: sections.timeline?.content || '' };
      pricing = { pricingOptions: sections.pricing?.content || '' };
      paymentTerms = { paymentTerms: sections.paymentTerms?.content || '' };
      cancellationNotice = { cancellationNotice: sections.cancellationNotice?.content || '' };

    } else {
      // PHASE 1: Current two-step extraction (for backward compatibility)
      this.logger.log('Phase 1: Extracting insights from transcription');
      const extractedInsights = await this.extractInsights(context);

      this.logger.log('Phase 1: Generating proposal sections');
      [
        overview,
        executiveSummary,
        objectivesAndOutcomes,
        scopeOfWork,
        deliverables,
        approachAndTools,
        scopeAndTimeline,
        pricing,
        paymentTerms,
        cancellationNotice,
      ] = await Promise.all([
        this.generateOverview(context, extractedInsights),
        this.generateExecutiveSummary(context, extractedInsights),
        this.generateObjectivesAndOutcomes(context, extractedInsights),
        this.generateScopeOfWork(context, extractedInsights),
        this.generateDeliverables(context, extractedInsights),
        this.generateApproachAndTools(context, extractedInsights),
        this.generateScope(context, extractedInsights),
        this.generatePricing(context, extractedInsights),
        this.generatePaymentTerms(context, extractedInsights),
        this.generateCancellationNotice(context, extractedInsights),
      ]);
    }

    // STEP 3: Extract confidence data from all responses
    this.logger.log('Step 3: Extracting confidence scores from AI responses');
    const sectionQualities: SectionQuality[] = [];
    let qualityMetrics: any;

    if (usePhase2 && multiPassResult) {
      // Phase 2: Use confidence data from multi-pass extraction
      const sections = multiPassResult.finalSections;

      // Convert multi-pass confidence data to SectionQuality format
      Object.entries(sections).forEach(([sectionName, sectionData]: [string, any]) => {
        if (sectionData && sectionData.confidence) {
          sectionQualities.push({
            sectionName: sectionName,
            confidence: {
              overall: sectionData.confidence.overall || 0.7,
              dataAvailability: sectionData.confidence.dataAvailability || 0.7,
              specificity: sectionData.confidence.specificity || 0.7,
              personalization: sectionData.confidence.personalization || 0.7,
            },
            flags: sectionData.flags || [],
            sources: sectionData.sources || [],
            reasoning: sectionData.reasoning || '',
          });
        }
      });

      // Calculate quality metrics using Phase 2 data
      qualityMetrics = this.confidenceScoring.calculateProposalMetrics(sectionQualities);

      // Override with multi-pass metrics if available
      qualityMetrics.overallConfidence = multiPassResult.overallConfidence;
      qualityMetrics.coverageScore = multiPassResult.coverageScore;

    } else {
      // Phase 1: Extract confidence from text responses
      const overviewQuality = this.confidenceScoring.extractConfidenceFromResponse(overview, 'overview');
      if (overviewQuality) sectionQualities.push(overviewQuality);

      const execSummaryQuality = this.confidenceScoring.extractConfidenceFromResponse(executiveSummary, 'executiveSummary');
      if (execSummaryQuality) sectionQualities.push(execSummaryQuality);

      const objectivesQuality = this.confidenceScoring.extractConfidenceFromResponse(objectivesAndOutcomes, 'objectivesAndOutcomes');
      if (objectivesQuality) sectionQualities.push(objectivesQuality);

      const scopeOfWorkQuality = this.confidenceScoring.extractConfidenceFromResponse(scopeOfWork, 'scopeOfWork');
      if (scopeOfWorkQuality) sectionQualities.push(scopeOfWorkQuality);

      const deliverablesQuality = this.confidenceScoring.extractConfidenceFromResponse(deliverables, 'deliverables');
      if (deliverablesQuality) sectionQualities.push(deliverablesQuality);

      const approachQuality = this.confidenceScoring.extractConfidenceFromResponse(approachAndTools, 'approachAndTools');
      if (approachQuality) sectionQualities.push(approachQuality);

      const timelineQuality = this.confidenceScoring.extractConfidenceFromResponse(scopeAndTimeline, 'timeline');
      if (timelineQuality) sectionQualities.push(timelineQuality);

      const pricingQuality = this.confidenceScoring.extractConfidenceFromResponse(pricing, 'pricing');
      if (pricingQuality) sectionQualities.push(pricingQuality);

      const paymentTermsQuality = this.confidenceScoring.extractConfidenceFromResponse(paymentTerms, 'paymentTerms');
      if (paymentTermsQuality) sectionQualities.push(paymentTermsQuality);

      const cancellationQuality = this.confidenceScoring.extractConfidenceFromResponse(cancellationNotice, 'cancellationNotice');
      if (cancellationQuality) sectionQualities.push(cancellationQuality);

      // Phase 1 also extracts from insights
      const extractionQuality = this.confidenceScoring.extractConfidenceFromResponse(await this.extractInsights(context), 'extraction');
      if (extractionQuality) sectionQualities.push(extractionQuality);

      // Calculate quality metrics
      qualityMetrics = this.confidenceScoring.calculateProposalMetrics(sectionQualities);
    }

    // STEP 4: Log quality report
    this.logger.log('Step 4: Logging quality metrics');

    // Log quality report
    const qualityReport = this.confidenceScoring.generateQualityReport(qualityMetrics);
    this.logger.log(`Quality Report:\n${qualityReport}`);

    // Warn if validation failed
    if (!qualityMetrics.validationPassed) {
      this.logger.warn(
        `Proposal ${proposalId} has low quality scores. Coverage: ${(qualityMetrics.coverageScore * 100).toFixed(0)}%, Overall: ${(qualityMetrics.overallConfidence * 100).toFixed(0)}%`,
      );
    }

    // STEP 5: Update proposal with generated content and quality metrics
    this.logger.log('Step 5: Updating proposal with generated content and quality metrics');
    const updatedProposal = await this.prisma.proposal.update({
      where: { id: proposalId },
      data: {
        title: overview.title,
        executiveSummary: executiveSummary.executiveSummary,
        objectivesAndOutcomes: objectivesAndOutcomes.objectivesAndOutcomes,
        scopeOfWork: scopeOfWork.scopeOfWork,
        deliverables: deliverables.deliverables,
        approachAndTools: approachAndTools.approachAndTools,
        timeline: scopeAndTimeline.timeline,
        pricing: pricing.pricingOptions,
        paymentTerms: paymentTerms.paymentTerms,
        cancellationNotice: cancellationNotice.cancellationNotice,
        generationMethod: 'ai_autofill',
        aiModel: 'gpt-4o + gpt-4o-mini',
        // IR v2.0.31 Quality Tracking
        confidenceScores: qualityMetrics.sectionScores as any,
        validationResults: {
          validationPassed: qualityMetrics.validationPassed,
          overallConfidence: qualityMetrics.overallConfidence,
          coverageScore: qualityMetrics.coverageScore,
          dataAvailabilityScore: qualityMetrics.dataAvailabilityScore,
          lowConfidenceSections: qualityMetrics.lowConfidenceSections,
          flaggedForReview: qualityMetrics.flaggedForReview,
          timestamp: new Date().toISOString(),
        } as any,
        aiGenerationMetadata: usePhase2 && multiPassResult ? {
          phase: 2,
          model: 'gpt-4o + gpt-4o-mini (multi-pass)',
          irVersion: 'v2.0.31',
          multiPass: {
            totalCost: multiPassResult.totalCost,
            totalDuration: multiPassResult.totalDuration,
            passes: multiPassResult.passes.length,
            costBreakdown: multiPassResult.costBreakdown,
            gapsIdentified: multiPassResult.gapsIdentified.length,
            gapsResolved: multiPassResult.gapsResolved.length,
            remainingGaps: multiPassResult.remainingGaps.length,
            consistencyIssues: multiPassResult.consistencyIssues?.length || 0,
          },
          entities: multiPassResult.finalEntities,
          timestamp: new Date().toISOString(),
        } as any : {
          phase: 1,
          model: 'gpt-4o + gpt-4o-mini',
          extractionModel: 'gpt-4o-mini',
          generationModel: 'gpt-4o',
          sectionsGenerated: sectionQualities.length,
          timestamp: new Date().toISOString(),
          irVersion: 'v2.0.31',
        } as any,
      },
      include: {
        client: true,
        transcription: true,
      },
    });

    this.logger.log(`Auto-fill complete for proposal ${proposalId}`);

    // Include quality metrics in response for UI display
    return {
      ...updatedProposal,
      qualityMetrics,
    };
  }

  /**
   * Generate or regenerate a specific section
   */
  async generateSection(
    tenantId: string,
    userId: string,
    proposalId: string,
    sectionName: string,
  ): Promise<any> {
    this.logger.log(`Generating section "${sectionName}" for proposal ${proposalId}`);

    const validSections = [
      'overview',
      'executiveSummary',
      'objectivesAndOutcomes',
      'scopeOfWork',
      'deliverables',
      'approachAndTools',
      'scope',
      'pricing',
      'paymentTerms',
      'cancellationNotice',
    ];

    if (!validSections.includes(sectionName)) {
      throw new BadRequestException(
        `Invalid section name. Must be one of: ${validSections.join(', ')}`,
      );
    }

    // Fetch proposal with all necessary data
    const proposal = await this.prisma.proposal.findFirst({
      where: { id: proposalId, tenantId },
      include: {
        client: true,
        transcription: true,
      },
    });

    if (!proposal) {
      throw new NotFoundException(`Proposal ${proposalId} not found`);
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });

    // Build context
    const context: SectionContext = {
      client: {
        companyName: proposal.client.companyName,
        industry: proposal.client.industry || undefined,
        website: proposal.client.website || undefined,
        contactFirstName: proposal.client.contactFirstName || undefined,
        contactLastName: proposal.client.contactLastName || undefined,
        problemStatement: proposal.client.problemStatement || undefined,
        budgetNote: proposal.client.budgetNote || undefined,
        timelineNote: proposal.client.timelineNote || undefined,
        currentTools: proposal.client.currentTools || undefined,
      },
      transcription: proposal.transcription
        ? {
            transcript: proposal.transcription.transcript || '',
            extractedData: proposal.transcription.extractedData,
            keyMoments: proposal.transcription.salesTips,
          }
        : undefined,
      tenantSettings: {
        companyName: tenant?.name,
      },
      existingSections: {
        executiveSummary: proposal.executiveSummary || undefined,
        objectivesAndOutcomes: proposal.objectivesAndOutcomes || undefined,
        scopeOfWork: proposal.scopeOfWork || undefined,
        deliverables: proposal.deliverables as any,
        approachAndTools: proposal.approachAndTools || undefined,
        scope: proposal.timeline as any,
        pricing: proposal.pricing as any,
        paymentTerms: proposal.paymentTerms || undefined,
        cancellationNotice: proposal.cancellationNotice || undefined,
      },
    };

    // Extract insights if we have a transcription
    let extractedInsights;
    if (context.transcription) {
      extractedInsights = await this.extractInsights(context);
    }

    // Generate the requested section
    let sectionData;
    let updateData: any = {};

    switch (sectionName) {
      case 'overview':
        sectionData = await this.generateOverview(context, extractedInsights);
        updateData.title = sectionData.title;
        break;
      case 'executiveSummary':
        sectionData = await this.generateExecutiveSummary(context, extractedInsights);
        updateData.executiveSummary = sectionData.executiveSummary;
        break;
      case 'objectivesAndOutcomes':
        sectionData = await this.generateObjectivesAndOutcomes(context, extractedInsights);
        updateData.objectivesAndOutcomes = sectionData.objectivesAndOutcomes;
        break;
      case 'scopeOfWork':
        sectionData = await this.generateScopeOfWork(context, extractedInsights);
        updateData.scopeOfWork = sectionData.scopeOfWork;
        break;
      case 'deliverables':
        sectionData = await this.generateDeliverables(context, extractedInsights);
        updateData.deliverables = sectionData.deliverables;
        break;
      case 'approachAndTools':
        sectionData = await this.generateApproachAndTools(context, extractedInsights);
        updateData.approachAndTools = sectionData.approachAndTools;
        break;
      case 'scope':
        sectionData = await this.generateScope(context, extractedInsights);
        updateData.timeline = sectionData.timeline;
        break;
      case 'pricing':
        sectionData = await this.generatePricing(context, extractedInsights);
        updateData.pricing = sectionData.pricingOptions;
        break;
      case 'paymentTerms':
        sectionData = await this.generatePaymentTerms(context, extractedInsights);
        updateData.paymentTerms = sectionData.paymentTerms;
        break;
      case 'cancellationNotice':
        sectionData = await this.generateCancellationNotice(context, extractedInsights);
        updateData.cancellationNotice = sectionData.cancellationNotice;
        break;
    }

    // Update the proposal
    const updatedProposal = await this.prisma.proposal.update({
      where: { id: proposalId },
      data: updateData,
      include: {
        client: true,
        transcription: true,
      },
    });

    return {
      section: sectionName,
      data: sectionData,
      proposal: updatedProposal,
    };
  }

  // ==================== PRIVATE HELPER METHODS ====================

  private async extractInsights(context: SectionContext): Promise<any> {
    const prompt = getExtractionPrompt(context);
    const systemPrompt = 'You are an expert at extracting structured insights from sales conversations. Return only valid JSON.';

    const response = await this.openai['client'].chat.completions.create({
      model: 'gpt-4o-mini', // Optimized for extraction
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2, // Low temperature for accurate extraction
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content received from extraction');
    }

    return JSON.parse(content);
  }

  private async generateOverview(
    context: SectionContext,
    extractedInsights?: any,
  ): Promise<any> {
    const prompt = getOverviewPrompt(context);
    const systemPrompt = getSectionSystemPrompt('overview');

    const response = await this.openai['client'].chat.completions.create({
      model: 'gpt-4o', // Better for creative generation
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content received from overview generation');
    }

    return JSON.parse(content);
  }

  private async generateExecutiveSummary(
    context: SectionContext,
    extractedInsights?: any,
  ): Promise<any> {
    const prompt = getExecutiveSummaryPrompt(context, extractedInsights);
    const systemPrompt = getSectionSystemPrompt('executiveSummary');

    const response = await this.openai['client'].chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content received from executive summary generation');
    }

    return JSON.parse(content);
  }

  private async generateObjectivesAndOutcomes(
    context: SectionContext,
    extractedInsights?: any,
  ): Promise<any> {
    const prompt = getObjectivesAndOutcomesPrompt(context, extractedInsights);
    const systemPrompt = getSectionSystemPrompt('objectivesAndOutcomes');

    const response = await this.openai['client'].chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content received from objectives and outcomes generation');
    }

    return JSON.parse(content);
  }

  private async generateScopeOfWork(
    context: SectionContext,
    extractedInsights?: any,
  ): Promise<any> {
    const prompt = getScopeOfWorkPrompt(context, extractedInsights);
    const systemPrompt = getSectionSystemPrompt('scopeOfWork');

    const response = await this.openai['client'].chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content received from scope of work generation');
    }

    return JSON.parse(content);
  }

  private async generateDeliverables(
    context: SectionContext,
    extractedInsights?: any,
  ): Promise<any> {
    const prompt = getDeliverablesPrompt(context, extractedInsights);
    const systemPrompt = getSectionSystemPrompt('deliverables');

    const response = await this.openai['client'].chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content received from deliverables generation');
    }

    return JSON.parse(content);
  }

  private async generateApproachAndTools(
    context: SectionContext,
    extractedInsights?: any,
  ): Promise<any> {
    const prompt = getApproachAndToolsPrompt(context, extractedInsights);
    const systemPrompt = getSectionSystemPrompt('approachAndTools');

    const response = await this.openai['client'].chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content received from approach and tools generation');
    }

    return JSON.parse(content);
  }

  private async generatePaymentTerms(
    context: SectionContext,
    extractedInsights?: any,
  ): Promise<any> {
    const prompt = getPaymentTermsPrompt(context, extractedInsights);
    const systemPrompt = getSectionSystemPrompt('paymentTerms');

    const response = await this.openai['client'].chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content received from payment terms generation');
    }

    return JSON.parse(content);
  }

  private async generateCancellationNotice(
    context: SectionContext,
    extractedInsights?: any,
  ): Promise<any> {
    const prompt = getCancellationNoticePrompt(context, extractedInsights);
    const systemPrompt = getSectionSystemPrompt('cancellationNotice');

    const response = await this.openai['client'].chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content received from cancellation notice generation');
    }

    return JSON.parse(content);
  }

  private async generateScope(
    context: SectionContext,
    extractedInsights?: any,
  ): Promise<any> {
    const prompt = getScopePrompt(context, extractedInsights);
    const systemPrompt = getSectionSystemPrompt('scope');

    const response = await this.openai['client'].chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content received from scope generation');
    }

    return JSON.parse(content);
  }

  private async generatePricing(
    context: SectionContext,
    extractedInsights?: any,
  ): Promise<any> {
    const prompt = getPricingPrompt(context, extractedInsights);
    const systemPrompt = getSectionSystemPrompt('pricing');

    const response = await this.openai['client'].chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content received from pricing generation');
    }

    return JSON.parse(content);
  }
}
