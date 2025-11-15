import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { ContactsService } from '../contacts/contacts.service';
import {
  CreateClientDto,
  UpdateClientDto,
  ClientResponseDto,
  ClientsListResponseDto,
} from './dto';

/**
 * Clients Service
 *
 * Business logic for client management:
 * - Create clients (manual or AI-extracted)
 * - Retrieve clients with pagination
 * - Update client information
 * - Delete clients
 * - HubSpot CRM integration
 */
@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  constructor(
    private prisma: PrismaService,
    private contactsService: ContactsService,
  ) {}

  /**
   * Create a new client
   */
  async create(
    tenantId: string,
    userId: string,
    dto: CreateClientDto,
  ): Promise<ClientResponseDto> {
    this.logger.log(
      `Creating client for tenant ${tenantId}: ${dto.companyName}`,
    );

    // Check if client with same company name already exists for this tenant
    const existingClient = await this.prisma.client.findFirst({
      where: {
        tenantId,
        companyName: dto.companyName,
      },
    });

    if (existingClient) {
      throw new ConflictException(
        `Client with company name "${dto.companyName}" already exists`,
      );
    }

    // Create client
    const client = await this.prisma.client.create({
      data: {
        tenantId,
        companyName: dto.companyName,
        industry: dto.industry,
        website: dto.website,
        contactFirstName: dto.contactFirstName,
        contactLastName: dto.contactLastName,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
        contactLinkedIn: dto.contactLinkedIn,
        problemStatement: dto.problemStatement,
        currentTools: dto.currentTools || [],
        budget: dto.budget,
        timeline: dto.timeline,
        // Rich lead-intake fields
        budgetNote: dto.budgetNote,
        timelineNote: dto.timelineNote,
        additionalContacts: dto.additionalContacts as any,
        deliverablesLogistics: dto.deliverablesLogistics,
        keyMeetingsSchedule: dto.keyMeetingsSchedule,
        hubspotDealId: dto.hubspotDealId,
        status: dto.status || 'prospect',
      },
    });

    this.logger.log(`Client created: ${client.id}`);

    // Auto-create contacts if provided
    await this.createContactsFromDto(tenantId, dto, client.companyName);

    return this.mapToResponseDto(client);
  }

  /**
   * Get paginated list of clients
   */
  async findAll(
    tenantId: string,
    page: number = 1,
    limit: number = 20,
    status?: string,
  ): Promise<ClientsListResponseDto> {
    this.logger.log(`Fetching clients for tenant ${tenantId}`);

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = { tenantId };
    if (status) {
      where.status = status;
    }

    // Get total count and paginated data
    const [total, clients] = await Promise.all([
      this.prisma.client.count({ where }),
      this.prisma.client.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created: 'desc' },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: clients.map((c) => this.mapToResponseDto(c)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Get a single client by ID
   */
  async findOne(tenantId: string, id: string): Promise<ClientResponseDto> {
    this.logger.log(`Fetching client ${id} for tenant ${tenantId}`);

    const client = await this.prisma.client.findFirst({
      where: { id, tenantId },
      include: {
        transcriptions: {
          select: {
            id: true,
            fileName: true,
            status: true,
            created: true,
          },
          orderBy: { created: 'desc' },
          take: 5,
        },
        proposals: {
          select: {
            id: true,
            title: true,
            status: true,
            created: true,
          },
          orderBy: { created: 'desc' },
          take: 5,
        },
      },
    });

    if (!client) {
      throw new NotFoundException(`Client ${id} not found`);
    }

    return this.mapToResponseDto(client);
  }

  /**
   * Update a client
   */
  async update(
    tenantId: string,
    id: string,
    dto: UpdateClientDto,
  ): Promise<ClientResponseDto> {
    this.logger.log(`Updating client ${id} for tenant ${tenantId}`);

    // Ensure client exists and belongs to tenant
    const existing = await this.prisma.client.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundException(`Client ${id} not found`);
    }

    // Check for company name conflicts if companyName is being updated
    if (dto.companyName && dto.companyName !== existing.companyName) {
      const conflict = await this.prisma.client.findFirst({
        where: {
          tenantId,
          companyName: dto.companyName,
          id: { not: id },
        },
      });

      if (conflict) {
        throw new ConflictException(
          `Client with company name "${dto.companyName}" already exists`,
        );
      }
    }

    // Update client
    const client = await this.prisma.client.update({
      where: { id },
      data: {
        ...(dto.companyName !== undefined && { companyName: dto.companyName }),
        ...(dto.industry !== undefined && { industry: dto.industry }),
        ...(dto.website !== undefined && { website: dto.website }),
        ...(dto.contactFirstName !== undefined && {
          contactFirstName: dto.contactFirstName,
        }),
        ...(dto.contactLastName !== undefined && {
          contactLastName: dto.contactLastName,
        }),
        ...(dto.contactEmail !== undefined && {
          contactEmail: dto.contactEmail,
        }),
        ...(dto.contactPhone !== undefined && {
          contactPhone: dto.contactPhone,
        }),
        ...(dto.contactLinkedIn !== undefined && {
          contactLinkedIn: dto.contactLinkedIn,
        }),
        ...(dto.problemStatement !== undefined && {
          problemStatement: dto.problemStatement,
        }),
        ...(dto.currentTools !== undefined && {
          currentTools: dto.currentTools,
        }),
        ...(dto.budget !== undefined && { budget: dto.budget }),
        ...(dto.timeline !== undefined && { timeline: dto.timeline }),
        // Rich lead-intake fields (partial updates)
        ...(dto.budgetNote !== undefined && { budgetNote: dto.budgetNote }),
        ...(dto.timelineNote !== undefined && { timelineNote: dto.timelineNote }),
        ...(dto.additionalContacts !== undefined && {
          additionalContacts: dto.additionalContacts as any,
        }),
        ...(dto.deliverablesLogistics !== undefined && {
          deliverablesLogistics: dto.deliverablesLogistics,
        }),
        ...(dto.keyMeetingsSchedule !== undefined && {
          keyMeetingsSchedule: dto.keyMeetingsSchedule,
        }),
        ...(dto.hubspotDealId !== undefined && {
          hubspotDealId: dto.hubspotDealId,
        }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
    });

    this.logger.log(`Client updated: ${client.id}`);

    return this.mapToResponseDto(client);
  }

  /**
   * Delete a client
   */
  async delete(tenantId: string, id: string): Promise<void> {
    this.logger.log(`Deleting client ${id} for tenant ${tenantId}`);

    // Ensure client exists and belongs to tenant
    const client = await this.prisma.client.findFirst({
      where: { id, tenantId },
    });

    if (!client) {
      throw new NotFoundException(`Client ${id} not found`);
    }

    // Delete client (cascading deletes handled by Prisma schema)
    await this.prisma.client.delete({
      where: { id },
    });

    this.logger.log(`Client deleted: ${id}`);
  }

  /**
   * Map Prisma client to response DTO
   */
  private mapToResponseDto(client: any): ClientResponseDto {
    return {
      id: client.id,
      companyName: client.companyName,
      industry: client.industry,
      website: client.website,
      contactFirstName: client.contactFirstName,
      contactLastName: client.contactLastName,
      contactEmail: client.contactEmail,
      contactPhone: client.contactPhone,
      contactLinkedIn: client.contactLinkedIn,
      problemStatement: client.problemStatement,
      currentTools: client.currentTools,
      budget: client.budget,
      timeline: client.timeline,
      // Rich lead-intake fields
      budgetNote: client.budgetNote,
      timelineNote: client.timelineNote,
      additionalContacts: client.additionalContacts,
      deliverablesLogistics: client.deliverablesLogistics,
      keyMeetingsSchedule: client.keyMeetingsSchedule,
      hubspotDealId: client.hubspotDealId,
      status: client.status,
      created: client.created.toISOString(),
      updated: client.updated.toISOString(),
      ...(client.transcriptions && { transcriptions: client.transcriptions }),
      ...(client.proposals && { proposals: client.proposals }),
    };
  }

  /**
   * Create Contact entities from client DTO (primary and additional contacts)
   * Best-effort: errors are logged but do not block client creation
   */
  private async createContactsFromDto(
    tenantId: string,
    dto: CreateClientDto | UpdateClientDto,
    companyName?: string,
  ): Promise<void> {
    const contactsCreated: string[] = [];
    const contactsFailed: Array<{email: string, reason: string}> = [];
    const contactsSkipped: Array<{reason: string, data: any}> = [];
    const emailsSeen = new Set<string>();

    try {
      // Primary contact
      if (dto.contactEmail) {
        emailsSeen.add(dto.contactEmail.toLowerCase());
        try {
          await this.contactsService.create(tenantId, {
            email: dto.contactEmail,
            firstName: dto.contactFirstName,
            lastName: dto.contactLastName,
            company: companyName || undefined,
            customFields: {},
            tags: [],
            source: 'api',
          });
          contactsCreated.push(dto.contactEmail);
        } catch (error) {
          const reason = error.message || 'Unknown error';
          this.logger.warn(`Primary contact creation failed: ${dto.contactEmail}`, {reason});
          contactsFailed.push({email: dto.contactEmail, reason});
        }
      }

      // Additional contacts with deduplication
      const additional: any = (dto as any).additionalContacts;
      if (Array.isArray(additional)) {
        this.logger.log(`Processing ${additional.length} additional contacts`);

        for (const c of additional) {
          const email = c?.email || c?.Email || c?.contactEmail;

          // Dry-run mode: log missing emails without creating noise
          if (!email) {
            contactsSkipped.push({
              reason: 'missing_email',
              data: {
                firstName: c?.first_name || c?.firstName,
                lastName: c?.last_name || c?.lastName,
                role: c?.role_or_note
              }
            });
            continue;
          }

          // Deduplicate
          const emailLower = email.toLowerCase();
          if (emailsSeen.has(emailLower)) {
            this.logger.debug(`Skipping duplicate contact: ${email}`);
            contactsSkipped.push({reason: 'duplicate', data: {email}});
            continue;
          }
          emailsSeen.add(emailLower);

          try {
            await this.contactsService.create(tenantId, {
              email,
              firstName: c?.first_name || c?.firstName || undefined,
              lastName: c?.last_name || c?.lastName || undefined,
              company: companyName || undefined,
              customFields: {
                role: c?.role_or_note || c?.role || undefined,
              },
              tags: ['alt-contact'],
              source: 'api',
            });
            contactsCreated.push(email);
          } catch (error) {
            const reason = error.message || 'Unknown error';
            this.logger.warn(`Additional contact creation failed: ${email}`, {reason});
            contactsFailed.push({email, reason});
          }
        }
      }

      // Summary log
      this.logger.log('Contact creation summary', {
        total: additional?.length || 0,
        created: contactsCreated.length,
        failed: contactsFailed.length,
        skipped: contactsSkipped.length,
        createdEmails: contactsCreated,
        failures: contactsFailed,
        skippedReasons: contactsSkipped.reduce((acc, s) => {
          acc[s.reason] = (acc[s.reason] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      });
    } catch (err) {
      this.logger.warn(`Contact auto-creation failed: ${(err as Error).message}`);
    }
  }
}
