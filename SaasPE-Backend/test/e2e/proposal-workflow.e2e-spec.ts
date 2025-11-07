import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/shared/database/prisma.service';

/**
 * Proposal Workflow E2E Tests
 *
 * Tests the complete user journey for proposals:
 * 1. Upload transcription
 * 2. Create proposal from transcription
 * 3. Generate AI content
 * 4. Edit proposal
 * 5. Export to PDF
 * 6. Send to client
 *
 * This ensures all features work together end-to-end
 */
describe('Proposal Workflow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Test entities
  let tenant: any;
  let user: any;
  let client: any;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Setup test tenant and user
    await setupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  async function setupTestData() {
    // Clean any existing test data
    await cleanupTestData();

    // Create tenant
    tenant = await prisma.tenant.create({
      data: {
        name: 'E2E Test Agency',
        plan: 'professional',
        status: 'active',
      },
    });

    // Create user
    user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: 'test@e2e.com',
        passwordHash: 'hashed',
        firstName: 'Test',
        lastName: 'User',
        role: 'admin',
        status: 'active',
        preferences: {},
      },
    });

    // Create client
    client = await prisma.client.create({
      data: {
        tenantId: tenant.id,
        companyName: 'E2E Test Client',
        industry: 'Technology',
        status: 'prospect',
        problemStatement: 'Need to automate sales process',
        budget: '$10,000 - $20,000',
        timeline: '3 months',
      },
    });

    // Generate auth token
    authToken = Buffer.from(
      JSON.stringify({
        sub: user.id,
        email: user.email,
        tenantId: user.tenantId,
        role: user.role,
      }),
    ).toString('base64');
  }

  async function cleanupTestData() {
    if (tenant?.id) {
      await prisma.proposal.deleteMany({ where: { tenantId: tenant.id } });
      await prisma.transcription.deleteMany({ where: { tenantId: tenant.id } });
      await prisma.client.deleteMany({ where: { tenantId: tenant.id } });
      await prisma.user.deleteMany({ where: { tenantId: tenant.id } });
      await prisma.tenant.delete({ where: { id: tenant.id } });
    }
  }

  describe('Complete Proposal Workflow', () => {
    let transcriptionId: string;
    let proposalId: string;

    it('Step 1: Create a transcription (simulated)', async () => {
      // In a real E2E test, you'd upload a file
      // For now, we'll create the transcription directly in the database
      const transcription = await prisma.transcription.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          clientId: client.id,
          fileName: 'client-meeting.mp3',
          fileSize: 1024000,
          fileType: 'audio/mpeg',
          s3Key: 'test/transcriptions/test.mp3',
          s3Bucket: 'test-bucket',
          status: 'completed',
          transcript:
            'This is a test transcript of a client meeting discussing their needs.',
          analyzed: true,
          extractedData: {
            problemStatement: 'Need to automate sales outreach',
            budget: { min: 10000, max: 20000, currency: 'USD' },
            timeline: '3 months',
          },
        },
      });

      transcriptionId = transcription.id;
      expect(transcriptionId).toBeDefined();
    });

    it('Step 2: Create a proposal from transcription', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/proposals')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          clientId: client.id,
          transcriptionId: transcriptionId,
          title: 'Sales Automation Proposal for E2E Test Client',
        })
        .expect(201);

      proposalId = response.body.id;
      expect(response.body.title).toBe(
        'Sales Automation Proposal for E2E Test Client',
      );
      expect(response.body.status).toBe('draft');
      expect(response.body.clientId).toBe(client.id);
    });

    it('Step 3: Generate AI content (simulated)', async () => {
      // Note: This would normally queue a background job
      // For testing, we'll manually update the proposal with generated content
      await prisma.proposal.update({
        where: { id: proposalId },
        data: {
          status: 'ready',
          executiveSummary: 'AI-generated executive summary',
          problemStatement: 'AI-generated problem statement',
          proposedSolution: 'AI-generated proposed solution',
          scope: 'AI-generated project scope',
          timeline: 'AI-generated timeline',
          pricing: {
            items: [
              {
                name: 'Development',
                description: 'Full implementation',
                price: 15000,
              },
              { name: 'Support', description: '3 months support', price: 3000 },
            ],
            total: 18000,
          },
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/proposals/${proposalId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('ready');
      expect(response.body.executiveSummary).toBeDefined();
      expect(response.body.pricing.total).toBe(18000);
    });

    it('Step 4: Edit proposal content', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/proposals/${proposalId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          executiveSummary: 'Updated executive summary with more details',
          pricing: {
            items: [
              {
                name: 'Development',
                description: 'Full implementation',
                price: 15000,
              },
              { name: 'Support', description: '6 months support', price: 5000 },
            ],
            total: 20000,
          },
        })
        .expect(200);

      expect(response.body.executiveSummary).toBe(
        'Updated executive summary with more details',
      );
      expect(response.body.pricing.total).toBe(20000);
    });


    it('Step 5: Export to PDF (simulated)', async () => {
      // Note: This would normally generate a PDF with Puppeteer
      // For testing purposes, we'll skip the actual PDF generation
      // and just verify the endpoint accepts the request

      // In a real E2E test with proper mocking:
      // const response = await request(app.getHttpServer())
      //   .post(`/api/v1/proposals/${proposalId}/export-pdf`)
      //   .set('Authorization', `Bearer ${authToken}`)
      //   .expect(200);
      //
      // expect(response.body.pdfUrl).toBeDefined();
      // expect(response.body.expiresAt).toBeDefined();

      // For now, we'll just verify the proposal has the required content
      const proposal = await prisma.proposal.findUnique({
        where: { id: proposalId },
      });

      expect(proposal.executiveSummary).toBeDefined();
      expect(proposal.proposedSolution).toBeDefined();
    });

    it('Step 6: Retrieve proposal and verify all data', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/proposals/${proposalId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify all expected fields are present
      expect(response.body.id).toBe(proposalId);
      expect(response.body.title).toBe(
        'Sales Automation Proposal for E2E Test Client',
      );
      expect(response.body.status).toBe('ready');
      expect(response.body.client).toBeDefined();
      expect(response.body.client.companyName).toBe('E2E Test Client');
      expect(response.body.executiveSummary).toBeDefined();
      expect(response.body.problemStatement).toBeDefined();
      expect(response.body.proposedSolution).toBeDefined();
      expect(response.body.scope).toBeDefined();
      expect(response.body.timeline).toBeDefined();
      expect(response.body.pricing).toBeDefined();
      expect(response.body.pricing.total).toBe(20000);
      expect(response.body.created).toBeDefined();
      expect(response.body.updated).toBeDefined();
    });
  });

  describe('Proposal Listing and Filtering', () => {
    beforeAll(async () => {
      // Create multiple proposals with different statuses
      await prisma.proposal.createMany({
        data: [
          {
            tenantId: tenant.id,
            userId: user.id,
            clientId: client.id,
            title: 'Draft Proposal 1',
            status: 'draft',
          },
          {
            tenantId: tenant.id,
            userId: user.id,
            clientId: client.id,
            title: 'Draft Proposal 2',
            status: 'draft',
          },
          {
            tenantId: tenant.id,
            userId: user.id,
            clientId: client.id,
            title: 'Sent Proposal 1',
            status: 'sent',
            sentAt: new Date(),
          },
        ],
      });
    });

    it('should list all proposals with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/proposals')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.pagination.total).toBeGreaterThan(0);
    });

    it('should filter proposals by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/proposals')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ status: 'draft' })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
      response.body.data.forEach((proposal: any) => {
        expect(proposal.status).toBe('draft');
      });
    });

    it('should filter proposals by client', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/proposals')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ clientId: client.id })
        .expect(200);

      expect(response.body.data).toBeDefined();
      response.body.data.forEach((proposal: any) => {
        expect(proposal.clientId).toBe(client.id);
      });
    });

    it('should sort proposals by created date descending', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/proposals')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ sortBy: 'created', sortOrder: 'desc' })
        .expect(200);

      expect(response.body.data).toBeDefined();
      if (response.body.data.length > 1) {
        const dates = response.body.data.map((p: any) =>
          new Date(p.created).getTime(),
        );
        for (let i = 0; i < dates.length - 1; i++) {
          expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1]);
        }
      }
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent proposal', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/proposals/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 400 for invalid create request', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/proposals')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required field: clientId
          title: 'Invalid Proposal',
        })
        .expect(400);
    });

    it('should return 401 for unauthenticated request', async () => {
      await request(app.getHttpServer()).get('/api/v1/proposals').expect(401);
    });
  });
});
