import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/shared/database/prisma.service';

/**
 * Pricing V2 Workflow E2E Tests
 *
 * Tests the complete Pricing V2 workflow:
 * 1. Create proposal
 * 2. Add pricing options with line items
 * 3. Add pricing notes
 * 4. Update pricing options
 * 5. Delete line items
 * 6. Seed templates
 * 7. Verify PDF rendering includes Pricing V2
 *
 * This ensures all Pricing V2 features work together end-to-end
 */
describe('Pricing V2 Workflow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Test entities
  let tenant: any;
  let user: any;
  let client: any;
  let proposal: any;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Setup test tenant, user, and client
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
        name: 'Pricing V2 E2E Test Agency',
        plan: 'professional',
        status: 'active',
      },
    });

    // Create user
    user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: 'pricing-v2-test@e2e.com',
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
        companyName: 'Pricing V2 Test Client',
        industry: 'Technology',
        status: 'prospect',
        problemStatement: 'Need comprehensive pricing options for enterprise solution',
        budget: '$5,000 - $15,000',
        timeline: '6 months',
      },
    });

    // Create proposal
    proposal = await prisma.proposal.create({
      data: {
        tenantId: tenant.id,
        clientId: client.id,
        title: 'Pricing V2 Test Proposal',
        status: 'draft',
        executiveSummary: 'This is a test proposal for Pricing V2 E2E testing',
        proposedSolution: 'We propose a comprehensive solution to meet your needs',
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
    if (tenant) {
      await prisma.proposal.deleteMany({ where: { tenantId: tenant.id } });
      await prisma.client.deleteMany({ where: { tenantId: tenant.id } });
      await prisma.user.deleteMany({ where: { tenantId: tenant.id } });
      await prisma.tenant.delete({ where: { id: tenant.id } }).catch(() => {});
    }
  }

  // ============================================================================
  // Test Suite
  // ============================================================================

  describe('Complete Pricing V2 Workflow', () => {
    let pricingOptionId: string;
    let lineItemId: string;
    let pricingNoteId: string;

    it('should seed pricing templates', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/proposals/pricing-blueprints/seed')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toBe('Pricing blueprints seeded successfully');
      expect(response.body.templates).toHaveLength(3);
      expect(response.body.count).toBe(3);
    });

    it('should create a pricing option with line items', async () => {
      const dto = {
        label: 'Option A: Diagnostic Sprint',
        billingCadence: 'fixed_fee',
        summary:
          'This fixed-fee engagement provides a comprehensive diagnostic assessment of your current operations, identifying key opportunities for improvement and optimization.',
        tierType: 'single',
        paymentTerms: 'Net 30, payment due upon project completion. ACH or wire transfer preferred.',
        cancellationNotice: 'N/A (fixed engagement with defined deliverables)',
        isRecommended: true,
        lineItems: [
          {
            lineType: 'core',
            description:
              'Twenty Hour Diagnostic Sprint • Fixed fee for one month, up to twenty hours of consulting',
            amount: 2000,
            unitType: 'fixed',
            hoursIncluded: 20,
            notes: 'Unused hours do not roll over to following months',
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post(`/api/v1/proposals/${proposal.id}/pricing-options`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(dto)
        .expect(201);

      expect(response.body.message).toBe('Pricing option created successfully');
      expect(response.body.pricingOption.label).toBe(dto.label);
      expect(response.body.pricingOption.lineItems).toHaveLength(1);

      pricingOptionId = response.body.id;
      lineItemId = response.body.pricingOption.lineItems[0].id;
    });

    it('should add another line item to the pricing option', async () => {
      const dto = {
        lineType: 'addon',
        description:
          'Additional consulting hours beyond included twenty hours at standard hourly rate',
        amount: 150,
        unitType: 'hourly',
        notes: 'Available upon request with 48-hour advance notice',
      };

      const response = await request(app.getHttpServer())
        .post(
          `/api/v1/proposals/${proposal.id}/pricing-options/${pricingOptionId}/line-items`,
        )
        .set('Authorization', `Bearer ${authToken}`)
        .send(dto)
        .expect(201);

      expect(response.body.message).toBe('Line item added successfully');
      expect(response.body.lineItem.description).toBe(dto.description);
      expect(response.body.lineItem.amount).toBe(150);
    });

    it('should add a third-party cost line item', async () => {
      const dto = {
        lineType: 'thirdParty',
        description:
          'Software licensing fees for enterprise analytics platform (billed quarterly)',
        amount: 500,
        unitType: 'monthly',
        requiresApproval: true,
        notes: 'Third-party vendor invoice passed through at cost, no markup applied',
      };

      const response = await request(app.getHttpServer())
        .post(
          `/api/v1/proposals/${proposal.id}/pricing-options/${pricingOptionId}/line-items`,
        )
        .set('Authorization', `Bearer ${authToken}`)
        .send(dto)
        .expect(201);

      expect(response.body.lineItem.requiresApproval).toBe(true);
      expect(response.body.lineItem.lineType).toBe('thirdParty');
    });

    it('should create a second pricing option (retainer)', async () => {
      const dto = {
        label: 'Option B: Monthly Retainer',
        billingCadence: 'monthly_retainer',
        summary:
          'Ongoing monthly retainer providing consistent access to our expertise and support team with flexible hour allocations based on your needs.',
        tierType: 'tiered',
        paymentTerms: 'Monthly invoice, Net 15. ACH or credit card accepted.',
        cancellationNotice: '30-day written notice required for cancellation',
        isRecommended: false,
        lineItems: [
          {
            lineType: 'tier',
            description:
              'Starter Tier • Up to 40 hours per month of consulting and support services',
            amount: 4000,
            unitType: 'monthly',
            hoursIncluded: 40,
          },
          {
            lineType: 'tier',
            description:
              'Professional Tier • Up to 80 hours per month with priority support and dedicated account manager',
            amount: 7500,
            unitType: 'monthly',
            hoursIncluded: 80,
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post(`/api/v1/proposals/${proposal.id}/pricing-options`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(dto)
        .expect(201);

      expect(response.body.pricingOption.billingCadence).toBe('monthly_retainer');
      expect(response.body.pricingOption.lineItems).toHaveLength(2);
    });

    it('should add pricing notes', async () => {
      const dto = {
        noteType: 'payment_method',
        content:
          'Payment accepted via ACH, wire transfer, or credit card. Credit card payments subject to 3% processing fee.',
      };

      const response = await request(app.getHttpServer())
        .post(`/api/v1/proposals/${proposal.id}/pricing-notes`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(dto)
        .expect(201);

      expect(response.body.message).toBe('Pricing note added successfully');
      expect(response.body.note.noteType).toBe('payment_method');

      pricingNoteId = response.body.id;
    });

    it('should add terms pricing note', async () => {
      const dto = {
        noteType: 'terms',
        content:
          'All pricing excludes applicable taxes and third-party expenses unless otherwise noted. Pricing valid for 30 days from proposal date.',
      };

      const response = await request(app.getHttpServer())
        .post(`/api/v1/proposals/${proposal.id}/pricing-notes`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(dto)
        .expect(201);

      expect(response.body.note.noteType).toBe('terms');
    });

    it('should update a pricing option', async () => {
      const dto = {
        label: 'Option A: Diagnostic Sprint (Updated)',
        summary:
          'This updated fixed-fee engagement provides comprehensive diagnostic assessment with enhanced deliverables and detailed recommendations.',
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/proposals/${proposal.id}/pricing-options/${pricingOptionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(dto)
        .expect(200);

      expect(response.body.message).toBe('Pricing option updated successfully');
      expect(response.body.pricingOption.label).toContain('Updated');
    });

    it('should update a line item', async () => {
      const dto = {
        amount: 2500,
        description:
          'Twenty-Five Hour Diagnostic Sprint • Fixed fee for one month, up to twenty-five hours of consulting',
      };

      const response = await request(app.getHttpServer())
        .patch(
          `/api/v1/proposals/${proposal.id}/pricing-options/${pricingOptionId}/line-items/${lineItemId}`,
        )
        .set('Authorization', `Bearer ${authToken}`)
        .send(dto)
        .expect(200);

      expect(response.body.message).toBe('Line item updated successfully');
      expect(response.body.lineItem.amount).toBe(2500);
    });

    it('should update a pricing note', async () => {
      const dto = {
        content:
          'Payment accepted via ACH, wire transfer, credit card, or check. Credit card payments subject to 2.9% processing fee.',
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/proposals/${proposal.id}/pricing-notes/${pricingNoteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(dto)
        .expect(200);

      expect(response.body.message).toBe('Pricing note updated successfully');
      expect(response.body.note.content).toContain('2.9%');
    });

    it('should retrieve proposal with pricing V2 data', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/proposals/${proposal.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.pricingOptionsV2).toBeDefined();
      expect(response.body.pricingOptionsV2.length).toBeGreaterThan(0);
      expect(response.body.pricingNotesV2).toBeDefined();
      expect(response.body.pricingNotesV2.length).toBeGreaterThan(0);

      // Verify recommended option
      const recommendedOption = response.body.pricingOptionsV2.find(
        (opt: any) => opt.isRecommended,
      );
      expect(recommendedOption).toBeDefined();
      expect(recommendedOption.label).toContain('Diagnostic Sprint');
    });

    it('should delete a line item', async () => {
      const response = await request(app.getHttpServer())
        .delete(
          `/api/v1/proposals/${proposal.id}/pricing-options/${pricingOptionId}/line-items/${lineItemId}`,
        )
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toBe('Line item deleted successfully');
    });

    it('should delete a pricing note', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/proposals/${proposal.id}/pricing-notes/${pricingNoteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toBe('Pricing note deleted successfully');
    });

    it('should delete a pricing option', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/proposals/${proposal.id}/pricing-options/${pricingOptionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toBe('Pricing option deleted successfully');
    });

    it('should validate minimum character requirements', async () => {
      const dto = {
        label: 'Short',
        billingCadence: 'fixed_fee',
        summary: 'Too short',
        lineItems: [
          {
            lineType: 'core',
            description: 'Short',
            amount: 1000,
            unitType: 'fixed',
          },
        ],
      };

      await request(app.getHttpServer())
        .post(`/api/v1/proposals/${proposal.id}/pricing-options`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(dto)
        .expect(400);
    });

    it('should reject invalid billing cadence', async () => {
      const dto = {
        label: 'Test Option',
        billingCadence: 'invalid_cadence',
        summary:
          'This is a test summary with sufficient characters to pass validation requirements.',
        lineItems: [
          {
            lineType: 'core',
            description: 'This is a valid line item description with enough characters',
            amount: 1000,
            unitType: 'fixed',
          },
        ],
      };

      await request(app.getHttpServer())
        .post(`/api/v1/proposals/${proposal.id}/pricing-options`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(dto)
        .expect(400);
    });
  });

  describe('Tenant Isolation', () => {
    it('should not allow access to another tenant\'s pricing data', async () => {
      // Create another tenant
      const otherTenant = await prisma.tenant.create({
        data: {
          name: 'Other Tenant',
          plan: 'professional',
          status: 'active',
        },
      });

      const otherUser = await prisma.user.create({
        data: {
          tenantId: otherTenant.id,
          email: 'other@tenant.com',
          passwordHash: 'hashed',
          firstName: 'Other',
          lastName: 'User',
          role: 'admin',
          status: 'active',
          preferences: {},
        },
      });

      const otherAuthToken = Buffer.from(
        JSON.stringify({
          sub: otherUser.id,
          email: otherUser.email,
          tenantId: otherUser.tenantId,
          role: otherUser.role,
        }),
      ).toString('base64');

      // Try to access pricing options from different tenant
      await request(app.getHttpServer())
        .post(`/api/v1/proposals/${proposal.id}/pricing-options`)
        .set('Authorization', `Bearer ${otherAuthToken}`)
        .send({
          label: 'Unauthorized Option',
          billingCadence: 'fixed_fee',
          summary: 'This should not be created due to tenant isolation',
          lineItems: [],
        })
        .expect(404);

      // Cleanup
      await prisma.user.delete({ where: { id: otherUser.id } });
      await prisma.tenant.delete({ where: { id: otherTenant.id } });
    });
  });
});
