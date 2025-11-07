import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

export class DatabaseTestHelper {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }

  /**
   * Initialize the test database with migrations
   */
  async initialize(): Promise<void> {
    try {
      console.log('Initializing test database...');

      // Run migrations on test database
      execSync('npx prisma migrate deploy', {
        env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
        stdio: 'inherit',
      });

      console.log('Test database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize test database:', error);
      throw error;
    }
  }

  /**
   * Seed minimal required data for tests (subscription plans are required for registration)
   */
  async seedRequiredData(): Promise<void> {
    try {
      console.log('Seeding required test data...');

      // Create subscription plans (required for user registration)
      const existingPlans = await this.prisma.subscriptionPlan.count();

      if (existingPlans === 0) {
        await this.prisma.subscriptionPlan.createMany({
          data: [
            {
              name: 'professional',
              displayName: 'Professional',
              description: 'Test plan for integration tests',
              monthlyPrice: 550,
              annualPrice: 5500,
              monthlyTokens: 35000,
              annualTokens: 42000,
              currency: 'usd',
              overageTokenCost: 0.009,
              monthlyEmailCredits: 5000,
              contactLimit: 1000,
              unlimitedMailboxes: true,
              unlimitedWarmup: true,
              supportLevel: 'chatbot',
              features: {
                crm: true,
                basicAnalytics: true,
                emailCampaigns: true,
                transcriptions: true,
                proposals: true,
                maxUsers: 5,
                support: 'email',
              },
              isActive: true,
              sortOrder: 1,
              isMostPopular: false,
              isCustomPricing: false,
            },
            {
              name: 'advanced',
              displayName: 'Advanced',
              description: 'Test plan for integration tests',
              monthlyPrice: 1500,
              annualPrice: 15000,
              monthlyTokens: 100000,
              annualTokens: 120000,
              currency: 'usd',
              overageTokenCost: 0.008,
              monthlyEmailCredits: 100000,
              contactLimit: 25000,
              unlimitedMailboxes: true,
              unlimitedWarmup: true,
              supportLevel: 'priority',
              features: {
                crm: true,
                basicAnalytics: true,
                advancedAnalytics: true,
                emailCampaigns: true,
                transcriptions: true,
                proposals: true,
                hubspotIntegration: true,
                apiAccess: true,
                maxUsers: 15,
                support: 'priority',
              },
              isActive: true,
              sortOrder: 2,
              isMostPopular: true,
              isCustomPricing: false,
            },
          ],
        });

        // Create token pricing entries
        await this.prisma.tokenPricing.createMany({
          data: [
            { model: 'gpt-4o-mini', inputCostPer1k: 0.00015, outputCostPer1k: 0.0006 },
            { model: 'gpt-4o', inputCostPer1k: 0.0025, outputCostPer1k: 0.01 },
          ],
        });
      }

      console.log('Required test data seeded successfully');
    } catch (error) {
      console.error('Failed to seed test data:', error);
      throw error;
    }
  }

  /**
   * Clean all test data from the database (in correct order to handle foreign keys)
   */
  async cleanupAllData(): Promise<void> {
    try {
      console.log('Cleaning up test data...');

      // Delete in correct order to handle foreign key constraints
      // Using correct model names from schema
      await this.prisma.tokenTransaction.deleteMany({});
      await this.prisma.transcription.deleteMany({});
      await this.prisma.proposalPricingLineItem.deleteMany({});
      await this.prisma.proposalPricingOption.deleteMany({});
      await this.prisma.proposalRevision.deleteMany({});
      await this.prisma.proposal.deleteMany({});
      await this.prisma.userJourney.deleteMany({});
      await this.prisma.companyProfile.deleteMany({});
      await this.prisma.client.deleteMany({});
      await this.prisma.campaignEmail.deleteMany({});
      await this.prisma.campaign.deleteMany({});
      await this.prisma.mailbox.deleteMany({});
      await this.prisma.contact.deleteMany({});
      await this.prisma.supportMessage.deleteMany({});
      await this.prisma.supportConversation.deleteMany({});
      await this.prisma.tenantSubscription.deleteMany({});
      await this.prisma.tenantEmailCredits.deleteMany({});
      await this.prisma.emailCreditTransaction.deleteMany({});
      await this.prisma.user.deleteMany({});
      await this.prisma.tenant.deleteMany({});
      // Don't delete subscription plans or token pricing as they're needed for all tests

      console.log('Test data cleaned successfully');
    } catch (error) {
      console.error('Failed to cleanup test data:', error);
      throw error;
    }
  }

  /**
   * Truncate specific tables for isolated test cleanup
   */
  async cleanupTables(tables: string[]): Promise<void> {
    for (const table of tables) {
      if (this.prisma[table]) {
        await this.prisma[table].deleteMany({});
      }
    }
  }

  /**
   * Get Prisma client instance for direct database operations in tests
   */
  getClient(): PrismaClient {
    return this.prisma;
  }

  /**
   * Disconnect from the database
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }

  /**
   * Connect to the database
   */
  async connect(): Promise<void> {
    await this.prisma.$connect();
  }

  /**
   * Drop all data and recreate the database (nuclear option for test isolation)
   */
  async resetDatabase(): Promise<void> {
    try {
      console.log('Resetting test database...');

      // Clean all data
      await this.cleanupAllData();

      // Re-seed required data
      await this.seedRequiredData();

      console.log('Test database reset successfully');
    } catch (error) {
      console.error('Failed to reset test database:', error);
      throw error;
    }
  }

  /**
   * Check if database is ready for tests
   */
  async isReady(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}

// Singleton instance for tests
let dbHelper: DatabaseTestHelper | null = null;

export function getDatabaseTestHelper(): DatabaseTestHelper {
  if (!dbHelper) {
    dbHelper = new DatabaseTestHelper();
  }
  return dbHelper;
}

export async function setupTestDatabase(): Promise<DatabaseTestHelper> {
  const helper = getDatabaseTestHelper();
  await helper.connect();
  await helper.initialize();
  await helper.seedRequiredData();
  return helper;
}

export async function cleanupTestDatabase(): Promise<void> {
  const helper = getDatabaseTestHelper();
  await helper.cleanupAllData();
  await helper.disconnect();
}
