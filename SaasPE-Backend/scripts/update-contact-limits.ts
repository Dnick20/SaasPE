import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Updating contact limits in subscription plans...');
  console.log('');

  // Update Professional plan
  const professional = await prisma.subscriptionPlan.updateMany({
    where: { name: 'professional' },
    data: { contactLimit: 10000 },
  });
  console.log(`✓ Updated Professional plan: ${professional.count} record(s)`);

  // Update Advanced plan
  const advanced = await prisma.subscriptionPlan.updateMany({
    where: { name: 'advanced' },
    data: { contactLimit: 50000 },
  });
  console.log(`✓ Updated Advanced plan: ${advanced.count} record(s)`);

  // Update Enterprise plan
  const enterprise = await prisma.subscriptionPlan.updateMany({
    where: { name: 'enterprise' },
    data: { contactLimit: 100000 },
  });
  console.log(`✓ Updated Enterprise plan: ${enterprise.count} record(s)`);

  // Update Ultimate plan
  const ultimate = await prisma.subscriptionPlan.updateMany({
    where: { name: 'ultimate' },
    data: { contactLimit: 500000 },
  });
  console.log(`✓ Updated Ultimate plan: ${ultimate.count} record(s)`);

  // Update Starter plan (if exists)
  const starter = await prisma.subscriptionPlan.updateMany({
    where: { name: 'starter' },
    data: { contactLimit: 1000 },
  });
  console.log(`✓ Updated Starter plan: ${starter.count} record(s)`);

  console.log('');
  console.log('📊 Verifying updates...');
  console.log('');

  const plans = await prisma.subscriptionPlan.findMany({
    select: {
      name: true,
      contactLimit: true,
      monthlyPrice: true,
    },
    orderBy: { monthlyPrice: 'asc' },
  });

  console.table(plans);

  console.log('');
  console.log('✅ Contact limits updated successfully!');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
