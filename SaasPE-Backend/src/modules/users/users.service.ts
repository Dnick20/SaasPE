import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { User, Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new user
   */
  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }

  /**
   * Find user by email (unique identifier for login)
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        tenant: true,
      },
    });
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        tenant: true,
      },
    });
  }

  /**
   * Find user by Google ID (OAuth)
   */
  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { googleId },
      include: {
        tenant: true,
      },
    });
  }

  /**
   * Find user by Microsoft ID (OAuth)
   */
  async findByMicrosoftId(microsoftId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { microsoftId },
      include: {
        tenant: true,
      },
    });
  }

  /**
   * Update user details
   */
  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  /**
   * Update user's last login timestamp
   */
  async updateLastLogin(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { lastLogin: new Date() },
    });
  }

  /**
   * Delete user (soft delete by changing status)
   */
  async delete(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { status: 'suspended' },
    });
  }

  /**
   * Find all users in a tenant (for team management)
   */
  async findByTenantId(tenantId: string): Promise<User[]> {
    return this.prisma.user.findMany({
      where: { tenantId },
      orderBy: { created: 'desc' },
    });
  }
}
