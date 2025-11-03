import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ExecutionContext } from '@nestjs/common';
import * as request from 'supertest';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { AuthModule } from '../auth.module';
import { PrismaService } from '../../../shared/database/prisma.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { UsersService } from '../../users/users.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { getDatabaseTestHelper } from '../../../../test/helpers/database-test.helper';
import { createAuthTestHelper } from '../../../../test/helpers/auth-test.helper';

const req = (server: any) =>
  ((request as any).default ? (request as any).default(server) : (request as any)(server));

describe('AuthController (Integration)', () => {
  let app: INestApplication;
  let authService: AuthService;
  let prismaService: PrismaService;
  const dbHelper = getDatabaseTestHelper();
  let authHelper: any;

  beforeAll(async () => {
    // Setup test database
    await dbHelper.connect();
    await dbHelper.seedRequiredData();
    authHelper = createAuthTestHelper(dbHelper.getClient());
  });

  afterAll(async () => {
    // Cleanup and disconnect
    await dbHelper.cleanupAllData();
    await dbHelper.disconnect();
  });

  beforeEach(async () => {
    // Create smart mock for CacheService that validates based on token format
    const mockCacheService = {
      storeRefreshToken: jest.fn().mockResolvedValue(undefined),
      getRefreshToken: jest.fn().mockResolvedValue('mock-refresh-token'),
      validateRefreshToken: jest.fn().mockImplementation((userId: string, token: string) => {
        // Return false for obviously invalid tokens
        if (token === 'invalid-token-that-does-not-exist' || !token || token.length < 10) {
          return Promise.resolve(false);
        }
        // Return true for JWT-formatted tokens
        return Promise.resolve(token.startsWith('eyJ'));
      }),
      revokeRefreshToken: jest.fn().mockResolvedValue(undefined),
    };

    // Create mock Reflector for checking public endpoints
    const mockReflector = new Reflector();

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        JwtModule.registerAsync({
          imports: [ConfigModule],
          useFactory: async (configService: ConfigService) => ({
            secret: configService.get<string>('JWT_SECRET'),
            signOptions: {
              expiresIn: configService.get<string>('JWT_ACCESS_EXPIRATION', '15m'),
            },
          }),
          inject: [ConfigService],
        }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        PrismaService,
        UsersService,
        ConfigService,
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: APP_GUARD,
          useValue: {
            canActivate: async (context: ExecutionContext) => {
              // Check if the endpoint is marked as public
              const isPublic = mockReflector.getAllAndOverride<boolean>('isPublic', [
                context.getHandler(),
                context.getClass(),
              ]);

              // Allow public endpoints without authentication
              if (isPublic) {
                return true;
              }

              // For protected endpoints, enforce authentication
              const request = context.switchToHttp().getRequest();
              const authHeader = request.headers.authorization;
              if (!authHeader) return false;

              const token = authHeader.split(' ')[1];
              if (!token || token === 'invalid-token' || token === 'invalid-token-here') return false;

              try {
                // Use authHelper to verify and decode the token
                const payload = authHelper.verifyToken(token);

                // Fetch the full user object from database (CurrentUser decorator expects this)
                const user = await authHelper.getUserById(payload.sub);
                if (!user) return false;

                request.user = user;
                return true;
              } catch {
                return false;
              }
            },
          },
        },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();

    authService = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(async () => {
    // Clean up test data after each test
    await dbHelper.cleanupAllData();
    await app.close();
  });

  describe('POST /auth/register', () => {
    const validRegisterDto: RegisterDto = {
      agencyName: 'Test Agency',
      email: 'test@example.com',
      password: 'SecurePass123!@#',
      firstName: 'John',
      lastName: 'Doe',
      plan: 'starter',
    };

    it('should register a new agency successfully', async () => {
      const response = await req(app.getHttpServer())
        .post('/auth/register')
        .send(validRegisterDto)
        .expect(201);

      expect(response.body).toHaveProperty('tenant');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('tokens');
      expect(response.body.tenant.name).toBe('Test Agency');
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.firstName).toBe('John');
      expect(response.body.user.lastName).toBe('Doe');
      expect(response.body.user.role).toBe('admin');
      expect(response.body.tokens.accessToken).toBeDefined();
      expect(response.body.tokens.refreshToken).toBeDefined();

      // Verify user was created in database
      const user = await authHelper.getUserByEmail('test@example.com');
      expect(user).toBeDefined();
      expect(user.firstName).toBe('John');
    });

    it('should return 400 with weak password', async () => {
      const weakPasswordDto = {
        ...validRegisterDto,
        password: 'weak',
      };

      await req(app.getHttpServer())
        .post('/auth/register')
        .send(weakPasswordDto)
        .expect(400);
    });

    it('should return 400 with invalid email', async () => {
      const invalidEmailDto = {
        ...validRegisterDto,
        email: 'invalid-email',
      };

      await req(app.getHttpServer())
        .post('/auth/register')
        .send(invalidEmailDto)
        .expect(400);
    });

    it('should return 400 with missing required fields', async () => {
      const incompleteDto = {
        email: 'test@example.com',
        password: 'SecurePass123!@#',
      };

      await req(app.getHttpServer())
        .post('/auth/register')
        .send(incompleteDto)
        .expect(400);
    });

    it('should return 409 if user already exists', async () => {
      // First registration should succeed
      await req(app.getHttpServer())
        .post('/auth/register')
        .send(validRegisterDto)
        .expect(201);

      // Second registration with same email should fail
      await req(app.getHttpServer())
        .post('/auth/register')
        .send({
          ...validRegisterDto,
          agencyName: 'Different Agency',
        })
        .expect(409);
    });
  });

  describe('POST /auth/login', () => {
    const validLoginDto: LoginDto = {
      email: 'test@example.com',
      password: 'SecurePass123!@#',
    };

    beforeEach(async () => {
      // Create a test user before each login test
      await authHelper.createTestTenant({
        agencyName: 'Test Agency',
        email: 'test@example.com',
        password: 'SecurePass123!@#',
      });
    });

    it('should login successfully with valid credentials', async () => {
      const response = await req(app.getHttpServer())
        .post('/auth/login')
        .send(validLoginDto)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('tokens');
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.tokens.accessToken).toBeDefined();
      expect(response.body.tokens.refreshToken).toBeDefined();
    });

    it('should return 401 with wrong password', async () => {
      await req(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword123!',
        })
        .expect(401);
    });

    it('should return 400 with invalid email format', async () => {
      await req(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'invalid-email',
          password: 'SecurePass123!@#',
        })
        .expect(400);
    });

    it('should return 400 with missing password', async () => {
      await req(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
        })
        .expect(400);
    });
  });

  describe('POST /auth/refresh', () => {
    let testUserData: any;

    beforeEach(async () => {
      // Create test user and get tokens
      testUserData = await authHelper.createTestTenant({
        agencyName: 'Test Agency',
        email: 'refresh-test@example.com',
        password: 'TestPassword123!@#',
      });
    });

    it('should refresh tokens successfully', async () => {
      const response = await req(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: testUserData.tokens.refreshToken,
          userId: testUserData.adminUser.id,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      // Verify access token is a valid JWT
      expect(response.body.accessToken).toMatch(/^eyJ/);
      // Verify refresh token is a UUID or JWT (backend uses UUID)
      expect(response.body.refreshToken.length).toBeGreaterThan(10);
    });

    it('should return 401 with invalid refresh token', async () => {
      await req(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: 'invalid-token-that-does-not-exist',
          userId: testUserData.adminUser.id,
        })
        .expect(401);
    });

    it('should return 401 with missing refreshToken', async () => {
      await req(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          userId: 'user-uuid',
        })
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    let testUserData: any;

    beforeEach(async () => {
      testUserData = await authHelper.createTestTenant({
        agencyName: 'Test Agency',
        email: 'logout-test@example.com',
        password: 'TestPassword123!@#',
      });
    });

    it('should logout successfully', async () => {
      const response = await req(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', authHelper.getBearerToken(testUserData.tokens.accessToken))
        .send({ userId: testUserData.adminUser.id })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Logout successful');
    });
  });

  describe('GET /auth/me', () => {
    let testUserData: any;

    beforeEach(async () => {
      testUserData = await authHelper.createTestTenant({
        agencyName: 'Test Agency',
        email: 'me-test@example.com',
        password: 'TestPassword123!@#',
      });
    });

    it('should return current user details when authenticated', async () => {
      const response = await req(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', authHelper.getBearerToken(testUserData.tokens.accessToken))
        .expect(200);

      expect(response.body).toHaveProperty('id', testUserData.adminUser.id);
      expect(response.body).toHaveProperty('email', testUserData.adminUser.email);
      expect(response.body).toHaveProperty('firstName', testUserData.adminUser.firstName);
      expect(response.body).toHaveProperty('role', 'admin');
    });

    it('should return 403 when not authenticated', async () => {
      await req(app.getHttpServer())
        .get('/auth/me')
        .expect(403);
    });

    it('should return 403 with invalid token', async () => {
      await req(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(403);
    });
  });
});
