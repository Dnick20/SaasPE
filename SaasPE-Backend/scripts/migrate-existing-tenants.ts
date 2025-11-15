/**
 * Migration Script for Existing Tenants
 *
 * This script initializes new features for existing tenants:
 * 1. Initialize email credits based on subscription plan
 * 2. Set warmup status for existing mailboxes
 * 3. Create any missing required records
 *
 * Usage:
 *   npx ts-node scripts/migrate-existing-tenants.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Email credit allocation per plan
const PLAN_EMAIL_CREDITS = {
  Starter: 5000,
  Growth: 100000,
  Professional: 500000,
  Enterprise: 1000000,
};

async function main() {
  console.log('🚀 Starting tenant migration...\n');

  try {
    // Get all tenants
    const tenants = await prisma.tenant.findMany({
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
        mailboxes: true,
        emailCredits: true,
      },
    });

    console.log(`Found ${tenants.length} tenants to migrate\n`);

    for (const tenant of tenants) {
      console.log(`\n📦 Migrating tenant: ${tenant.name} (${tenant.id})`);

      // 1. Initialize email credits if not exists
      if (!tenant.emailCredits) {
        const planName = tenant.subscription?.plan?.name || 'Starter';
        const monthlyAllocation = PLAN_EMAIL_CREDITS[planName as keyof typeof PLAN_EMAIL_CREDITS] || 5000;

        await prisma.tenantEmailCredits.create({
          data: {
            tenantId: tenant.id,
            monthlyAllocation,
            creditsUsed: 0,
            currentPeriodStart: new Date(),
            currentPeriodEnd: getNextMonthFirstDay(),
          },
        });

        console.log(`  ✅ Initialized email credits: ${monthlyAllocation} credits/month`);
      } else {
        console.log(`  ℹ️  Email credits already initialized`);
      }

      // 2. Update mailboxes with warmup status
      if (tenant.mailboxes.length > 0) {
        for (const mailbox of tenant.mailboxes) {
          // Set warmup status based on current mailbox status
          let warmupStatus: 'IDLE' | 'WARMING' | 'ACTIVE' | 'PAUSED' = 'IDLE';

          if (mailbox.status === 'ACTIVE') {
            // Existing active mailboxes are considered already warmed up
            warmupStatus = 'ACTIVE';
          } else if (mailbox.status === 'WARMING') {
            warmupStatus = 'WARMING';
          }

          await prisma.mailbox.update({
            where: { id: mailbox.id },
            data: {
              warmupStatus,
              warmupCurrentLimit: warmupStatus === 'ACTIVE' ? mailbox.dailySendLimit : 5,
              warmupTargetLimit: mailbox.dailySendLimit,
            },
          });
        }

        console.log(`  ✅ Updated ${tenant.mailboxes.length} mailboxes with warmup status`);
      }
    }

    console.log('\n\n✨ Migration completed successfully!');
    console.log('\nSummary:');
    console.log(`  - Migrated ${tenants.length} tenants`);
    console.log(`  - Initialized email credits for tenants without them`);
    console.log(`  - Updated mailbox warmup statuses`);

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Get the first day of next month
 */
function getNextMonthFirstDay(): Date {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth;
}

// Run the migration
main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
