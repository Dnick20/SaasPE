const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const proposal = await prisma.proposal.findUnique({
    where: { id: '3683195b-9c65-4ad5-a327-d4bb258e56c5' },
  });

  console.log('AI Metadata:');
  console.log('- aiModel:', proposal.aiModel);
  console.log('- aiCost:', proposal.aiCost);
  console.log('- aiPromptTokens:', proposal.aiPromptTokens);
  console.log('- aiCompletionTokens:', proposal.aiCompletionTokens);
  console.log('- status:', proposal.status);
  
  await prisma.$disconnect();
}

check().catch(console.error);
