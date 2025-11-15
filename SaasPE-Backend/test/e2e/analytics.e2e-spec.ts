import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/shared/database/prisma.service';
import { JwtService } from '@nestjs/jwt';

/**
 * Analytics Endpoints E2E Tests
 *
 * Tests the analytics endpoints for campaign and mailbox analytics
 * Verifies:
 * - Dashboard metrics calculation
 * - Campaign analytics aggregation
 * - Mailbox analytics
 * - Tenant isolation
 */
describe('Analytics (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  // Test data
  let tenant: any;
  let user: any;
  let accessToken: string;
  let client: any;
  let campaign1: any;
  let campaign2: any;
  let mailbox: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    jwtService = app.get<JwtService>(JwtService);

    await cleanupTestData();
    await setupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  /**
   * Setup test data
   */
  async function setupTestData() {
    // Create tenant
    tenant = await prisma.tenant.create({
      data: {
        name: 'Analytics Test Agency',
        plan: 'professional',
        status: 'active',
      },
    });

    // Create user
    user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: 'analytics@test.com',
        passwordHash: 'hashed',
        firstName: 'Analytics',
        lastName: 'Tester',
        role: 'admin',
        status: 'active',
        preferences: {},
      },
    });

    // Generate access token
    accessToken = jwtService.sign({
      sub: user.id,
      email: user.email,
      tenantId: tenant.id,
      role: user.role,
    });

    // Create client
    client = await prisma.client.create({
      data: {
        tenantId: tenant.id,
        companyName: 'Test Client Corp',
        status: 'active',
      },
    });

    // Create proposal
    await prisma.proposal.create({
      data: {
        tenantId: tenant.id,
        title: 'Test Proposal',
        clientId: client.id,
        status: 'sent',
      },
    });

    // Create transcription
    await prisma.transcription.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        clientId: client.id,
        fileName: 'test-audio.mp3',
        fileSize: 1024,
        status: 'completed',
      },
    });

    // Create mailbox
    mailbox = await prisma.mailbox.create({
      data: {
        tenantId: tenant.id,
        email: 'sender@test.com',
        imapHost: 'imap.test.com',
        imapPort: 993,
        smtpHost: 'smtp.test.com',
        smtpPort: 587,
        password: 'encrypted',
        status: 'ACTIVE',
        dailySendLimit: 50,
        warmupProgress: 100,
      },
    });

    // Create campaigns with metrics
    campaign1 = await prisma.campaign.create({
      data: {
        tenantId: tenant.id,
        mailboxId: mailbox.id,
        name: 'Q4 Outreach Campaign',
        subject: 'Partnership Opportunity',
        body: 'Hi {{firstName}}, I wanted to reach out...',
        status: 'running',
        totalContacts: 100,
        sentCount: 100,
        openedCount: 30,
        clickedCount: 10,
        repliedCount: 5,
        bouncedCount: 2,
      },
    });

    campaign2 = await prisma.campaign.create({
      data: {
        tenantId: tenant.id,
        mailboxId: mailbox.id,
        name: 'Product Launch Campaign',
        subject: 'New Product Release',
        body: 'Hi {{firstName}}, We just launched...',
        status: 'completed',
        totalContacts: 50,
        sentCount: 50,
        openedCount: 20,
        clickedCount: 8,
        repliedCount: 3,
        bouncedCount: 1,
      },
    });

    // Create contacts
    const contact1 = await prisma.contact.create({
      data: {
        tenantId: tenant.id,
        email: 'contact1@example.com',
        firstName: 'John',
        lastName: 'Doe',
        company: 'Acme Inc',
        status: 'active',
      },
    });

    const contact2 = await prisma.contact.create({
      data: {
        tenantId: tenant.id,
        email: 'contact2@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        company: 'Beta Corp',
        status: 'active',
      },
    });

    // Create campaign emails with various statuses
    await prisma.campaignEmail.createMany({
      data: [
        {
          campaignId: campaign1.id,
          contactId: contact1.id,
          mailboxId: mailbox.id,
          recipientEmail: 'contact1@example.com',
          recipientName: 'John Doe',
          subject: 'Partnership Opportunity',
          body: 'Hi John...',
          status: 'replied',
          sentAt: new Date(),
          openedAt: new Date(),
          repliedAt: new Date(),
          replyClassification: 'interested',
          replyBody: 'Yes, I would like to learn more!',
        },
        {
          campaignId: campaign1.id,
          contactId: contact2.id,
          mailboxId: mailbox.id,
          recipientEmail: 'contact2@example.com',
          recipientName: 'Jane Smith',
          subject: 'Partnership Opportunity',
          body: 'Hi Jane...',
          status: 'opened',
          sentAt: new Date(),
          openedAt: new Date(),
        },
        {
          campaignId: campaign2.id,
          contactId: contact1.id,
          mailboxId: mailbox.id,
          recipientEmail: 'contact1@example.com',
          recipientName: 'John Doe',
          subject: 'New Product Release',
          body: 'Hi John...',
          status: 'replied',
          sentAt: new Date(),
          openedAt: new Date(),
          repliedAt: new Date(),
          replyClassification: 'not_interested',
          replyBody: 'No thanks.',
        },
      ],
    });
  }

  /**
   * Cleanup test data
   */
  async function cleanupTestData() {
    if (!prisma) return;

    try {
      await prisma.campaignEmail.deleteMany({
        where: { campaign: { tenantId: tenant?.id } },
      });
      await prisma.campaign.deleteMany({ where: { tenantId: tenant?.id } });
      await prisma.contact.deleteMany({ where: { tenantId: tenant?.id } });
      await prisma.mailbox.deleteMany({ where: { tenantId: tenant?.id } });
      await prisma.proposal.deleteMany({ where: { tenantId: tenant?.id } });
      await prisma.transcription.deleteMany({
        where: { tenantId: tenant?.id },
      });
      await prisma.client.deleteMany({ where: { tenantId: tenant?.id } });
      await prisma.user.deleteMany({ where: { tenantId: tenant?.id } });
      await prisma.tenant.deleteMany({
        where: { name: 'Analytics Test Agency' },
      });
    } catch (error) {
      // Ignore errors during cleanup
    }
  }

  describe('GET /api/v1/analytics/dashboard', () => {
    it('should return dashboard metrics', () => {
      return request(app.getHttpServer())
        .get('/api/v1/analytics/dashboard')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('totalClients');
          expect(res.body).toHaveProperty('activeProposals');
          expect(res.body).toHaveProperty('totalTranscriptions');
          expect(res.body).toHaveProperty('campaignsSent');
          expect(res.body).toHaveProperty('responseRate');
          expect(res.body).toHaveProperty('changes');

          expect(res.body.totalClients).toBe(1);
          expect(res.body.totalTranscriptions).toBe(1);
          expect(res.body.campaignsSent).toBe(150); // 100 + 50
        });
    });

    it('should require authentication', () => {
      return request(app.getHttpServer())
        .get('/api/v1/analytics/dashboard')
        .expect(401);
    });

    it('should calculate response rate correctly', () => {
      return request(app.getHttpServer())
        .get('/api/v1/analytics/dashboard')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          const expectedRate = (8 / 150) * 100; // 8 replies out of 150 sent
          expect(res.body.responseRate).toBeCloseTo(expectedRate, 1);
        });
    });
  });

  describe('GET /api/v1/analytics/campaigns', () => {
    it('should return campaign analytics', () => {
      return request(app.getHttpServer())
        .get('/api/v1/analytics/campaigns')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('overview');
          expect(res.body).toHaveProperty('metrics');
          expect(res.body).toHaveProperty('replyClassifications');
          expect(res.body).toHaveProperty('topCampaigns');
          expect(res.body).toHaveProperty('timeSeries');

          // Overview
          expect(res.body.overview.totalCampaigns).toBe(2);
          expect(res.body.overview.totalSent).toBe(150);
          expect(res.body.overview.totalOpened).toBe(50);
          expect(res.body.overview.totalReplied).toBe(8);
          expect(res.body.overview.totalBounced).toBe(3);

          // Metrics
          expect(res.body.metrics.openRate).toBeCloseTo(33.33, 1);
          expect(res.body.metrics.replyRate).toBeCloseTo(5.33, 1);
        });
    });

    it('should return reply classifications breakdown', () => {
      return request(app.getHttpServer())
        .get('/api/v1/analytics/campaigns')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.replyClassifications).toHaveProperty('interested');
          expect(res.body.replyClassifications).toHaveProperty(
            'not_interested',
          );
          expect(res.body.replyClassifications.interested).toBe(1);
          expect(res.body.replyClassifications.not_interested).toBe(1);
        });
    });

    it('should return top campaigns ranked by score', () => {
      return request(app.getHttpServer())
        .get('/api/v1/analytics/campaigns')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.topCampaigns).toBeInstanceOf(Array);
          expect(res.body.topCampaigns.length).toBe(2);

          const topCampaign = res.body.topCampaigns[0];
          expect(topCampaign).toHaveProperty('id');
          expect(topCampaign).toHaveProperty('name');
          expect(topCampaign).toHaveProperty('sent');
          expect(topCampaign).toHaveProperty('openRate');
          expect(topCampaign).toHaveProperty('replyRate');
        });
    });

    it('should filter by date range', () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();

      return request(app.getHttpServer())
        .get('/api/v1/analytics/campaigns')
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('overview');
          expect(res.body).toHaveProperty('timeSeries');
        });
    });

    it('should return time series data', () => {
      return request(app.getHttpServer())
        .get('/api/v1/analytics/campaigns')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.timeSeries).toBeInstanceOf(Array);
          expect(res.body.timeSeries.length).toBeGreaterThan(0);

          const dayData = res.body.timeSeries[0];
          expect(dayData).toHaveProperty('date');
          expect(dayData).toHaveProperty('sent');
          expect(dayData).toHaveProperty('opened');
          expect(dayData).toHaveProperty('clicked');
          expect(dayData).toHaveProperty('replied');
        });
    });
  });

  describe('GET /api/v1/analytics/mailboxes', () => {
    it('should return mailbox analytics', () => {
      return request(app.getHttpServer())
        .get('/api/v1/analytics/mailboxes')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('active');
          expect(res.body).toHaveProperty('warming');
          expect(res.body).toHaveProperty('mailboxes');

          expect(res.body.total).toBe(1);
          expect(res.body.active).toBe(1);
          expect(res.body.warming).toBe(0);
        });
    });

    it('should return detailed mailbox statistics', () => {
      return request(app.getHttpServer())
        .get('/api/v1/analytics/mailboxes')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.mailboxes).toBeInstanceOf(Array);
          expect(res.body.mailboxes.length).toBe(1);

          const mailboxStats = res.body.mailboxes[0];
          expect(mailboxStats).toHaveProperty('id');
          expect(mailboxStats).toHaveProperty('email');
          expect(mailboxStats).toHaveProperty('status');
          expect(mailboxStats).toHaveProperty('sentCount');
          expect(mailboxStats).toHaveProperty('deliveryRate');
          expect(mailboxStats).toHaveProperty('campaigns');

          expect(mailboxStats.email).toBe('sender@test.com');
          expect(mailboxStats.status).toBe('ACTIVE');
          expect(mailboxStats.campaigns).toBe(2);
        });
    });

    it('should calculate delivery rate correctly', () => {
      return request(app.getHttpServer())
        .get('/api/v1/analytics/mailboxes')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          const mailboxStats = res.body.mailboxes[0];
          expect(mailboxStats.deliveryRate).toBeGreaterThan(0);
          expect(mailboxStats.deliveryRate).toBeLessThanOrEqual(100);
        });
    });
  });

  describe('GET /api/v1/analytics/activity', () => {
    it('should return recent activity', () => {
      return request(app.getHttpServer())
        .get('/api/v1/analytics/activity')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Array);
          expect(res.body.length).toBeGreaterThan(0);

          const activity = res.body[0];
          expect(activity).toHaveProperty('id');
          expect(activity).toHaveProperty('type');
          expect(activity).toHaveProperty('description');
          expect(activity).toHaveProperty('timestamp');
        });
    });

    it('should respect limit parameter', () => {
      return request(app.getHttpServer())
        .get('/api/v1/analytics/activity')
        .query({ limit: 5 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Array);
          expect(res.body.length).toBeLessThanOrEqual(5);
        });
    });

    it('should sort activities by timestamp descending', () => {
      return request(app.getHttpServer())
        .get('/api/v1/analytics/activity')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          const activities = res.body;
          for (let i = 1; i < activities.length; i++) {
            const prev = new Date(activities[i - 1].timestamp);
            const curr = new Date(activities[i].timestamp);
            expect(prev.getTime()).toBeGreaterThanOrEqual(curr.getTime());
          }
        });
    });
  });

  describe('Tenant Isolation', () => {
    let otherTenant: any;
    let otherUser: any;
    let otherToken: string;

    beforeAll(async () => {
      // Create another tenant
      otherTenant = await prisma.tenant.create({
        data: {
          name: 'Other Tenant Agency',
          plan: 'starter',
          status: 'active',
        },
      });

      otherUser = await prisma.user.create({
        data: {
          tenantId: otherTenant.id,
          email: 'other@test.com',
          passwordHash: 'hashed',
          firstName: 'Other',
          lastName: 'User',
          role: 'admin',
          status: 'active',
          preferences: {},
        },
      });

      otherToken = jwtService.sign({
        sub: otherUser.id,
        email: otherUser.email,
        tenantId: otherTenant.id,
        role: otherUser.role,
      });
    });

    afterAll(async () => {
      await prisma.user.deleteMany({ where: { tenantId: otherTenant.id } });
      await prisma.tenant.deleteMany({ where: { id: otherTenant.id } });
    });

    it('should not return data from other tenants', () => {
      return request(app.getHttpServer())
        .get('/api/v1/analytics/campaigns')
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.overview.totalCampaigns).toBe(0);
          expect(res.body.overview.totalSent).toBe(0);
        });
    });

    it('should isolate mailbox analytics by tenant', () => {
      return request(app.getHttpServer())
        .get('/api/v1/analytics/mailboxes')
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.total).toBe(0);
          expect(res.body.mailboxes).toEqual([]);
        });
    });
  });
});
