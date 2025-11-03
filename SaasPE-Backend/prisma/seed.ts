import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // ===== SUBSCRIPTION PLANS =====
  console.log('Creating subscription plans...');

  const professionalPlan = await prisma.subscriptionPlan.create({
    data: {
      name: 'professional',
      displayName: 'Professional',
      description: 'Perfect for small to mid-sized agencies starting with automation',
      monthlyPrice: 550,
      annualPrice: 5500, // ~17% discount
      monthlyTokens: 35000,
      annualTokens: 42000, // 20% bonus for annual
      currency: 'usd',
      overageTokenCost: 0.009, // $0.009 per token overage (10% discount from base)
      // NEW: instantly.ai-style features
      monthlyEmailCredits: 5000, // 5K emails/month
      contactLimit: 1000, // 1K contacts
      unlimitedMailboxes: true,
      unlimitedWarmup: true,
      supportLevel: 'chatbot', // AI chatbot support
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
  });

  const advancedPlan = await prisma.subscriptionPlan.create({
    data: {
      name: 'advanced',
      displayName: 'Advanced ⭐',
      description: 'Most popular - For growing agencies with higher volume needs',
      monthlyPrice: 1500,
      annualPrice: 15000, // ~17% discount
      monthlyTokens: 100000,
      annualTokens: 120000, // 20% bonus
      currency: 'usd',
      overageTokenCost: 0.008, // $0.008 per token (20% discount)
      // NEW: instantly.ai-style features
      monthlyEmailCredits: 100000, // 100K emails/month
      contactLimit: 25000, // 25K contacts
      unlimitedMailboxes: true,
      unlimitedWarmup: true,
      supportLevel: 'priority', // Priority support
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
  });

  const enterprisePlan = await prisma.subscriptionPlan.create({
    data: {
      name: 'enterprise',
      displayName: 'Enterprise',
      description: 'For established agencies with high-volume workflows',
      monthlyPrice: 2500,
      annualPrice: 25000, // ~17% discount
      monthlyTokens: 200000,
      annualTokens: 240000, // 20% bonus
      currency: 'usd',
      overageTokenCost: 0.007, // $0.007 per token (30% discount)
      // NEW: instantly.ai-style features
      monthlyEmailCredits: 500000, // 500K emails/month
      contactLimit: 100000, // 100K contacts
      unlimitedMailboxes: true,
      unlimitedWarmup: true,
      supportLevel: 'dedicated', // Dedicated support
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
  });

  const ultimatePlan = await prisma.subscriptionPlan.create({
    data: {
      name: 'ultimate',
      displayName: 'Ultimate',
      description: 'For large agencies requiring unlimited scale and custom support',
      monthlyPrice: 4000,
      annualPrice: 40000, // ~17% discount
      monthlyTokens: 750000,
      annualTokens: 900000, // 20% bonus
      currency: 'usd',
      overageTokenCost: 0.006, // $0.006 per token (40% discount)
      // NEW: instantly.ai-style features
      monthlyEmailCredits: 1000000, // 1M emails/month
      contactLimit: 250000, // 250K contacts
      unlimitedMailboxes: true,
      unlimitedWarmup: true,
      supportLevel: 'dedicated', // Dedicated + phone support
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
        maxUsers: -1, // Unlimited
        support: 'phone',
      },
      isActive: true,
      sortOrder: 4,
      isMostPopular: false,
      isCustomPricing: false,
    },
  });

  console.log('✓ Created 4 subscription plans');

  // ===== TOKEN PRICING =====
  console.log('Creating token pricing catalog...');

  const tokenPricing = [
    // Transcription actions (OpenAI Whisper + AWS S3 - 40% increase)
    {
      actionType: 'transcription_upload_30min',
      category: 'transcription',
      displayName: 'Upload & transcribe meeting (30 min)',
      tokenCost: 70, // 50 * 1.4 = 70
      infrastructureCost: 0.01,
      aiCost: 0.03,
      valueScore: 8,
      description: 'Upload audio/video file and generate AI transcription (30 minutes)',
    },
    {
      actionType: 'transcription_upload_60min',
      category: 'transcription',
      displayName: 'Upload & transcribe meeting (60 min)',
      tokenCost: 140, // 100 * 1.4 = 140
      infrastructureCost: 0.02,
      aiCost: 0.06,
      valueScore: 8,
      description: 'Upload audio/video file and generate AI transcription (60 minutes)',
    },
    {
      actionType: 'extract_key_moments',
      category: 'transcription',
      displayName: 'Extract key moments (AI analysis)',
      tokenCost: 35, // 25 * 1.4 = 35
      infrastructureCost: 0.005,
      aiCost: 0.02,
      valueScore: 7,
      description: 'AI analysis to identify important moments in transcription',
    },
    {
      actionType: 'generate_meeting_summary',
      category: 'transcription',
      displayName: 'Generate meeting summary',
      tokenCost: 21, // 15 * 1.4 = 21
      infrastructureCost: 0.002,
      aiCost: 0.01,
      valueScore: 7,
      description: 'AI-generated summary of meeting transcription',
    },
    // Proposal actions (OpenAI GPT-4o - 75% cost reduction vs gpt-4-turbo)
    {
      actionType: 'proposal_generation',
      category: 'proposal',
      displayName: 'Generate proposal from transcription',
      tokenCost: 53, // Reduced from 210 (75% savings with gpt-4o)
      infrastructureCost: 0.01,
      aiCost: 0.025, // Reduced from 0.1 (75% savings)
      valueScore: 10,
      description: 'Full AI-generated proposal using gpt-4o + gpt-4o-mini',
    },
    {
      actionType: 'proposal_regenerate_section',
      category: 'proposal',
      displayName: 'Regenerate specific section',
      tokenCost: 14, // Reduced from 56 (75% savings with gpt-4o)
      infrastructureCost: 0.003,
      aiCost: 0.008, // Reduced from 0.03 (75% savings)
      valueScore: 7,
      description: 'Regenerate a single section using gpt-4o',
    },
    {
      actionType: 'proposal_ai_enhance',
      category: 'proposal',
      displayName: 'AI-enhance existing proposal',
      tokenCost: 21, // Reduced from 84 (75% savings with gpt-4o)
      infrastructureCost: 0.005,
      aiCost: 0.013, // Reduced from 0.05 (75% savings)
      valueScore: 8,
      description: 'AI suggestions and improvements using gpt-4o',
    },
    // Email campaign actions (AWS SES - 40% increase)
    {
      actionType: 'email_send_single',
      category: 'email',
      displayName: 'Send 1 email',
      tokenCost: 2, // 1 * 1.4 = 1.4, rounded to 2
      infrastructureCost: 0.0001,
      aiCost: 0,
      valueScore: 3,
      description: 'Send single email via AWS SES',
    },
    {
      actionType: 'email_send_bulk_100',
      category: 'email',
      displayName: 'Send 100 emails',
      tokenCost: 140, // 100 * 1.4 = 140
      infrastructureCost: 0.01,
      aiCost: 0,
      valueScore: 5,
      description: 'Bulk send 100 emails',
    },
    {
      actionType: 'email_send_bulk_1000',
      category: 'email',
      displayName: 'Send 1,000 emails',
      tokenCost: 1120, // 800 * 1.4 = 1120
      infrastructureCost: 0.1,
      aiCost: 0,
      valueScore: 6,
      description: 'Bulk send 1,000 emails (20% volume discount)',
    },
    {
      actionType: 'email_generate_copy',
      category: 'email',
      displayName: 'AI-generate email copy',
      tokenCost: 42, // 30 * 1.4 = 42 (OpenAI GPT-4)
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
      tokenCost: 28, // 20 * 1.4 = 28 (OpenAI GPT-4)
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
      tokenCost: 35, // 25 * 1.4 = 35 (OpenAI GPT-4)
      infrastructureCost: 0.003,
      aiCost: 0.02,
      valueScore: 9,
      description: 'Advanced AI-powered analytics insights',
    },
  ];

  for (const pricing of tokenPricing) {
    await prisma.tokenPricing.create({ data: pricing });
  }

  console.log(`✓ Created ${tokenPricing.length} token pricing entries`);

  // ===== TEST TENANT =====
  console.log('Creating test tenant...');

  const tenant = await prisma.tenant.create({
    data: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Acme Marketing Agency',
      subdomain: 'acme',
      plan: 'professional',
      status: 'active',
      billingEmail: 'billing@acme-agency.com',
      usageCredits: 1000,
      usedThisMonth: {
        transcriptionMinutes: 0,
        proposalsGenerated: 0,
        emailsSent: 0,
      },
      settings: {
        defaultTemplates: {},
        brandColors: {
          primary: '#3B82F6',
          secondary: '#10B981',
        },
        emailSignature: 'Best regards,\nAcme Marketing Team',
      },
    },
  });

  console.log('✓ Created test tenant:', tenant.name);

  // ===== TENANT SUBSCRIPTION =====
  console.log('Creating tenant subscription...');

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  await prisma.tenantSubscription.create({
    data: {
      tenantId: tenant.id,
      planId: professionalPlan.id,
      status: 'active',
      billingInterval: 'monthly',
      tokenBalance: 50000, // Full monthly allocation
      monthlyAllocation: 50000,
      tokensUsedThisPeriod: 0,
      lifetimeTokensUsed: 0,
      monthlyPrice: 550,
      currency: 'usd',
      overageTokenCost: 0.009,
      isTrialing: false,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      autoRefillEnabled: false,
    },
  });

  console.log('✓ Created tenant subscription on Professional plan');

  // Create admin user
  const passwordHash = await bcrypt.hash('Admin123!@#', 12);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@acme-agency.com' },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'admin@acme-agency.com',
      passwordHash,
      firstName: 'John',
      lastName: 'Admin',
      role: 'admin',
      status: 'active',
      mfaEnabled: false,
      preferences: {
        notifications: true,
        defaultView: 'dashboard',
        timezone: 'America/New_York',
      },
    },
  });

  console.log('Created admin user:', adminUser.email);

  // Create sample client
  const client = await prisma.client.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      tenantId: tenant.id,
      companyName: 'TechStart Inc.',
      industry: 'SaaS',
      website: 'https://techstart.example.com',
      contactFirstName: 'Jane',
      contactLastName: 'Smith',
      contactEmail: 'jane.smith@techstart.example.com',
      contactPhone: '+1-555-0123',
      problemStatement: 'Need to increase inbound leads by 50% in Q1',
      currentTools: ['HubSpot', 'Mailchimp', 'Google Analytics'],
      budget: '$10,000-$15,000',
      timeline: '3 months',
      status: 'qualified',
    },
  });

  console.log('Created sample client:', client.companyName);

  // Create sample transcription
  const transcription = await prisma.transcription.create({
    data: {
      tenantId: tenant.id,
      userId: adminUser.id,
      clientId: client.id,
      fileName: 'discovery-call-techstart.mp3',
      fileSize: 5242880, // 5MB
      fileType: 'audio/mpeg',
      s3Key: 'transcripts/sample-discovery-call.mp3',
      s3Bucket: 'saaspe-uploads-dev',
      duration: 1800, // 30 minutes
      status: 'completed',
      transcript: `Jane Smith: Hi, thanks for taking the time to meet with us today. I'm Jane, the VP of Marketing at TechStart.

John Admin: Thanks for having me, Jane. Tell me about TechStart and what you're looking to accomplish.

Jane Smith: We're a B2B SaaS company that provides project management tools for remote teams. We've been growing steadily, but we're struggling to scale our inbound lead generation. Right now, we're getting about 200 qualified leads per month, but we need to double that to hit our revenue targets for Q1.

John Admin: That's a great goal. What have you tried so far?

Jane Smith: We're using HubSpot for our CRM and Mailchimp for email campaigns. We've been running Google Ads and some LinkedIn campaigns, but the cost per lead is too high - around $150 per qualified lead. Our sales team says they need better quality leads, not just more volume.

John Admin: I see. What's your current tech stack looking like?

Jane Smith: Besides HubSpot and Mailchimp, we use Google Analytics for tracking. We also have a content team that publishes blog posts twice a week, but we're not seeing great engagement.

John Admin: Got it. And what's your budget for this project?

Jane Smith: We're thinking somewhere in the range of $10,000 to $15,000 for the initial setup and strategy, and then ongoing management costs after that.

John Admin: Perfect. And timeline-wise, when do you need to see results?

Jane Smith: Ideally we'd like to start seeing improvement within 3 months, with the full impact by end of Q1.`,
      confidence: 0.95,
      language: 'en',
      analyzed: true,
      extractedData: {
        problemStatement: 'Need to increase inbound leads by 50% in Q1',
        budget: '$10,000-$15,000',
        timeline: '3 months',
        currentTools: ['HubSpot', 'Mailchimp', 'Google Analytics'],
        painPoints: [
          'High cost per lead ($150)',
          'Need better quality leads',
          'Low blog engagement',
        ],
        goals: [
          'Double qualified leads from 200 to 400/month',
          'Reduce cost per lead',
          'Improve lead quality',
        ],
        stakeholders: [
          {
            name: 'Jane Smith',
            role: 'VP of Marketing',
            email: 'jane.smith@techstart.example.com',
          },
        ],
      },
      aiConfidence: 0.92,
      transcriptionCost: 0.36, // $0.006 per minute * 60 minutes
      analysisCost: 0.05,
    },
  });

  console.log('Created sample transcription:', transcription.fileName);

  console.log('Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
