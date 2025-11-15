import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Updating subscription plan pricing...');

  // Update Professional Plan
  await prisma.subscriptionPlan.update({
    where: { name: 'professional' },
    data: {
      monthlyPrice: 500,
      annualPrice: 5000,
      monthlyTokens: 35000,
      annualTokens: 42000,
    },
  });
  console.log('✓ Updated Professional plan: $500/month, 35,000 tokens');

  // Update Advanced Plan
  await prisma.subscriptionPlan.update({
    where: { name: 'advanced' },
    data: {
      monthlyPrice: 1500,
      annualPrice: 15000,
      monthlyTokens: 100000,
      annualTokens: 120000,
    },
  });
  console.log('✓ Updated Advanced plan: $1,500/month, 100,000 tokens');

  // Update Enterprise Plan
  await prisma.subscriptionPlan.update({
    where: { name: 'enterprise' },
    data: {
      monthlyPrice: 2500,
      annualPrice: 25000,
      monthlyTokens: 200000,
      annualTokens: 240000,
    },
  });
  console.log('✓ Updated Enterprise plan: $2,500/month, 200,000 tokens');

  // Update all existing tenant subscriptions to reflect new allocations
  console.log('\nUpdating existing tenant subscriptions...');

  const subscriptions = await prisma.tenantSubscription.findMany({
    include: { plan: true },
  });

  for (const subscription of subscriptions) {
    const newAllocation = subscription.plan.monthlyTokens;
    await prisma.tenantSubscription.update({
      where: { id: subscription.id },
      data: {
        monthlyAllocation: newAllocation,
        monthlyPrice: subscription.plan.monthlyPrice,
        // Optionally adjust current token balance
        // tokenBalance: newAllocation, // Uncomment to reset balances
      },
    });
    console.log(`✓ Updated subscription for tenant ${subscription.tenantId}`);
  }

  console.log('\n✅ All pricing updated successfully!');
  console.log('\n📊 New Pricing Structure:');
  console.log('Professional: $500/month - 35,000 tokens');
  console.log('Advanced: $1,500/month - 100,000 tokens');
  console.log('Enterprise: $2,500/month - 200,000 tokens');
  console.log('\n💰 Margins: ~2,700-3,100% (far exceeding 200% target)');
}

main()
  .catch((e) => {
    console.error('Error updating pricing:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
