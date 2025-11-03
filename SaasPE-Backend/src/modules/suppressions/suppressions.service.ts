import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';

@Injectable()
export class SuppressionsService {
  private readonly logger = new Logger(SuppressionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(
    tenantId: string,
    opts: { type?: string; q?: string; page?: number; limit?: number },
  ) {
    const { type, q, page = 1, limit = 50 } = opts || {};
    const where: any = { tenantId };
    if (type) where.type = type;
    if (q) where.email = { contains: q, mode: 'insensitive' };

    const [rows, total] = await Promise.all([
      this.prisma.suppression.findMany({
        where,
        orderBy: { created: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.suppression.count({ where }),
    ]);

    return {
      data: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async add(tenantId: string, email: string, type: string, reason?: string) {
    const row = await this.prisma.suppression.create({
      data: {
        tenantId,
        email: email.toLowerCase(),
        type,
        reason,
        source: 'manual',
      },
    });

    // Keep DNC in sync for unsubscribes
    if (type === 'unsubscribe') {
      await this.prisma.doNotContact.upsert({
        where: { tenantId_email: { tenantId, email: email.toLowerCase() } },
        create: { tenantId, email: email.toLowerCase(), reason: 'unsubscribe', source: 'suppressions' },
        update: { reason: 'unsubscribe', source: 'suppressions' },
      });
    }

    return row;
  }

  async remove(tenantId: string, id: string) {
    const row = await this.prisma.suppression.findFirst({ where: { id, tenantId } });
    if (!row) return { deleted: false };
    await this.prisma.suppression.delete({ where: { id } });
    return { deleted: true };
  }

  async bulkImport(
    tenantId: string,
    entries: Array<{ email: string; type: string; reason?: string }>,
  ) {
    let success = 0;
    let failed = 0;
    for (const e of entries) {
      try {
        await this.add(tenantId, e.email, e.type, e.reason);
        success++;
      } catch (error) {
        failed++;
        this.logger.error(`Failed to import suppression for ${e.email}: ${error.message}`);
      }
    }
    return { success, failed, total: entries.length };
  }

  async exportCsv(tenantId: string, type?: string) {
    const where: any = { tenantId };
    if (type) where.type = type;
    const rows = await this.prisma.suppression.findMany({ where, orderBy: { created: 'desc' } });
    const header = 'email,type,source,reason,created\n';
    const body = rows
      .map((r) => `${r.email},${r.type},${r.source || ''},${(r.reason || '').replace(/\n/g, ' ')},${r.created.toISOString()}`)
      .join('\n');
    return header + body + '\n';
  }
}


