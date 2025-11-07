const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkProposal() {
  const proposal = await prisma.proposal.findUnique({
    where: { id: '85db7935-51a9-4a38-8ea3-283040c1798d' },
    select: {
      id: true,
      status: true,
      aiModel: true,
      aiCost: true,
      executiveSummary: true,
      problemStatement: true,
      proposedSolution: true,
      scope: true,
      timeline: true,
      pricing: true,
    },
  });

  console.log(JSON.stringify(proposal, null, 2));
  await prisma.$disconnect();
}

checkProposal().catch(console.error);
