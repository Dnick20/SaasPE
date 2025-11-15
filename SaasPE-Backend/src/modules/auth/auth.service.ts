import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../shared/database/prisma.service';
import { CacheService } from '../../shared/cache/cache.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User, Tenant } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterResponse {
  tenant: Partial<Tenant>;
  user: Partial<User>;
  tokens: AuthTokens;
}

export interface LoginResponse {
  user: Partial<User>;
  tokens: AuthTokens;
}

@Injectable()
export class AuthService {
  private readonly BCRYPT_SALT_ROUNDS = 12;
  private readonly REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Register a new agency (tenant) with admin user
   */
  async register(dto: RegisterDto): Promise<RegisterResponse> {
    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const passwordHash = await this.hashPassword(dto.password);

    // Map user-friendly plan names to actual plan names
    const planNameMap: Record<string, string> = {
      starter: 'professional',
      professional: 'professional',
      growth: 'advanced',
      advanced: 'advanced',
      enterprise: 'enterprise',
      ultimate: 'ultimate',
    };
    const planName =
      planNameMap[dto.plan?.toLowerCase() || 'starter'] || 'professional';

    // Create tenant and admin user in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Get the subscription plan
      const subscriptionPlan = await tx.subscriptionPlan.findUnique({
        where: { name: planName },
      });

      if (!subscriptionPlan) {
        throw new BadRequestException(
          `Subscription plan '${planName}' not found`,
        );
      }

      // Create tenant
      const tenant = await tx.tenant.create({
        data: {
          name: dto.agencyName,
          plan: planName,
          status: 'trial',
          usedThisMonth: {},
          settings: {},
        },
      });

      // Create tenant subscription with trial period
      const now = new Date();
      const trialEndsAt = new Date(now);
      trialEndsAt.setDate(trialEndsAt.getDate() + 14); // 14 day trial
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      await tx.tenantSubscription.create({
        data: {
          tenantId: tenant.id,
          planId: subscriptionPlan.id,
          status: 'trial',
          billingInterval: 'monthly',
          tokenBalance: subscriptionPlan.monthlyTokens, // Full allocation during trial
          monthlyAllocation: subscriptionPlan.monthlyTokens,
          tokensUsedThisPeriod: 0,
          lifetimeTokensUsed: 0,
          monthlyPrice: subscriptionPlan.monthlyPrice,
          currency: subscriptionPlan.currency,
          overageTokenCost: subscriptionPlan.overageTokenCost,
          isTrialing: true,
          trialEndsAt,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
        },
      });

      // Create admin user
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: 'admin', // First user is always admin
          status: 'active',
          preferences: {},
        },
      });

      return { tenant, user };
    });

    // Generate tokens
    const tokens = await this.generateTokens(result.user);

    // Update last login
    await this.usersService.updateLastLogin(result.user.id);

    return {
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        plan: result.tenant.plan,
        status: result.tenant.status,
      },
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role,
      },
      tokens,
    };
  }

  /**
   * Login with email and password
   */
  async login(dto: LoginDto): Promise<LoginResponse> {
    // Validate credentials
    const user = await this.validateUser(dto.email, dto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if user is active
    if (user.status !== 'active') {
      throw new UnauthorizedException('User account is not active');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Update last login
    await this.usersService.updateLastLogin(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantId: user.tenantId,
      },
      tokens,
    };
  }

  /**
   * Validate user credentials
   */
  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);

    if (!user || !user.passwordHash) {
      return null;
    }

    const isPasswordValid = await this.comparePasswords(
      password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  /**
   * Generate access and refresh tokens
   */
  async generateTokens(user: User): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    };

    // Generate access token (JWT, short-lived)
    const accessToken = this.jwtService.sign(payload);

    // Generate refresh token (random UUID, long-lived)
    const refreshToken = uuidv4();

    // Store refresh token in Redis
    await this.cacheService.storeRefreshToken(
      user.id,
      refreshToken,
      this.REFRESH_TOKEN_TTL,
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    // Validate refresh token format
    if (!refreshToken) {
      throw new BadRequestException('Refresh token is required');
    }

    // Find user by checking all stored refresh tokens
    // Note: In production, you might want to store userId with the token
    // For now, we'll decode the old access token if provided, or require userId
    // This is a simplified implementation

    // For this implementation, we'll need to pass userId separately
    // or decode from expired access token
    // Let's throw an error for now and improve this in the next iteration
    throw new BadRequestException(
      'Refresh token implementation requires userId - use POST /auth/refresh with userId in body',
    );
  }

  /**
   * Refresh tokens for a specific user
   */
  async refreshTokensForUser(
    userId: string,
    refreshToken: string,
  ): Promise<AuthTokens> {
    // Validate refresh token against stored token
    const isValid = await this.cacheService.validateRefreshToken(
      userId,
      refreshToken,
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Get user
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Revoke old refresh token
    await this.cacheService.revokeRefreshToken(userId);

    // Generate new tokens (rotation)
    const tokens = await this.generateTokens(user);

    return tokens;
  }

  /**
   * Logout user (revoke refresh token)
   */
  async logout(userId: string): Promise<void> {
    await this.cacheService.revokeRefreshToken(userId);
  }

  /**
   * Hash password with bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.BCRYPT_SALT_ROUNDS);
  }

  /**
   * Compare plain password with hashed password
   */
  async comparePasswords(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Validate JWT payload and return user
   */
  async validateJwtPayload(payload: JwtPayload): Promise<User> {
    const user = await this.usersService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('User account is not active');
    }

    return user;
  }

  /**
   * Google OAuth login/register
   */
  async googleLogin(googleUser: {
    email: string;
    firstName: string;
    lastName: string;
    googleId: string;
  }): Promise<LoginResponse> {
    // Try to find existing user by Google ID
    let user = await this.usersService.findByGoogleId(googleUser.googleId);

    // If not found by Google ID, try by email
    if (!user) {
      user = await this.usersService.findByEmail(googleUser.email);

      // If found by email, link Google account
      if (user) {
        user = await this.usersService.update(user.id, {
          googleId: googleUser.googleId,
        });
      }
    }

    // If still no user, create new account
    if (!user) {
      // Create tenant and user
      const result = await this.prisma.$transaction(async (tx) => {
        // Get the professional plan (default for new signups)
        const subscriptionPlan = await tx.subscriptionPlan.findUnique({
          where: { name: 'professional' },
        });

        if (!subscriptionPlan) {
          throw new BadRequestException('Default subscription plan not found');
        }

        const tenant = await tx.tenant.create({
          data: {
            name: `${googleUser.firstName}'s Agency`,
            plan: 'professional',
            status: 'trial',
            usedThisMonth: {},
            settings: {},
          },
        });

        // Create tenant subscription with trial period
        const now = new Date();
        const trialEndsAt = new Date(now);
        trialEndsAt.setDate(trialEndsAt.getDate() + 14); // 14 day trial
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        await tx.tenantSubscription.create({
          data: {
            tenantId: tenant.id,
            planId: subscriptionPlan.id,
            status: 'trial',
            billingInterval: 'monthly',
            tokenBalance: subscriptionPlan.monthlyTokens,
            monthlyAllocation: subscriptionPlan.monthlyTokens,
            tokensUsedThisPeriod: 0,
            lifetimeTokensUsed: 0,
            monthlyPrice: subscriptionPlan.monthlyPrice,
            currency: subscriptionPlan.currency,
            overageTokenCost: subscriptionPlan.overageTokenCost,
            isTrialing: true,
            trialEndsAt,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: false,
          },
        });

        const newUser = await tx.user.create({
          data: {
            tenantId: tenant.id,
            email: googleUser.email,
            firstName: googleUser.firstName,
            lastName: googleUser.lastName,
            googleId: googleUser.googleId,
            role: 'admin',
            status: 'active',
            preferences: {},
          },
        });

        return { user: newUser };
      });

      user = result.user;
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Update last login
    await this.usersService.updateLastLogin(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantId: user.tenantId,
      },
      tokens,
    };
  }

  /**
   * Microsoft OAuth login/register
   */
  async microsoftLogin(microsoftUser: {
    email: string;
    firstName: string;
    lastName: string;
    microsoftId: string;
  }): Promise<LoginResponse> {
    // Try to find existing user by Microsoft ID
    let user = await this.usersService.findByMicrosoftId(
      microsoftUser.microsoftId,
    );

    // If not found by Microsoft ID, try by email
    if (!user) {
      user = await this.usersService.findByEmail(microsoftUser.email);

      // If found by email, link Microsoft account
      if (user) {
        user = await this.usersService.update(user.id, {
          microsoftId: microsoftUser.microsoftId,
        });
      }
    }

    // If still no user, create new account
    if (!user) {
      // Create tenant and user
      const result = await this.prisma.$transaction(async (tx) => {
        // Get the professional plan (default for new signups)
        const subscriptionPlan = await tx.subscriptionPlan.findUnique({
          where: { name: 'professional' },
        });

        if (!subscriptionPlan) {
          throw new BadRequestException('Default subscription plan not found');
        }

        const tenant = await tx.tenant.create({
          data: {
            name: `${microsoftUser.firstName}'s Agency`,
            plan: 'professional',
            status: 'trial',
            usedThisMonth: {},
            settings: {},
          },
        });

        // Create tenant subscription with trial period
        const now = new Date();
        const trialEndsAt = new Date(now);
        trialEndsAt.setDate(trialEndsAt.getDate() + 14); // 14 day trial
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        await tx.tenantSubscription.create({
          data: {
            tenantId: tenant.id,
            planId: subscriptionPlan.id,
            status: 'trial',
            billingInterval: 'monthly',
            tokenBalance: subscriptionPlan.monthlyTokens,
            monthlyAllocation: subscriptionPlan.monthlyTokens,
            tokensUsedThisPeriod: 0,
            lifetimeTokensUsed: 0,
            monthlyPrice: subscriptionPlan.monthlyPrice,
            currency: subscriptionPlan.currency,
            overageTokenCost: subscriptionPlan.overageTokenCost,
            isTrialing: true,
            trialEndsAt,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: false,
          },
        });

        const newUser = await tx.user.create({
          data: {
            tenantId: tenant.id,
            email: microsoftUser.email,
            firstName: microsoftUser.firstName,
            lastName: microsoftUser.lastName,
            microsoftId: microsoftUser.microsoftId,
            role: 'admin',
            status: 'active',
            preferences: {},
          },
        });

        return { user: newUser };
      });

      user = result.user;
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Update last login
    await this.usersService.updateLastLogin(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantId: user.tenantId,
      },
      tokens,
    };
  }
}
