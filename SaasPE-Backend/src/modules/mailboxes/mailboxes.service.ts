import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { EncryptionService } from '../../shared/services/encryption.service';
import { CloudWatchService } from '../../shared/services/cloudwatch.service';
import { CreateMailboxDto } from './dto/create-mailbox.dto';
import { UpdateMailboxDto } from './dto/update-mailbox.dto';
import {
  MailboxResponseDto,
  MailboxListResponseDto,
} from './dto/mailbox-response.dto';
import {
  BulkImportMailboxesDto,
  BulkImportResponseDto,
} from './dto/bulk-import.dto';
import { MailboxStatus, MailboxProvider, MailboxType } from '@prisma/client';

@Injectable()
export class MailboxesService {
  private readonly logger = new Logger(MailboxesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
    private readonly cloudwatchService: CloudWatchService,
  ) {}

  async create(
    tenantId: string,
    userId: string,
    createMailboxDto: CreateMailboxDto,
  ): Promise<MailboxResponseDto> {
    try {
      // Check if mailbox with this email already exists for this tenant
      const existing = await this.prisma.mailbox.findUnique({
        where: {
          tenantId_email: {
            tenantId,
            email: createMailboxDto.email,
          },
        },
      });

      if (existing) {
        throw new ConflictException(
          `Mailbox with email ${createMailboxDto.email} already exists`,
        );
      }

      // Validate based on provider
      if (createMailboxDto.provider === MailboxProvider.SMTP) {
        if (
          !createMailboxDto.smtpHost ||
          !createMailboxDto.smtpPort ||
          !createMailboxDto.smtpUsername ||
          !createMailboxDto.smtpPassword
        ) {
          throw new BadRequestException(
            'SMTP mailboxes require smtpHost, smtpPort, smtpUsername, and smtpPassword',
          );
        }
      }

      // Prepare data for creation
      const dataToCreate: any = {
        tenantId,
        userId,
        email: createMailboxDto.email,
        type: createMailboxDto.type || MailboxType.USER_PROVIDED,
        provider: createMailboxDto.provider,
        status: MailboxStatus.INACTIVE, // Will be activated after connection test
      };

      // Encrypt sensitive fields
      if (createMailboxDto.smtpPassword) {
        dataToCreate.smtpPassword = await this.encryptionService.encrypt(
          createMailboxDto.smtpPassword,
        );
      }

      if (createMailboxDto.oauthRefreshToken) {
        dataToCreate.oauthRefreshToken = await this.encryptionService.encrypt(
          createMailboxDto.oauthRefreshToken,
        );
      }

      if (createMailboxDto.oauthAccessToken) {
        dataToCreate.oauthAccessToken = await this.encryptionService.encrypt(
          createMailboxDto.oauthAccessToken,
        );
      }

      // Copy other OAuth fields
      if (createMailboxDto.oauthProvider) {
        dataToCreate.oauthProvider = createMailboxDto.oauthProvider;
      }
      if (createMailboxDto.oauthTokenExpiry) {
        dataToCreate.oauthTokenExpiry = createMailboxDto.oauthTokenExpiry;
      }
      if (createMailboxDto.oauthScopes) {
        dataToCreate.oauthScopes = createMailboxDto.oauthScopes;
      }

      // Copy SMTP fields
      if (createMailboxDto.smtpHost)
        dataToCreate.smtpHost = createMailboxDto.smtpHost;
      if (createMailboxDto.smtpPort)
        dataToCreate.smtpPort = createMailboxDto.smtpPort;
      if (createMailboxDto.smtpUsername)
        dataToCreate.smtpUsername = createMailboxDto.smtpUsername;
      if (createMailboxDto.smtpUseSsl !== undefined) {
        dataToCreate.smtpUseSsl = createMailboxDto.smtpUseSsl;
      }

      // Copy AWS SES fields
      if (createMailboxDto.awsSesIdentity) {
        dataToCreate.awsSesIdentity = createMailboxDto.awsSesIdentity;
      }
      if (createMailboxDto.awsSesRegion) {
        dataToCreate.awsSesRegion = createMailboxDto.awsSesRegion;
      }
      if (createMailboxDto.dedicatedIp) {
        dataToCreate.dedicatedIp = createMailboxDto.dedicatedIp;
      }

      const mailbox = await this.prisma.mailbox.create({
        data: dataToCreate,
      });

      this.logger.log(`Created mailbox ${mailbox.id} for tenant ${tenantId}`);

      // Track metric
      await this.cloudwatchService.trackCustomMetric(
        'MailboxCreated',
        1,
        'Count',
        {
          TenantId: tenantId,
          Provider: createMailboxDto.provider,
        },
      );

      return new MailboxResponseDto(mailbox);
    } catch (error) {
      this.logger.error(
        `Failed to create mailbox: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findAll(
    tenantId: string,
    page: number = 1,
    limit: number = 20,
    status?: string,
  ): Promise<MailboxListResponseDto> {
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (status) {
      where.status = status;
    }

    const [mailboxes, total] = await Promise.all([
      this.prisma.mailbox.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created: 'desc' },
      }),
      this.prisma.mailbox.count({ where }),
    ]);

    return {
      mailboxes: mailboxes.map((m) => new MailboxResponseDto(m)),
      total,
      page,
      limit,
    };
  }

  async findOne(tenantId: string, id: string): Promise<MailboxResponseDto> {
    const mailbox = await this.prisma.mailbox.findFirst({
      where: { id, tenantId },
    });

    if (!mailbox) {
      throw new NotFoundException(`Mailbox with ID ${id} not found`);
    }

    return new MailboxResponseDto(mailbox);
  }

  async update(
    tenantId: string,
    id: string,
    updateMailboxDto: UpdateMailboxDto,
  ): Promise<MailboxResponseDto> {
    try {
      const mailbox = await this.prisma.mailbox.findFirst({
        where: { id, tenantId },
      });

      if (!mailbox) {
        throw new NotFoundException(`Mailbox with ID ${id} not found`);
      }

      const dataToUpdate: any = {};

      // Encrypt sensitive fields if provided
      if (updateMailboxDto.smtpPassword) {
        dataToUpdate.smtpPassword = await this.encryptionService.encrypt(
          updateMailboxDto.smtpPassword,
        );
      }

      if (updateMailboxDto.oauthRefreshToken) {
        dataToUpdate.oauthRefreshToken = await this.encryptionService.encrypt(
          updateMailboxDto.oauthRefreshToken,
        );
      }

      if (updateMailboxDto.oauthAccessToken) {
        dataToUpdate.oauthAccessToken = await this.encryptionService.encrypt(
          updateMailboxDto.oauthAccessToken,
        );
      }

      // Copy other fields from DTO
      const nonEncryptedFields = [
        'email',
        'status',
        'provider',
        'type',
        'smtpHost',
        'smtpPort',
        'smtpUsername',
        'smtpUseSsl',
        'oauthProvider',
        'oauthTokenExpiry',
        'oauthScopes',
        'awsSesIdentity',
        'awsSesRegion',
        'dedicatedIp',
      ];

      nonEncryptedFields.forEach((field) => {
        if (updateMailboxDto[field] !== undefined) {
          dataToUpdate[field] = updateMailboxDto[field];
        }
      });

      const updated = await this.prisma.mailbox.update({
        where: { id },
        data: dataToUpdate,
      });

      this.logger.log(`Updated mailbox ${id} for tenant ${tenantId}`);

      return new MailboxResponseDto(updated);
    } catch (error) {
      this.logger.error(
        `Failed to update mailbox: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async delete(tenantId: string, id: string): Promise<void> {
    try {
      const mailbox = await this.prisma.mailbox.findFirst({
        where: { id, tenantId },
      });

      if (!mailbox) {
        throw new NotFoundException(`Mailbox with ID ${id} not found`);
      }

      await this.prisma.mailbox.delete({
        where: { id },
      });

      this.logger.log(`Deleted mailbox ${id} for tenant ${tenantId}`);

      // Track metric
      await this.cloudwatchService.trackCustomMetric(
        'MailboxDeleted',
        1,
        'Count',
        {
          TenantId: tenantId,
          Provider: mailbox.provider,
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to delete mailbox: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async testConnection(
    tenantId: string,
    id: string,
  ): Promise<{ success: boolean; message: string }> {
    const mailbox = await this.prisma.mailbox.findFirst({
      where: { id, tenantId },
    });

    if (!mailbox) {
      throw new NotFoundException(`Mailbox with ID ${id} not found`);
    }

    // TODO: Implement actual SMTP/IMAP connection testing
    // For now, return mock success
    return {
      success: true,
      message: 'Connection test successful',
    };
  }

  async bulkImport(
    tenantId: string,
    userId: string,
    bulkImportDto: BulkImportMailboxesDto,
  ): Promise<BulkImportResponseDto> {
    const importedIds: string[] = [];
    const errors: Array<{ email: string; error: string }> = [];
    let successCount = 0;
    let failureCount = 0;

    for (const mailboxData of bulkImportDto.mailboxes) {
      try {
        // Detect provider from email domain if not specified
        let provider: MailboxProvider = MailboxProvider.SMTP;
        if (mailboxData.email.endsWith('@gmail.com')) {
          provider = MailboxProvider.GMAIL;
        } else if (
          mailboxData.email.includes('@outlook.') ||
          mailboxData.email.includes('@hotmail.') ||
          mailboxData.email.includes('@live.')
        ) {
          provider = MailboxProvider.OUTLOOK;
        }

        // Create mailbox DTO
        const createDto: CreateMailboxDto = {
          email: mailboxData.email,
          type: MailboxType.USER_PROVIDED,
          provider,
          smtpHost: mailboxData.smtpHost,
          smtpPort: mailboxData.smtpPort,
          smtpUsername: mailboxData.smtpUsername || mailboxData.email,
          smtpPassword: mailboxData.smtpPassword,
        };

        const createdMailbox = await this.create(tenantId, userId, createDto);
        importedIds.push(createdMailbox.id);
        successCount++;
      } catch (error) {
        failureCount++;
        errors.push({
          email: mailboxData.email,
          error: error.message || 'Unknown error occurred',
        });
        this.logger.warn(
          `Failed to import mailbox ${mailboxData.email}: ${error.message}`,
        );
      }
    }

    this.logger.log(
      `Bulk import completed for tenant ${tenantId}: ${successCount} successful, ${failureCount} failed`,
    );

    // Track metric
    await this.cloudwatchService.trackCustomMetric(
      'BulkMailboxImport',
      successCount,
      'Count',
      {
        TenantId: tenantId,
        TotalCount: bulkImportDto.mailboxes.length.toString(),
        FailureCount: failureCount.toString(),
      },
    );

    return {
      successCount,
      failureCount,
      totalCount: bulkImportDto.mailboxes.length,
      errors,
      importedIds,
    };
  }
}
