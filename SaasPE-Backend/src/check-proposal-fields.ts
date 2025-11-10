import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

async function checkProposal() {
  const proposal = await prisma.proposal.findUnique({
    where: { id: '562bf624-0e84-4ade-87e5-e5d163ccabd2' },
    select: {
      id: true,
      status: true,
      executiveSummary: true,
      objectivesAndOutcomes: true,
      scopeOfWork: true,
      deliverables: true,
      approachAndTools: true,
      timeline: true,
      pricing: true,
      paymentTerms: true,
      cancellationNotice: true,
      coverPageData: true,
    },
  });

  console.log('\n📊 Proposal Fields Check:');
  console.log('ID:', proposal?.id);
  console.log('Status:', proposal?.status);
  console.log('\n✅ Fields with data:');
  console.log('executiveSummary:', proposal?.executiveSummary ? '✓ HAS DATA' : '✗ EMPTY');
  console.log('objectivesAndOutcomes:', proposal?.objectivesAndOutcomes ? '✓ HAS DATA' : '✗ EMPTY');
  console.log('scopeOfWork:', proposal?.scopeOfWork ? '✓ HAS DATA' : '✗ EMPTY');
  console.log('deliverables:', proposal?.deliverables ? '✓ HAS DATA' : '✗ EMPTY');
  console.log('approachAndTools:', proposal?.approachAndTools ? '✓ HAS DATA' : '✗ EMPTY');
  console.log('timeline:', proposal?.timeline ? '✓ HAS DATA' : '✗ EMPTY');
  console.log('pricing:', proposal?.pricing ? '✓ HAS DATA' : '✗ EMPTY');
  console.log('paymentTerms:', proposal?.paymentTerms ? '✓ HAS DATA' : '✗ EMPTY');
  console.log('cancellationNotice:', proposal?.cancellationNotice ? '✓ HAS DATA' : '✗ EMPTY');
  console.log('coverPageData.summary (overview):', proposal?.coverPageData?.['summary'] ? '✓ HAS DATA' : '✗ EMPTY');

  await prisma.$disconnect();
}

checkProposal().catch(console.error);
