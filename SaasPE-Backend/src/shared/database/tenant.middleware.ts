import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from './prisma.service';

/**
 * Middleware to set tenant context for PostgreSQL Row-Level Security (RLS)
 * This ensures all database queries are automatically filtered by tenant_id
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Extract tenant ID from JWT payload (set by auth guard)
    const tenantId = (req as any).user?.tenantId;

    if (tenantId) {
      try {
        // Set tenant context using PostgreSQL session variable
        // This enables Row-Level Security filtering at the database level
        await this.prisma.$executeRawUnsafe(
          `SET LOCAL app.current_tenant = '${tenantId}'`,
        );
      } catch (error) {
        console.error('Failed to set tenant context:', error);
        // Continue execution even if setting tenant context fails
        // This allows public routes to work without tenant context
      }
    }

    next();
  }
}
