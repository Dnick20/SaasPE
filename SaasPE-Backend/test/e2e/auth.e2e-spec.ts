import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { getDatabaseTestHelper } from '../helpers/database-test.helper';
import { createAuthTestHelper, AuthTestHelper } from '../helpers/auth-test.helper';
import { PrismaService } from '../../src/shared/database/prisma.service';

const req = (server: any) =>
  ((request as any).default ? (request as any).default(server) : (request as any)(server));

describe('Auth E2E Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  const dbHelper = getDatabaseTestHelper();
  let authHelper: AuthTestHelper;

  beforeAll(async () => {
    // Setup test database
    await dbHelper.connect();
    await dbHelper.seedRequiredData();
    authHelper = createAuthTestHelper(dbHelper.getClient());

    // Create NestJS application
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await dbHelper.cleanupAllData();
    await dbHelper.disconnect();
    await app.close();
  });

  afterEach(async () => {
    // Clean up test data after each test
    await dbHelper.cleanupAllData();
    await dbHelper.seedRequiredData();
  });

  describe('Complete Authentication Flow', () => {
    it('should complete full registration → login → refresh → logout flow', async () => {
      const uniqueEmail = `e2e-${Date.now()}@example.com`;

      // Step 1: Register new agency with admin user
      const registerResponse = await req(app.getHttpServer())
        .post('/auth/register')
        .send({
          agencyName: 'E2E Test Agency',
          email: uniqueEmail,
          password: 'SecurePassword123!@#',
          firstName: 'Test',
          lastName: 'User',
          plan: 'professional',
        })
        .expect(201);

      expect(registerResponse.body).toHaveProperty('tenant');
      expect(registerResponse.body).toHaveProperty('user');
      expect(registerResponse.body).toHaveProperty('tokens');

      const { user, tenant, tokens } = registerResponse.body;
      expect(user.email).toBe(uniqueEmail);
      expect(tenant.name).toBe('E2E Test Agency');
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();

      // Step 2: Login with registered credentials
      const loginResponse = await req(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: uniqueEmail,
          password: 'SecurePassword123!@#',
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('user');
      expect(loginResponse.body).toHaveProperty('tokens');
      expect(loginResponse.body.user.email).toBe(uniqueEmail);

      const newTokens = loginResponse.body.tokens;

      // Step 3: Access protected endpoint with access token
      const meResponse = await req(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${newTokens.accessToken}`)
        .expect(200);

      expect(meResponse.body.email).toBe(uniqueEmail);
      expect(meResponse.body.role).toBe('admin');

      // Wait 1 second to ensure JWT timestamp changes
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Step 4: Refresh tokens
      const refreshResponse = await req(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: newTokens.refreshToken,
          userId: user.id,
        })
        .expect(200);

      expect(refreshResponse.body).toHaveProperty('accessToken');
      expect(refreshResponse.body).toHaveProperty('refreshToken');
      expect(refreshResponse.body.accessToken).not.toBe(newTokens.accessToken);

      // Step 5: Logout
      const logoutResponse = await req(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${refreshResponse.body.accessToken}`)
        .send({ userId: user.id })
        .expect(200);

      expect(logoutResponse.body.message).toBe('Logout successful');

      // Step 6: Verify old refresh token no longer works after logout
      await req(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: newTokens.refreshToken,
          userId: user.id,
        })
        .expect(401);
    });
  });

  describe('Registration Tests', () => {
    it('should register agency with all valid data', async () => {
      const response = await req(app.getHttpServer())
        .post('/auth/register')
        .send({
          agencyName: 'Valid Agency',
          email: `valid-${Date.now()}@example.com`,
          password: 'ValidPass123!@#',
          firstName: 'John',
          lastName: 'Doe',
          plan: 'professional',
        })
        .expect(201);

      expect(response.body.tenant.name).toBe('Valid Agency');
      expect(response.body.user.firstName).toBe('John');
      expect(response.body.user.role).toBe('admin');
    });

    it('should reject registration with duplicate email', async () => {
      const email = `duplicate-${Date.now()}@example.com`;

      // First registration
      await req(app.getHttpServer())
        .post('/auth/register')
        .send({
          agencyName: 'First Agency',
          email: email,
          password: 'Password123!@#',
          firstName: 'First',
          lastName: 'User',
          plan: 'professional',
        })
        .expect(201);

      // Second registration with same email
      await req(app.getHttpServer())
        .post('/auth/register')
        .send({
          agencyName: 'Second Agency',
          email: email,
          password: 'Password123!@#',
          firstName: 'Second',
          lastName: 'User',
          plan: 'professional',
        })
        .expect(409);
    });

    it('should reject registration with weak password', async () => {
      await req(app.getHttpServer())
        .post('/auth/register')
        .send({
          agencyName: 'Weak Pass Agency',
          email: `weak-${Date.now()}@example.com`,
          password: 'weak',
          firstName: 'Test',
          lastName: 'User',
          plan: 'professional',
        })
        .expect(400);
    });

    it('should reject registration with invalid email', async () => {
      await req(app.getHttpServer())
        .post('/auth/register')
        .send({
          agencyName: 'Invalid Email Agency',
          email: 'not-an-email',
          password: 'ValidPass123!@#',
          firstName: 'Test',
          lastName: 'User',
          plan: 'professional',
        })
        .expect(400);
    });

    it('should reject registration with missing required fields', async () => {
      await req(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `missing-${Date.now()}@example.com`,
          password: 'ValidPass123!@#',
        })
        .expect(400);
    });

    it('should create subscription for new tenant', async () => {
      const response = await req(app.getHttpServer())
        .post('/auth/register')
        .send({
          agencyName: 'Subscription Test Agency',
          email: `sub-${Date.now()}@example.com`,
          password: 'Password123!@#',
          firstName: 'Sub',
          lastName: 'Test',
          plan: 'professional',
        })
        .expect(201);

      const tenantId = response.body.tenant.id;

      // Verify subscription was created
      const subscription = await prismaService.tenantSubscription.findFirst({
        where: { tenantId },
      });

      expect(subscription).toBeDefined();
      expect(subscription?.status).toBe('trial');
      expect(subscription?.tokenBalance).toBeGreaterThan(0);
    });
  });

  describe('Login Tests', () => {
    let testUserData: any;

    beforeEach(async () => {
      testUserData = await authHelper.createTestTenant({
        agencyName: 'Login Test Agency',
        email: `login-${Date.now()}@example.com`,
        password: 'TestPassword123!@#',
      });
    });

    it('should login with valid credentials', async () => {
      const response = await req(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUserData.adminUser.email,
          password: 'TestPassword123!@#',
        })
        .expect(200);

      expect(response.body.user.email).toBe(testUserData.adminUser.email);
      expect(response.body.tokens.accessToken).toBeDefined();
    });

    it('should reject login with wrong password', async () => {
      await req(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUserData.adminUser.email,
          password: 'WrongPassword123!',
        })
        .expect(401);
    });

    it('should reject login with non-existent email', async () => {
      await req(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'TestPassword123!@#',
        })
        .expect(401);
    });

    it('should reject login for suspended user', async () => {
      // Suspend the user
      await authHelper.updateUserStatus(testUserData.adminUser.id, 'suspended');

      await req(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUserData.adminUser.email,
          password: 'TestPassword123!@#',
        })
        .expect(401);
    });

    it('should update lastLogin timestamp on successful login', async () => {
      const beforeLogin = new Date();

      await req(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUserData.adminUser.email,
          password: 'TestPassword123!@#',
        })
        .expect(200);

      const updatedUser = await authHelper.getUserById(testUserData.adminUser.id);
      expect(updatedUser?.lastLogin).toBeDefined();
      expect(updatedUser?.lastLogin!.getTime()).toBeGreaterThanOrEqual(beforeLogin.getTime());
    });
  });

  describe('Token Refresh Tests', () => {
    let testUserData: any;
    let realTokens: any;

    beforeEach(async () => {
      const email = `refresh-${Date.now()}@example.com`;
      const password = 'TestPassword123!@#';

      // Register user to get real tokens stored in Redis
      const registerResponse = await req(app.getHttpServer())
        .post('/auth/register')
        .send({
          agencyName: 'Refresh Test Agency',
          email,
          password,
          firstName: 'Test',
          lastName: 'User',
          plan: 'professional',
        })
        .expect(201);

      testUserData = registerResponse.body;
      realTokens = registerResponse.body.tokens;
    });

    it('should refresh tokens with valid refresh token', async () => {
      // Wait to ensure JWT timestamp changes
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const response = await req(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: realTokens.refreshToken,
          userId: testUserData.user.id,
        })
        .expect(200);

      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.accessToken).not.toBe(realTokens.accessToken);
    });

    it('should reject refresh with invalid token', async () => {
      await req(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: 'invalid-token',
          userId: testUserData.user.id,
        })
        .expect(401);
    });

    it('should reject refresh with missing userId', async () => {
      await req(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: realTokens.refreshToken,
        })
        .expect(401);
    });
  });

  describe('Multi-Tenant Isolation Tests', () => {
    it('should isolate users between tenants', async () => {
      // Create two separate tenants
      const tenant1Data = await authHelper.createTestTenant({
        agencyName: 'Tenant 1',
        email: `tenant1-${Date.now()}@example.com`,
        password: 'Password123!@#',
      });

      const tenant2Data = await authHelper.createTestTenant({
        agencyName: 'Tenant 2',
        email: `tenant2-${Date.now()}@example.com`,
        password: 'Password123!@#',
      });

      // Verify tenants are different
      expect(tenant1Data.tenant.id).not.toBe(tenant2Data.tenant.id);

      // Verify users belong to their respective tenants
      expect(tenant1Data.adminUser.tenantId).toBe(tenant1Data.tenant.id);
      expect(tenant2Data.adminUser.tenantId).toBe(tenant2Data.tenant.id);

      // Verify JWT tokens contain correct tenant IDs
      const token1 = authHelper.verifyToken(tenant1Data.tokens.accessToken);
      const token2 = authHelper.verifyToken(tenant2Data.tokens.accessToken);

      expect(token1.tenantId).toBe(tenant1Data.tenant.id);
      expect(token2.tenantId).toBe(tenant2Data.tenant.id);
      expect(token1.tenantId).not.toBe(token2.tenantId);
    });

    it('should prevent users from accessing other tenant data', async () => {
      const tenant1Data = await authHelper.createTestTenant({
        agencyName: 'Tenant A',
        email: `tenantA-${Date.now()}@example.com`,
        password: 'Password123!@#',
      });

      const tenant2Data = await authHelper.createTestTenant({
        agencyName: 'Tenant B',
        email: `tenantB-${Date.now()}@example.com`,
        password: 'Password123!@#',
      });

      // User from tenant1 tries to use tenant2's user ID in refresh
      await req(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: tenant1Data.tokens.refreshToken,
          userId: tenant2Data.adminUser.id, // Wrong user ID
        })
        .expect(401);
    });
  });

  describe('Protected Endpoint Tests', () => {
    let testUserData: any;

    beforeEach(async () => {
      testUserData = await authHelper.createTestTenant({
        agencyName: 'Protected Test Agency',
        email: `protected-${Date.now()}@example.com`,
        password: 'TestPassword123!@#',
      });
    });

    it('should access /auth/me with valid token', async () => {
      const response = await req(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${testUserData.tokens.accessToken}`)
        .expect(200);

      expect(response.body.email).toBe(testUserData.adminUser.email);
    });

    it('should reject /auth/me without token', async () => {
      await req(app.getHttpServer())
        .get('/auth/me')
        .expect(401);
    });

    it('should reject /auth/me with invalid token', async () => {
      await req(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token-here')
        .expect(401);
    });

    it('should reject /auth/me with malformed authorization header', async () => {
      await req(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'NotBearer token')
        .expect(401);
    });
  });

  describe('Password Security Tests', () => {
    it('should hash passwords before storing', async () => {
      const email = `hash-test-${Date.now()}@example.com`;
      const password = 'TestPassword123!@#';

      await req(app.getHttpServer())
        .post('/auth/register')
        .send({
          agencyName: 'Hash Test Agency',
          email: email,
          password: password,
          firstName: 'Test',
          lastName: 'User',
          plan: 'professional',
        })
        .expect(201);

      // Retrieve user from database
      const user = await authHelper.getUserByEmail(email);
      expect(user).toBeDefined();
      expect(user!.passwordHash).toBeDefined();
      expect(user!.passwordHash).not.toBe(password);
      expect(user!.passwordHash.length).toBeGreaterThan(50); // Bcrypt hashes are long
    });

    it('should require strong passwords', async () => {
      const weakPasswords = ['weak', '12345678', 'password', 'abcdefgh'];

      for (const weakPass of weakPasswords) {
        await req(app.getHttpServer())
          .post('/auth/register')
          .send({
            agencyName: 'Weak Pass Test',
            email: `weak-${Date.now()}-${Math.random()}@example.com`,
            password: weakPass,
            firstName: 'Test',
            lastName: 'User',
            plan: 'professional',
          })
          .expect(400);
      }
    });
  });

  describe('JWT Token Tests', () => {
    it('should include correct payload in JWT tokens', async () => {
      const testData = await authHelper.createTestTenant({
        agencyName: 'JWT Test Agency',
        email: `jwt-${Date.now()}@example.com`,
        password: 'TestPassword123!@#',
      });

      const payload = authHelper.verifyToken(testData.tokens.accessToken);

      expect(payload.sub).toBe(testData.adminUser.id);
      expect(payload.email).toBe(testData.adminUser.email);
      expect(payload.tenantId).toBe(testData.tenant.id);
      expect(payload.role).toBe('admin');
    });

    it('should reject expired tokens', async () => {
      // Note: This test would require manipulating time or using short-lived tokens
      // For now, we verify that invalid tokens are rejected
      await req(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwidXNlcklkIjoiZXhwaXJlZCIsImlhdCI6MTUxNjIzOTAyMiwiZXhwIjoxNTE2MjM5MDIyfQ.4Adcj0u6gHnbJr7u7RBvxcAFXrYJF9GJlVxL6VhcHrc')
        .expect(401);
    });
  });
});
