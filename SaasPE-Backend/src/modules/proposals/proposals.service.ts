import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { PrismaService } from '../../shared/database/prisma.service';
import { S3Service } from '../../shared/services/s3.service';
import { PdfService } from '../../shared/services/pdf.service';
import { ESignatureProviderFactory } from '../../shared/services/e-signature-provider.factory';
import { ESignatureConnectionsService } from '../e-signature-connections/e-signature-connections.service';
import { TokensService } from '../tokens/tokens.service';
import { OpenAIService } from '../../shared/services/openai.service';
import { PdfRendererService } from './services/pdf-renderer.service';
import { ProposalComposerService } from './services/proposal-composer.service';
import { ProposalAutofillService } from './services/proposal-autofill.service';
import { PricingTemplateService } from './services/pricing-template.service';
import { ProposalContextBuilderService } from './services/proposal-context-builder.service';
import { GoogleOAuthService } from '../../shared/services/google/google-oauth.service';
import { GDocsExporterService } from '../../shared/services/google/gdocs-exporter.service';
import { WordExporterService } from '../../shared/services/word-exporter.service';
import {
  CreateProposalDto,
  UpdateProposalDto,
  GenerateProposalDto,
  SendProposalDto,
  ProposalResponseDto,
  ProposalsListResponseDto,
  GenerateProposalResponseDto,
  ExportPdfResponseDto,
  ExportWordResponseDto,
  SendProposalResponseDto,
  CreateProposalFromTranscriptionDto,
  GenerateAIProposalDto,
  UpdateProposalPricingDto,
} from './dto';
import {
  PROPOSAL_GENERATE_JOB,
  type GenerateProposalJobData,
} from './constants/job-names';

/**
 * Proposals Service
 *
 * Business logic for proposal management:
 * - CRUD operations
 * - AI content generation (GPT-4)
 * - PDF export (Puppeteer)
 * - DocuSign integration
 * - Email sending
 * - Token consumption tracking
 */
@Injectable()
export class ProposalsService {
  private readonly logger = new Logger(ProposalsService.name);

  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service,
    private pdfService: PdfService,
    private pdfRendererService: PdfRendererService,
    private proposalComposerService: ProposalComposerService,
    private proposalAutofillService: ProposalAutofillService,
    private pricingTemplateService: PricingTemplateService,
    private eSignatureFactory: ESignatureProviderFactory,
    private tokensService: TokensService,
    private openaiService: OpenAIService,
    private eSignatureConnectionsService: ESignatureConnectionsService,
    private googleOAuthService: GoogleOAuthService,
    private gdocsExporterService: GDocsExporterService,
    private wordExporterService: WordExporterService,
    private proposalContextBuilder: ProposalContextBuilderService,
    @InjectQueue('proposal') private proposalQueue: Queue,
  ) {}

  /**
   * Create a new proposal
   */
  async create(
    tenantId: string,
    userId: string,
    dto: CreateProposalDto,
  ): Promise<ProposalResponseDto> {
    this.logger.log(`Creating proposal for client ${dto.clientId}`);

    // Validate client exists
    const client = await this.prisma.client.findFirst({
      where: { id: dto.clientId, tenantId },
    });

    if (!client) {
      throw new NotFoundException(`Client ${dto.clientId} not found`);
    }

    // Validate transcription if provided
    if (dto.transcriptionId) {
      const transcription = await this.prisma.transcription.findFirst({
        where: { id: dto.transcriptionId, tenantId },
      });

      if (!transcription) {
        throw new NotFoundException(
          `Transcription ${dto.transcriptionId} not found`,
        );
      }
    }

    // Create proposal
    const proposal = await this.prisma.proposal.create({
      data: {
        tenantId,
        userId,
        clientId: dto.clientId,
        transcriptionId: dto.transcriptionId,
        title: dto.title,
        templateId: dto.templateId,
        variables: dto.variables as any,
        status: 'draft',
      },
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
    });

    this.logger.log(`Proposal ${proposal.id} created successfully`);

    return this.mapToDto(proposal);
  }

  /**
   * Synchronously generate a complete proposal with AI and create a draft
   */
  async generateAIDraft(
    tenantId: string,
    userId: string,
    dto: GenerateAIProposalDto,
  ): Promise<ProposalResponseDto> {
    this.logger.log(
      `Generating AI proposal draft for client ${dto.clientId} (transcription: ${dto.transcriptionId || 'none'})`,
    );

    // Validate client exists
    const client = await this.prisma.client.findFirst({
      where: { id: dto.clientId, tenantId },
    });
    if (!client) {
      throw new NotFoundException(`Client ${dto.clientId} not found`);
    }

    // Optional transcription context
    let transcription: any | undefined;
    if (dto.transcriptionId) {
      transcription = await this.prisma.transcription.findFirst({
        where: { id: dto.transcriptionId, tenantId },
      });
      if (!transcription) {
        throw new NotFoundException(
          `Transcription ${dto.transcriptionId} not found`,
        );
      }
    }

    // Build rich context for AI (includes ICP, website, tone, highlights)
    const context = await this.proposalContextBuilder.buildContext(
      dto.clientId,
      dto.transcriptionId,
    );

    const clientData = context.client;
    const transcriptData = context.transcription;

    const sections = [
      'executiveSummary',
      'objectivesAndOutcomes',
      'scopeOfWork',
      'deliverables',
      'approachAndTools',
      'paymentTerms',
      'cancellationNotice',
      'timeline',
      'pricing',
    ];

    // Generate content
    const content = await this.openaiService.generateProposalContentWithLearning(
      tenantId,
      clientData,
      transcriptData,
      sections,
      undefined,
      {
        tone: dto.tone || (await this.prisma.companyProfile.findFirst({ where: { userId } }))?.preferredTone || undefined,
        targetICP: (await this.prisma.companyProfile.findFirst({ where: { userId } }))?.targetICP as any,
      },
    );

    // Create proposal with generated sections
    const proposal = await this.prisma.proposal.create({
      data: {
        tenantId,
        userId,
        clientId: dto.clientId,
        transcriptionId: dto.transcriptionId,
        title: dto.title || `Proposal for ${client.companyName}`,
        status: 'draft',
        generationMethod: 'instant_ai' as any,
        executiveSummary: content.executiveSummary,
        objectivesAndOutcomes: content.objectivesAndOutcomes,
        scopeOfWork: content.scopeOfWork,
        deliverables: content.deliverables as any,
        approachAndTools: content.approachAndTools,
        timeline: content.timeline as any,
        pricing: content.pricing as any,
        paymentTerms: content.paymentTerms,
        cancellationNotice: content.cancellationNotice,
        coverPageData: {
          ...(content.overview ? { summary: content.overview } : {}),
        } as any,
      },
      include: {
        client: {
          select: { id: true, companyName: true },
        },
      },
    });

    this.logger.log(`AI proposal draft ${proposal.id} created`);

    return this.mapToDto(proposal);
  }

  /**
   * Get all proposals with pagination and filtering
   */
  async findAll(
    tenantId: string,
    page: number = 1,
    limit: number = 20,
    status?: string,
    clientId?: string,
    sortBy: 'created' | 'updated' = 'updated',
    sortOrder: 'asc' | 'desc' = 'desc',
  ): Promise<ProposalsListResponseDto> {
    // Validate pagination
    if (page < 1) page = 1;
    if (limit < 1 || limit > 100) limit = 20;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = { tenantId };
    if (status) where.status = status;
    if (clientId) where.clientId = clientId;

    // Build order by
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    // Get total count
    const total = await this.prisma.proposal.count({ where });

    // Get paginated data
    const proposals = await this.prisma.proposal.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
    });

    return {
      data: proposals.map((p) => this.mapToDto(p)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single proposal by ID
   */
  async findOne(tenantId: string, id: string): Promise<ProposalResponseDto> {
    const proposal = await this.prisma.proposal.findFirst({
      where: { id, tenantId },
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
    });

    if (!proposal) {
      throw new NotFoundException(`Proposal ${id} not found`);
    }

    return this.mapToDto(proposal);
  }

  /**
   * Update proposal content
   */
  async update(
    tenantId: string,
    id: string,
    dto: UpdateProposalDto,
  ): Promise<ProposalResponseDto> {
    // Verify proposal exists and belongs to tenant
    const existing = await this.prisma.proposal.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundException(`Proposal ${id} not found`);
    }

    // Editing rules: allow edits while draft/generating/ready; block after client signature
    if (existing.clientSignedAt || existing.status === 'signed' || existing.status === 'sent') {
      throw new BadRequestException(
        'Proposal has been sent or signed. Please clone to edit a new draft.',
      );
    }

    // Update proposal
    const proposal = await this.prisma.proposal.update({
      where: { id },
      data: {
        title: dto.title,
        executiveSummary: dto.executiveSummary,
        objectivesAndOutcomes: (dto as any).objectivesAndOutcomes,
        scopeOfWork: (dto as any).scopeOfWork,
        deliverables: (dto as any).deliverables as any,
        approachAndTools: (dto as any).approachAndTools,
        timeline: dto.timeline as any,
        pricing: dto.pricing as any,
        paymentTerms: (dto as any).paymentTerms,
        cancellationNotice: (dto as any).cancellationNotice,
        pricingOptions: (dto as any).pricingOptions as any,
        selectedPricingOption: (dto as any).selectedPricingOption,
      },
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
    });

    this.logger.log(`Proposal ${id} updated successfully`);

    return this.mapToDto(proposal);
  }

  /**
   * Update proposal pricing only and calculate totals
   */
  async updatePricing(
    tenantId: string,
    id: string,
    dto: UpdateProposalPricingDto,
  ): Promise<ProposalResponseDto> {
    // Verify proposal exists and belongs to tenant
    const existing = await this.prisma.proposal.findFirst({ where: { id, tenantId } });
    if (!existing) {
      throw new NotFoundException(`Proposal ${id} not found`);
    }

    // Calculate totals
    const subtotal = dto.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const discount = dto.items.reduce((sum, item) => {
      const line = item.unitPrice * item.quantity;
      return sum + (item.discountPct ? (line * item.discountPct) / 100 : 0);
    }, 0);
    const tax = dto.items.reduce((sum, item) => {
      const line = item.unitPrice * item.quantity - (item.discountPct ? (item.unitPrice * item.quantity * item.discountPct) / 100 : 0);
      return sum + (item.taxPct ? (line * item.taxPct) / 100 : 0);
    }, 0);
    const total = Math.max(0, subtotal - discount + tax);

    const pricingPayload: any = {
      currency: dto.currency || 'USD',
      items: dto.items,
      subtotal,
      discount,
      tax,
      total,
    };

    const proposal = await this.prisma.proposal.update({
      where: { id },
      data: { pricing: pricingPayload },
      include: {
        client: { select: { id: true, companyName: true } },
      },
    });

    this.logger.log(`Updated pricing for proposal ${id} (total: ${total})`);

    return this.mapToDto(proposal);
  }

  /**
   * Generate proposal content using AI
   * Queues a background job to generate the specified sections
   */
  async generateContent(
    tenantId: string,
    id: string,
    dto: GenerateProposalDto,
  ): Promise<GenerateProposalResponseDto> {
    // Verify proposal exists
    const proposal = await this.prisma.proposal.findFirst({
      where: { id, tenantId },
      include: {
        client: true,
        transcription: true,
      },
    });

    if (!proposal) {
      throw new NotFoundException(`Proposal ${id} not found`);
    }

    // Consume tokens for AI proposal generation
    await this.tokensService.consumeTokens({
      tenantId,
      actionType: 'proposal_generation',
      actionId: id,
      metadata: {
        proposalId: id,
        clientId: proposal.clientId,
        sections: dto.sections,
        hasTranscription: !!proposal.transcriptionId,
      },
    });

    // Update status to generating
    await this.prisma.proposal.update({
      where: { id },
      data: { status: 'generating' },
    });

    // Queue generation job
    const jobData: GenerateProposalJobData = {
      proposalId: id,
      tenantId,
      sections: dto.sections,
      templateId: dto.useTemplateId,
      customInstructions: dto.customInstructions,
    };

    const job = await this.proposalQueue.add(PROPOSAL_GENERATE_JOB, jobData);

    this.logger.log(
      `Proposal generation job ${job.id} queued for proposal ${id}`,
    );

    // Estimate completion time (rough estimate: 30 seconds)
    const estimatedCompletion = new Date(Date.now() + 30000);

    return {
      id,
      status: 'generating',
      jobId: String(job.id),
      estimatedCompletion: estimatedCompletion.toISOString(),
    };
  }

  /**
   * Export proposal as PDF
   */
  async exportPdf(tenantId: string, id: string): Promise<ExportPdfResponseDto> {
    // Get proposal
    const proposal = await this.prisma.proposal.findFirst({
      where: { id, tenantId },
      include: {
        client: true,
        tenant: true,
      },
    });

    if (!proposal) {
      throw new NotFoundException(`Proposal ${id} not found`);
    }

    // Validate proposal has content
    if (!proposal.executiveSummary && !proposal.approachAndTools) {
      throw new BadRequestException(
        'Proposal must have content before exporting to PDF',
      );
    }

    // Consume tokens for PDF export
    await this.tokensService.consumeTokens({
      tenantId,
      actionType: 'export_pdf',
      actionId: id,
      metadata: {
        proposalId: id,
        clientId: proposal.clientId,
        title: proposal.title,
      },
    });

    this.logger.log(`Generating PDF for proposal ${id}`);

    // Generate PDF using new PdfRendererService
    const pdfBuffer = await this.pdfRendererService.generateProposalPdf({
      id: proposal.id,
      title: proposal.title,
      client: {
        companyName: proposal.client.companyName,
        contactFirstName: proposal.client.contactFirstName ?? undefined,
        contactLastName: proposal.client.contactLastName ?? undefined,
        contactEmail: proposal.client.contactEmail ?? undefined,
      },
      tenant: {
        name: proposal.tenant.name,
      },
      coverPageData: proposal.coverPageData as any,
      executiveSummary: proposal.executiveSummary ?? undefined,
      objectivesAndOutcomes: proposal.objectivesAndOutcomes ?? undefined,
      scopeOfWork: proposal.scopeOfWork ?? undefined,
      deliverables: proposal.deliverables ?? undefined,
      approachAndTools: proposal.approachAndTools ?? undefined,
      timeline: proposal.timeline ?? undefined,
      paymentTerms: proposal.paymentTerms ?? undefined,
      cancellationNotice: proposal.cancellationNotice ?? undefined,
      pricingOptions: proposal.pricingOptions as any,
      accountHierarchy: proposal.accountHierarchy ?? undefined,
      contentEnrichment: proposal.contentEnrichment ?? undefined,
      kpiForecast: proposal.kpiForecast ?? undefined,
      teamRoster: proposal.teamRoster ?? undefined,
      appendix: proposal.appendix ?? undefined,
      tableOfContents: proposal.tableOfContents ?? undefined,
      created: proposal.created,
    });

    // Upload to S3
    const s3Key = await this.s3Service.uploadFile(
      tenantId,
      pdfBuffer,
      `${proposal.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
      'application/pdf',
      'proposals',
    );

    // Update proposal with PDF S3 key
    await this.prisma.proposal.update({
      where: { id },
      data: { pdfS3Key: s3Key },
    });

    // Generate pre-signed URL (expires in 1 hour)
    const pdfUrl = await this.s3Service.getPresignedDownloadUrl(s3Key, 3600);

    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    this.logger.log(`PDF generated and uploaded for proposal ${id}`);

    return {
      pdfUrl,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Export proposal as Word document
   */
  async exportWord(tenantId: string, id: string): Promise<ExportWordResponseDto> {
    // Get proposal
    const proposal = await this.prisma.proposal.findFirst({
      where: { id, tenantId },
      include: {
        client: true,
        tenant: true,
      },
    });

    if (!proposal) {
      throw new NotFoundException(`Proposal ${id} not found`);
    }

    // Validate proposal has content
    if (!proposal.executiveSummary && !proposal.approachAndTools) {
      throw new BadRequestException(
        'Proposal must have content before exporting to Word',
      );
    }

    // Consume tokens for Word export
    await this.tokensService.consumeTokens({
      tenantId,
      actionType: 'word_export',
      actionId: id,
      metadata: {
        proposalId: id,
        clientId: proposal.clientId,
        title: proposal.title,
      },
    });

    this.logger.log(`Generating Word document for proposal ${id}`);

    // Generate Word document using WordExporterService
    const buffer = await this.wordExporterService.exportProposal({
      id: proposal.id,
      title: proposal.title,
      client: {
        companyName: proposal.client.companyName,
        contactFirstName: proposal.client.contactFirstName ?? undefined,
        contactLastName: proposal.client.contactLastName ?? undefined,
        contactEmail: proposal.client.contactEmail ?? undefined,
      },
      tenant: {
        name: proposal.tenant.name,
      },
      coverPageData: proposal.coverPageData as any,
      executiveSummary: proposal.executiveSummary ?? undefined,
      objectivesAndOutcomes: proposal.objectivesAndOutcomes ?? undefined,
      scopeOfWork: proposal.scopeOfWork ?? undefined,
      deliverables: proposal.deliverables ?? undefined,
      approachAndTools: proposal.approachAndTools ?? undefined,
      timeline: proposal.timeline ?? undefined,
      paymentTerms: proposal.paymentTerms ?? undefined,
      cancellationNotice: proposal.cancellationNotice ?? undefined,
      pricingOptions: proposal.pricingOptions as any,
      created: proposal.created,
    });

    this.logger.log(`Word document generated successfully for proposal ${id}`);

    return {
      message: 'Word document generated successfully',
      buffer,
    };
  }

  /**
   * Download proposal PDF
   * Returns a pre-signed S3 URL for downloading the PDF
   * Generates and uploads PDF if it doesn't exist in S3 yet
   */
  async downloadPdf(
    tenantId: string,
    id: string,
  ): Promise<ExportPdfResponseDto> {
    // Get proposal
    const proposal = await this.prisma.proposal.findFirst({
      where: { id, tenantId },
      include: {
        client: true,
        tenant: true,
      },
    });

    if (!proposal) {
      throw new NotFoundException(`Proposal ${id} not found`);
    }

    // Validate proposal has content
    if (!proposal.executiveSummary && !proposal.approachAndTools) {
      throw new BadRequestException(
        'Proposal must have content before downloading PDF',
      );
    }

    let s3Key = proposal.pdfS3Key;

    // If PDF doesn't exist in S3 yet, generate and upload it
    if (!s3Key) {
      this.logger.log(
        `PDF not found in S3 for proposal ${id}, generating new PDF`,
      );

      // Generate PDF using PdfRendererService with S3 upload
      s3Key = await this.pdfRendererService.generateAndUploadProposalPdf(
        {
          id: proposal.id,
          title: proposal.title,
          client: {
            companyName: proposal.client.companyName,
            contactFirstName: proposal.client.contactFirstName ?? undefined,
            contactLastName: proposal.client.contactLastName ?? undefined,
            contactEmail: proposal.client.contactEmail ?? undefined,
          },
          tenant: {
            name: proposal.tenant.name,
          },
          coverPageData: proposal.coverPageData as any,
          executiveSummary: proposal.executiveSummary ?? undefined,
          objectivesAndOutcomes: proposal.objectivesAndOutcomes ?? undefined,
          scopeOfWork: proposal.scopeOfWork ?? undefined,
          deliverables: proposal.deliverables ?? undefined,
          approachAndTools: proposal.approachAndTools ?? undefined,
          timeline: proposal.timeline ?? undefined,
          paymentTerms: proposal.paymentTerms ?? undefined,
          cancellationNotice: proposal.cancellationNotice ?? undefined,
          pricingOptions: proposal.pricingOptions as any,
          accountHierarchy: proposal.accountHierarchy ?? undefined,
          contentEnrichment: proposal.contentEnrichment ?? undefined,
          kpiForecast: proposal.kpiForecast ?? undefined,
          teamRoster: proposal.teamRoster ?? undefined,
          appendix: proposal.appendix ?? undefined,
          tableOfContents: proposal.tableOfContents ?? undefined,
          created: proposal.created,
        },
        tenantId,
      );

      // Update proposal with PDF S3 key and timestamp
      await this.prisma.proposal.update({
        where: { id },
        data: {
          pdfS3Key: s3Key,
          lastExportedAt: new Date(),
        },
      });

      this.logger.log(
        `PDF generated and uploaded to S3 for proposal ${id}: ${s3Key}`,
      );
    } else {
      this.logger.log(
        `Using existing PDF from S3 for proposal ${id}: ${s3Key}`,
      );
    }

    // Generate pre-signed download URL (expires in 1 hour)
    const pdfUrl = await this.s3Service.getPresignedDownloadUrl(s3Key, 3600);

    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    this.logger.log(`Generated download URL for proposal ${id} PDF`);

    return {
      pdfUrl,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Get proposal PDF as Buffer for Blob download
   * Returns PDF bytes and filename for direct streaming to client
   * Generates and uploads PDF if it doesn't exist in S3 yet
   */
  async getPdfBuffer(
    tenantId: string,
    id: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    // Get proposal
    const proposal = await this.prisma.proposal.findFirst({
      where: { id, tenantId },
      include: {
        client: true,
        tenant: true,
      },
    });

    if (!proposal) {
      throw new NotFoundException(`Proposal ${id} not found`);
    }

    // Validate proposal has content
    if (!proposal.executiveSummary && !proposal.approachAndTools) {
      throw new BadRequestException(
        'Proposal must have content before downloading PDF',
      );
    }

    let s3Key = proposal.pdfS3Key;

    // If PDF doesn't exist in S3 yet, generate and upload it
    if (!s3Key) {
      this.logger.log(
        `PDF not found in S3 for proposal ${id}, generating new PDF`,
      );

      // Generate PDF using PdfRendererService with S3 upload
      s3Key = await this.pdfRendererService.generateAndUploadProposalPdf(
        {
          id: proposal.id,
          title: proposal.title,
          client: {
            companyName: proposal.client.companyName,
            contactFirstName: proposal.client.contactFirstName ?? undefined,
            contactLastName: proposal.client.contactLastName ?? undefined,
            contactEmail: proposal.client.contactEmail ?? undefined,
          },
          tenant: {
            name: proposal.tenant.name,
          },
          coverPageData: proposal.coverPageData as any,
          executiveSummary: proposal.executiveSummary ?? undefined,
          objectivesAndOutcomes: proposal.objectivesAndOutcomes ?? undefined,
          scopeOfWork: proposal.scopeOfWork ?? undefined,
          deliverables: proposal.deliverables ?? undefined,
          approachAndTools: proposal.approachAndTools ?? undefined,
          timeline: proposal.timeline ?? undefined,
          paymentTerms: proposal.paymentTerms ?? undefined,
          cancellationNotice: proposal.cancellationNotice ?? undefined,
          pricingOptions: proposal.pricingOptions as any,
          accountHierarchy: proposal.accountHierarchy ?? undefined,
          contentEnrichment: proposal.contentEnrichment ?? undefined,
          kpiForecast: proposal.kpiForecast ?? undefined,
          teamRoster: proposal.teamRoster ?? undefined,
          appendix: proposal.appendix ?? undefined,
          tableOfContents: proposal.tableOfContents ?? undefined,
          created: proposal.created,
        },
        tenantId,
      );

      // Update proposal with PDF S3 key and timestamp
      await this.prisma.proposal.update({
        where: { id },
        data: {
          pdfS3Key: s3Key,
          lastExportedAt: new Date(),
        },
      });

      this.logger.log(
        `PDF generated and uploaded to S3 for proposal ${id}: ${s3Key}`,
      );
    } else {
      this.logger.log(
        `Using existing PDF from S3 for proposal ${id}: ${s3Key}`,
      );
    }

    // Fetch PDF from S3 as Buffer
    const buffer = await this.s3Service.downloadFile(s3Key);

    // Generate sanitized filename
    const filename = this.generatePdfFilename(
      proposal.client.companyName,
      proposal.title,
      proposal.created,
    );

    this.logger.log(`Fetched PDF buffer for proposal ${id}: ${filename}`);

    return {
      buffer,
      filename,
    };
  }

  /**
   * Generate a sanitized filename for proposal PDF
   * Format: {clientName}-{proposalTitle}-{date}.pdf
   */
  private generatePdfFilename(
    clientName: string,
    proposalTitle: string,
    date: Date,
  ): string {
    // Sanitize strings for filename
    const sanitize = (str: string, maxLength: number = 30): string => {
      return str
        .replace(/[<>:"/\\|?*]/g, '-')
        .replace(/[\s-]+/g, '-')
        .trim()
        .replace(/^-+|-+$/g, '')
        .substring(0, maxLength)
        .replace(/-+$/, '')
        || 'untitled';
    };

    const sanitizedClient = sanitize(clientName, 30);
    const sanitizedTitle = sanitize(proposalTitle, 40);
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD

    return `${sanitizedClient}-${sanitizedTitle}-${dateStr}.pdf`;
  }

  /**
   * Send proposal to client (with optional e-signature)
   */
  async send(
    tenantId: string,
    id: string,
    dto: SendProposalDto,
  ): Promise<SendProposalResponseDto> {
    // Get proposal with tenant branding
    const proposal = await this.prisma.proposal.findFirst({
      where: { id, tenantId },
      include: {
        client: true,
        tenant: {
          include: {
            branding: true,
          },
        },
      },
    });

    if (!proposal) {
      throw new NotFoundException(`Proposal ${id} not found`);
    }

    // Validate proposal has content
    if (!proposal.executiveSummary && !proposal.approachAndTools) {
      throw new BadRequestException(
        'Proposal must have content before sending',
      );
    }

    // Consume tokens for sending proposal via email
    await this.tokensService.consumeTokens({
      tenantId,
      actionType: 'email_proposal',
      actionId: id,
      metadata: {
        proposalId: id,
        recipientEmail: dto.recipientEmail,
        includeESignature: dto.includeESignature,
      },
    });

    this.logger.log(`Sending proposal ${id} to ${dto.recipientEmail}`);

    let docusignEnvelopeId: string | undefined;

    // If e-signature requested, send via DocuSign
    if (dto.includeESignature) {
      // Generate PDF if not already generated
      let pdfBuffer: Buffer;

      if (proposal.pdfS3Key) {
        pdfBuffer = await this.s3Service.downloadFile(proposal.pdfS3Key);
      } else {
        pdfBuffer = await this.pdfRendererService.generateProposalPdf({
          id: proposal.id,
          title: proposal.title,
          client: {
            companyName: proposal.client.companyName,
            contactFirstName: proposal.client.contactFirstName ?? undefined,
            contactLastName: proposal.client.contactLastName ?? undefined,
            contactEmail: proposal.client.contactEmail ?? undefined,
          },
          tenant: {
            name: proposal.tenant.name,
          },
          coverPageData: proposal.coverPageData as any,
          executiveSummary: proposal.executiveSummary ?? undefined,
          objectivesAndOutcomes: proposal.objectivesAndOutcomes ?? undefined,
          scopeOfWork: proposal.scopeOfWork ?? undefined,
          deliverables: proposal.deliverables ?? undefined,
          approachAndTools: proposal.approachAndTools ?? undefined,
          timeline: proposal.timeline ?? undefined,
          paymentTerms: proposal.paymentTerms ?? undefined,
          cancellationNotice: proposal.cancellationNotice ?? undefined,
          pricingOptions: proposal.pricingOptions as any,
          tableOfContents: proposal.tableOfContents ?? undefined,
          created: proposal.created,
        });
      }

      // Get e-signature provider from tenant branding
      const providerType =
        (proposal.tenant.branding?.eSignatureProvider as any) || 'docusign';

      // Check if provider is connected
      const isConnected = await this.eSignatureConnectionsService.isConnected(
        tenantId,
        providerType,
      );

      if (!isConnected) {
        throw new BadRequestException(
          `${providerType} is not connected. Please connect your account in settings before sending proposals with e-signature.`,
        );
      }

      const eSignatureProvider =
        this.eSignatureFactory.getProvider(providerType);

      this.logger.log(
        `Using ${eSignatureProvider.getProviderName()} for proposal ${id}`,
      );

      // Send via e-signature provider
      const documentBase64 = pdfBuffer.toString('base64');

      docusignEnvelopeId = await eSignatureProvider.createAndSendEnvelope({
        documentBase64,
        documentName: `${proposal.title}.pdf`,
        recipientEmail: dto.recipientEmail,
        recipientName: dto.recipientName,
        emailSubject: `Proposal: ${proposal.title}`,
        emailBody:
          dto.message ||
          `Please review and sign the attached proposal: ${proposal.title}`,
      });

      this.logger.log(
        `Proposal ${id} sent via ${eSignatureProvider.getProviderName()} (envelope: ${docusignEnvelopeId})`,
      );
    } else {
      // TODO: Send via regular email (AWS SES)
      // For now, we'll just log it
      this.logger.log(
        `Proposal ${id} would be sent via email to ${dto.recipientEmail}`,
      );
    }

    // Update proposal status
    const sentAt = new Date();
    await this.prisma.proposal.update({
      where: { id },
      data: {
        status: 'sent',
        sentAt,
        docusignEnvelopeId,
      },
    });

    return {
      id,
      status: 'sent',
      sentAt: sentAt.toISOString(),
      docusignEnvelopeId,
      emailSent: true,
    };
  }

  /**
   * Create proposal from transcription with AI generation
   */
  async createFromTranscription(
    tenantId: string,
    userId: string,
    dto: CreateProposalFromTranscriptionDto,
  ): Promise<any> {
    this.logger.log(
      `Creating proposal from transcription ${dto.transcriptionId}`,
    );

    // Validate client exists
    const client = await this.prisma.client.findFirst({
      where: { id: dto.clientId, tenantId },
    });

    if (!client) {
      throw new NotFoundException(`Client ${dto.clientId} not found`);
    }

    // Validate transcription exists
    const transcription = await this.prisma.transcription.findFirst({
      where: { id: dto.transcriptionId, tenantId },
    });

    if (!transcription) {
      throw new NotFoundException(
        `Transcription ${dto.transcriptionId} not found`,
      );
    }

    if (transcription.status !== 'completed') {
      throw new BadRequestException(
        'Transcription must be completed before generating proposal',
      );
    }

    // Create proposal with generation method set to transcription
    const proposal = await this.prisma.proposal.create({
      data: {
        tenantId,
        userId,
        clientId: dto.clientId,
        transcriptionId: dto.transcriptionId,
        title: dto.title,
        generationMethod: 'transcription',
        coverPageData: dto.coverPageData as any,
        tableOfContents: dto.tableOfContents ?? true,
        variables: dto.variables as any,
        status: 'generating',
      },
    });

    // Consume tokens for AI proposal generation from transcription
    await this.tokensService.consumeTokens({
      tenantId,
      actionType: 'proposal_generation',
      actionId: proposal.id,
      metadata: {
        proposalId: proposal.id,
        clientId: dto.clientId,
        transcriptionId: dto.transcriptionId,
        generationMethod: 'transcription',
      },
    });

    // Queue generation job
    const jobData: GenerateProposalJobData = {
      proposalId: proposal.id,
      tenantId,
      sections: [
        'executiveSummary',
        'objectivesAndOutcomes',
        'scopeOfWork',
        'deliverables',
        'approachAndTools',
        'paymentTerms',
        'cancellationNotice',
        'timeline',
        'pricing',
      ],
    };

    const job = await this.proposalQueue.add(PROPOSAL_GENERATE_JOB, jobData);

    this.logger.log(
      `Proposal generation from transcription job ${job.id} queued for proposal ${proposal.id}`,
    );

    return {
      id: proposal.id,
      jobId: String(job.id),
      status: 'generating',
      message: 'Proposal is being generated from transcription',
    };
  }

  /**
   * Add a pricing option to the proposal
   */
  async addPricingOption(
    tenantId: string,
    id: string,
    dto: any, // Will be AddPricingOptionDto
  ): Promise<any> {
    this.logger.log(`Adding pricing option to proposal ${id}`);

    // Verify proposal exists
    const proposal = await this.prisma.proposal.findFirst({
      where: { id, tenantId },
    });

    if (!proposal) {
      throw new NotFoundException(`Proposal ${id} not found`);
    }

    // Get current pricing options
    const pricingOptions = (proposal.pricingOptions as any[]) || [];

    // Add new option
    const newOption = {
      name: dto.name,
      description: dto.description,
      items: dto.items,
      total: dto.total,
    };

    pricingOptions.push(newOption);

    // Update proposal
    await this.prisma.proposal.update({
      where: { id },
      data: {
        pricingOptions: pricingOptions as any,
      },
    });

    this.logger.log(`Pricing option "${dto.name}" added to proposal ${id}`);

    return {
      id,
      pricingOptions,
      message: 'Pricing option added successfully',
    };
  }

  /**
   * Update send options for client view
   */
  async updateSendOptions(
    tenantId: string,
    id: string,
    dto: any, // Will be UpdateSendOptionsDto
  ): Promise<any> {
    this.logger.log(`Updating send options for proposal ${id}`);

    // Verify proposal exists
    const proposal = await this.prisma.proposal.findFirst({
      where: { id, tenantId },
    });

    if (!proposal) {
      throw new NotFoundException(`Proposal ${id} not found`);
    }

    // Build send options object
    const sendOptions: any = {};

    if (dto.showTOC !== undefined) {
      sendOptions.showTOC = dto.showTOC;
    }

    if (dto.pricingOptions !== undefined) {
      sendOptions.pricingOptions = dto.pricingOptions;
    }

    if (dto.customSections !== undefined) {
      sendOptions.customSections = dto.customSections;
    }

    // Update proposal
    await this.prisma.proposal.update({
      where: { id },
      data: {
        sendOptions: sendOptions,
      },
    });

    this.logger.log(`Send options updated for proposal ${id}`);

    return {
      id,
      sendOptions,
      message: 'Send options updated successfully',
    };
  }

  /**
   * Agency signs the proposal
   */
  async agencySign(
    tenantId: string,
    userId: string,
    id: string,
    dto: any, // Will be AgencySignDto
  ): Promise<any> {
    this.logger.log(`Agency signing proposal ${id}`);

    // Verify proposal exists
    const proposal = await this.prisma.proposal.findFirst({
      where: { id, tenantId },
    });

    if (!proposal) {
      throw new NotFoundException(`Proposal ${id} not found`);
    }

    // Check if already signed by agency
    if (proposal.agencySignedAt) {
      throw new BadRequestException('Proposal already signed by agency');
    }

    let signatureS3Key: string | undefined;

    // If signature image provided, upload to S3
    if (dto.signatureImage) {
      // Extract base64 data
      const base64Data = dto.signatureImage.replace(
        /^data:image\/\w+;base64,/,
        '',
      );
      const buffer = Buffer.from(base64Data, 'base64');

      // Upload to S3
      signatureS3Key = await this.s3Service.uploadFile(
        tenantId,
        buffer,
        `proposal-${id}-agency-signature.png`,
        'image/png',
        'signatures/agency',
      );

      this.logger.log(`Agency signature uploaded to S3: ${signatureS3Key}`);
    }

    // Update proposal with agency signature
    const agencySignedAt = new Date();
    await this.prisma.proposal.update({
      where: { id },
      data: {
        agencySignedAt,
        agencySignedBy: userId,
        agencySignatureS3: signatureS3Key,
      },
    });

    this.logger.log(`Proposal ${id} signed by agency (user: ${userId})`);

    return {
      id,
      agencySignedAt,
      agencySignatureS3: signatureS3Key,
      message: 'Proposal signed by agency successfully',
    };
  }

  /**
   * Map database entity to DTO
   */
  private mapToDto(proposal: any): ProposalResponseDto {
    return {
      id: proposal.id,
      clientId: proposal.clientId,
      client: proposal.client
        ? {
            id: proposal.client.id,
            companyName: proposal.client.companyName,
          }
        : undefined,
      title: proposal.title,
      status: proposal.status,
      coverPageData: proposal.coverPageData,
      executiveSummary: proposal.executiveSummary,
      objectivesAndOutcomes: proposal.objectivesAndOutcomes,
      scopeOfWork: proposal.scopeOfWork,
      deliverables: proposal.deliverables,
      approachAndTools: proposal.approachAndTools,
      timeline: proposal.timeline,
      paymentTerms: proposal.paymentTerms,
      cancellationNotice: proposal.cancellationNotice,
      pricing: proposal.pricing,
      pdfUrl: proposal.pdfUrl,
      docusignEnvelopeId: proposal.docusignEnvelopeId,
      created: proposal.created.toISOString(),
      updated: proposal.updated.toISOString(),
      sentAt: proposal.sentAt?.toISOString(),
      signedAt: proposal.signedAt?.toISOString(),
    };
  }

  /**
   * Submit feedback on an AI-generated proposal
   * This helps the AI learn and improve future generations
   */
  async submitFeedback(
    tenantId: string,
    proposalId: string,
    feedbackData: {
      userRating?: number;
      wasEdited?: boolean;
      editedVersion?: string;
      feedback?: string;
      outcome?: 'won_deal' | 'lost_deal' | 'no_response' | 'unclear';
    },
  ): Promise<{ success: boolean; message: string }> {
    // Verify proposal exists and belongs to tenant
    const proposal = await this.prisma.proposal.findFirst({
      where: { id: proposalId, tenantId },
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    // Record feedback for AI learning
    await this.openaiService.recordFeedback({
      tenantId,
      generationType: 'proposal',
      generationId: proposalId,
      promptUsed: 'AI-generated proposal with adaptive learning',
      outputGenerated: JSON.stringify({
        executiveSummary: proposal.executiveSummary,
        objectivesAndOutcomes: proposal.objectivesAndOutcomes,
        scopeOfWork: proposal.scopeOfWork,
        deliverables: proposal.deliverables,
        approachAndTools: proposal.approachAndTools,
        timeline: proposal.timeline,
        paymentTerms: proposal.paymentTerms,
        cancellationNotice: proposal.cancellationNotice,
        pricing: proposal.pricing,
      }),
      modelUsed: 'gpt-4-turbo-preview',
      userRating: feedbackData.userRating,
      wasEdited: feedbackData.wasEdited,
      editedVersion: feedbackData.editedVersion,
      feedback: feedbackData.feedback,
      outcome: feedbackData.outcome,
      inputContext: {
        clientId: proposal.clientId,
        transcriptionId: proposal.transcriptionId,
      },
    });

    this.logger.log(
      `Feedback submitted for proposal ${proposalId}: Rating=${feedbackData.userRating}, Outcome=${feedbackData.outcome}`,
    );

    return {
      success: true,
      message:
        'Feedback recorded successfully. Thank you for helping improve our AI!',
    };
  }

  /**
   * Export proposal to Google Docs
   */
  async exportGDoc(
    tenantId: string,
    userId: string,
    id: string,
  ): Promise<{ docId: string; docUrl: string; message: string }> {
    // Get proposal with all related data
    const proposal = await this.prisma.proposal.findFirst({
      where: { id, tenantId },
      include: {
        client: true,
        tenant: true,
      },
    });

    if (!proposal) {
      throw new NotFoundException(`Proposal ${id} not found`);
    }

    // Validate proposal has content
    if (!proposal.executiveSummary && !proposal.approachAndTools) {
      throw new BadRequestException(
        'Proposal must have content before exporting to Google Docs',
      );
    }

    this.logger.log(
      `Exporting proposal ${id} to Google Docs for user ${userId}`,
    );

    // Export to Google Docs using injected service
    const { docId, docUrl } = await this.gdocsExporterService.exportProposal(
      {
        id: proposal.id,
        title: proposal.title,
        client: {
          companyName: proposal.client.companyName,
        },
        tenant: {
          name: proposal.tenant.name,
        },
        coverPageData: proposal.coverPageData as any,
        executiveSummary: proposal.executiveSummary ?? undefined,
        objectivesAndOutcomes: proposal.objectivesAndOutcomes ?? undefined,
        scopeOfWork: proposal.scopeOfWork ?? undefined,
        deliverables: proposal.deliverables ?? undefined,
        approachAndTools: proposal.approachAndTools ?? undefined,
        timeline: proposal.timeline ?? undefined,
        paymentTerms: proposal.paymentTerms ?? undefined,
        cancellationNotice: proposal.cancellationNotice ?? undefined,
        pricingOptions: proposal.pricingOptions as any,
        accountHierarchy: proposal.accountHierarchy ?? undefined,
        contentEnrichment: proposal.contentEnrichment ?? undefined,
        kpiForecast: proposal.kpiForecast ?? undefined,
        teamRoster: proposal.teamRoster ?? undefined,
        appendix: proposal.appendix ?? undefined,
        created: proposal.created,
      },
      userId,
      proposal.gdocId ?? undefined,
    );

    // Update proposal with Google Doc info
    await this.prisma.proposal.update({
      where: { id },
      data: {
        gdocId: docId,
        gdocUrl: docUrl,
        lastExportedAt: new Date(),
      },
    });

    this.logger.log(`Proposal ${id} exported to Google Docs: ${docUrl}`);

    return {
      docId,
      docUrl,
      message: 'Proposal exported to Google Docs successfully',
    };
  }

  /**
   * Refresh existing Google Doc with updated proposal content
   * Clears and rebuilds the document with current proposal data
   */
  async refreshGDoc(
    tenantId: string,
    userId: string,
    id: string,
  ): Promise<{ docId: string; docUrl: string; message: string }> {
    // Get proposal with all related data
    const proposal = await this.prisma.proposal.findFirst({
      where: { id, tenantId },
      include: {
        client: true,
        tenant: true,
      },
    });

    if (!proposal) {
      throw new NotFoundException(`Proposal ${id} not found`);
    }

    // Verify proposal has been exported to Google Docs before
    if (!proposal.gdocId) {
      throw new NotFoundException(
        'Proposal has not been exported to Google Docs yet. Use /export-gdoc first.',
      );
    }

    // Validate proposal has content
    if (!proposal.executiveSummary && !proposal.approachAndTools) {
      throw new BadRequestException(
        'Proposal must have content before refreshing Google Doc',
      );
    }

    this.logger.log(
      `Refreshing Google Doc ${proposal.gdocId} for proposal ${id}`,
    );

    // Refresh the existing Google Doc with updated content
    const { docId, docUrl } = await this.gdocsExporterService.exportProposal(
      {
        id: proposal.id,
        title: proposal.title,
        client: {
          companyName: proposal.client.companyName,
        },
        tenant: {
          name: proposal.tenant.name,
        },
        coverPageData: proposal.coverPageData as any,
        executiveSummary: proposal.executiveSummary ?? undefined,
        objectivesAndOutcomes: proposal.objectivesAndOutcomes ?? undefined,
        scopeOfWork: proposal.scopeOfWork ?? undefined,
        deliverables: proposal.deliverables ?? undefined,
        approachAndTools: proposal.approachAndTools ?? undefined,
        timeline: proposal.timeline ?? undefined,
        paymentTerms: proposal.paymentTerms ?? undefined,
        cancellationNotice: proposal.cancellationNotice ?? undefined,
        pricingOptions: proposal.pricingOptions as any,
        accountHierarchy: proposal.accountHierarchy ?? undefined,
        contentEnrichment: proposal.contentEnrichment ?? undefined,
        kpiForecast: proposal.kpiForecast ?? undefined,
        teamRoster: proposal.teamRoster ?? undefined,
        appendix: proposal.appendix ?? undefined,
        created: proposal.created,
      },
      userId,
      proposal.gdocId, // Pass existing docId to refresh it
    );

    // Update proposal with refreshed timestamp
    await this.prisma.proposal.update({
      where: { id },
      data: {
        gdocId: docId,
        gdocUrl: docUrl,
        lastExportedAt: new Date(),
      },
    });

    this.logger.log(`Google Doc refreshed successfully for proposal ${id}`);

    return {
      docId,
      docUrl,
      message: 'Google Doc refreshed successfully',
    };
  }

  /**
   * Import content from Google Doc and update proposal fields
   * Also creates a revision snapshot before and after import
   */
  async importFromGDoc(
    tenantId: string,
    userId: string,
    id: string,
  ): Promise<{ message: string; updatedSections: string[] }> {
    // Verify proposal exists and belongs to tenant
    const proposal = await this.prisma.proposal.findFirst({
      where: { id, tenantId },
    });

    if (!proposal) {
      throw new NotFoundException(`Proposal ${id} not found`);
    }

    if (!proposal.gdocId) {
      throw new NotFoundException(
        'Proposal has not been exported to Google Docs yet. Export first to create a doc.',
      );
    }

    // Read doc content as plain text
    const text = await this.gdocsExporterService.readDocumentPlainText(
      userId,
      proposal.gdocId,
    );

    // Basic parser: extract sections by common headings
    const sections = this.parseGDocSections(text);

    // Snapshot before import
    await this.createRevision(tenantId, userId, id, 'Before GDoc import');

    const data: any = {};
    const updatedSections: string[] = [];

    if (sections.executiveSummary) {
      data.executiveSummary = sections.executiveSummary;
      updatedSections.push('executiveSummary');
    }
    if (sections.objectivesAndOutcomes) {
      data.objectivesAndOutcomes = sections.objectivesAndOutcomes;
      updatedSections.push('objectivesAndOutcomes');
    }
    if (sections.scopeOfWork) {
      data.scopeOfWork = sections.scopeOfWork;
      updatedSections.push('scopeOfWork');
    }
    if (sections.deliverables) {
      data.deliverables = sections.deliverables;
      updatedSections.push('deliverables');
    }
    if (sections.approachAndTools) {
      data.approachAndTools = sections.approachAndTools;
      updatedSections.push('approachAndTools');
    }
    if (sections.timeline) {
      data.timeline = sections.timeline; // keep as string if parsed
      updatedSections.push('timeline');
    }
    if (sections.paymentTerms) {
      data.paymentTerms = sections.paymentTerms;
      updatedSections.push('paymentTerms');
    }
    if (sections.cancellationNotice) {
      data.cancellationNotice = sections.cancellationNotice;
      updatedSections.push('cancellationNotice');
    }

    if (updatedSections.length > 0) {
      await this.prisma.proposal.update({
        where: { id },
        data,
      });
    }

    // Snapshot after import
    await this.createRevision(tenantId, userId, id, 'After GDoc import');

    return {
      message:
        updatedSections.length > 0
          ? 'Imported content from Google Doc successfully'
          : 'No matching sections found to import from Google Doc',
      updatedSections,
    };
  }

  /**
   * Parse plain-text GDoc content into known proposal sections
   */
  private parseGDocSections(text: string): {
    executiveSummary?: string;
    objectivesAndOutcomes?: string;
    scopeOfWork?: string;
    deliverables?: string;
    approachAndTools?: string;
    timeline?: string;
    paymentTerms?: string;
    cancellationNotice?: string;
  } {
    const result: any = {};
    const lines = text.split(/\r?\n/);
    const joinUntilNext = (startIdx: number, stopHeadings: RegExp): string => {
      const buff: string[] = [];
      for (let i = startIdx + 1; i < lines.length; i++) {
        if (stopHeadings.test(lines[i].trim())) break;
        buff.push(lines[i]);
      }
      return buff.join('\n').trim();
    };

    const headingRegex = /^(Executive Summary|Objectives and Outcomes|Scope of Work|Deliverables|Approach and Tools|Project Timeline|Payment Terms|Cancellation Notice)\s*$/i;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!headingRegex.test(line)) continue;
      const stopHeadings = headingRegex;
      const content = joinUntilNext(i, stopHeadings);
      if (/^Executive Summary$/i.test(line)) result.executiveSummary = content;
      else if (/^Objectives and Outcomes$/i.test(line)) result.objectivesAndOutcomes = content;
      else if (/^Scope of Work$/i.test(line)) result.scopeOfWork = content;
      else if (/^Deliverables$/i.test(line)) result.deliverables = content;
      else if (/^Approach and Tools$/i.test(line)) result.approachAndTools = content;
      else if (/^Project Timeline$/i.test(line)) result.timeline = content;
      else if (/^Payment Terms$/i.test(line)) result.paymentTerms = content;
      else if (/^Cancellation Notice$/i.test(line)) result.cancellationNotice = content;
    }
    return result;
  }

  /**
   * Delete a proposal
   */
  async delete(tenantId: string, id: string): Promise<{ message: string }> {
    // Verify proposal exists and belongs to tenant
    const proposal = await this.prisma.proposal.findFirst({
      where: { id, tenantId },
    });

    if (!proposal) {
      throw new NotFoundException(`Proposal ${id} not found`);
    }

    this.logger.log(`Deleting proposal ${id}`);

    // Delete proposal (cascade will delete revisions)
    await this.prisma.proposal.delete({
      where: { id },
    });

    this.logger.log(`Proposal ${id} deleted successfully`);

    return {
      message: 'Proposal deleted successfully',
    };
  }

  /**
   * Get revision history for a proposal
   */
  async getRevisions(
    tenantId: string,
    id: string,
  ): Promise<{
    revisions: Array<{
      id: string;
      createdAt: string;
      createdBy: string;
      changeNote?: string;
    }>;
  }> {
    // Verify proposal exists and belongs to tenant
    const proposal = await this.prisma.proposal.findFirst({
      where: { id, tenantId },
    });

    if (!proposal) {
      throw new NotFoundException(`Proposal ${id} not found`);
    }

    // Get all revisions
    const revisions = await this.prisma.proposalRevision.findMany({
      where: { proposalId: id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        createdBy: true,
        changeNote: true,
      },
    });

    return {
      revisions: revisions.map((rev) => ({
        id: rev.id,
        createdAt: rev.createdAt.toISOString(),
        createdBy: rev.createdBy,
        changeNote: rev.changeNote ?? undefined,
      })),
    };
  }

  /**
   * Restore proposal from a revision
   */
  async restoreRevision(
    tenantId: string,
    userId: string,
    id: string,
    revisionId: string,
  ): Promise<{ message: string }> {
    // Verify proposal exists and belongs to tenant
    const proposal = await this.prisma.proposal.findFirst({
      where: { id, tenantId },
    });

    if (!proposal) {
      throw new NotFoundException(`Proposal ${id} not found`);
    }

    // Get the revision
    const revision = await this.prisma.proposalRevision.findFirst({
      where: {
        id: revisionId,
        proposalId: id,
      },
    });

    if (!revision) {
      throw new NotFoundException(`Revision ${revisionId} not found`);
    }

    this.logger.log(
      `Restoring proposal ${id} from revision ${revisionId} by user ${userId}`,
    );

    // Create a new revision snapshot of current state before restoring
    await this.createRevision(tenantId, userId, id, 'Snapshot before restore');

    // Restore proposal data from revision
    const revisionData = revision.proposalData as any;

    await this.prisma.proposal.update({
      where: { id },
      data: {
        title: revisionData.title,
        executiveSummary: revisionData.executiveSummary,
        objectivesAndOutcomes: revisionData.objectivesAndOutcomes,
        scopeOfWork: revisionData.scopeOfWork,
        deliverables: revisionData.deliverables,
        approachAndTools: revisionData.approachAndTools,
        timeline: revisionData.timeline,
        paymentTerms: revisionData.paymentTerms,
        cancellationNotice: revisionData.cancellationNotice,
        pricingOptions: revisionData.pricingOptions,
      },
    });

    this.logger.log(`Proposal ${id} restored from revision ${revisionId}`);

    return {
      message: 'Proposal restored from revision successfully',
    };
  }

  /**
   * Create a revision snapshot of current proposal state
   */
  async createRevision(
    tenantId: string,
    userId: string,
    id: string,
    changeNote?: string,
  ): Promise<{ revisionId: string; message: string }> {
    // Get current proposal state
    const proposal = await this.prisma.proposal.findFirst({
      where: { id, tenantId },
    });

    if (!proposal) {
      throw new NotFoundException(`Proposal ${id} not found`);
    }

    // Create revision snapshot
    const revision = await this.prisma.proposalRevision.create({
      data: {
        proposalId: id,
        createdBy: userId,
        changeNote,
        proposalData: {
          title: proposal.title,
          executiveSummary: proposal.executiveSummary,
          objectivesAndOutcomes: proposal.objectivesAndOutcomes,
          scopeOfWork: proposal.scopeOfWork,
          deliverables: proposal.deliverables,
          approachAndTools: proposal.approachAndTools,
          timeline: proposal.timeline,
          paymentTerms: proposal.paymentTerms,
          cancellationNotice: proposal.cancellationNotice,
          pricingOptions: proposal.pricingOptions,
          status: proposal.status,
        } as any,
      },
    });

    this.logger.log(`Created revision ${revision.id} for proposal ${id}`);

    return {
      revisionId: revision.id,
      message: 'Revision created successfully',
    };
  }

  // ============================================================================
  // PRICING V2 METHODS (Narrative Pricing)
  // ============================================================================

  /**
   * Add pricing option to proposal
   */
  async addPricingOptionV2(
    tenantId: string,
    proposalId: string,
    dto: any,
  ): Promise<any> {
    // Verify proposal exists and belongs to tenant
    const proposal = await this.prisma.proposal.findFirst({
      where: { id: proposalId, tenantId },
    });

    if (!proposal) {
      throw new NotFoundException(`Proposal ${proposalId} not found`);
    }

    // Create pricing option with nested line items
    const pricingOption = await this.prisma.proposalPricingOption.create({
      data: {
        proposalId,
        label: dto.label,
        billingCadence: dto.billingCadence,
        summary: dto.summary,
        tierType: dto.tierType,
        paymentTerms: dto.paymentTerms,
        cancellationNotice: dto.cancellationNotice,
        isRecommended: dto.isRecommended || false,
        sortOrder: dto.sortOrder || 0,
        lineItems: {
          create: dto.lineItems.map((item: any, index: number) => ({
            lineType: item.lineType,
            description: item.description,
            amount: item.amount,
            unitType: item.unitType,
            hoursIncluded: item.hoursIncluded,
            requiresApproval: item.requiresApproval || false,
            notes: item.notes,
            sortOrder: item.sortOrder !== undefined ? item.sortOrder : index,
          })),
        },
      },
      include: {
        lineItems: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    this.logger.log(
      `Created pricing option ${pricingOption.id} for proposal ${proposalId}`,
    );

    return {
      id: pricingOption.id,
      message: 'Pricing option created successfully',
      pricingOption,
    };
  }

  /**
   * Update pricing option
   */
  async updatePricingOptionV2(
    tenantId: string,
    proposalId: string,
    optionId: string,
    dto: any,
  ): Promise<any> {
    // Verify proposal exists
    const proposal = await this.prisma.proposal.findFirst({
      where: { id: proposalId, tenantId },
    });

    if (!proposal) {
      throw new NotFoundException(`Proposal ${proposalId} not found`);
    }

    // Verify pricing option exists and belongs to proposal
    const existingOption = await this.prisma.proposalPricingOption.findFirst({
      where: { id: optionId, proposalId },
    });

    if (!existingOption) {
      throw new NotFoundException(`Pricing option ${optionId} not found`);
    }

    // Update pricing option
    const updatedOption = await this.prisma.proposalPricingOption.update({
      where: { id: optionId },
      data: {
        label: dto.label,
        billingCadence: dto.billingCadence,
        summary: dto.summary,
        tierType: dto.tierType,
        paymentTerms: dto.paymentTerms,
        cancellationNotice: dto.cancellationNotice,
        isRecommended: dto.isRecommended,
        sortOrder: dto.sortOrder,
      },
      include: {
        lineItems: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    this.logger.log(`Updated pricing option ${optionId}`);

    return {
      message: 'Pricing option updated successfully',
      pricingOption: updatedOption,
    };
  }

  /**
   * Delete pricing option
   */
  async deletePricingOptionV2(
    tenantId: string,
    proposalId: string,
    optionId: string,
  ): Promise<any> {
    // Verify proposal exists
    const proposal = await this.prisma.proposal.findFirst({
      where: { id: proposalId, tenantId },
    });

    if (!proposal) {
      throw new NotFoundException(`Proposal ${proposalId} not found`);
    }

    // Verify pricing option exists and belongs to proposal
    const existingOption = await this.prisma.proposalPricingOption.findFirst({
      where: { id: optionId, proposalId },
    });

    if (!existingOption) {
      throw new NotFoundException(`Pricing option ${optionId} not found`);
    }

    // Delete pricing option (cascade will delete line items)
    await this.prisma.proposalPricingOption.delete({
      where: { id: optionId },
    });

    this.logger.log(`Deleted pricing option ${optionId}`);

    return {
      message: 'Pricing option deleted successfully',
    };
  }

  /**
   * Add line item to pricing option
   */
  async addLineItem(
    tenantId: string,
    proposalId: string,
    optionId: string,
    dto: any,
  ): Promise<any> {
    // Verify proposal exists
    const proposal = await this.prisma.proposal.findFirst({
      where: { id: proposalId, tenantId },
    });

    if (!proposal) {
      throw new NotFoundException(`Proposal ${proposalId} not found`);
    }

    // Verify pricing option exists
    const pricingOption = await this.prisma.proposalPricingOption.findFirst({
      where: { id: optionId, proposalId },
    });

    if (!pricingOption) {
      throw new NotFoundException(`Pricing option ${optionId} not found`);
    }

    // Create line item
    const lineItem = await this.prisma.proposalPricingLineItem.create({
      data: {
        optionId,
        lineType: dto.lineType,
        description: dto.description,
        amount: dto.amount,
        unitType: dto.unitType,
        hoursIncluded: dto.hoursIncluded,
        requiresApproval: dto.requiresApproval || false,
        notes: dto.notes,
        sortOrder: dto.sortOrder || 0,
      },
    });

    this.logger.log(`Created line item ${lineItem.id} for option ${optionId}`);

    return {
      id: lineItem.id,
      message: 'Line item created successfully',
      lineItem,
    };
  }

  /**
   * Update line item
   */
  async updateLineItem(
    tenantId: string,
    proposalId: string,
    optionId: string,
    lineItemId: string,
    dto: any,
  ): Promise<any> {
    // Verify proposal exists
    const proposal = await this.prisma.proposal.findFirst({
      where: { id: proposalId, tenantId },
    });

    if (!proposal) {
      throw new NotFoundException(`Proposal ${proposalId} not found`);
    }

    // Verify line item exists and belongs to option
    const existingLineItem =
      await this.prisma.proposalPricingLineItem.findFirst({
        where: { id: lineItemId, optionId },
      });

    if (!existingLineItem) {
      throw new NotFoundException(`Line item ${lineItemId} not found`);
    }

    // Update line item
    const updatedLineItem = await this.prisma.proposalPricingLineItem.update({
      where: { id: lineItemId },
      data: {
        lineType: dto.lineType,
        description: dto.description,
        amount: dto.amount,
        unitType: dto.unitType,
        hoursIncluded: dto.hoursIncluded,
        requiresApproval: dto.requiresApproval,
        notes: dto.notes,
        sortOrder: dto.sortOrder,
      },
    });

    this.logger.log(`Updated line item ${lineItemId}`);

    return {
      message: 'Line item updated successfully',
      lineItem: updatedLineItem,
    };
  }

  /**
   * Delete line item
   */
  async deleteLineItem(
    tenantId: string,
    proposalId: string,
    optionId: string,
    lineItemId: string,
  ): Promise<any> {
    // Verify proposal exists
    const proposal = await this.prisma.proposal.findFirst({
      where: { id: proposalId, tenantId },
    });

    if (!proposal) {
      throw new NotFoundException(`Proposal ${proposalId} not found`);
    }

    // Verify line item exists and belongs to option
    const existingLineItem =
      await this.prisma.proposalPricingLineItem.findFirst({
        where: { id: lineItemId, optionId },
      });

    if (!existingLineItem) {
      throw new NotFoundException(`Line item ${lineItemId} not found`);
    }

    // Delete line item
    await this.prisma.proposalPricingLineItem.delete({
      where: { id: lineItemId },
    });

    this.logger.log(`Deleted line item ${lineItemId}`);

    return {
      message: 'Line item deleted successfully',
    };
  }

  /**
   * Add pricing note to proposal
   */
  async addPricingNote(
    tenantId: string,
    proposalId: string,
    dto: any,
  ): Promise<any> {
    // Verify proposal exists
    const proposal = await this.prisma.proposal.findFirst({
      where: { id: proposalId, tenantId },
    });

    if (!proposal) {
      throw new NotFoundException(`Proposal ${proposalId} not found`);
    }

    // Create pricing note
    const pricingNote = await this.prisma.proposalPricingNote.create({
      data: {
        proposalId,
        noteType: dto.noteType,
        content: dto.content,
        sortOrder: dto.sortOrder || 0,
      },
    });

    this.logger.log(
      `Created pricing note ${pricingNote.id} for proposal ${proposalId}`,
    );

    return {
      id: pricingNote.id,
      message: 'Pricing note created successfully',
      pricingNote,
    };
  }

  /**
   * Update pricing note
   */
  async updatePricingNote(
    tenantId: string,
    proposalId: string,
    noteId: string,
    dto: any,
  ): Promise<any> {
    // Verify proposal exists
    const proposal = await this.prisma.proposal.findFirst({
      where: { id: proposalId, tenantId },
    });

    if (!proposal) {
      throw new NotFoundException(`Proposal ${proposalId} not found`);
    }

    // Verify pricing note exists and belongs to proposal
    const existingNote = await this.prisma.proposalPricingNote.findFirst({
      where: { id: noteId, proposalId },
    });

    if (!existingNote) {
      throw new NotFoundException(`Pricing note ${noteId} not found`);
    }

    // Update pricing note
    const updatedNote = await this.prisma.proposalPricingNote.update({
      where: { id: noteId },
      data: {
        noteType: dto.noteType,
        content: dto.content,
        sortOrder: dto.sortOrder,
      },
    });

    this.logger.log(`Updated pricing note ${noteId}`);

    return {
      message: 'Pricing note updated successfully',
      pricingNote: updatedNote,
    };
  }

  /**
   * Delete pricing note
   */
  async deletePricingNote(
    tenantId: string,
    proposalId: string,
    noteId: string,
  ): Promise<any> {
    // Verify proposal exists
    const proposal = await this.prisma.proposal.findFirst({
      where: { id: proposalId, tenantId },
    });

    if (!proposal) {
      throw new NotFoundException(`Proposal ${proposalId} not found`);
    }

    // Verify pricing note exists and belongs to proposal
    const existingNote = await this.prisma.proposalPricingNote.findFirst({
      where: { id: noteId, proposalId },
    });

    if (!existingNote) {
      throw new NotFoundException(`Pricing note ${noteId} not found`);
    }

    // Delete pricing note
    await this.prisma.proposalPricingNote.delete({
      where: { id: noteId },
    });

    this.logger.log(`Deleted pricing note ${noteId}`);

    return {
      message: 'Pricing note deleted successfully',
    };
  }

  /**
   * Seed pricing blueprints (default templates)
   * Creates sample pricing options based on templates for testing/demo
   */
  seedPricingBlueprints(tenantId: string): any {
    this.logger.log(`Seeding pricing blueprints for tenant ${tenantId}`);

    // Get all templates
    const templates = [
      this.pricingTemplateService.getSprintTemplate(),
      this.pricingTemplateService.getRetainerTemplate(),
      this.pricingTemplateService.getHourlyTemplate(),
    ];

    const seededTemplates = templates.map((template) => ({
      name: template.label,
      billingCadence: template.billingCadence,
      summary: template.summary,
      coreServices: template.coreServices,
      tierDefinitions: template.tierDefinitions,
      paymentTerms: template.paymentTerms,
      cancellationNotice: template.cancellationNotice,
    }));

    return {
      message: 'Pricing blueprints seeded successfully',
      templates: seededTemplates,
      count: seededTemplates.length,
    };
  }

  /**
   * Auto-fill all proposal sections from transcription and client data
   */
  async autoFillFromTranscription(
    tenantId: string,
    userId: string,
    proposalId: string,
  ): Promise<any> {
    return this.proposalAutofillService.autoFillProposal(
      tenantId,
      userId,
      proposalId,
    );
  }

  /**
   * Generate or regenerate a specific proposal section
   */
  async generateSection(
    tenantId: string,
    userId: string,
    proposalId: string,
    section: string,
  ): Promise<any> {
    return this.proposalAutofillService.generateSection(
      tenantId,
      userId,
      proposalId,
      section,
    );
  }
}
