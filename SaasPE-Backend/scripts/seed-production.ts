import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Environment safety check
if (process.env.NODE_ENV !== 'production') {
  console.error('❌ ERROR: This script is for production only!');
  console.error('Current NODE_ENV:', process.env.NODE_ENV);
  console.error('To run in production, set: NODE_ENV=production');
  process.exit(1);
}

async function seedProductionDatabase() {
  console.log('🌱 Starting production database seed...');
  console.log('⚠️  This script will only seed reference data (no test data)');

  try {
    await seedSubscriptionPlans();
    await seedTokenPricing();

    console.log('\n✅ Production database seed completed successfully!');
  } catch (error) {
    console.error('\n❌ Production seed failed:', error);
    throw error;
  }
}

async function seedSubscriptionPlans() {
  console.log('\n📋 Seeding subscription plans...');

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
        docusignIntegration: true,
        apiAccess: true,
        whiteLabel: true,
        customBranding: true,
        maxUsers: 50,
        support: 'priority',
      },
      isActive: true,
      sortOrder: 3,
      isMostPopular: false,
      isCustomPricing: false,
    },
    {
      name: 'ultimate',
      displayName: 'Ultimate',
      description: 'For large agencies requiring unlimited scale and custom support',
      monthlyPrice: 4000,
      annualPrice: 40000,
      monthlyTokens: 750000,
      annualTokens: 900000,
      currency: 'usd',
      overageTokenCost: 0.006,
      monthlyEmailCredits: 1000000,
      contactLimit: 250000,
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
        docusignIntegration: true,
        apiAccess: true,
        whiteLabel: true,
        customBranding: true,
        customIntegrations: true,
        dedicatedAccountManager: true,
        slaGuarantees: true,
        maxUsers: -1,
        support: 'phone',
      },
      isActive: true,
      sortOrder: 4,
      isMostPopular: false,
      isCustomPricing: false,
    },
  ];

  for (const plan of plans) {
    const result = await prisma.subscriptionPlan.upsert({
      where: { name: plan.name },
      update: {}, // Don't update existing plans
      create: plan,
    });

    console.log(`  ✓ ${plan.name}: ${result.id}`);
  }

  console.log(`✅ Seeded ${plans.length} subscription plans (idempotent)`);
}

async function seedTokenPricing() {
  console.log('\n💰 Seeding token pricing catalog...');

  const tokenPricing = [
    // Transcription actions
    {
      actionType: 'transcription_upload_30min',
      category: 'transcription',
      displayName: 'Upload & transcribe meeting (30 min)',
      tokenCost: 70,
      infrastructureCost: 0.01,
      aiCost: 0.03,
      valueScore: 8,
      description: 'Upload audio/video file and generate AI transcription (30 minutes)',
    },
    {
      actionType: 'transcription_upload_60min',
      category: 'transcription',
      displayName: 'Upload & transcribe meeting (60 min)',
      tokenCost: 140,
      infrastructureCost: 0.02,
      aiCost: 0.06,
      valueScore: 8,
      description: 'Upload audio/video file and generate AI transcription (60 minutes)',
    },
    {
      actionType: 'extract_key_moments',
      category: 'transcription',
      displayName: 'Extract key moments (AI analysis)',
      tokenCost: 35,
      infrastructureCost: 0.005,
      aiCost: 0.02,
      valueScore: 7,
      description: 'AI analysis to identify important moments in transcription',
    },
    {
      actionType: 'generate_meeting_summary',
      category: 'transcription',
      displayName: 'Generate meeting summary',
      tokenCost: 21,
      infrastructureCost: 0.002,
      aiCost: 0.01,
      valueScore: 7,
      description: 'AI-generated summary of meeting transcription',
    },
    // Proposal actions
    {
      actionType: 'proposal_generation',
      category: 'proposal',
      displayName: 'Generate proposal from transcription',
      tokenCost: 210,
      infrastructureCost: 0.01,
      aiCost: 0.1,
      valueScore: 10,
      description: 'Full AI-generated proposal based on meeting transcription',
    },
    {
      actionType: 'proposal_regenerate_section',
      category: 'proposal',
      displayName: 'Regenerate specific section',
      tokenCost: 56,
      infrastructureCost: 0.003,
      aiCost: 0.03,
      valueScore: 7,
      description: 'Regenerate a single section of an existing proposal',
    },
    {
      actionType: 'proposal_ai_enhance',
      category: 'proposal',
      displayName: 'AI-enhance existing proposal',
      tokenCost: 84,
      infrastructureCost: 0.005,
      aiCost: 0.05,
      valueScore: 8,
      description: 'AI suggestions and improvements for existing proposal',
    },
    // Email campaign actions
    {
      actionType: 'email_send_single',
      category: 'email',
      displayName: 'Send 1 email',
      tokenCost: 2,
      infrastructureCost: 0.0001,
      aiCost: 0,
      valueScore: 3,
      description: 'Send single email via AWS SES',
    },
    {
      actionType: 'email_send_bulk_100',
      category: 'email',
      displayName: 'Send 100 emails',
      tokenCost: 140,
      infrastructureCost: 0.01,
      aiCost: 0,
      valueScore: 5,
      description: 'Bulk send 100 emails',
    },
    {
      actionType: 'email_send_bulk_1000',
      category: 'email',
      displayName: 'Send 1,000 emails',
      tokenCost: 1120,
      infrastructureCost: 0.1,
      aiCost: 0,
      valueScore: 6,
      description: 'Bulk send 1,000 emails (20% volume discount)',
    },
    {
      actionType: 'email_generate_copy',
      category: 'email',
      displayName: 'AI-generate email copy',
      tokenCost: 42,
      infrastructureCost: 0.002,
      aiCost: 0.025,
      valueScore: 7,
      description: 'AI copywriting for email campaigns',
    },
    // CRM actions
    {
      actionType: 'client_create',
      category: 'crm',
      displayName: 'Create client record',
      tokenCost: 2,
      infrastructureCost: 0.001,
      aiCost: 0,
      valueScore: 5,
      description: 'Create new client in CRM',
    },
    {
      actionType: 'client_update',
      category: 'crm',
      displayName: 'Update client record',
      tokenCost: 1,
      infrastructureCost: 0.0005,
      aiCost: 0,
      valueScore: 4,
      description: 'Update existing client record',
    },
    {
      actionType: 'client_sync_hubspot',
      category: 'crm',
      displayName: 'Sync to HubSpot (bidirectional)',
      tokenCost: 5,
      infrastructureCost: 0.003,
      aiCost: 0,
      valueScore: 6,
      description: 'Bidirectional sync with HubSpot CRM',
    },
    {
      actionType: 'client_generate_insights',
      category: 'crm',
      displayName: 'Generate client insights (AI)',
      tokenCost: 28,
      infrastructureCost: 0.002,
      aiCost: 0.015,
      valueScore: 8,
      description: 'AI analysis of client data for insights',
    },
    // Export actions
    {
      actionType: 'export_pdf',
      category: 'export',
      displayName: 'Export proposal to PDF',
      tokenCost: 10,
      infrastructureCost: 0.005,
      aiCost: 0,
      valueScore: 6,
      description: 'Generate PDF from proposal',
    },
    {
      actionType: 'export_docusign',
      category: 'export',
      displayName: 'Send to DocuSign',
      tokenCost: 15,
      infrastructureCost: 0.008,
      aiCost: 0,
      valueScore: 8,
      description: 'Send document to DocuSign for e-signature',
    },
    {
      actionType: 'export_google_docs',
      category: 'export',
      displayName: 'Export to Google Docs',
      tokenCost: 5,
      infrastructureCost: 0.003,
      aiCost: 0,
      valueScore: 5,
      description: 'Export to Google Docs format',
    },
    // Analytics actions
    {
      actionType: 'analytics_dashboard',
      category: 'analytics',
      displayName: 'Generate dashboard (daily)',
      tokenCost: 5,
      infrastructureCost: 0.002,
      aiCost: 0,
      valueScore: 5,
      description: 'Daily automated analytics dashboard',
    },
    {
      actionType: 'analytics_custom_report',
      category: 'analytics',
      displayName: 'Custom report generation',
      tokenCost: 15,
      infrastructureCost: 0.005,
      aiCost: 0,
      valueScore: 7,
      description: 'On-demand custom analytics report',
    },
    {
      actionType: 'analytics_ai_insights',
      category: 'analytics',
      displayName: 'AI insights & recommendations',
      tokenCost: 35,
      infrastructureCost: 0.003,
      aiCost: 0.02,
      valueScore: 9,
      description: 'Advanced AI-powered analytics insights',
    },
  ];

  for (const pricing of tokenPricing) {
    const result = await prisma.tokenPricing.upsert({
      where: { actionType: pricing.actionType },
      update: {}, // Don't update existing pricing
      create: pricing,
    });

    console.log(`  ✓ ${pricing.actionType}`);
  }

  console.log(`✅ Seeded ${tokenPricing.length} token pricing entries (idempotent)`);
}

// Main execution
seedProductionDatabase()
  .catch((error) => {
    console.error('Fatal error during seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
