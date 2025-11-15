const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const transcription = await prisma.transcription.findUnique({
    where: { id: 'c681f33a-f4d6-4b0c-893e-7f11f50e531a' },
  });

  if (!transcription) {
    console.log('Transcription not found');
    await prisma.$disconnect();
    return;
  }

  console.log('\nTranscription Details:');
  console.log('- ID:', transcription.id);
  console.log('- Analyzed:', transcription.analyzed);
  console.log('- Analysis Cost:', transcription.analysisCost);
  console.log('- AI Confidence:', transcription.aiConfidence);
  console.log('- Has extractedData:', !!transcription.extractedData);
  console.log('- Has salesTips:', !!transcription.salesTips);

  if (transcription.salesTips) {
    console.log('\nSales Tips (Key Moments):');
    const salesTips = transcription.salesTips;
    console.log('- Key Moments:', salesTips.keyMoments?.length || 0);
    console.log('- Action Items:', salesTips.actionItems?.length || 0);
    console.log('- Pain Points:', salesTips.painPoints?.length || 0);
    console.log('- Buying Signals:', salesTips.buyingSignals?.length || 0);
    console.log('- Objections:', salesTips.objections?.length || 0);
    console.log('- Strengths:', salesTips.strengths?.length || 0);
    console.log('- Improvements:', salesTips.improvements?.length || 0);
    console.log('- Next Call Tips:', salesTips.nextCallTips?.length || 0);
  }

  await prisma.$disconnect();
}

check().catch(console.error);
