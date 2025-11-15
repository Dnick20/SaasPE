import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { OpenAIService } from '../../shared/services/openai.service';
import { Playbook } from '@prisma/client';
import {
  CreatePlaybookDto,
  UpdatePlaybookDto,
  PlaybookResponseDto,
  GenerateScriptsDto,
} from './dto';

/**
 * Playbooks Service
 *
 * Business logic for playbook management:
 * - Create playbooks with AI-generated scripts
 * - Retrieve playbooks by client
 * - Update playbook content
 * - Export playbooks to Google Docs/PDF
 * - Delete playbooks
 */
@Injectable()
export class PlaybooksService {
  private readonly logger = new Logger(PlaybooksService.name);

  constructor(
    private prisma: PrismaService,
    private openaiService: OpenAIService,
  ) {}

  /**
   * Create a new playbook for a client
   */
  async create(
    tenantId: string,
    dto: CreatePlaybookDto,
    userId: string,
  ): Promise<PlaybookResponseDto> {
    this.logger.log(
      `Creating playbook for tenant ${tenantId}, client ${dto.clientId}`,
    );

    // Verify client exists and belongs to tenant
    const client = await this.prisma.client.findFirst({
      where: {
        id: dto.clientId,
        tenantId,
      },
    });

    if (!client) {
      throw new NotFoundException(
        `Client not found or does not belong to this tenant`,
      );
    }

    // If proposalId provided, verify it exists and belongs to tenant
    if (dto.proposalId) {
      const proposal = await this.prisma.proposal.findFirst({
        where: {
          id: dto.proposalId,
          tenantId,
        },
      });

      if (!proposal) {
        throw new NotFoundException(
          `Proposal not found or does not belong to this tenant`,
        );
      }
    }

    // Create playbook
    const playbook = await this.prisma.playbook.create({
      data: {
        tenantId,
        clientId: dto.clientId,
        proposalId: dto.proposalId,
        targetICP: dto.targetICP,
        emailScript: dto.emailScript,
        linkedInScript: dto.linkedInScript,
        coldCallScript: dto.coldCallScript,
        tone: dto.tone,
        structure: dto.structure,
        ctas: dto.ctas,
        compliance: dto.compliance,
        campaignCount: dto.campaignCount || 1,
        campaignStrategy: dto.campaignStrategy,
        version: dto.version || 1,
        isTemplate: dto.isTemplate || false,
        createdBy: dto.createdBy || userId,
      },
    });

    this.logger.log(`Playbook created: ${playbook.id}`);

    return this.mapToResponseDto(playbook);
  }

  /**
   * Get all playbooks for a client
   */
  async findByClient(
    tenantId: string,
    clientId: string,
  ): Promise<PlaybookResponseDto[]> {
    this.logger.log(
      `Fetching playbooks for tenant ${tenantId}, client ${clientId}`,
    );

    // Verify client exists and belongs to tenant
    const client = await this.prisma.client.findFirst({
      where: {
        id: clientId,
        tenantId,
      },
    });

    if (!client) {
      throw new NotFoundException(
        `Client not found or does not belong to this tenant`,
      );
    }

    const playbooks = await this.prisma.playbook.findMany({
      where: {
        tenantId,
        clientId,
      },
      orderBy: {
        created: 'desc',
      },
    });

    return playbooks.map((p) => this.mapToResponseDto(p));
  }

  /**
   * Get all playbooks for a tenant
   */
  async findAll(tenantId: string): Promise<PlaybookResponseDto[]> {
    this.logger.log(`Fetching all playbooks for tenant ${tenantId}`);

    const playbooks = await this.prisma.playbook.findMany({
      where: {
        tenantId,
      },
      orderBy: {
        created: 'desc',
      },
    });

    return playbooks.map((p) => this.mapToResponseDto(p));
  }

  /**
   * Get a single playbook by ID
   */
  async findOne(tenantId: string, id: string): Promise<PlaybookResponseDto> {
    this.logger.log(`Fetching playbook ${id} for tenant ${tenantId}`);

    const playbook = await this.prisma.playbook.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!playbook) {
      throw new NotFoundException('Playbook not found');
    }

    return this.mapToResponseDto(playbook);
  }

  /**
   * Update a playbook
   */
  async update(
    tenantId: string,
    id: string,
    dto: UpdatePlaybookDto,
  ): Promise<PlaybookResponseDto> {
    this.logger.log(`Updating playbook ${id} for tenant ${tenantId}`);

    // Verify playbook exists and belongs to tenant
    const existingPlaybook = await this.prisma.playbook.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!existingPlaybook) {
      throw new NotFoundException('Playbook not found');
    }

    // Update playbook
    const playbook = await this.prisma.playbook.update({
      where: { id },
      data: {
        ...(dto.targetICP && { targetICP: dto.targetICP }),
        ...(dto.emailScript && { emailScript: dto.emailScript }),
        ...(dto.linkedInScript && { linkedInScript: dto.linkedInScript }),
        ...(dto.coldCallScript && { coldCallScript: dto.coldCallScript }),
        ...(dto.tone && { tone: dto.tone }),
        ...(dto.structure && { structure: dto.structure }),
        ...(dto.ctas && { ctas: dto.ctas }),
        ...(dto.compliance !== undefined && { compliance: dto.compliance }),
        ...(dto.campaignCount && { campaignCount: dto.campaignCount }),
        ...(dto.campaignStrategy && { campaignStrategy: dto.campaignStrategy }),
        ...(dto.googleDocUrl && { googleDocUrl: dto.googleDocUrl }),
        ...(dto.pdfS3Key && { pdfS3Key: dto.pdfS3Key }),
        ...(dto.pdfUrl && { pdfUrl: dto.pdfUrl }),
        ...(dto.version !== undefined && { version: dto.version }),
        ...(dto.isTemplate !== undefined && { isTemplate: dto.isTemplate }),
      },
    });

    this.logger.log(`Playbook updated: ${playbook.id}`);

    return this.mapToResponseDto(playbook);
  }

  /**
   * Delete a playbook
   */
  async delete(tenantId: string, id: string): Promise<void> {
    this.logger.log(`Deleting playbook ${id} for tenant ${tenantId}`);

    // Verify playbook exists and belongs to tenant
    const playbook = await this.prisma.playbook.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!playbook) {
      throw new NotFoundException('Playbook not found');
    }

    await this.prisma.playbook.delete({
      where: { id },
    });

    this.logger.log(`Playbook deleted: ${id}`);
  }

  /**
   * Generate scripts using AI
   */
  async generateScripts(dto: GenerateScriptsDto): Promise<{
    emailScript: {
      subject: string;
      body: string;
      ctaText: string;
      ctaUrl?: string;
      followUpSequence?: string[];
    };
    linkedInScript: {
      connectionRequest: string;
      firstMessage: string;
      followUpMessage: string;
    };
    coldCallScript: {
      opener: string;
      discovery: string[];
      objectionHandling: Record<string, string>;
      close: string;
    };
  }> {
    this.logger.log(
      `Generating AI scripts for ${dto.targetICP.industry || 'industry'} with ${dto.tone} tone`,
    );

    try {
      const scripts = await this.openaiService.generatePlaybookScripts({
        targetICP: dto.targetICP,
        tone: dto.tone,
        ctas: dto.ctas,
        clientContext: dto.clientContext,
      });

      // Ensure scripts match expected structure
      return {
        emailScript: {
          subject: scripts.emailScript?.subject || '',
          body: scripts.emailScript?.body || '',
          ctaText: scripts.emailScript?.ctaText || '',
          ctaUrl: scripts.emailScript?.ctaUrl,
          followUpSequence: scripts.emailScript?.followUpSequence || [],
        },
        linkedInScript: {
          connectionRequest: scripts.linkedInScript?.connectionRequest || '',
          firstMessage: scripts.linkedInScript?.firstMessage || '',
          followUpMessage: scripts.linkedInScript?.followUpMessage || '',
        },
        coldCallScript: {
          opener: scripts.coldCallScript?.opener || '',
          discovery: scripts.coldCallScript?.discovery || [],
          objectionHandling: scripts.coldCallScript?.objectionHandling || {},
          close: scripts.coldCallScript?.close || '',
        },
      };
    } catch (error) {
      this.logger.error('Failed to generate scripts:', error);
      throw new BadRequestException(
        'Failed to generate scripts. Please try again.',
      );
    }
  }

  /**
   * Map Prisma playbook to response DTO
   */
  private mapToResponseDto(playbook: Playbook): PlaybookResponseDto {
    return {
      id: playbook.id,
      tenantId: playbook.tenantId,
      clientId: playbook.clientId,
      proposalId: playbook.proposalId ?? undefined,
      targetICP: playbook.targetICP as Record<string, any>,
      emailScript: playbook.emailScript as Record<string, any>,
      linkedInScript: playbook.linkedInScript as Record<string, any>,
      coldCallScript: playbook.coldCallScript as Record<string, any>,
      tone: playbook.tone,
      structure: playbook.structure as Record<string, any>,
      ctas: playbook.ctas,
      compliance: playbook.compliance as Record<string, any> | undefined,
      campaignCount: playbook.campaignCount,
      campaignStrategy: playbook.campaignStrategy as Record<string, any>,
      googleDocUrl: playbook.googleDocUrl ?? undefined,
      pdfS3Key: playbook.pdfS3Key ?? undefined,
      pdfUrl: playbook.pdfUrl ?? undefined,
      version: (playbook.version as number | null) ?? 1,
      isTemplate: (playbook.isTemplate as boolean | null) ?? false,
      createdBy: playbook.createdBy as string,
      created: playbook.created,
      updated: playbook.updated,
    };
  }
}
