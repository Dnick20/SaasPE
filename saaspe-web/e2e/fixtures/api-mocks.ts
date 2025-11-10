import { Page } from '@playwright/test';

/**
 * API Mocking Utilities for Playwright E2E Tests
 *
 * Provides reusable mock data and helpers for isolating frontend tests
 */

// Mock User Data
export const mockUser = {
  id: 'user_test_123',
  email: 'test@agency.com',
  firstName: 'Test',
  lastName: 'User',
  tenantId: 'tenant_test_123',
  role: 'admin',
  status: 'active',
};

export const mockTenant = {
  id: 'tenant_test_123',
  name: 'Test Agency',
  plan: 'professional',
  status: 'active',
};

// Mock Company Profile
export const mockCompanyProfile = {
  id: 'profile_test_123',
  tenantId: 'tenant_test_123',
  companyName: 'Test Agency',
  website: 'https://testagency.com',
  industry: 'Marketing',
  targetICP: 'B2B SaaS companies with 50-500 employees',
  preferredTone: 'professional' as const,
  enrichmentData: {
    description: 'Marketing agency for SaaS',
    services: ['SEO', 'Content Marketing'],
    valueProposition: 'Help SaaS companies grow',
  },
};

// Mock Client Data
export const mockClient = {
  id: 'client_test_123',
  tenantId: 'tenant_test_123',
  companyName: 'First Client Corp',
  contactFirstName: 'John',
  contactLastName: 'Doe',
  contactEmail: 'john@firstclient.com',
  status: 'prospect',
  industry: 'Technology',
  created: new Date().toISOString(),
  updated: new Date().toISOString(),
};

// Mock Proposal Data
export const mockProposal = {
  id: 'proposal_test_123',
  tenantId: 'tenant_test_123',
  clientId: 'client_test_123',
  title: 'Digital Marketing Strategy Proposal',
  status: 'draft',
  generationStatus: 'completed',
  executiveSummary: 'Comprehensive marketing solution',
  pricing: {
    items: [
      { name: 'SEO Services', price: 2000, description: 'Monthly' },
      { name: 'Content Marketing', price: 1500, description: 'Monthly' },
    ],
    total: 3500,
  },
  created: new Date().toISOString(),
};

// Mock Mailbox Data
export const mockMailbox = {
  id: 'mailbox_test_123',
  tenantId: 'tenant_test_123',
  userId: 'user_test_123',
  email: 'test@agency.com',
  provider: 'SMTP' as const,
  status: 'ACTIVE' as const,
  warmupStatus: 'ACTIVE' as const,
  warmupDaysActive: 14,
  warmupCurrentLimit: 50,
  warmupTargetLimit: 50,
  healthScore: 95,
  bounceRate: 0.01,
  complaintRate: 0.001,
  created: new Date().toISOString(),
};

// Mock Campaign Data
export const mockCampaign = {
  id: 'campaign_test_123',
  tenantId: 'tenant_test_123',
  name: 'First Campaign',
  status: 'draft' as const,
  mailboxId: 'mailbox_test_123',
  sequence: [
    {
      step: 1,
      subject: 'Quick question about your marketing',
      body: 'Hi {firstName}, I noticed...',
      delayDays: 0,
    },
  ],
  schedule: {
    sendDays: ['1', '2', '3', '4', '5'],
    sendTimeStart: '09:00',
    sendTimeEnd: '17:00',
    timezone: 'America/New_York',
  },
  created: new Date().toISOString(),
};

// Mock Journey State
export const mockJourneyInitial = {
  currentStep: 'discovery' as const,
  completedSteps: [] as string[],
  metadata: {},
  progressPercentage: 0,
  nextAction: {
    label: 'Start Discovery',
    route: '/dashboard/onboarding',
    description: 'Tell us about your business',
    icon: '🎯',
  },
};

export const mockJourneyComplete = {
  currentStep: 'complete' as const,
  completedSteps: ['discovery', 'client', 'proposal', 'playbook', 'mailboxes', 'warmup', 'campaign'],
  metadata: {
    companyName: 'Test Agency',
    firstClientId: 'client_test_123',
    firstProposalId: 'proposal_test_123',
    playbookId: 'playbook_test_123',
    connectedMailboxIds: ['mailbox_test_123'],
    firstCampaignId: 'campaign_test_123',
  },
  progressPercentage: 100,
  nextAction: {
    label: 'Go to Dashboard',
    route: '/dashboard',
    description: "You're all set!",
    icon: '✅',
  },
};

/**
 * Setup comprehensive API mocks for authenticated user
 */
export async function setupAuthenticatedMocks(page: Page) {
  // Auth check
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockUser),
    });
  });

  // Mock cookies for auth
  await page.context().addCookies([
    {
      name: 'auth_token',
      value: 'mock_token_123',
      domain: 'localhost',
      path: '/',
    },
  ]);
}

/**
 * Setup journey endpoint mocks
 */
export async function setupJourneyMocks(
  page: Page,
  journeyState = mockJourneyInitial
) {
  await page.route('**/api/v1/journey*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(journeyState),
      });
    } else if (route.request().method() === 'POST') {
      const body = await route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ ...body, id: 'journey_test_123' }),
      });
    }
  });
}

/**
 * Setup company profile mocks
 */
export async function setupCompanyProfileMocks(page: Page) {
  await page.route('**/api/v1/company-profile*', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname.endsWith('/analyze-website')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockCompanyProfile.enrichmentData),
      });
    } else if (url.pathname.endsWith('/defaults')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockCompanyProfile),
      });
    } else if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockCompanyProfile),
      });
    } else if (route.request().method() === 'POST' || route.request().method() === 'PATCH') {
      const body = await route.request().postDataJSON();
      await route.fulfill({
        status: route.request().method() === 'POST' ? 201 : 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...mockCompanyProfile, ...body }),
      });
    }
  });
}

/**
 * Setup clients endpoint mocks
 */
export async function setupClientsMocks(page: Page, clients = [mockClient]) {
  await page.route('**/api/v1/clients*', async (route) => {
    const url = new URL(route.request().url());
    const clientId = url.pathname.split('/').pop();

    if (route.request().method() === 'GET' && clientId && clientId !== 'clients') {
      // Get single client
      const client = clients.find((c) => c.id === clientId) || mockClient;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(client),
      });
    } else if (route.request().method() === 'GET') {
      // List clients
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          clients,
          total: clients.length,
          page: 1,
          limit: 20,
        }),
      });
    } else if (route.request().method() === 'POST') {
      const body = await route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ ...mockClient, ...body }),
      });
    }
  });
}

/**
 * Setup proposals endpoint mocks
 */
export async function setupProposalsMocks(page: Page, proposals = [mockProposal]) {
  await page.route('**/api/v1/proposals*', async (route) => {
    const url = new URL(route.request().url());
    const proposalId = url.pathname.split('/').pop();

    if (route.request().method() === 'GET' && proposalId && proposalId !== 'proposals') {
      // Get single proposal
      const proposal = proposals.find((p) => p.id === proposalId) || mockProposal;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(proposal),
      });
    } else if (route.request().method() === 'GET') {
      // List proposals
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          proposals,
          total: proposals.length,
          page: 1,
          limit: 20,
        }),
      });
    } else if (route.request().method() === 'POST') {
      const body = await route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ ...mockProposal, ...body }),
      });
    } else if (route.request().method() === 'PATCH') {
      const body = await route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...mockProposal, ...body }),
      });
    }
  });
}

/**
 * Setup mailboxes endpoint mocks
 */
export async function setupMailboxesMocks(page: Page, mailboxes = [mockMailbox]) {
  await page.route('**/api/v1/mailboxes*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          mailboxes,
          total: mailboxes.length,
          page: 1,
          limit: 20,
        }),
      });
    } else if (route.request().method() === 'POST') {
      const body = await route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ ...mockMailbox, ...body }),
      });
    }
  });
}

/**
 * Setup campaigns endpoint mocks
 */
export async function setupCampaignsMocks(page: Page, campaigns = [mockCampaign]) {
  await page.route('**/api/v1/campaigns*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          campaigns,
          total: campaigns.length,
          page: 1,
          limit: 20,
        }),
      });
    } else if (route.request().method() === 'POST') {
      const body = await route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ ...mockCampaign, ...body }),
      });
    }
  });
}

/**
 * Setup all common mocks for most tests
 */
export async function setupCommonMocks(page: Page) {
  await setupAuthenticatedMocks(page);
  await setupJourneyMocks(page);
  await setupCompanyProfileMocks(page);
  await setupClientsMocks(page);
  await setupProposalsMocks(page);
  await setupMailboxesMocks(page);
  await setupCampaignsMocks(page);
}

/**
 * Mock API error response
 */
export async function mockApiError(
  page: Page,
  endpoint: string,
  statusCode: number,
  message: string
) {
  await page.route(endpoint, async (route) => {
    await route.fulfill({
      status: statusCode,
      contentType: 'application/json',
      body: JSON.stringify({
        error: {
          code: 'API_ERROR',
          message,
        },
      }),
    });
  });
}
