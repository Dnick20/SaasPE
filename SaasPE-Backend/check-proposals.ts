import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function main() {
  try {
    // Get all proposals
    const proposals = await prisma.proposal.findMany({
      include: {
        client: {
          select: {
            companyName: true,
          }
        }
      },
      orderBy: {
        created: 'desc'
      },
      take: 10
    });

    console.log('=== Proposals in Database ===');
    console.log(`Total proposals found: ${proposals.length}`);
    console.log('');

    if (proposals.length === 0) {
      console.log('No proposals found in the database.');
    } else {
      proposals.forEach((proposal: any, index: number) => {
        console.log(`${index + 1}. ${proposal.title}`);
        console.log(`   ID: ${proposal.id}`);
        console.log(`   Status: ${proposal.status}`);
        console.log(`   Client: ${proposal.client?.companyName || 'N/A'}`);
        console.log(`   Created: ${proposal.created}`);
        console.log(`   Has Executive Summary: ${proposal.executiveSummary ? 'Yes' : 'No'}`);
        console.log(`   Generation Method: ${proposal.generationMethod || 'N/A'}`);
        console.log('');
      });
    }

    // Get count by status
    const statusCounts = await prisma.proposal.groupBy({
      by: ['status'],
      _count: true
    });

    console.log('=== Proposals by Status ===');
    statusCounts.forEach((stat: any) => {
      console.log(`${stat.status}: ${stat._count}`);
    });

  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
