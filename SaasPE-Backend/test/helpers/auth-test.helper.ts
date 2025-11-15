import { PrismaClient, Tenant, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';

export interface TestTenantData {
  tenant: Tenant;
  adminUser: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  role: string;
}

export class AuthTestHelper {
  private prisma: PrismaClient;
  private jwtService: JwtService;
  private readonly BCRYPT_SALT_ROUNDS = 12;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.jwtService = new JwtService({
      secret: process.env.JWT_SECRET || 'test-secret-key',
    });
  }

  /**
   * Create a test tenant with admin user
   */
  async createTestTenant(options?: {
    agencyName?: string;
    email?: string;
    password?: string;
    plan?: string;
  }): Promise<TestTenantData> {
    const agencyName = options?.agencyName || `Test Agency ${uuidv4().substring(0, 8)}`;
    const email = options?.email || `test-${uuidv4().substring(0, 8)}@example.com`;
    const password = options?.password || 'TestPassword123!@#';
    const plan = options?.plan || 'professional';

    // Hash password
    const passwordHash = await bcrypt.hash(password, this.BCRYPT_SALT_ROUNDS);

    // Create tenant and admin user in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Get subscription plan
      const subscriptionPlan = await tx.subscriptionPlan.findUnique({
        where: { name: plan },
      });

      if (!subscriptionPlan) {
        throw new Error(`Subscription plan '${plan}' not found`);
      }

      // Create tenant
      const tenant = await tx.tenant.create({
        data: {
          name: agencyName,
          plan: plan,
          status: 'trial',
          usedThisMonth: {},
          settings: {},
        },
      });

      // Create subscription for tenant
      const now = new Date();
      await tx.tenantSubscription.create({
        data: {
          tenantId: tenant.id,
          planId: subscriptionPlan.id,
          status: 'trial',
          billingInterval: 'monthly',
          isTrialing: true,
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
          tokenBalance: subscriptionPlan.monthlyTokens,
          monthlyAllocation: subscriptionPlan.monthlyTokens,
          monthlyPrice: subscriptionPlan.monthlyPrice,
          overageTokenCost: subscriptionPlan.overageTokenCost,
          currentPeriodStart: now,
          currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      });

      // Create admin user
      const user = await tx.user.create({
        data: {
          email: email,
          passwordHash: passwordHash,
          firstName: 'Test',
          lastName: 'User',
          role: 'admin',
          status: 'active',
          tenantId: tenant.id,
          preferences: {},
        },
      });

      return { tenant, user };
    });

    // Generate tokens
    const tokens = this.generateTokens(result.user);

    return {
      tenant: result.tenant,
      adminUser: result.user,
      tokens,
    };
  }

  /**
   * Create a test user for an existing tenant
   */
  async createTestUser(
    tenantId: string,
    options?: {
      email?: string;
      password?: string;
      role?: 'admin' | 'member';
      firstName?: string;
      lastName?: string;
    },
  ): Promise<User> {
    const email = options?.email || `user-${uuidv4().substring(0, 8)}@example.com`;
    const password = options?.password || 'TestPassword123!@#';
    const passwordHash = await bcrypt.hash(password, this.BCRYPT_SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: email,
        passwordHash: passwordHash,
        firstName: options?.firstName || 'Test',
        lastName: options?.lastName || 'User',
        role: options?.role || 'member',
        status: 'active',
        tenantId: tenantId,
        preferences: {},
      },
    });

    return user;
  }

  /**
   * Generate JWT access and refresh tokens for a user
   */
  generateTokens(user: User): {
    accessToken: string;
    refreshToken: string;
  } {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: process.env.JWT_ACCESS_EXPIRATION || '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
    });

    return { accessToken, refreshToken };
  }

  /**
   * Verify and decode a JWT token
   */
  verifyToken(token: string): JwtPayload {
    try {
      return this.jwtService.verify<JwtPayload>(token);
    } catch (error) {
      throw new Error(`Invalid token: ${error.message}`);
    }
  }

  /**
   * Generate a bearer authorization header
   */
  getBearerToken(accessToken: string): string {
    return `Bearer ${accessToken}`;
  }

  /**
   * Hash a password (useful for testing password validation)
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.BCRYPT_SALT_ROUNDS);
  }

  /**
   * Compare a password with its hash
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Clean up auth-related test data for a specific tenant
   */
  async cleanupTenantData(tenantId: string): Promise<void> {
    // Delete in order to handle foreign key constraints
    await this.prisma.tokenTransaction.deleteMany({ where: { tenantId } });
    await this.prisma.transcription.deleteMany({ where: { tenantId } });
    await this.prisma.proposalPricingLineItem.deleteMany({ where: { proposal: { tenantId } } });
    await this.prisma.proposalPricingOption.deleteMany({ where: { proposal: { tenantId } } });
    await this.prisma.proposalRevision.deleteMany({ where: { proposal: { tenantId } } });
    await this.prisma.proposal.deleteMany({ where: { tenantId } });
    await this.prisma.userJourney.deleteMany({ where: { tenantId } });
    await this.prisma.companyProfile.deleteMany({ where: { tenantId } });
    await this.prisma.client.deleteMany({ where: { tenantId } });
    await this.prisma.campaignEmail.deleteMany({ where: { campaign: { tenantId } } });
    await this.prisma.campaign.deleteMany({ where: { tenantId } });
    await this.prisma.mailbox.deleteMany({ where: { tenantId } });
    await this.prisma.tenantSubscription.deleteMany({ where: { tenantId } });
    await this.prisma.tenantEmailCredits.deleteMany({ where: { tenantId } });
    await this.prisma.emailCreditTransaction.deleteMany({ where: { tenantId } });
    await this.prisma.user.deleteMany({ where: { tenantId } });
    await this.prisma.tenant.delete({ where: { id: tenantId } });
  }

  /**
   * Clean up a specific user
   */
  async cleanupUser(userId: string): Promise<void> {
    await this.prisma.user.delete({ where: { id: userId } });
  }

  /**
   * Get a user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  /**
   * Get a user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  /**
   * Update user status
   */
  async updateUserStatus(userId: string, status: 'active' | 'suspended' | 'inactive'): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { status },
    });
  }

  /**
   * Create multiple test users for testing bulk operations
   */
  async createMultipleTestUsers(
    tenantId: string,
    count: number,
  ): Promise<User[]> {
    const users: User[] = [];

    for (let i = 0; i < count; i++) {
      const user = await this.createTestUser(tenantId, {
        email: `bulk-user-${i}-${uuidv4().substring(0, 8)}@example.com`,
      });
      users.push(user);
    }

    return users;
  }

  /**
   * Create a test tenant with multiple users
   */
  async createTestTenantWithUsers(
    userCount: number,
  ): Promise<TestTenantData & { additionalUsers: User[] }> {
    const tenantData = await this.createTestTenant();
    const additionalUsers = await this.createMultipleTestUsers(
      tenantData.tenant.id,
      userCount - 1, // -1 because admin user is already created
    );

    return {
      ...tenantData,
      additionalUsers,
    };
  }
}

// Factory function to create auth test helper
export function createAuthTestHelper(prisma: PrismaClient): AuthTestHelper {
  return new AuthTestHelper(prisma);
}
