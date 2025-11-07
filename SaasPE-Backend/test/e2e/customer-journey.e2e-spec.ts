import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/shared/database/prisma.service';

/**
 * Customer Journey E2E Tests
 *
 * Tests the complete customer journey flow from discovery to first campaign:
 * 1. Discovery (Company Profile & ICP)
 * 2. Client Creation
 * 3. Proposal Generation
 * 4. Playbook Creation
 * 5. Email Account Connection
 * 6. Email Warmup
 * 7. Campaign Launch
 * 8. Journey Completion
 *
 * Also tests:
 * - Journey state persistence
 * - Journey metadata tracking
 * - Step completion tracking
 * - Client-scoped journeys
 */
describe('Customer Journey (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Test data
  let tenant: any;
  let user: any;
  let authToken: string;
  let client: any;
  let proposal: any;
  let playbook: any;
  let mailbox: any;
  let campaign: any;

  beforeAll(async () => {
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

    prisma = app.get<PrismaService>(PrismaService);

    // Clean up and setup
    await cleanupTestData();
    await setupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  async function setupTestData() {
    // Create tenant
    tenant = await prisma.tenant.create({
      data: {
        name: 'Journey Test Agency',
        plan: 'professional',
        status: 'active',
      },
    });

    // Create user
    user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: 'journey@test.com',
        passwordHash:
          '$2b$10$EixZaYVK1fsbw1ZfbX3OXe.X.X.X', // bcrypt hash for "Test123!@#"
        firstName: 'Journey',
        lastName: 'Tester',
        role: 'admin',
        status: 'active',
        preferences: {},
      },
    });

    // Generate auth token (simplified - in real tests, use proper JWT)
    authToken = `Bearer mock_token_${user.id}`;
  }

  async function cleanupTestData() {
    // Cleanup in reverse dependency order
    await prisma.campaignContact.deleteMany({
      where: { campaign: { tenantId: tenant?.id } },
    });
    await prisma.campaignEmail.deleteMany({
      where: { campaign: { tenantId: tenant?.id } },
    });
    await prisma.campaign.deleteMany({ where: { tenantId: tenant?.id } });
    await prisma.playbook.deleteMany({ where: { tenantId: tenant?.id } });
    await prisma.mailbox.deleteMany({ where: { tenantId: tenant?.id } });
    await prisma.proposal.deleteMany({ where: { tenantId: tenant?.id } });
    await prisma.transcription.deleteMany({ where: { tenantId: tenant?.id } });
    await prisma.client.deleteMany({ where: { tenantId: tenant?.id } });
    await prisma.companyProfile.deleteMany({ where: { tenantId: tenant?.id } });
    await prisma.user.deleteMany({ where: { tenantId: tenant?.id } });
    await prisma.tenant.deleteMany({
      where: { name: { contains: 'Journey Test' } },
    });
  }

  describe('Step 1: Discovery - Company Profile', () => {
    it('should create company profile with basic info', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/company-profile')
        .set('Authorization', authToken)
        .send({
          companyName: 'Journey Test Agency',
          website: 'https://journeytest.com',
          industry: 'Marketing',
          targetICP: 'B2B SaaS companies with 50-500 employees',
          preferredTone: 'professional',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        companyName: 'Journey Test Agency',
        website: 'https://journeytest.com',
        industry: 'Marketing',
        targetICP: 'B2B SaaS companies with 50-500 employees',
        preferredTone: 'professional',
      });
    });

    it('should update journey state after discovery', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/journey')
        .set('Authorization', authToken)
        .send({
          currentStep: 'client',
          completedSteps: ['discovery'],
          metadata: {
            companyName: 'Journey Test Agency',
            targetICP: 'B2B SaaS companies',
            preferredTone: 'professional',
          },
        })
        .expect(201);

      expect(response.body.currentStep).toBe('client');
      expect(response.body.completedSteps).toContain('discovery');
    });

    it('should retrieve journey state', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/journey')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.currentStep).toBe('client');
      expect(response.body.metadata.companyName).toBe('Journey Test Agency');
    });
  });

  describe('Step 2: Client Creation', () => {
    it('should create first client', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/clients')
        .set('Authorization', authToken)
        .send({
          companyName: 'First Client Corp',
          contactFirstName: 'John',
          contactLastName: 'Doe',
          contactEmail: 'john@firstclient.com',
          industry: 'Technology',
          status: 'prospect',
        })
        .expect(201);

      client = response.body;
      expect(client.companyName).toBe('First Client Corp');
    });

    it('should update journey with client info', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/journey')
        .set('Authorization', authToken)
        .send({
          currentStep: 'proposal',
          completedSteps: ['discovery', 'client'],
          metadata: {
            companyName: 'Journey Test Agency',
            targetICP: 'B2B SaaS companies',
            preferredTone: 'professional',
            firstClientId: client.id,
            firstClientName: client.companyName,
          },
        })
        .expect(201);
    });

    it('should track journey progress percentage', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/journey')
        .set('Authorization', authToken)
        .expect(200);

      // 2 out of 7 steps completed = ~28%
      expect(response.body.progressPercentage).toBeGreaterThanOrEqual(25);
      expect(response.body.progressPercentage).toBeLessThanOrEqual(35);
    });
  });

  describe('Step 3: Proposal Generation', () => {
    it('should create proposal for client', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/proposals')
        .set('Authorization', authToken)
        .send({
          clientId: client.id,
          title: 'Digital Marketing Strategy Proposal',
        })
        .expect(201);

      proposal = response.body;
      expect(proposal.clientId).toBe(client.id);
      expect(proposal.title).toBe('Digital Marketing Strategy Proposal');
    });

    it('should update proposal with content', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/proposals/${proposal.id}`)
        .set('Authorization', authToken)
        .send({
          executiveSummary: 'Comprehensive marketing solution',
          problemStatement: 'Client needs to increase lead generation',
          proposedSolution: 'Multi-channel marketing campaign',
          pricing: {
            items: [
              { name: 'SEO Services', price: 2000, description: 'Monthly' },
              { name: 'Content Marketing', price: 1500, description: 'Monthly' },
            ],
            total: 3500,
          },
        })
        .expect(200);
    });

    it('should update journey after proposal creation', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/journey')
        .set('Authorization', authToken)
        .send({
          currentStep: 'playbook',
          completedSteps: ['discovery', 'client', 'proposal'],
          metadata: {
            companyName: 'Journey Test Agency',
            firstClientId: client.id,
            firstClientName: client.companyName,
            firstProposalId: proposal.id,
          },
        })
        .expect(201);
    });
  });

  describe('Step 4: Playbook Creation', () => {
    it('should create playbook with scripts', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/playbooks')
        .set('Authorization', authToken)
        .send({
          clientId: client.id,
          title: 'First Client Playbook',
          targetICP: 'B2B SaaS companies',
          scripts: [
            {
              type: 'cold_email',
              content: 'Hi {firstName}, I noticed...',
              tone: 'professional',
            },
            {
              type: 'follow_up',
              content: 'Following up on my previous email...',
              tone: 'professional',
            },
          ],
        })
        .expect(201);

      playbook = response.body;
      expect(playbook.clientId).toBe(client.id);
    });

    it('should update journey after playbook creation', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/journey')
        .set('Authorization', authToken)
        .send({
          currentStep: 'mailboxes',
          completedSteps: ['discovery', 'client', 'proposal', 'playbook'],
          metadata: {
            firstClientId: client.id,
            firstProposalId: proposal.id,
            playbookId: playbook.id,
          },
        })
        .expect(201);
    });
  });

  describe('Step 5: Email Account Connection', () => {
    it('should connect email account', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/mailboxes')
        .set('Authorization', authToken)
        .send({
          email: 'journey@test.com',
          provider: 'SMTP',
          smtpHost: 'smtp.gmail.com',
          smtpPort: 587,
          smtpUsername: 'journey@test.com',
          smtpPassword: 'app_password_123',
          smtpUseSsl: true,
        })
        .expect(201);

      mailbox = response.body;
      expect(mailbox.email).toBe('journey@test.com');
      expect(mailbox.status).toBe('ACTIVE');
    });

    it('should update journey with mailbox info', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/journey')
        .set('Authorization', authToken)
        .send({
          currentStep: 'warmup',
          completedSteps: [
            'discovery',
            'client',
            'proposal',
            'playbook',
            'mailboxes',
          ],
          metadata: {
            firstClientId: client.id,
            firstProposalId: proposal.id,
            playbookId: playbook.id,
            connectedMailboxIds: [mailbox.id],
          },
        })
        .expect(201);
    });
  });

  describe('Step 6: Email Warmup', () => {
    it('should configure warmup for mailbox', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/warmup/configure')
        .set('Authorization', authToken)
        .send({
          mailboxIds: [mailbox.id],
          targetDailyLimit: 50,
          warmupDurationDays: 14,
        })
        .expect(201);

      expect(response.body.mailboxes).toHaveLength(1);
      expect(response.body.mailboxes[0].warmupStatus).toBe('WARMING');
    });

    it('should update journey after warmup configured', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/journey')
        .set('Authorization', authToken)
        .send({
          currentStep: 'campaign',
          completedSteps: [
            'discovery',
            'client',
            'proposal',
            'playbook',
            'mailboxes',
            'warmup',
          ],
          metadata: {
            firstClientId: client.id,
            firstProposalId: proposal.id,
            playbookId: playbook.id,
            connectedMailboxIds: [mailbox.id],
            warmupConfigured: true,
          },
        })
        .expect(201);
    });
  });

  describe('Step 7: Campaign Launch', () => {
    it('should create first campaign', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/campaigns')
        .set('Authorization', authToken)
        .send({
          name: 'First Campaign',
          mailboxId: mailbox.id,
          sequence: [
            {
              step: 1,
              subject: 'Quick question about your marketing',
              body: 'Hi {firstName}, I noticed...',
              delayDays: 0,
            },
            {
              step: 2,
              subject: 'Following up on my previous email',
              body: 'Just wanted to follow up...',
              delayDays: 3,
            },
          ],
          contacts: [
            {
              email: 'contact@example.com',
              firstName: 'Test',
              lastName: 'Contact',
              company: 'Test Company',
            },
          ],
          schedule: {
            sendDays: ['1', '2', '3', '4', '5'],
            sendTimeStart: '09:00',
            sendTimeEnd: '17:00',
            timezone: 'America/New_York',
          },
        })
        .expect(201);

      campaign = response.body;
      expect(campaign.name).toBe('First Campaign');
      expect(campaign.status).toBe('draft');
    });

    it('should update journey to complete', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/journey')
        .set('Authorization', authToken)
        .send({
          currentStep: 'complete',
          completedSteps: [
            'discovery',
            'client',
            'proposal',
            'playbook',
            'mailboxes',
            'warmup',
            'campaign',
          ],
          metadata: {
            firstClientId: client.id,
            firstProposalId: proposal.id,
            playbookId: playbook.id,
            connectedMailboxIds: [mailbox.id],
            warmupConfigured: true,
            firstCampaignId: campaign.id,
          },
        })
        .expect(201);

      expect(response.body.currentStep).toBe('complete');
      expect(response.body.progressPercentage).toBe(100);
    });
  });

  describe('Journey State Management', () => {
    it('should retrieve complete journey state', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/journey')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toMatchObject({
        currentStep: 'complete',
        completedSteps: expect.arrayContaining([
          'discovery',
          'client',
          'proposal',
          'playbook',
          'mailboxes',
          'warmup',
          'campaign',
        ]),
        progressPercentage: 100,
        metadata: expect.objectContaining({
          firstClientId: expect.any(String),
          firstProposalId: expect.any(String),
          playbookId: expect.any(String),
          firstCampaignId: expect.any(String),
        }),
      });
    });

    it('should allow journey reset for testing', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/journey/reset')
        .set('Authorization', authToken)
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/v1/journey')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.currentStep).toBe('discovery');
      expect(response.body.completedSteps).toHaveLength(0);
      expect(response.body.progressPercentage).toBe(0);
    });
  });

  describe('Client-Scoped Journeys', () => {
    let secondClient: any;

    it('should create second client', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/clients')
        .set('Authorization', authToken)
        .send({
          companyName: 'Second Client Corp',
          contactFirstName: 'Jane',
          contactLastName: 'Smith',
          contactEmail: 'jane@secondclient.com',
          status: 'prospect',
        })
        .expect(201);

      secondClient = response.body;
    });

    it('should maintain separate journey state for each client', async () => {
      // Update journey for second client
      await request(app.getHttpServer())
        .post('/api/v1/journey')
        .set('Authorization', authToken)
        .send({
          currentStep: 'proposal',
          completedSteps: ['client'],
          metadata: {
            clientId: secondClient.id,
            firstClientName: secondClient.companyName,
          },
        })
        .expect(201);

      // Fetch client-scoped journey
      const response = await request(app.getHttpServer())
        .get(`/api/v1/journey?clientId=${secondClient.id}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.metadata.clientId).toBe(secondClient.id);
      expect(response.body.currentStep).toBe('proposal');
    });

    it('should provide next action based on current step', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/journey?clientId=${secondClient.id}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.nextAction).toMatchObject({
        label: expect.stringContaining('Proposal'),
        route: expect.stringContaining('/proposals'),
        icon: expect.any(String),
      });
    });
  });

  describe('Journey Analytics', () => {
    it('should track journey completion time', async () => {
      const journey = await prisma.client.findUnique({
        where: { id: client.id },
        select: {
          journeyMetadata: true,
        },
      });

      expect(journey?.journeyMetadata).toHaveProperty('lastCompletedAt');
    });

    it('should identify skipped steps', async () => {
      // Skip warmup for a test scenario
      await request(app.getHttpServer())
        .post('/api/v1/journey')
        .set('Authorization', authToken)
        .send({
          currentStep: 'campaign',
          completedSteps: [
            'discovery',
            'client',
            'proposal',
            'playbook',
            'mailboxes',
          ],
          metadata: {
            skippedSteps: ['warmup'],
          },
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/v1/journey')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.metadata.skippedSteps).toContain('warmup');
    });
  });
});
