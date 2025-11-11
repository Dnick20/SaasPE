import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  HttpStatus,
  StreamableFile,
  Res,
  Header,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ProposalsService } from './proposals.service';
import {
  CreateProposalDto,
  UpdateProposalDto,
  GenerateProposalDto,
  GenerateAIProposalDto,
  SendProposalDto,
  ProposalResponseDto,
  ProposalsListResponseDto,
  GenerateProposalResponseDto,
  ExportPdfResponseDto,
  ExportWordResponseDto,
  SendProposalResponseDto,
  CreateProposalFromTranscriptionDto,
  UpdateProposalSectionsDto,
  UpdateProposalPricingDto,
} from './dto';

/**
 * Proposals Controller
 *
 * Endpoints:
 * - POST /proposals - Create proposal
 * - GET /proposals - List proposals
 * - GET /proposals/:id - Get single proposal
 * - PATCH /proposals/:id - Update proposal
 * - POST /proposals/:id/generate - Generate content with AI
 * - POST /proposals/:id/export-pdf - Export to PDF
 * - POST /proposals/:id/send - Send to client
 */
@Controller('proposals')
@ApiTags('Proposals')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProposalsController {
  constructor(private proposalsService: ProposalsService) {}

  /**
   * Create a new proposal
   */
  @Post()
  @ApiOperation({ summary: 'Create a new proposal' })
  @ApiResponse({
    status: 201,
    description: 'Proposal created successfully',
    type: ProposalResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @CurrentUser() user: any,
    @Body() dto: CreateProposalDto,
  ): Promise<ProposalResponseDto> {
    return this.proposalsService.create(user.tenantId, user.id, dto);
  }

  /**
   * Generate a complete proposal with AI and create a Draft
   * Synchronously generates all core sections and persists a draft
   * NOTE: Must be defined before :id routes to avoid routing conflicts
   */
  @Post('generate-ai')
  @ApiOperation({ summary: 'Generate a complete proposal with AI and create a draft' })
  @ApiResponse({ status: 201, description: 'Proposal generated and created', type: ProposalResponseDto })
  @ApiResponse({ status: 404, description: 'Client or transcription not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async generateAIProposal(
    @CurrentUser() user: any,
    @Body() dto: GenerateAIProposalDto,
  ): Promise<ProposalResponseDto> {
    return this.proposalsService.generateAIDraft(user.tenantId, user.id, dto);
  }

  /**
   * Create proposal from transcription with AI generation
   * NOTE: Must be defined before :id routes to avoid routing conflicts
   */
  @Post('from-transcription')
  @ApiOperation({
    summary: 'Create proposal from transcription with AI generation',
  })
  @ApiResponse({
    status: 201,
    description: 'Proposal generation from transcription started',
  })
  @ApiResponse({
    status: 404,
    description: 'Client or transcription not found',
  })
  @ApiResponse({ status: 400, description: 'Transcription not completed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createFromTranscription(
    @CurrentUser() user: any,
    @Body() dto: CreateProposalFromTranscriptionDto,
  ): Promise<any> {
    return this.proposalsService.createFromTranscription(
      user.tenantId,
      user.id,
      dto,
    );
  }

  /**
   * List all proposals with pagination and filtering
   */
  @Get()
  @ApiOperation({ summary: 'List all proposals for the tenant' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20, max: 100)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description:
      'Filter by status (draft, generating, ready, sent, signed, rejected)',
  })
  @ApiQuery({
    name: 'clientId',
    required: false,
    type: String,
    description: 'Filter by client ID',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['created', 'updated'],
    description: 'Sort by field (default: updated)',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Sort order (default: desc)',
  })
  @ApiResponse({
    status: 200,
    description: 'Proposals retrieved successfully',
    type: ProposalsListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @CurrentUser() user: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
    @Query('clientId') clientId?: string,
    @Query('sortBy') sortBy?: 'created' | 'updated',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ): Promise<ProposalsListResponseDto> {
    return this.proposalsService.findAll(
      user.tenantId,
      page,
      limit,
      status,
      clientId,
      sortBy,
      sortOrder,
    );
  }

  /**
   * Get single proposal details
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get single proposal details' })
  @ApiResponse({
    status: 200,
    description: 'Proposal retrieved successfully',
    type: ProposalResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Proposal not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ): Promise<ProposalResponseDto> {
    return this.proposalsService.findOne(user.tenantId, id);
  }

  /**
   * Get proposal generation status
   */
  @Get(':id/generation-status')
  @ApiOperation({ summary: 'Check proposal generation status' })
  @ApiResponse({
    status: 200,
    description: 'Generation status retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Proposal not found' })
  async getGenerationStatus(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ): Promise<{
    status: 'draft' | 'generating' | 'ready' | 'failed';
    progress?: number;
    error?: string;
  }> {
    return this.proposalsService.getGenerationStatus(user.tenantId, id);
  }

  /**
   * Update proposal content
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update proposal content' })
  @ApiResponse({
    status: 200,
    description: 'Proposal updated successfully',
    type: ProposalResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Proposal not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateProposalDto,
  ): Promise<ProposalResponseDto> {
    return this.proposalsService.update(user.tenantId, id, dto);
  }

  /**
   * Partially update proposal sections (executive, problem, solution, scope, timeline)
   */
  @Patch(':id/sections')
  @ApiOperation({ summary: 'Update specific proposal sections' })
  @ApiResponse({ status: 200, description: 'Sections updated', type: ProposalResponseDto })
  @ApiResponse({ status: 404, description: 'Proposal not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateSections(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateProposalSectionsDto,
  ): Promise<ProposalResponseDto> {
    return this.proposalsService.update(user.tenantId, id, dto as any);
  }

  /**
   * Update proposal pricing in isolation
   */
  @Patch(':id/pricing')
  @ApiOperation({ summary: 'Update proposal pricing' })
  @ApiResponse({ status: 200, description: 'Pricing updated', type: ProposalResponseDto })
  @ApiResponse({ status: 404, description: 'Proposal not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updatePricing(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateProposalPricingDto,
  ): Promise<ProposalResponseDto> {
    return this.proposalsService.updatePricing(user.tenantId, id, dto);
  }

  /**
   * Generate proposal content using AI
   * Queues a background job to generate specified sections
   */
  @Post(':id/generate')
  @ApiOperation({ summary: 'Generate proposal content using AI' })
  @ApiResponse({
    status: 202,
    description: 'AI generation job queued successfully',
    type: GenerateProposalResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Proposal not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async generateContent(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: GenerateProposalDto,
  ): Promise<GenerateProposalResponseDto> {
    return this.proposalsService.generateContent(user.tenantId, id, dto);
  }

  /**
   * Export proposal as PDF
   * Generates a PDF and returns a pre-signed download URL
   */
  @Post(':id/export-pdf')
  @ApiOperation({ summary: 'Export proposal as PDF' })
  @ApiResponse({
    status: 200,
    description: 'PDF generated successfully',
    type: ExportPdfResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Proposal has no content to export',
  })
  @ApiResponse({ status: 404, description: 'Proposal not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async exportPdf(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ): Promise<ExportPdfResponseDto> {
    return this.proposalsService.exportPdf(user.tenantId, id);
  }

  /**
   * Export proposal as Word document
   * Generates a .docx file and returns it as a downloadable attachment
   */
  @Get(':id/export/word')
  @ApiOperation({ summary: 'Export proposal as Word document' })
  @ApiResponse({
    status: 200,
    description: 'Word document generated successfully',
    content: {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Proposal has no content to export',
  })
  @ApiResponse({ status: 404, description: 'Proposal not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async exportWord(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const result = await this.proposalsService.exportWord(user.tenantId, id);

    // Get proposal title for filename
    const proposal = await this.proposalsService.findOne(user.tenantId, id);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${proposal.title}.docx"`,
    );
    res.send(result.buffer);
  }

  /**
   * Download proposal PDF (returns pre-signed URL)
   * Returns a pre-signed S3 URL for downloading the proposal PDF
   * Generates the PDF if it doesn't exist in S3 yet
   * @deprecated Use /proposals/:id/pdf for direct Blob download
   */
  @Get(':id/download-pdf')
  @ApiOperation({ summary: 'Download proposal PDF (returns URL)' })
  @ApiResponse({
    status: 200,
    description: 'Pre-signed download URL generated',
    type: ExportPdfResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Proposal has no content to export',
  })
  @ApiResponse({ status: 404, description: 'Proposal not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async downloadPdf(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ): Promise<ExportPdfResponseDto> {
    return this.proposalsService.downloadPdf(user.tenantId, id);
  }

  /**
   * Stream proposal PDF directly as Blob
   * Returns the PDF file bytes directly for Blob-based download
   * Generates the PDF if it doesn't exist in S3 yet
   * Frontend should use this with downloadPdfFromUrl() helper
   */
  @Get(':id/pdf')
  @ApiOperation({ summary: 'Stream proposal PDF as Blob' })
  @ApiResponse({
    status: 200,
    description: 'PDF file streamed successfully',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Proposal has no content to export',
  })
  @ApiResponse({ status: 404, description: 'Proposal not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Header('Content-Type', 'application/pdf')
  async streamPdf(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { buffer, filename } = await this.proposalsService.getPdfBuffer(
      user.tenantId,
      id,
    );

    // Set Content-Disposition header for download
    res.set({
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Type': 'application/pdf',
    });

    return new StreamableFile(buffer);
  }

  /**
   * Send proposal to client
   * Can optionally send via DocuSign for e-signature
   */
  @Post(':id/send')
  @ApiOperation({ summary: 'Send proposal to client' })
  @ApiResponse({
    status: 200,
    description: 'Proposal sent successfully',
    type: SendProposalResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Proposal has no content to send',
  })
  @ApiResponse({ status: 404, description: 'Proposal not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async send(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: SendProposalDto,
  ): Promise<SendProposalResponseDto> {
    return this.proposalsService.send(user.tenantId, id, dto);
  }

  @Post(':id/feedback')
  @ApiOperation({ summary: 'Submit feedback on AI-generated proposal (Phase 1: Enhanced with Validation)' })
  @ApiResponse({
    status: 200,
    description: 'Feedback submitted successfully with validation results',
  })
  @ApiResponse({ status: 404, description: 'Proposal not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async submitFeedback(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body()
    feedbackData: {
      userRating?: number;
      wasEdited?: boolean;
      editedVersion?: string;
      feedback?: string;
      outcome?: 'won_deal' | 'lost_deal' | 'no_response' | 'unclear';
      detailedRatings?: Record<string, number>;
      dealValue?: number;
    },
  ): Promise<{ success: boolean; message: string; validation?: any }> {
    return this.proposalsService.submitFeedback(
      user.tenantId,
      id,
      feedbackData,
    );
  }

  /**
   * Add a pricing option to the proposal
   */
  @Post(':id/pricing-option')
  @ApiOperation({ summary: 'Add a pricing option to the proposal' })
  @ApiResponse({
    status: 200,
    description: 'Pricing option added successfully',
  })
  @ApiResponse({ status: 404, description: 'Proposal not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async addPricingOption(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: any, // AddPricingOptionDto
  ): Promise<any> {
    return this.proposalsService.addPricingOption(user.tenantId, id, dto);
  }

  /**
   * Update send options for client view
   */
  @Patch(':id/send-options')
  @ApiOperation({ summary: 'Update send options for client view' })
  @ApiResponse({
    status: 200,
    description: 'Send options updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Proposal not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateSendOptions(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: any, // UpdateSendOptionsDto
  ): Promise<any> {
    return this.proposalsService.updateSendOptions(user.tenantId, id, dto);
  }

  /**
   * Agency signs the proposal
   */
  @Post(':id/agency-sign')
  @ApiOperation({ summary: 'Agency signs the proposal' })
  @ApiResponse({
    status: 200,
    description: 'Proposal signed by agency successfully',
  })
  @ApiResponse({ status: 404, description: 'Proposal not found' })
  @ApiResponse({
    status: 400,
    description: 'Proposal already signed by agency',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async agencySign(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: any, // AgencySignDto
  ): Promise<any> {
    return this.proposalsService.agencySign(user.tenantId, user.id, id, dto);
  }

  /**
   * Export proposal to Google Docs
   */
  @Post(':id/export-gdoc')
  @ApiOperation({ summary: 'Export proposal to Google Docs' })
  @ApiResponse({
    status: 200,
    description: 'Proposal exported to Google Docs successfully',
  })
  @ApiResponse({ status: 404, description: 'Proposal not found' })
  @ApiResponse({
    status: 400,
    description: 'Google account not connected or proposal has no content',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async exportGDoc(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ): Promise<any> {
    return this.proposalsService.exportGDoc(user.tenantId, user.id, id);
  }

  /**
   * Refresh existing Google Doc with updated proposal content
   * Clears existing document and rebuilds it with current proposal data
   */
  @Post(':id/refresh-gdoc')
  @ApiOperation({
    summary: 'Refresh existing Google Doc with updated proposal content',
  })
  @ApiResponse({
    status: 200,
    description: 'Google Doc refreshed successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Proposal not found or not previously exported to Google Docs',
  })
  @ApiResponse({
    status: 400,
    description: 'Google account not connected or proposal has no content',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async refreshGDoc(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ): Promise<any> {
    return this.proposalsService.refreshGDoc(user.tenantId, user.id, id);
  }

  /**
   * Import content from Google Doc and update proposal fields
   */
  @Post(':id/import-gdoc')
  @ApiOperation({ summary: 'Import content from Google Doc to proposal' })
  @ApiResponse({
    status: 200,
    description: 'Imported content from Google Doc successfully',
  })
  @ApiResponse({ status: 404, description: 'Proposal not found or no gdocId' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async importGDoc(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ): Promise<any> {
    return this.proposalsService.importFromGDoc(user.tenantId, user.id, id);
  }

  /**
   * Delete proposal
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete proposal' })
  @ApiResponse({
    status: 200,
    description: 'Proposal deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Proposal not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async delete(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ): Promise<any> {
    return this.proposalsService.delete(user.tenantId, id);
  }

  // ============================================================================
  // PRICING V2 ENDPOINTS (Narrative Pricing)
  // ============================================================================

  /**
   * Add pricing option to proposal
   */
  @Post(':id/pricing-options')
  @ApiOperation({ summary: 'Add pricing option to proposal' })
  @ApiResponse({
    status: 201,
    description: 'Pricing option created successfully',
  })
  @ApiResponse({ status: 404, description: 'Proposal not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async addPricingOptionV2(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: any, // CreatePricingOptionDto
  ): Promise<any> {
    return this.proposalsService.addPricingOptionV2(user.tenantId, id, dto);
  }

  /**
   * Update pricing option
   */
  @Patch(':id/pricing-options/:optionId')
  @ApiOperation({ summary: 'Update pricing option' })
  @ApiResponse({
    status: 200,
    description: 'Pricing option updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Pricing option not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updatePricingOptionV2(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('optionId') optionId: string,
    @Body() dto: any, // UpdatePricingOptionDto
  ): Promise<any> {
    return this.proposalsService.updatePricingOptionV2(
      user.tenantId,
      id,
      optionId,
      dto,
    );
  }

  /**
   * Delete pricing option
   */
  @Delete(':id/pricing-options/:optionId')
  @ApiOperation({ summary: 'Delete pricing option' })
  @ApiResponse({
    status: 200,
    description: 'Pricing option deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Pricing option not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deletePricingOptionV2(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('optionId') optionId: string,
  ): Promise<any> {
    return this.proposalsService.deletePricingOptionV2(
      user.tenantId,
      id,
      optionId,
    );
  }

  /**
   * Add line item to pricing option
   */
  @Post(':id/pricing-options/:optionId/line-items')
  @ApiOperation({ summary: 'Add line item to pricing option' })
  @ApiResponse({
    status: 201,
    description: 'Line item added successfully',
  })
  @ApiResponse({ status: 404, description: 'Pricing option not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async addLineItem(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('optionId') optionId: string,
    @Body() dto: any, // CreateLineItemDto
  ): Promise<any> {
    return this.proposalsService.addLineItem(user.tenantId, id, optionId, dto);
  }

  /**
   * Update line item
   */
  @Patch(':id/pricing-options/:optionId/line-items/:lineItemId')
  @ApiOperation({ summary: 'Update line item' })
  @ApiResponse({
    status: 200,
    description: 'Line item updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Line item not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateLineItem(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('optionId') optionId: string,
    @Param('lineItemId') lineItemId: string,
    @Body() dto: any, // UpdateLineItemDto
  ): Promise<any> {
    return this.proposalsService.updateLineItem(
      user.tenantId,
      id,
      optionId,
      lineItemId,
      dto,
    );
  }

  /**
   * Delete line item
   */
  @Delete(':id/pricing-options/:optionId/line-items/:lineItemId')
  @ApiOperation({ summary: 'Delete line item' })
  @ApiResponse({
    status: 200,
    description: 'Line item deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Line item not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteLineItem(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('optionId') optionId: string,
    @Param('lineItemId') lineItemId: string,
  ): Promise<any> {
    return this.proposalsService.deleteLineItem(
      user.tenantId,
      id,
      optionId,
      lineItemId,
    );
  }

  /**
   * Add pricing note to proposal
   */
  @Post(':id/pricing-notes')
  @ApiOperation({ summary: 'Add pricing note to proposal' })
  @ApiResponse({
    status: 201,
    description: 'Pricing note created successfully',
  })
  @ApiResponse({ status: 404, description: 'Proposal not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async addPricingNote(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: any, // CreatePricingNoteDto
  ): Promise<any> {
    return this.proposalsService.addPricingNote(user.tenantId, id, dto);
  }

  /**
   * Update pricing note
   */
  @Patch(':id/pricing-notes/:noteId')
  @ApiOperation({ summary: 'Update pricing note' })
  @ApiResponse({
    status: 200,
    description: 'Pricing note updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Pricing note not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updatePricingNote(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('noteId') noteId: string,
    @Body() dto: any, // UpdatePricingNoteDto
  ): Promise<any> {
    return this.proposalsService.updatePricingNote(
      user.tenantId,
      id,
      noteId,
      dto,
    );
  }

  /**
   * Delete pricing note
   */
  @Delete(':id/pricing-notes/:noteId')
  @ApiOperation({ summary: 'Delete pricing note' })
  @ApiResponse({
    status: 200,
    description: 'Pricing note deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Pricing note not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deletePricingNote(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('noteId') noteId: string,
  ): Promise<any> {
    return this.proposalsService.deletePricingNote(user.tenantId, id, noteId);
  }

  /**
   * Seed pricing blueprints (default templates)
   * NOTE: Must be defined before :id routes to avoid routing conflicts
   */
  @Post('pricing-blueprints/seed')
  @ApiOperation({ summary: 'Seed default pricing templates for tenant' })
  @ApiResponse({
    status: 201,
    description: 'Pricing blueprints seeded successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async seedPricingBlueprints(@CurrentUser() user: any): Promise<any> {
    return this.proposalsService.seedPricingBlueprints(user.tenantId);
  }

  /**
   * Get proposal revision history
   */
  @Get(':id/revisions')
  @ApiOperation({ summary: 'Get proposal revision history' })
  @ApiResponse({
    status: 200,
    description: 'Revision history retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Proposal not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getRevisions(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ): Promise<any> {
    return this.proposalsService.getRevisions(user.tenantId, id);
  }

  /**
   * Restore proposal from a revision
   */
  @Post(':id/restore/:revisionId')
  @ApiOperation({ summary: 'Restore proposal from a revision' })
  @ApiResponse({
    status: 200,
    description: 'Proposal restored from revision successfully',
  })
  @ApiResponse({ status: 404, description: 'Proposal or revision not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async restoreRevision(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('revisionId') revisionId: string,
  ): Promise<any> {
    return this.proposalsService.restoreRevision(
      user.tenantId,
      user.id,
      id,
      revisionId,
    );
  }

  /**
   * Create a revision snapshot of current proposal state
   */
  @Post(':id/revisions')
  @ApiOperation({ summary: 'Create a revision snapshot' })
  @ApiResponse({
    status: 201,
    description: 'Revision created successfully',
  })
  @ApiResponse({ status: 404, description: 'Proposal not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createRevision(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: { changeNote?: string },
  ): Promise<any> {
    return this.proposalsService.createRevision(
      user.tenantId,
      user.id,
      id,
      dto.changeNote,
    );
  }

  /**
   * Auto-fill all proposal sections from transcription and client data
   */
  @Post(':id/auto-fill')
  @ApiOperation({
    summary: 'Auto-fill all proposal sections using AI',
    description:
      'Extracts insights from transcription and client data to auto-populate all 6 sections: overview, executive summary, problem statement, proposed solution, scope, and pricing',
  })
  @ApiResponse({
    status: 200,
    description: 'Proposal sections auto-filled successfully',
    type: ProposalResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Proposal or transcription not found' })
  @ApiResponse({ status: 400, description: 'No transcription linked to proposal' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async autoFillProposal(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ): Promise<ProposalResponseDto> {
    return this.proposalsService.autoFillFromTranscription(
      user.tenantId,
      user.id,
      id,
    );
  }

  /**
   * Generate or regenerate a specific proposal section
   */
  @Post(':id/sections/:section/generate')
  @ApiOperation({
    summary: 'Generate or regenerate a specific section',
    description:
      'Generates content for a specific section (overview, executiveSummary, problemStatement, proposedSolution, scope, pricing) using AI',
  })
  @ApiResponse({
    status: 200,
    description: 'Section generated successfully',
  })
  @ApiResponse({ status: 404, description: 'Proposal not found' })
  @ApiResponse({
    status: 400,
    description: 'Invalid section name or missing required data',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async generateSection(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('section') section: string,
  ): Promise<any> {
    return this.proposalsService.generateSection(
      user.tenantId,
      user.id,
      id,
      section,
    );
  }
}
