const { PrismaClient } = require('@prisma/client');

const DATABASE_URL = "postgresql://saaspe_admin:qWp-3%7ByoJ4t%26WH9%218MYwd%2BHoTaN%2AX%23%28D@saaspe-production-postgres.cp8uiigkalb0.us-east-2.rds.amazonaws.com:5432/saaspe";

const prisma = new PrismaClient({
  datasourceUrl: DATABASE_URL
});

async function addProposalPricing() {
  console.log('Adding proposal pricing...');

  const tokenPricing = [
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
      displayName: 'AI enhance proposal',
      tokenCost: 42,
      infrastructureCost: 0.002,
      aiCost: 0.02,
      valueScore: 7,
      description: 'Use AI to enhance and polish proposal content',
    },
  ];

  for (const pricing of tokenPricing) {
    try {
      const result = await prisma.tokenPricing.upsert({
        where: { actionType: pricing.actionType },
        update: pricing,
        create: pricing,
      });

      console.log(`✓ ${pricing.actionType}: ${result.id}`);
    } catch (error) {
      console.error(`Error adding ${pricing.actionType}:`, error.message);
    }
  }

  console.log(`✅ Completed adding proposal pricing entries`);

  await prisma.$disconnect();
}

addProposalPricing().catch((error) => {
  console.error('Error:', error);
  prisma.$disconnect();
  process.exit(1);
});
