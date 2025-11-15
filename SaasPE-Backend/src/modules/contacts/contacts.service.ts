import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import {
  CreateContactDto,
  UpdateContactDto,
  BulkImportContactsDto,
} from './dto';

@Injectable()
export class ContactsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new contact with email deduplication
   */
  async create(tenantId: string, dto: CreateContactDto) {
    // Check tenant's contact limit
    await this.checkContactLimit(tenantId);

    // Check for existing contact (deduplication)
    const existing = await this.prisma.contact.findUnique({
      where: {
        tenantId_email: {
          tenantId,
          email: dto.email.toLowerCase(),
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Contact with email ${dto.email} already exists. Use update instead.`,
      );
    }

    return this.prisma.contact.create({
      data: {
        tenantId,
        email: dto.email.toLowerCase(),
        firstName: dto.firstName,
        lastName: dto.lastName,
        company: dto.company,
        customFields: dto.customFields || {},
        tags: dto.tags || [],
        source: dto.source,
        status: 'active',
      },
    });
  }

  /**
   * Bulk import contacts with deduplication
   */
  async bulkImport(tenantId: string, dto: BulkImportContactsDto) {
    const { contacts, skipDuplicates = true } = dto;

    // Check tenant's contact limit
    await this.checkContactLimit(tenantId, contacts.length);

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const contact of contacts) {
      try {
        const email = contact.email.toLowerCase();

        // Check for existing contact
        const existing = await this.prisma.contact.findUnique({
          where: {
            tenantId_email: {
              tenantId,
              email,
            },
          },
        });

        if (existing) {
          if (skipDuplicates) {
            results.skipped++;
          } else {
            // Update existing contact
            await this.prisma.contact.update({
              where: { id: existing.id },
              data: {
                firstName: contact.firstName || existing.firstName,
                lastName: contact.lastName || existing.lastName,
                company: contact.company || existing.company,
                customFields:
                  contact.customFields ||
                  (existing.customFields as Record<string, any>),
                tags: contact.tags || existing.tags,
                source: contact.source || existing.source,
              },
            });
            results.updated++;
          }
        } else {
          // Create new contact
          await this.prisma.contact.create({
            data: {
              tenantId,
              email,
              firstName: contact.firstName,
              lastName: contact.lastName,
              company: contact.company,
              customFields: contact.customFields || {},
              tags: contact.tags || [],
              source: contact.source,
              status: 'active',
            },
          });
          results.created++;
        }
      } catch (error) {
        results.errors.push(
          `Failed to import ${contact.email}: ${error.message}`,
        );
      }
    }

    return results;
  }

  /**
   * Get all contacts for a tenant with pagination and filtering
   */
  async findAll(
    tenantId: string,
    options?: {
      page?: number;
      limit?: number;
      status?: string;
      tags?: string[];
      search?: string;
    },
  ) {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.tags && options.tags.length > 0) {
      where.tags = { hasSome: options.tags };
    }

    if (options?.search) {
      where.OR = [
        { email: { contains: options.search, mode: 'insensitive' } },
        { firstName: { contains: options.search, mode: 'insensitive' } },
        { lastName: { contains: options.search, mode: 'insensitive' } },
        { company: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const [contacts, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created: 'desc' },
      }),
      this.prisma.contact.count({ where }),
    ]);

    return {
      data: contacts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find a contact by ID
   */
  async findOne(tenantId: string, id: string) {
    const contact = await this.prisma.contact.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    return contact;
  }

  /**
   * Update a contact
   */
  async update(tenantId: string, id: string, dto: UpdateContactDto) {
    // Verify contact exists and belongs to tenant
    await this.findOne(tenantId, id);

    // If email is being updated, check for duplicates
    if (dto.email) {
      const existing = await this.prisma.contact.findFirst({
        where: {
          tenantId,
          email: dto.email.toLowerCase(),
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException(
          `Another contact with email ${dto.email} already exists`,
        );
      }
    }

    return this.prisma.contact.update({
      where: { id },
      data: {
        email: dto.email?.toLowerCase(),
        firstName: dto.firstName,
        lastName: dto.lastName,
        company: dto.company,
        customFields: dto.customFields,
        tags: dto.tags,
        source: dto.source,
        status: dto.status,
      },
    });
  }

  /**
   * Delete a contact
   */
  async remove(tenantId: string, id: string) {
    // Verify contact exists and belongs to tenant
    await this.findOne(tenantId, id);

    await this.prisma.contact.delete({
      where: { id },
    });

    return { success: true, message: 'Contact deleted successfully' };
  }

  /**
   * Check if tenant has reached contact limit
   */
  private async checkContactLimit(
    tenantId: string,
    additionalContacts: number = 1,
  ) {
    // Get tenant with subscription plan
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
      },
    });

    if (!tenant || !tenant.subscription) {
      throw new BadRequestException('Tenant subscription not found');
    }

    const contactLimit = tenant.subscription.plan.contactLimit;

    // Count current contacts
    const currentCount = await this.prisma.contact.count({
      where: { tenantId },
    });

    if (currentCount + additionalContacts > contactLimit) {
      throw new BadRequestException(
        `Contact limit reached. Your plan allows ${contactLimit} contacts. You currently have ${currentCount}.`,
      );
    }
  }

  /**
   * Get contact statistics
   */
  async getStats(tenantId: string) {
    const [total, active, unsubscribed, bounced, bySource] = await Promise.all([
      this.prisma.contact.count({ where: { tenantId } }),
      this.prisma.contact.count({ where: { tenantId, status: 'active' } }),
      this.prisma.contact.count({
        where: { tenantId, status: 'unsubscribed' },
      }),
      this.prisma.contact.count({ where: { tenantId, status: 'bounced' } }),
      this.prisma.contact.groupBy({
        by: ['source'],
        where: { tenantId },
        _count: true,
      }),
    ]);

    return {
      total,
      active,
      unsubscribed,
      bounced,
      bySource: bySource.map((item) => ({
        source: item.source || 'unknown',
        count: item._count,
      })),
    };
  }
}
