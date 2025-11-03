import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private prisma: PrismaService) {}

  async seedDatabase() {
    this.logger.log('Starting database seed...');
    const results = {
      subscriptionPlans: { created: 0, existing: 0 },
      message: 'Database seed completed successfully',
    };

    try {
      // Seed subscription plans
      const plans = [
        {
          name: 'professional',
          displayName: 'Professional',
          description: 'Perfect for small to mid-sized agencies starting with automation',
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
          displayName: 'Advanced ⭐',
          description: 'Most popular - For growing agencies with higher volume needs',
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
        {
          name: 'enterprise',
          displayName: 'Enterprise',
          description: 'For established agencies with high-volume workflows',
          monthlyPrice: 2500,
          annualPrice: 25000,
          monthlyTokens: 200000,
          annualTokens: 240000,
          currency: 'usd',
          overageTokenCost: 0.007,
          monthlyEmailCredits: 500000,
          contactLimit: 100000,
          unlimitedMailboxes: true,
          unlimitedWarmup: true,
          supportLevel: 'dedicated',
          features: {
            crm: true,
            basicAnalytics: true,
            advancedAnalytics: true,
            emailCampaigns: true,
            transcriptions: true,
            proposals: true,
            hubspotIntegration: true,
            apiAccess: true,
            whiteLabel: true,
            maxUsers: -1,
            support: 'dedicated',
          },
          isActive: true,
          sortOrder: 3,
          isMostPopular: false,
          isCustomPricing: false,
        },
        {
          name: 'ultimate',
          displayName: 'Ultimate',
          description: 'Enterprise-grade with custom solutions',
          monthlyPrice: 5000,
          annualPrice: 50000,
          monthlyTokens: 500000,
          annualTokens: 600000,
          currency: 'usd',
          overageTokenCost: 0.006,
          monthlyEmailCredits: 1000000,
          contactLimit: 500000,
          unlimitedMailboxes: true,
          unlimitedWarmup: true,
          supportLevel: 'dedicated',
          features: {
            crm: true,
            basicAnalytics: true,
            advancedAnalytics: true,
            emailCampaigns: true,
            transcriptions: true,
            proposals: true,
            hubspotIntegration: true,
            apiAccess: true,
            whiteLabel: true,
            customIntegrations: true,
            maxUsers: -1,
            support: 'dedicated',
          },
          isActive: true,
          sortOrder: 4,
          isMostPopular: false,
          isCustomPricing: false,
        },
      ];

      for (const plan of plans) {
        try {
          const existing = await this.prisma.subscriptionPlan.findUnique({
            where: { name: plan.name },
          });

          if (existing) {
            this.logger.log(`Plan already exists: ${plan.name}`);
            results.subscriptionPlans.existing++;
          } else {
            await this.prisma.subscriptionPlan.create({
              data: plan,
            });
            this.logger.log(`Created plan: ${plan.name}`);
            results.subscriptionPlans.created++;
          }
        } catch (error) {
          this.logger.error(`Error creating plan ${plan.name}:`, error);
        }
      }

      this.logger.log('Database seed completed successfully');
      return results;
    } catch (error) {
      this.logger.error('Error seeding database:', error);
      throw error;
    }
  }
}
