import {
  Controller,
  Post,
  Get,
  Param,
  Patch,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  ParseIntPipe,
  DefaultValuePipe,
  UsePipes,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TranscriptionsService } from './transcriptions.service';
import {
  UploadTranscriptionDto,
  TranscriptionResponseDto,
  TranscriptionsListResponseDto,
  AnalyzeResponseDto,
} from './dto';

/**
 * Transcriptions Controller
 *
 * Endpoints:
 * - POST /transcriptions - Upload audio/video for transcription or text file with pre-transcribed content
 * - GET /transcriptions - List all transcriptions
 * - GET /transcriptions/:id - Get single transcription
 * - POST /transcriptions/:id/analyze - Trigger AI analysis
 */
@Controller('transcriptions')
@ApiTags('Transcriptions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TranscriptionsController {
  constructor(private transcriptionsService: TranscriptionsService) {}

  /**
   * Upload meeting recording or transcript for analysis
   * Audio/video files are uploaded to S3 and queued for transcription
   * Text files (.txt) are processed directly as transcripts
   */
  @Post()
  @ApiOperation({ summary: 'Upload meeting recording or pre-transcribed text' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description:
      'File uploaded successfully, transcription queued or completed',
    type: TranscriptionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // Allow extra fields for multipart uploads
      transform: true,
      skipMissingProperties: true, // Skip validation if fields are missing
    }),
  )
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 2 * 1024 * 1024 * 1024, // 2GB limit
      },
    }),
  )
  async uploadTranscription(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto?: UploadTranscriptionDto,
  ): Promise<TranscriptionResponseDto> {
    console.log('=== UPLOAD ENDPOINT HIT ===');
    console.log('User:', { tenantId: user.tenantId, userId: user.id });
    console.log(
      'File:',
      file
        ? { name: file.originalname, size: file.size, type: file.mimetype }
        : 'NO FILE',
    );
    console.log('DTO:', dto);
    console.log('========================');

    return this.transcriptionsService.uploadTranscription(
      user.tenantId,
      user.id,
      file,
      dto?.clientId,
      dto?.fileName,
    );
  }

  /**
   * List all transcriptions for the tenant
   */
  @Get()
  @ApiOperation({ summary: 'List all transcriptions for the tenant' })
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
    description: 'Filter by status (uploaded, processing, completed, failed)',
  })
  @ApiQuery({
    name: 'clientId',
    required: false,
    type: String,
    description: 'Filter by client ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Transcriptions retrieved successfully',
    type: TranscriptionsListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @CurrentUser() user: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
    @Query('clientId') clientId?: string,
  ): Promise<TranscriptionsListResponseDto> {
    return this.transcriptionsService.findAll(
      user.tenantId,
      page,
      limit,
      status,
      clientId,
    );
  }

  /**
   * Get single transcription details
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get single transcription details' })
  @ApiResponse({
    status: 200,
    description: 'Transcription retrieved successfully',
    type: TranscriptionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Transcription not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ): Promise<TranscriptionResponseDto> {
    return this.transcriptionsService.findOne(user.tenantId, id);
  }

  /**
   * Trigger AI analysis on completed transcription
   * Uses GPT-4 to extract structured data (client details, problem statement, budget, etc.)
   */
  @Post(':id/analyze')
  @ApiOperation({ summary: 'Trigger AI analysis on completed transcription' })
  @ApiResponse({
    status: 202,
    description: 'Analysis job queued successfully',
    type: AnalyzeResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Transcription not ready for analysis',
  })
  @ApiResponse({ status: 404, description: 'Transcription not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async analyzeTranscription(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ): Promise<AnalyzeResponseDto> {
    return this.transcriptionsService.analyzeTranscription(user.tenantId, id);
  }

  /**
   * Create a proposal from transcription
   * Creates a proposal and auto-generates content using AI based on the transcription
   */
  @Post(':id/create-proposal')
  @ApiOperation({ summary: 'Create and generate proposal from transcription' })
  @ApiResponse({
    status: 201,
    description: 'Proposal created and generation queued',
  })
  @ApiResponse({
    status: 400,
    description: 'Transcription not ready or no client associated',
  })
  @ApiResponse({ status: 404, description: 'Transcription not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createProposal(@CurrentUser() user: any, @Param('id') id: string) {
    return this.transcriptionsService.createProposal(
      user.tenantId,
      user.id,
      id,
    );
  }

  /**
   * Update learning fields (wonBusiness, isExample)
   * Used to mark transcriptions for AI learning and improvement
   */
  @Patch(':id/learning')
  @ApiOperation({ summary: 'Update learning fields for transcription' })
  @ApiResponse({
    status: 200,
    description: 'Learning fields updated successfully',
    type: TranscriptionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Transcription not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateLearning(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { wonBusiness?: boolean; isExample?: boolean },
  ): Promise<TranscriptionResponseDto> {
    return this.transcriptionsService.updateLearning(user.tenantId, id, body);
  }

  /**
   * Associate a client with a transcription
   * Used to link a client to an existing transcription
   */
  @Patch(':id/client')
  @ApiOperation({ summary: 'Associate a client with a transcription' })
  @ApiResponse({
    status: 200,
    description: 'Client associated successfully',
    type: TranscriptionResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Transcription or client not found',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async associateClient(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { clientId: string },
  ): Promise<TranscriptionResponseDto> {
    return this.transcriptionsService.associateClient(
      user.tenantId,
      id,
      body.clientId,
    );
  }

  /**
   * Extract client contact information from transcription using AI
   * Uses GPT-3.5-turbo for cost-effective extraction
   */
  @Post(':id/extract-client-info')
  @ApiOperation({
    summary: 'Extract client contact info from transcription using AI',
  })
  @ApiResponse({
    status: 200,
    description: 'Client contact info extracted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Transcription has no transcript text',
  })
  @ApiResponse({ status: 404, description: 'Transcription not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async extractClientInfo(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ): Promise<any> {
    return this.transcriptionsService.extractClientInfo(user.tenantId, id);
  }

  /**
   * Delete a transcription
   * Deletes the transcription record and associated S3 file
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a transcription' })
  @ApiResponse({
    status: 204,
    description: 'Transcription deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Transcription not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async delete(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ): Promise<void> {
    return this.transcriptionsService.delete(user.tenantId, id);
  }
}
