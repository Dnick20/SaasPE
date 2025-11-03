import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuid } from 'uuid';
import { Readable } from 'stream';

/**
 * S3 Service
 *
 * Handles all AWS S3 operations:
 * - File uploads with pre-signed URLs
 * - File downloads
 * - File deletion
 * - Pre-signed URL generation for client-side uploads
 */
@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;

  constructor(private config: ConfigService) {
    this.region = this.config.get('AWS_REGION') || 'us-east-1';
    this.bucketName = this.config.get('AWS_S3_BUCKET') || 'saaspe-uploads';

    const accessKeyId = this.config.get('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get('AWS_SECRET_ACCESS_KEY');

    if (!accessKeyId || !secretAccessKey) {
      this.logger.warn(
        'AWS credentials not configured. S3 features will not work.',
      );
    }

    this.s3Client = new S3Client({
      region: this.region,
      credentials:
        accessKeyId && secretAccessKey
          ? {
              accessKeyId,
              secretAccessKey,
            }
          : undefined,
    });

    this.logger.log(`S3 Service initialized with bucket: ${this.bucketName}`);
  }

  /**
   * Generate a pre-signed URL for client-side file upload
   * This allows the frontend to upload directly to S3 without going through the backend
   */
  async getPresignedUploadUrl(
    tenantId: string,
    fileName: string,
    fileType: string,
    expiresIn: number = 3600, // 1 hour
  ): Promise<{ uploadUrl: string; s3Key: string }> {
    const fileExtension = fileName.split('.').pop();
    const s3Key = `${tenantId}/transcriptions/${uuid()}.${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
      ContentType: fileType,
      Metadata: {
        tenantId,
        originalFileName: fileName,
      },
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn,
    });

    this.logger.log(
      `Generated pre-signed upload URL for ${fileName} (tenant: ${tenantId})`,
    );

    return {
      uploadUrl,
      s3Key,
    };
  }

  /**
   * Upload a file buffer directly to S3
   * Used for server-side uploads (e.g., generated PDFs)
   */
  async uploadFile(
    tenantId: string,
    fileBuffer: Buffer,
    fileName: string,
    contentType: string,
    folder: string = 'files',
  ): Promise<string> {
    const fileExtension = fileName.split('.').pop();
    const s3Key = `${tenantId}/${folder}/${uuid()}.${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: contentType,
      Metadata: {
        tenantId,
        originalFileName: fileName,
      },
    });

    await this.s3Client.send(command);

    this.logger.log(
      `Uploaded file ${fileName} to S3 (key: ${s3Key}, tenant: ${tenantId})`,
    );

    return s3Key;
  }

  /**
   * Download a file from S3 as a buffer
   * Used for processing files (e.g., transcription)
   */
  async downloadFile(s3Key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
    });

    const response = await this.s3Client.send(command);

    // Convert stream to buffer
    const stream = response.Body as Readable;
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  /**
   * Generate a pre-signed URL for downloading a file
   * Used for temporary access to private files (e.g., PDF downloads)
   */
  async getPresignedDownloadUrl(
    s3Key: string,
    expiresIn: number = 3600, // 1 hour
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
    });

    const downloadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn,
    });

    this.logger.log(`Generated pre-signed download URL for ${s3Key}`);

    return downloadUrl;
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(s3Key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
    });

    await this.s3Client.send(command);

    this.logger.log(`Deleted file from S3: ${s3Key}`);
  }

  /**
   * Get the public URL for a file (if bucket is public)
   * Note: Our bucket is private, so use getPresignedDownloadUrl instead
   */
  getPublicUrl(s3Key: string): string {
    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${s3Key}`;
  }
}
