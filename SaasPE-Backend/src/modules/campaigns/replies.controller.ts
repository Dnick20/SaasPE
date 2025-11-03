import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  RepliesService,
  type PaginatedRepliesResponse,
} from './replies.service';

@ApiTags('replies')
@Controller('replies')
@UseGuards(JwtAuthGuard)
export class RepliesController {
  constructor(private readonly repliesService: RepliesService) {}

  /**
   * GET /replies
   * List all replies with filtering and pagination
   */
  @Get()
  @ApiOperation({ summary: 'Get all replies' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'classification',
    required: false,
    enum: ['interested', 'not_interested', 'out_of_office', 'unsubscribe'],
  })
  @ApiQuery({ name: 'campaignId', required: false, type: String })
  async findAll(
    @Request() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('classification') classification?: string,
    @Query('campaignId') campaignId?: string,
  ): Promise<PaginatedRepliesResponse> {
    const { tenantId } = req.user;

    return this.repliesService.findAll(tenantId, page, limit, {
      classification: classification as any,
      campaignId,
    });
  }

  /**
   * GET /replies/stats
   * Get reply statistics
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get reply statistics' })
  @ApiQuery({ name: 'campaignId', required: false, type: String })
  async getStats(@Request() req, @Query('campaignId') campaignId?: string) {
    const { tenantId } = req.user;
    return this.repliesService.getStats(tenantId, campaignId);
  }

  /**
   * GET /replies/:id
   * Get single reply by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get reply by ID' })
  @ApiResponse({ status: 200, description: 'Reply found' })
  @ApiResponse({ status: 404, description: 'Reply not found' })
  async findOne(@Request() req, @Param('id') id: string) {
    const { tenantId } = req.user;
    return this.repliesService.findOne(tenantId, id);
  }

  /**
   * PATCH /replies/:id/classify
   * Update reply classification manually
   */
  @Patch(':id/classify')
  @ApiOperation({ summary: 'Update reply classification' })
  @ApiResponse({ status: 200, description: 'Classification updated' })
  @ApiResponse({ status: 404, description: 'Reply not found' })
  async updateClassification(
    @Request() req,
    @Param('id') id: string,
    @Body()
    body: {
      classification:
        | 'interested'
        | 'not_interested'
        | 'out_of_office'
        | 'unsubscribe';
    },
  ) {
    const { tenantId } = req.user;
    return this.repliesService.updateClassification(
      tenantId,
      id,
      body.classification,
    );
  }

  /**
   * POST /replies/:id/generate-response
   * Generate AI-suggested response to a reply
   */
  @Post(':id/generate-response')
  @ApiOperation({ summary: 'Generate AI response suggestion' })
  @ApiResponse({ status: 200, description: 'Response generated' })
  @ApiResponse({ status: 404, description: 'Reply not found' })
  async generateResponse(@Request() req, @Param('id') id: string) {
    const { tenantId } = req.user;
    return this.repliesService.generateResponse(tenantId, id);
  }

  /**
   * POST /replies/batch-classify
   * Batch classify unclassified replies using AI
   */
  @Post('batch-classify')
  @ApiOperation({ summary: 'Batch classify unclassified replies' })
  @ApiResponse({ status: 200, description: 'Batch classification completed' })
  async batchClassify(@Request() req, @Body() body: { limit?: number }) {
    const { tenantId } = req.user;
    return this.repliesService.batchClassifyReplies(tenantId, body.limit || 50);
  }
}
