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
    // Get all transcriptions
    const transcriptions = await prisma.transcription.findMany({
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

    console.log('=== Transcriptions in Database ===');
    console.log(`Total transcriptions found: ${transcriptions.length}`);
    console.log('');

    if (transcriptions.length === 0) {
      console.log('No transcriptions found in the database.');
    } else {
      transcriptions.forEach((transcription: any, index: number) => {
        console.log(`${index + 1}. ${transcription.title}`);
        console.log(`   ID: ${transcription.id}`);
        console.log(`   Status: ${transcription.status}`);
        console.log(`   Client: ${transcription.client?.companyName || 'N/A'}`);
        console.log(`   Duration: ${Math.floor(transcription.duration / 60)} min`);
        console.log(`   Has Transcript: ${transcription.transcript ? 'Yes' : 'No'}`);
        console.log(`   Created: ${transcription.created}`);
        console.log('');
      });
    }

    // Get count by status
    const statusCounts = await prisma.transcription.groupBy({
      by: ['status'],
      _count: true
    });

    console.log('=== Transcriptions by Status ===');
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
