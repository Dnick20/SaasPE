import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        created: true,
      },
      orderBy: {
        created: 'desc',
      },
      take: 10,
    });

    console.log('\n=== Users in Database ===');
    users.forEach((user, idx) => {
      console.log(`\n${idx + 1}. ${user.email}`);
      console.log(`   Name: ${user.firstName} ${user.lastName}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   ID: ${user.id}`);
    });
    console.log(`\nTotal users: ${users.length}\n`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
