import { PrismaClient } from '@prisma/client';
import Queue from 'bull';

const prisma = new PrismaClient();

async function main() {
  const proposalId = '701f60b5-2411-426b-be98-207519c61d85';

  // Get the proposal details
  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    include: {
      client: true,
      transcription: true,
    },
  });

  if (!proposal) {
    console.log('Proposal not found');
    return;
  }

  console.log('Found proposal:');
  console.log('ID:', proposal.id);
  console.log('Title:', proposal.title);
  console.log('Status:', proposal.status);
  console.log('Generation Method:', proposal.generationMethod);
  console.log('Tenant ID:', proposal.tenantId);
  console.log('Transcription ID:', proposal.transcriptionId);

  // Connect to the proposal queue
  const proposalQueue = new Queue('proposal', {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    },
  });

  // Queue a new generation job
  console.log('\nQueueing new generation job...');

  const job = await proposalQueue.add('generate', {
    proposalId: proposal.id,
    tenantId: proposal.tenantId,
    sections: [
      'executiveSummary',
      'problemStatement',
      'proposedSolution',
      'scope',
      'timeline',
      'pricing',
    ],
  });

  console.log(`Job created with ID: ${job.id}`);
  console.log('Job queued successfully. The proposal should start generating now.');

  await proposalQueue.close();
  await prisma.$disconnect();
}

main().catch(console.error);
