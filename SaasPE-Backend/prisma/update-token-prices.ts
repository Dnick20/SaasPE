import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Updating token prices (40% increase for OpenAI and AWS features)...');

  const updates = [
    // OpenAI Whisper + AWS S3
    { actionType: 'transcription_upload_30min', newCost: 70 },
    { actionType: 'transcription_upload_60min', newCost: 140 },

    // OpenAI GPT-4
    { actionType: 'extract_key_moments', newCost: 35 },
    { actionType: 'generate_meeting_summary', newCost: 21 },
    { actionType: 'proposal_generation', newCost: 210 },
    { actionType: 'proposal_regenerate_section', newCost: 56 },
    { actionType: 'proposal_ai_enhance', newCost: 84 },
    { actionType: 'email_generate_copy', newCost: 42 },
    { actionType: 'client_generate_insights', newCost: 28 },
    { actionType: 'analytics_ai_insights', newCost: 35 },

    // AWS SES
    { actionType: 'email_send_single', newCost: 2 },
    { actionType: 'email_send_bulk_100', newCost: 140 },
    { actionType: 'email_send_bulk_1000', newCost: 1120 },
  ];

  for (const update of updates) {
    try {
      await prisma.tokenPricing.update({
        where: { actionType: update.actionType },
        data: { tokenCost: update.newCost },
      });
      console.log(`✓ Updated ${update.actionType}: ${update.newCost} tokens`);
    } catch (error) {
      console.error(`✗ Failed to update ${update.actionType}:`, error.message);
    }
  }

  console.log('\nToken prices updated successfully!');
}

main()
  .catch((e) => {
    console.error('Error updating token prices:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
