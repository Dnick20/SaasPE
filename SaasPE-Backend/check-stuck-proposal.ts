import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get the most recent proposal that's in generating status
  const stuckProposal = await prisma.proposal.findFirst({
    where: {
      status: 'generating',
    },
    orderBy: {
      created: 'desc',
    },
    include: {
      client: true,
      transcription: true,
    },
  });

  if (!stuckProposal) {
    console.log('No proposals stuck in generating status');
    return;
  }

  console.log('Found stuck proposal:');
  console.log('ID:', stuckProposal.id);
  console.log('Title:', stuckProposal.title);
  console.log('Status:', stuckProposal.status);
  console.log('Client:', stuckProposal.client?.companyName);
  console.log('Transcription ID:', stuckProposal.transcriptionId);

  // Skip error check - Proposal model doesn't have error field

  // Check timestamps
  const now = new Date();
  const createdAt = new Date(stuckProposal.created);
  const minutesElapsed = (now.getTime() - createdAt.getTime()) / 1000 / 60;
  console.log(`\nMinutes elapsed since creation: ${minutesElapsed.toFixed(2)}`);

  console.log('\nGeneration Method:', stuckProposal.generationMethod);
  console.log('Has Executive Summary:', !!stuckProposal.executiveSummary);
  console.log('Has Objectives & Outcomes:', !!stuckProposal.objectivesAndOutcomes);
  console.log('Has Approach & Tools:', !!stuckProposal.approachAndTools);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
