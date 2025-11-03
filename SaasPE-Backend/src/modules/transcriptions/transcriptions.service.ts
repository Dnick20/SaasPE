import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import * as mammoth from 'mammoth';
import { PrismaService } from '../../shared/database/prisma.service';
import { S3Service } from '../../shared/services/s3.service';
import { OpenAIService } from '../../shared/services/openai.service';
import { TokensService } from '../tokens/tokens.service';
import {
  TranscriptionResponseDto,
  TranscriptionsListResponseDto,
  AnalyzeResponseDto,
} from './dto';

/**
 * Transcriptions Service
 *
 * Business logic for transcription management:
 * - File upload and S3 storage
 * - Queueing transcription jobs
 * - Queueing analysis jobs
 * - Retrieving transcription data
 */
@Injectable()
export class TranscriptionsService {
  private readonly logger = new Logger(TranscriptionsService.name);

  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service,
    private openaiService: OpenAIService,
    private tokensService: TokensService,
    @InjectQueue('transcription') private transcriptionQueue: Queue,
    @InjectQueue('proposal') private proposalQueue: Queue,
  ) {}

  /**
   * Upload a file and create a transcription record
   * The file is uploaded to S3, then a background job is queued for transcription
   */
  async uploadTranscription(
    tenantId: string,
    userId: string,
    file: Express.Multer.File,
    clientId?: string,
    fileNameOverride?: string,
  ): Promise<TranscriptionResponseDto> {
    this.logger.log(
      `Uploading transcription for tenant ${tenantId}: ${file.originalname}`,
    );

    // Validate file type
    const allowedMimeTypes = [
      // Audio formats
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/webm',
      'audio/mp4',
      'audio/m4a',
      // Video formats
      'video/mp4',
      'video/mpeg',
      'video/webm',
      // Text formats (for pre-transcribed content)
      'text/plain', // .txt
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type: ${file.mimetype}. Supported: audio/video files (mp3, wav, mp4, etc.) or text files (.txt, .doc, .docx)`,
      );
    }

    // Validate file size (max 2GB as per spec)
    const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
    if (file.size > maxSize) {
      throw new BadRequestException(
        `File too large: ${file.size} bytes. Maximum: 2GB`,
      );
    }

    // Validate client exists if provided
    if (clientId) {
      const client = await this.prisma.client.findFirst({
        where: { id: clientId, tenantId },
      });

      if (!client) {
        throw new NotFoundException(`Client ${clientId} not found`);
      }
    }

    // Check if this is a text file (already transcribed)
    const textMimeTypes = [
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ];
    const isTextFile = textMimeTypes.includes(file.mimetype);

    // Token consumption - estimate based on file size for audio/video
    if (!isTextFile) {
      // Estimate duration from file size (rough estimate: 1MB ~= 1 minute for compressed audio)
      const estimatedMinutes = Math.ceil(file.size / (1024 * 1024));
      const actionType =
        estimatedMinutes > 45
          ? 'transcription_upload_60min'
          : 'transcription_upload_30min';

      // Check and consume tokens
      await this.tokensService.consumeTokens({
        tenantId,
        actionType,
        metadata: {
          fileName: file.originalname,
          fileSize: file.size,
          estimatedMinutes,
        },
      });
    }

    try {
      const fileName = fileNameOverride || file.originalname;

      if (isTextFile) {
        // Handle text files - extract content and store directly as transcript
        this.logger.log(
          `Processing text file ${fileName} - extracting transcript directly`,
        );

        let textContent: string;

        if (file.mimetype === 'text/plain') {
          // Plain text file - read directly
          textContent = file.buffer.toString('utf-8');
        } else if (
          file.mimetype ===
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          file.mimetype === 'application/msword'
        ) {
          // Word document (.docx or .doc) - use mammoth to extract text
          try {
            const result = await mammoth.extractRawText({
              buffer: file.buffer,
            });
            textContent = result.value;

            if (result.messages.length > 0) {
              this.logger.warn(
                `Mammoth warnings for ${fileName}:`,
                result.messages,
              );
            }
          } catch (error) {
            this.logger.error(
              `Failed to extract text from Word document:`,
              error,
            );
            throw new BadRequestException(
              'Failed to extract text from Word document. Please ensure the file is not corrupted.',
            );
          }
        } else {
          throw new BadRequestException('Unsupported text file format');
        }

        // Validate we got some content
        if (!textContent || textContent.trim().length === 0) {
          throw new BadRequestException(
            'The uploaded file appears to be empty. Please upload a file with content.',
          );
        }

        // Create database record with transcript already populated
        const transcription = await this.prisma.transcription.create({
          data: {
            tenantId,
            userId,
            clientId,
            fileName,
            fileSize: file.size,
            fileType: file.mimetype,
            s3Key: null,
            s3Bucket: null,
            transcript: textContent.trim(),
            status: 'completed',
            completed: new Date(),
            analyzed: false,
          },
        });

        this.logger.log(
          `Text transcription ${transcription.id} created with ${textContent.length} characters`,
        );

        return this.mapToDto(transcription);
      } else {
        // Handle audio/video files - upload to S3 and queue for transcription
        this.logger.log(
          `Starting S3 upload for ${fileName} (${Math.round(file.size / 1024 / 1024)}MB)`,
        );

        let s3Key: string;
        try {
          s3Key = await this.s3Service.uploadFile(
            tenantId,
            file.buffer,
            fileName,
            file.mimetype,
            'transcriptions',
          );
          this.logger.log(`S3 upload successful: ${s3Key}`);
        } catch (s3Error) {
          this.logger.error(`S3 upload failed for ${fileName}:`, s3Error);
          throw new BadRequestException(
            `Failed to upload file to storage: ${s3Error.message || 'Unknown error'}`,
          );
        }

        // Create database record
        const s3Bucket = this.s3Service['bucketName']; // Access bucket name
        const transcription = await this.prisma.transcription.create({
          data: {
            tenantId,
            userId,
            clientId,
            fileName,
            fileSize: file.size,
            fileType: file.mimetype,
            s3Key,
            s3Bucket,
            status: 'uploaded',
          },
        });

        // Queue transcription job
        const job = await this.transcriptionQueue.add('transcribe', {
          transcriptionId: transcription.id,
          tenantId,
          s3Key,
          fileName,
        });

        // Update with job ID
        await this.prisma.transcription.update({
          where: { id: transcription.id },
          data: { jobId: String(job.id) },
        });

        this.logger.log(
          `Transcription ${transcription.id} uploaded. Job ${job.id} queued.`,
        );

        return this.mapToDto(transcription);
      }
    } catch (error) {
      this.logger.error(`Failed to upload transcription:`, error);
      throw error;
    }
  }

  /**
   * Get all transcriptions for a tenant with pagination and filters
   */
  async findAll(
    tenantId: string,
    page: number = 1,
    limit: number = 20,
    status?: string,
    clientId?: string,
  ): Promise<TranscriptionsListResponseDto> {
    // Validate pagination
    if (page < 1) page = 1;
    if (limit < 1 || limit > 100) limit = 20;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = { tenantId };
    if (status) where.status = status;
    if (clientId) where.clientId = clientId;

    // Get total count
    const total = await this.prisma.transcription.count({ where });

    // Get paginated data
    const transcriptions = await this.prisma.transcription.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created: 'desc' },
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
      data: transcriptions.map((t) => this.mapToDto(t)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single transcription by ID
   */
  async findOne(
    tenantId: string,
    id: string,
  ): Promise<TranscriptionResponseDto> {
    const transcription = await this.prisma.transcription.findFirst({
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

    if (!transcription) {
      throw new NotFoundException(`Transcription ${id} not found`);
    }

    return this.mapToDto(transcription);
  }

  /**
   * Trigger AI analysis on a completed transcription
   * Queues a background job to analyze the transcript with GPT-4
   */
  async analyzeTranscription(
    tenantId: string,
    id: string,
  ): Promise<AnalyzeResponseDto> {
    const transcription = await this.prisma.transcription.findFirst({
      where: { id, tenantId },
    });

    if (!transcription) {
      throw new NotFoundException(`Transcription ${id} not found`);
    }

    // Validate transcription is completed
    if (transcription.status !== 'completed') {
      throw new BadRequestException(
        `Cannot analyze transcription with status: ${transcription.status}. Must be completed.`,
      );
    }

    if (!transcription.transcript) {
      throw new BadRequestException(
        'Transcription has no transcript text to analyze',
      );
    }

    // Consume tokens for analysis (extract key moments + generate summary)
    await this.tokensService.consumeTokens({
      tenantId,
      actionType: 'extract_key_moments',
      metadata: {
        transcriptionId: transcription.id,
        fileName: transcription.fileName,
      },
    });

    // Queue analysis job
    const job = await this.transcriptionQueue.add('analyze', {
      transcriptionId: transcription.id,
      tenantId,
    });

    this.logger.log(
      `Analysis job ${job.id} queued for transcription ${transcription.id}`,
    );

    return {
      id: transcription.id,
      status: 'analyzing',
      jobId: String(job.id),
    };
  }

  /**
   * Create a proposal from a transcription
   * Creates a proposal and automatically queues AI generation
   */
  async createProposal(
    tenantId: string,
    userId: string,
    transcriptionId: string,
  ) {
    // Get transcription with client info
    const transcription = await this.prisma.transcription.findFirst({
      where: { id: transcriptionId, tenantId },
      include: {
        client: true,
      },
    });

    if (!transcription) {
      throw new NotFoundException(`Transcription ${transcriptionId} not found`);
    }

    // Validate transcription has a client associated
    if (!transcription.clientId) {
      throw new BadRequestException(
        'Transcription must have a client associated to create a proposal',
      );
    }

    // Validate transcription is completed
    if (transcription.status !== 'completed' || !transcription.transcript) {
      throw new BadRequestException(
        'Transcription must be completed with transcript text to create a proposal',
      );
    }

    // Create proposal title from client name and date
    const proposalTitle = `${transcription.client!.companyName} - Proposal ${new Date().toLocaleDateString()}`;

    // Create proposal
    const proposal = await this.prisma.proposal.create({
      data: {
        tenantId,
        userId,
        clientId: transcription.clientId,
        transcriptionId: transcription.id,
        title: proposalTitle,
        status: 'generating',
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

    this.logger.log(
      `Proposal ${proposal.id} created from transcription ${transcriptionId}`,
    );

    // Queue AI generation job with all standard sections
    const job = await this.proposalQueue.add(
      'generate-proposal-from-transcription',
      {
        proposalId: proposal.id,
        tenantId,
        sections: [
          'executiveSummary',
          'problemStatement',
          'proposedSolution',
          'scope',
          'timeline',
          'pricing',
        ],
      },
    );

    this.logger.log(
      `Proposal generation job ${job.id} queued for proposal ${proposal.id}`,
    );

    return {
      id: proposal.id,
      clientId: proposal.clientId,
      client: proposal.client,
      title: proposal.title,
      status: 'generating',
      jobId: String(job.id),
      message: 'Proposal created and AI generation started',
    };
  }

  /**
   * Update transcription learning fields (wonBusiness, isExample)
   */
  async updateLearning(
    tenantId: string,
    id: string,
    data: { wonBusiness?: boolean; isExample?: boolean },
  ): Promise<TranscriptionResponseDto> {
    const transcription = await this.prisma.transcription.findFirst({
      where: { id, tenantId },
    });

    if (!transcription) {
      throw new NotFoundException(`Transcription ${id} not found`);
    }

    const updated = await this.prisma.transcription.update({
      where: { id },
      data,
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
    });

    this.logger.log(
      `Transcription ${id} learning fields updated: ${JSON.stringify(data)}`,
    );

    return this.mapToDto(updated);
  }

  /**
   * Associate a client with a transcription
   */
  async associateClient(
    tenantId: string,
    id: string,
    clientId: string,
  ): Promise<TranscriptionResponseDto> {
    const transcription = await this.prisma.transcription.findFirst({
      where: { id, tenantId },
    });

    if (!transcription) {
      throw new NotFoundException(`Transcription ${id} not found`);
    }

    // Verify client exists and belongs to the same tenant
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, tenantId },
    });

    if (!client) {
      throw new NotFoundException(`Client ${clientId} not found`);
    }

    const updated = await this.prisma.transcription.update({
      where: { id },
      data: { clientId },
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
    });

    this.logger.log(`Transcription ${id} associated with client ${clientId}`);

    return this.mapToDto(updated);
  }

  /**
   * Extract comprehensive lead intake data from transcription using AI
   * Uses GPT-4o-mini with structured outputs for comprehensive extraction
   */
  async extractClientInfo(tenantId: string, id: string): Promise<any> {
    const transcription = await this.prisma.transcription.findFirst({
      where: { id, tenantId },
    });

    if (!transcription) {
      throw new NotFoundException(`Transcription ${id} not found`);
    }

    // Validate transcription has transcript text
    if (!transcription.transcript) {
      throw new BadRequestException(
        'Transcription has no transcript text to extract from',
      );
    }

    this.logger.log(`Extracting lead intake data from transcription ${id}`);

    // Call OpenAI service to extract comprehensive lead intake
    const leadIntake = await this.openaiService.extractLeadIntake(
      transcription.transcript,
    );

    this.logger.log(`Lead intake extracted from transcription ${id}`);

    // Store provenance data in transcription's extractedData
    if (leadIntake.provenance) {
      await this.prisma.transcription.update({
        where: { id },
        data: {
          extractedData: {
            ...(transcription.extractedData as any),
            provenance: leadIntake.provenance,
          },
        },
      });
    }

    return leadIntake;
  }

  /**
   * Delete a transcription
   */
  async delete(tenantId: string, id: string): Promise<void> {
    const transcription = await this.prisma.transcription.findFirst({
      where: { id, tenantId },
    });

    if (!transcription) {
      throw new NotFoundException(`Transcription ${id} not found`);
    }

    // Delete the file from S3 if it exists
    if (transcription.s3Key && transcription.s3Bucket) {
      try {
        await this.s3Service.deleteFile(transcription.s3Key);
        this.logger.log(`Deleted S3 file: ${transcription.s3Key}`);
      } catch (error) {
        this.logger.error(
          `Failed to delete S3 file: ${transcription.s3Key}`,
          error,
        );
        // Continue with database deletion even if S3 deletion fails
      }
    }

    // Delete from database
    await this.prisma.transcription.delete({
      where: { id },
    });

    this.logger.log(`Transcription ${id} deleted successfully`);
  }

  /**
   * Map database entity to DTO
   */
  private mapToDto(transcription: any): TranscriptionResponseDto {
    return {
      id: transcription.id,
      fileName: transcription.fileName,
      fileSize: transcription.fileSize,
      duration: transcription.duration,
      status: transcription.status,
      s3Key: transcription.s3Key,
      transcript: transcription.transcript,
      confidence: transcription.confidence,
      language: transcription.language,
      analyzed: transcription.analyzed,
      extractedData: transcription.extractedData,
      wonBusiness: transcription.wonBusiness,
      isExample: transcription.isExample,
      salesTips: transcription.salesTips,
      created: transcription.created.toISOString(),
      completed: transcription.completed?.toISOString(),
      error: transcription.error,
    };
  }
}
