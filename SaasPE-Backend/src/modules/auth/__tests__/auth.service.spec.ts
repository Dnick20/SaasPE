import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../../shared/database/prisma.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { UsersService } from '../../users/users.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let cacheService: CacheService;
  let usersService: UsersService;

  const mockPrismaService = {
    $transaction: jest.fn(),
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    tenant: {
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        JWT_SECRET: 'test-secret',
        JWT_ACCESS_EXPIRATION: '15m',
        JWT_REFRESH_EXPIRATION: '7d',
      };
      return config[key];
    }),
  };

  const mockCacheService = {
    storeRefreshToken: jest.fn(),
    getRefreshToken: jest.fn(),
    revokeRefreshToken: jest.fn(),
    validateRefreshToken: jest.fn(),
  };

  const mockUsersService = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    findByGoogleId: jest.fn(),
    findByMicrosoftId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateLastLogin: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    cacheService = module.get<CacheService>(CacheService);
    usersService = module.get<UsersService>(UsersService);

    // Reset all mocks and spies
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      agencyName: 'Test Agency',
      email: 'test@example.com',
      password: 'SecurePass123!@#',
      firstName: 'John',
      lastName: 'Doe',
      plan: 'starter',
    };

    const mockTenant = {
      id: 'tenant-uuid',
      name: 'Test Agency',
      plan: 'starter',
      status: 'trial',
      usedThisMonth: {},
      settings: {},
      created: new Date(),
      updated: new Date(),
    };

    const mockUser = {
      id: 'user-uuid',
      tenantId: 'tenant-uuid',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
      firstName: 'John',
      lastName: 'Doe',
      role: 'admin',
      status: 'active',
      preferences: {},
      created: new Date(),
      updated: new Date(),
      googleId: null,
      microsoftId: null,
      mfaEnabled: false,
      mfaSecret: null,
      lastLogin: null,
    };

    it('should successfully register a new agency and admin user', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockPrismaService.$transaction.mockImplementation((callback) =>
        callback({
          subscriptionPlan: {
            findUnique: jest.fn().mockResolvedValue({ id: 'plan-id', name: 'starter' }),
          },
          tenant: {
            create: jest.fn().mockResolvedValue(mockTenant),
          },
          tenantSubscription: {
            create: jest.fn().mockResolvedValue({ id: 'sub-id' }),
          },
          user: {
            create: jest.fn().mockResolvedValue(mockUser),
          },
        }),
      );
      mockJwtService.sign.mockReturnValue('mock-access-token');
      mockCacheService.storeRefreshToken.mockResolvedValue(undefined);
      mockUsersService.updateLastLogin.mockResolvedValue(mockUser);

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('tenant');
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result.tenant.name).toBe('Test Agency');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.role).toBe('admin');
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
    });

    it('should throw ConflictException if user already exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.register(registerDto)).rejects.toThrow(
        'User with this email already exists',
      );
    });

    it('should hash password with bcrypt cost factor 12', async () => {
      const password = registerDto.password;
      const hashed = await service.hashPassword(password);
      // bcrypt hash format: $2b$12$...
      expect(hashed).toMatch(/\$2[aby]\$12\$/);
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'SecurePass123!@#',
    };

    const mockUser = {
      id: 'user-uuid',
      tenantId: 'tenant-uuid',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
      firstName: 'John',
      lastName: 'Doe',
      role: 'admin',
      status: 'active',
      preferences: {},
      created: new Date(),
      updated: new Date(),
      googleId: null,
      microsoftId: null,
      mfaEnabled: false,
      mfaSecret: null,
      lastLogin: null,
    };

    it('should successfully login with valid credentials', async () => {
      const hashed = await bcrypt.hash(loginDto.password, 12);
      const userWithHash = { ...mockUser, passwordHash: hashed } as any;
      mockUsersService.findByEmail.mockResolvedValue(userWithHash);
      mockJwtService.sign.mockReturnValue('mock-access-token');
      mockCacheService.storeRefreshToken.mockResolvedValue(undefined);
      mockUsersService.updateLastLogin.mockResolvedValue(userWithHash);

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result.user.email).toBe('test@example.com');
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException with wrong password', async () => {
      const hashed = await bcrypt.hash('some-other-password', 12);
      const userWithHash = { ...mockUser, passwordHash: hashed } as any;
      mockUsersService.findByEmail.mockResolvedValue(userWithHash);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        'Invalid email or password',
      );
    });

    it('should throw UnauthorizedException if user does not exist', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user is not active', async () => {
      const suspendedUser = { ...mockUser, status: 'suspended' } as any;
      suspendedUser.passwordHash = await bcrypt.hash(loginDto.password, 12);
      mockUsersService.findByEmail.mockResolvedValue(suspendedUser);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        'User account is not active',
      );
    });
  });

  describe('generateTokens', () => {
    const mockUser = {
      id: 'user-uuid',
      tenantId: 'tenant-uuid',
      email: 'test@example.com',
      role: 'admin',
    } as any;

    it('should generate access and refresh tokens', async () => {
      mockJwtService.sign.mockReturnValue('mock-access-token');
      mockCacheService.storeRefreshToken.mockResolvedValue(undefined);

      const tokens = await service.generateTokens(mockUser);

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        tenantId: mockUser.tenantId,
        role: mockUser.role,
      });
      expect(mockCacheService.storeRefreshToken).toHaveBeenCalled();
    });
  });

  describe('refreshTokensForUser', () => {
    const userId = 'user-uuid';
    const refreshToken = 'valid-refresh-token';

    const mockUser = {
      id: userId,
      tenantId: 'tenant-uuid',
      email: 'test@example.com',
      role: 'admin',
      status: 'active',
    } as any;

    it('should successfully refresh tokens with valid refresh token', async () => {
      mockCacheService.validateRefreshToken.mockResolvedValue(true);
      mockUsersService.findById.mockResolvedValue(mockUser);
      mockCacheService.revokeRefreshToken.mockResolvedValue(undefined);
      mockJwtService.sign.mockReturnValue('new-access-token');
      mockCacheService.storeRefreshToken.mockResolvedValue(undefined);

      const tokens = await service.refreshTokensForUser(userId, refreshToken);

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(mockCacheService.validateRefreshToken).toHaveBeenCalledWith(
        userId,
        refreshToken,
      );
      expect(mockCacheService.revokeRefreshToken).toHaveBeenCalledWith(userId);
    });

    it('should throw UnauthorizedException with invalid refresh token', async () => {
      mockCacheService.validateRefreshToken.mockResolvedValue(false);

      await expect(
        service.refreshTokensForUser(userId, refreshToken),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.refreshTokensForUser(userId, refreshToken),
      ).rejects.toThrow('Invalid or expired refresh token');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockCacheService.validateRefreshToken.mockResolvedValue(true);
      mockUsersService.findById.mockResolvedValue(null);

      await expect(
        service.refreshTokensForUser(userId, refreshToken),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.refreshTokensForUser(userId, refreshToken),
      ).rejects.toThrow('User not found');
    });
  });

  describe('logout', () => {
    it('should revoke refresh token on logout', async () => {
      const userId = 'user-uuid';
      mockCacheService.revokeRefreshToken.mockResolvedValue(undefined);

      await service.logout(userId);

      expect(mockCacheService.revokeRefreshToken).toHaveBeenCalledWith(userId);
    });
  });

  describe('hashPassword', () => {
    it('should hash password using bcrypt', async () => {
      const password = 'SecurePass123!@#';
      const hashed = await service.hashPassword(password);

      expect(hashed).toBeDefined();
      expect(hashed).not.toBe(password);

      // Verify hash is valid
      const isValid = await bcrypt.compare(password, hashed);
      expect(isValid).toBe(true);
    });
  });

  describe('comparePasswords', () => {
    it('should return true for matching passwords', async () => {
      const password = 'SecurePass123!@#';
      const hash = await bcrypt.hash(password, 12);

      const result = await service.comparePasswords(password, hash);

      expect(result).toBe(true);
    });

    it('should return false for non-matching passwords', async () => {
      const password = 'SecurePass123!@#';
      const wrongPassword = 'WrongPass456!@#';
      const hash = await bcrypt.hash(password, 12);

      const result = await service.comparePasswords(wrongPassword, hash);

      expect(result).toBe(false);
    });
  });

  describe('validateUser', () => {
    const mockUser = {
      id: 'user-uuid',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
    } as any;

    it('should return user for valid credentials', async () => {
      const userWithHash = { ...mockUser } as any;
      userWithHash.passwordHash = await bcrypt.hash('password', 12);
      mockUsersService.findByEmail.mockResolvedValue(userWithHash);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toEqual(userWithHash);
    });

    it('should return null for invalid email', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      const result = await service.validateUser(
        'wrong@example.com',
        'password',
      );

      expect(result).toBeNull();
    });

    it('should return null for invalid password', async () => {
      const userWithHash = { ...mockUser } as any;
      userWithHash.passwordHash = await bcrypt.hash('password', 12);
      mockUsersService.findByEmail.mockResolvedValue(userWithHash);

      const result = await service.validateUser(
        'test@example.com',
        'wrongpassword',
      );

      expect(result).toBeNull();
    });
  });
});
