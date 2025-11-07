const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');
  console.log('Creating subscription plans...');

  const plans = [
    {
      name: 'professional',
      displayName: 'Professional',
      description: 'Perfect for small to mid-sized agencies starting with automation',
      monthlyPrice: 550,
      annualPrice: 5500,
      monthlyTokens: 35000,
      isActive: true,
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
      isActive: true,
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
      isActive: true,
      isMostPopular: false,
      isCustomPricing: false,
    },
    {
      name: 'ultimate',
      displayName: 'Ultimate',
      description: 'For large agencies requiring unlimited scale and custom support',
      monthlyPrice: 4000,
      annualPrice: 40000,
      monthlyTokens: 350000,
      isActive: true,
      isMostPopular: false,
      isCustomPricing: false,
    },
  ];

  for (const plan of plans) {
    try {
      await prisma.subscriptionPlan.upsert({
        where: { name: plan.name },
        update: {},
        create: plan,
      });
      console.log(`✅ Created/verified plan: ${plan.name}`);
    } catch (error) {
      console.error(`❌ Error creating plan ${plan.name}:`, error.message);
    }
  }

  console.log('Database seed completed!');
}

main()
  .then(() => {
    prisma.$disconnect();
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error seeding database:', error);
    prisma.$disconnect();
    process.exit(1);
  });
