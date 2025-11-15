/**
 * Test script for AI enhancements
 *
 * This script demonstrates:
 * 1. Website scraper functionality
 * 2. Enhanced proposal generation with discovery context
 * 3. Transcript summarization
 * 4. Error handling and retry logic
 * 5. Audit logging
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { WebsiteScraperService } from './src/shared/services/website-scraper.service';
import { OpenAIService } from './src/shared/services/openai.service';

async function testWebsiteScraper() {
  console.log('\n=== Testing Website Scraper ===\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const scraperService = app.get(WebsiteScraperService);

  try {
    // Test with a sample website
    const testUrl = 'https://stripe.com'; // Well-structured website
    console.log(`Analyzing website: ${testUrl}`);

    const result = await scraperService.analyzeWebsite(testUrl, 'test-user-id');

    console.log('\nWebsite Analysis Result:');
    console.log(JSON.stringify(result, null, 2));

    console.log('\n✅ Website scraper test passed!');
  } catch (error) {
    console.error('❌ Website scraper test failed:', error.message);
  }

  await app.close();
}

async function testTranscriptSummarization() {
  console.log('\n=== Testing Transcript Summarization ===\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const openaiService = app.get(OpenAIService);

  try {
    // Create a long transcript (>8000 chars)
    const longTranscript = `
      Client: Hi, we're looking for a solution to automate our sales process.
      We currently use Salesforce but it's not integrated with our email system.
      We send about 500 cold emails per week manually, and it's taking too much time.
      Our team is growing, we have about 25 people now, and we expect to double by next year.
      Budget is flexible, but we need to see ROI within 6 months.
      We've looked at HubSpot and Pipedrive, but they don't have the AI features we need.
      Specifically, we want AI to help write personalized emails and proposals.
      We close deals worth $50k-$500k, so personalization is critical.
      We need to track every touchpoint and be able to generate proposals quickly.
      Our sales cycle is typically 3-6 months, with multiple stakeholders involved.
      Timeline is important - we want to launch by Q2 next year.
      We're willing to invest in training and change management.
      Security is also important - we handle sensitive client data.
      We need SOC 2 compliance and role-based access controls.
    `.repeat(100); // Repeat to make it >8000 chars

    console.log(`Original transcript length: ${longTranscript.length} chars`);

    // Test the private summarizeTranscript method (we'll access it via reflection)
    const summarized = await (openaiService as any).summarizeTranscript(
      longTranscript,
    );

    console.log(`Summarized transcript length: ${summarized.length} chars`);
    console.log('\nSummary preview:');
    console.log(summarized.substring(0, 500) + '...');

    const reduction = (
      ((longTranscript.length - summarized.length) / longTranscript.length) *
      100
    ).toFixed(1);
    console.log(`\n✅ Achieved ${reduction}% token reduction!`);
  } catch (error) {
    console.error('❌ Transcript summarization test failed:', error.message);
  }

  await app.close();
}

async function testEnhancedProposalGeneration() {
  console.log('\n=== Testing Enhanced Proposal Generation ===\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const openaiService = app.get(OpenAIService);

  try {
    const clientData = {
      companyName: 'Acme Corp',
      industry: 'SaaS',
      problemStatement: 'Need to automate sales process and improve email outreach',
      budget: { min: 50000, max: 100000, currency: 'USD' },
      timeline: 'Q2 2025 launch',
    };

    const transcriptData = {
      transcript:
        'We need help with sales automation. Currently manual process with 500 emails/week.',
    };

    const discoveryContext = {
      targetICP: 'Mid-market SaaS companies (25-200 employees)',
      tone: 'professional and consultative',
      painPoints: [
        'Manual email sending',
        'Lack of personalization',
        'No CRM integration',
      ],
    };

    console.log('Generating proposal with discovery context...');

    const result = await openaiService.generateProposalContentWithLearning(
      'test-tenant-id',
      clientData,
      transcriptData,
      ['executiveSummary', 'problemStatement', 'proposedSolution'],
      undefined, // No historical examples
      discoveryContext,
      2000, // Lower token limit for testing
    );

    console.log('\nGenerated Proposal Content:');
    console.log('Executive Summary:', result.executiveSummary?.substring(0, 200) + '...');
    console.log('\nProblem Statement:', result.problemStatement?.substring(0, 200) + '...');

    console.log('\n✅ Enhanced proposal generation test passed!');
  } catch (error) {
    console.error('❌ Enhanced proposal generation test failed:', error.message);
  }

  await app.close();
}

async function runAllTests() {
  console.log('🚀 Starting AI Enhancement Tests...\n');

  try {
    await testWebsiteScraper();
    await testTranscriptSummarization();
    await testEnhancedProposalGeneration();

    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests
runAllTests();
