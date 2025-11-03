import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { PrismaService } from '../../../shared/database/prisma.service';
import { S3Service } from '../../../shared/services/s3.service';
import { OpenAIService } from '../../../shared/services/openai.service';
import { ContactsService } from '../../contacts/contacts.service';

interface TranscriptionJobData {
  transcriptionId: string;
  tenantId: string;
  s3Key: string;
  fileName: string;
}

interface AnalysisJobData {
  transcriptionId: string;
  tenantId: string;
}

/**
 * Transcription Processor
 *
 * Handles background jobs for:
 * 1. Audio/video transcription with OpenAI Whisper
 * 2. AI analysis of transcripts with GPT-4
 *
 * Uses Bull queue for reliable job processing with retries
 */
@Processor('transcription')
export class TranscriptionProcessor {
  private readonly logger = new Logger(TranscriptionProcessor.name);

  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service,
    private openaiService: OpenAIService,
    private contactsService: ContactsService,
  ) {}

  /**
   * Process transcription job
   * Downloads file from S3, transcribes with Whisper, saves result
   */
  @Process('transcribe')
  async handleTranscription(job: Job<TranscriptionJobData>) {
    const { transcriptionId, tenantId, s3Key, fileName } = job.data;

    this.logger.log(
      `Starting transcription job ${job.id} for transcription ${transcriptionId}`,
    );

    try {
      // Update status to processing
      await this.prisma.transcription.update({
        where: { id: transcriptionId },
        data: { status: 'processing' },
      });

      // Step 1: Download file from S3
      this.logger.log(`Downloading file from S3: ${s3Key}`);
      const fileBuffer = await this.s3Service.downloadFile(s3Key);

      // Step 2: Transcribe with OpenAI Whisper
      this.logger.log(`Transcribing audio with Whisper API`);
      const transcriptionResult = await this.openaiService.transcribeAudio(
        fileBuffer,
        fileName,
      );

      // Step 3: Calculate cost (approximate based on duration)
      // Whisper pricing: $0.006 per minute
      const durationMinutes = transcriptionResult.duration / 60;
      const transcriptionCost = durationMinutes * 0.006;

      // Step 4: Update database with results
      await this.prisma.transcription.update({
        where: { id: transcriptionId },
        data: {
          status: 'completed',
          transcript: transcriptionResult.text,
          confidence: transcriptionResult.confidence,
          language: transcriptionResult.language,
          duration: transcriptionResult.duration,
          transcriptionCost,
          completed: new Date(),
        },
      });

      this.logger.log(
        `Transcription job ${job.id} completed successfully. Duration: ${transcriptionResult.duration}s`,
      );

      return {
        success: true,
        transcriptionId,
        duration: transcriptionResult.duration,
      };
    } catch (error) {
      this.logger.error(
        `Transcription job ${job.id} failed for transcription ${transcriptionId}:`,
        error,
      );

      // Update database with error
      await this.prisma.transcription.update({
        where: { id: transcriptionId },
        data: {
          status: 'failed',
          error: error.message || 'Transcription failed',
        },
      });

      throw error; // Re-throw to trigger job retry
    }
  }

  /**
   * Process analysis job
   * Analyzes completed transcript with GPT-4 to extract structured data
   */
  @Process('analyze')
  async handleAnalysis(job: Job<AnalysisJobData>): Promise<any> {
    const { transcriptionId, tenantId } = job.data;

    this.logger.log(
      `Starting analysis job ${job.id} for transcription ${transcriptionId}`,
    );

    try {
      // Step 1: Get transcription
      const transcription = await this.prisma.transcription.findUnique({
        where: { id: transcriptionId },
      });

      if (!transcription) {
        throw new Error(`Transcription ${transcriptionId} not found`);
      }

      if (!transcription.transcript) {
        throw new Error(
          `Transcription ${transcriptionId} has no transcript text`,
        );
      }

      // Step 2: Analyze with GPT-4
      this.logger.log(`Analyzing transcript with GPT-4 API`);
      const analysisResult = await this.openaiService.analyzeTranscript(
        transcription.transcript,
      );

      // Step 2.5: Extract key moments and sales insights
      this.logger.log(`Extracting key moments and sales insights`);
      const keyMomentsResult = await this.openaiService.extractKeyMoments(
        transcription.transcript,
      );

      // Step 3: Calculate cost (approximate based on tokens)
      // GPT-4 Turbo pricing: ~$0.01 per 1K input tokens, ~$0.03 per 1K output tokens
      // Rough estimate: 1 char ≈ 0.25 tokens
      // Note: We're making 2 GPT-4 calls now (analysis + key moments)
      const inputTokens = transcription.transcript.length * 0.25 * 2; // 2 calls
      const outputTokens =
        (JSON.stringify(analysisResult).length +
          JSON.stringify(keyMomentsResult).length) *
        0.25;
      const analysisCost =
        (inputTokens / 1000) * 0.01 + (outputTokens / 1000) * 0.03;

      // Step 4: Update database with analysis results and key moments
      await this.prisma.transcription.update({
        where: { id: transcriptionId },
        data: {
          analyzed: true,
          extractedData: analysisResult as any,
          aiConfidence: analysisResult.confidence,
          salesTips: keyMomentsResult, // Store key moments in salesTips field
          analysisCost,
        },
      });

      // Step 5: If company name was extracted, check if client exists or create one
      if (analysisResult.companyName) {
        const existingClient = await this.prisma.client.findFirst({
          where: {
            tenantId,
            companyName: analysisResult.companyName,
          },
        });

        if (!existingClient) {
          this.logger.log(
            `Creating new client from transcript: ${analysisResult.companyName}`,
          );

          const newClient = await this.prisma.client.create({
            data: {
              tenantId,
              companyName: analysisResult.companyName,
              industry: analysisResult.industry,
              status: 'prospect',
            },
          });

          // Link transcription to new client
          await this.prisma.transcription.update({
            where: { id: transcriptionId },
            data: { clientId: newClient.id },
          });
        }
      }

      // Step 6: Extract lead intake data and auto-create contacts
      try {
        this.logger.log(
          `Extracting lead intake data from transcription ${transcriptionId}`,
        );
        const leadIntake = await this.openaiService.extractLeadIntake(
          transcription.transcript,
        );

        // Create contacts from lead intake data
        await this.createContactsFromLeadIntake(tenantId, leadIntake);
      } catch (error) {
        // Log error but don't fail the entire job if contact creation fails
        this.logger.error(
          `Failed to extract lead intake or create contacts for transcription ${transcriptionId}:`,
          error,
        );
      }

      this.logger.log(`Analysis job ${job.id} completed successfully`);

      return {
        success: true,
        transcriptionId,
        analysisResult,
      };
    } catch (error) {
      this.logger.error(
        `Analysis job ${job.id} failed for transcription ${transcriptionId}:`,
        error,
      );

      // Update database with error (but keep analyzed = false)
      await this.prisma.transcription.update({
        where: { id: transcriptionId },
        data: {
          error: `Analysis failed: ${error.message}`,
        },
      });

      throw error; // Re-throw to trigger job retry
    }
  }

  /**
   * Create contacts from lead intake data
   * Extracts primary_contact and alt_contacts and creates them if they don't exist
   */
  private async createContactsFromLeadIntake(
    tenantId: string,
    leadIntake: any,
  ): Promise<void> {
    const contactsToCreate: Array<{
      email: string;
      firstName?: string;
      lastName?: string;
      company?: string;
      customFields?: any;
    }> = [];

    // Add primary contact if email exists
    if (leadIntake.primary_contact?.email) {
      contactsToCreate.push({
        email: leadIntake.primary_contact.email,
        firstName: leadIntake.primary_contact.first_name,
        lastName: leadIntake.primary_contact.last_name,
        company: leadIntake.company?.name,
        customFields: {
          phone: leadIntake.primary_contact.phone,
          linkedinUrl: leadIntake.primary_contact.linkedin_url,
          isPrimaryContact: true,
        },
      });
    }

    // Add alternative contacts if they have emails
    if (leadIntake.alt_contacts && Array.isArray(leadIntake.alt_contacts)) {
      for (const altContact of leadIntake.alt_contacts) {
        if (altContact.email) {
          contactsToCreate.push({
            email: altContact.email,
            firstName: altContact.first_name,
            lastName: altContact.last_name,
            company: leadIntake.company?.name,
            customFields: {
              role: altContact.role_or_note,
            },
          });
        }
      }
    }

    // Create each contact if it doesn't already exist
    let created = 0;
    let skipped = 0;

    for (const contactData of contactsToCreate) {
      try {
        // Check if contact already exists
        const existing = await this.prisma.contact.findUnique({
          where: {
            tenantId_email: {
              tenantId,
              email: contactData.email.toLowerCase(),
            },
          },
        });

        if (existing) {
          this.logger.log(
            `Contact with email ${contactData.email} already exists, skipping`,
          );
          skipped++;
          continue;
        }

        // Create new contact with source="api" to indicate AI-created
        await this.contactsService.create(tenantId, {
          email: contactData.email,
          firstName: contactData.firstName,
          lastName: contactData.lastName,
          company: contactData.company,
          customFields: contactData.customFields,
          source: 'api',
        });

        this.logger.log(
          `Created contact from AI extraction: ${contactData.email}`,
        );
        created++;
      } catch (error) {
        // Log error but continue with other contacts
        this.logger.error(
          `Failed to create contact ${contactData.email}:`,
          error.message,
        );
      }
    }

    this.logger.log(
      `Contact creation from lead intake complete: ${created} created, ${skipped} skipped`,
    );
  }
}
