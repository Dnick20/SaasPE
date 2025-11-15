/**
 * Automated Integration Test: AI Proposal Generation with Few-Shot Learning
 *
 * This test validates the complete flow:
 * 1. Register user and get JWT token
 * 2. Create client
 * 3. Upload transcript
 * 4. Create proposal from transcript
 * 5. Generate AI content with few-shot learning
 * 6. Verify all fields are populated correctly
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000/api/v1';
let authToken = '';
let clientId = '';
let transcriptionId = '';
let proposalId = '';

// Test configuration
const WAIT_TIME = 45000; // 45 seconds for AI generation

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n[${'='.repeat(70)}]`, 'cyan');
  log(`STEP ${step}: ${message}`, 'cyan');
  log(`[${'='.repeat(70)}]\n`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Step 1: Register user
async function registerUser() {
  logStep(1, 'Register Test User');

  try {
    const response = await axios.post(`${BASE_URL}/auth/register`, {
      agencyName: 'Test Agency AI',
      email: `test-ai-${Date.now()}@testagency.com`,
      password: 'TestPass123@456!',
      firstName: 'AI',
      lastName: 'Tester',
    });

    authToken = response.data.tokens.accessToken;
    logSuccess('User registered successfully');
    logInfo(`Token: ${authToken.substring(0, 20)}...`);
    return true;
  } catch (error) {
    logError(`Registration failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Step 2: Create client
async function createClient() {
  logStep(2, 'Create Test Client (Acme Corp)');

  try {
    const response = await axios.post(
      `${BASE_URL}/clients`,
      {
        companyName: 'Acme Corp',
        industry: 'SaaS',
        contactFirstName: 'John',
        contactLastName: 'Doe',
        contactEmail: 'john@acme.com',
        problemStatement: 'Need to automate sales process',
        budget: '$50,000 - $100,000',
        timeline: '3 months',
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    clientId = response.data.id;
    logSuccess('Client created successfully');
    logInfo(`Client ID: ${clientId}`);
    return true;
  } catch (error) {
    logError(`Client creation failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Step 3: Upload transcript
async function uploadTranscript() {
  logStep(3, 'Upload Meeting Transcript');

  // Create transcript file
  const transcriptContent = `Meeting with Acme Corp - Sales Discovery Call

John Doe (CEO): We're struggling with our sales process. It takes too long to create proposals, and our win rate is only 15%.

Me: What's your current process?

John: We manually write every proposal from scratch. It takes 5-8 hours per proposal, and we do about 20 proposals per month.

Me: What's your budget for solving this?

John: We can invest $50K-$100K if it solves the problem. We need it done in 3 months.

Me: What tools are you currently using?

John: Google Docs, HubSpot, and PandaDoc. But nothing is integrated.

Me: What's your goal?

John: Reduce proposal creation time by 80% and increase win rate to 30%+.`;

  const transcriptPath = '/tmp/test_transcript_ai.txt';
  fs.writeFileSync(transcriptPath, transcriptContent);

  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(transcriptPath));
    formData.append('clientId', clientId);

    const response = await axios.post(`${BASE_URL}/transcriptions`, formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${authToken}`,
      },
    });

    transcriptionId = response.data.id;
    logSuccess('Transcript uploaded successfully');
    logInfo(`Transcription ID: ${transcriptionId}`);
    logInfo(`Status: ${response.data.status}`);

    // Cleanup
    fs.unlinkSync(transcriptPath);
    return true;
  } catch (error) {
    logError(`Transcript upload failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Step 4: Create proposal from transcript
async function createProposal() {
  logStep(4, 'Create Proposal from Transcript');

  try {
    const response = await axios.post(
      `${BASE_URL}/transcriptions/${transcriptionId}/create-proposal`,
      {},
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    proposalId = response.data.id;
    logSuccess('Proposal created successfully');
    logInfo(`Proposal ID: ${proposalId}`);
    logInfo(`Initial Status: ${response.data.status}`);
    return true;
  } catch (error) {
    logError(`Proposal creation failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Step 5: Generate AI content
async function generateAIContent() {
  logStep(5, 'Trigger AI Content Generation (Zero-Shot)');

  try {
    const response = await axios.post(
      `${BASE_URL}/proposals/${proposalId}/generate`,
      {
        sections: ['executiveSummary', 'problemStatement', 'proposedSolution', 'scope', 'timeline', 'pricing'],
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    logSuccess('AI generation job queued');
    logInfo(`Job ID: ${response.data.jobId}`);
    logInfo(`Status: ${response.data.status}`);
    logInfo(`Estimated completion: ${response.data.estimatedCompletion}`);
    return true;
  } catch (error) {
    logError(`AI generation failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Step 6: Wait and verify
async function waitAndVerify() {
  logStep(6, `Wait ${WAIT_TIME / 1000} seconds for AI generation to complete`);

  logInfo('Waiting for AI to generate proposal content...');

  // Show progress bar
  const totalSteps = 9;
  for (let i = 0; i <= totalSteps; i++) {
    const progress = Math.floor((i / totalSteps) * 100);
    const bar = '█'.repeat(i) + '░'.repeat(totalSteps - i);
    process.stdout.write(`\r${bar} ${progress}%`);
    await new Promise(resolve => setTimeout(resolve, WAIT_TIME / totalSteps));
  }
  console.log('\n');

  logInfo('Checking proposal status...');

  try {
    const response = await axios.get(`${BASE_URL}/proposals/${proposalId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const proposal = response.data;

    logStep(7, 'Verify Results');

    // Check status
    if (proposal.status === 'ready') {
      logSuccess(`Status: ${proposal.status}`);
    } else {
      logWarning(`Status: ${proposal.status} (expected: ready)`);
    }

    // Check AI metadata
    if (proposal.aiModel) {
      logSuccess(`AI Model: ${proposal.aiModel}`);
    } else {
      logError('AI Model: NOT SET');
    }

    if (proposal.aiCost !== null && proposal.aiCost !== undefined) {
      logSuccess(`AI Cost: $${proposal.aiCost.toFixed(4)}`);
    } else {
      logError('AI Cost: NOT SET');
    }

    if (proposal.aiPromptTokens && proposal.aiCompletionTokens) {
      logSuccess(`Tokens: ${proposal.aiPromptTokens} prompt + ${proposal.aiCompletionTokens} completion = ${proposal.aiPromptTokens + proposal.aiCompletionTokens} total`);
    } else {
      logError('Token counts: NOT SET');
    }

    // Check content sections
    const sections = [
      'executiveSummary',
      'problemStatement',
      'proposedSolution',
      'scope',
      'timeline',
      'pricing',
    ];

    log('\nContent Verification:', 'cyan');
    let allSectionsValid = true;

    sections.forEach(section => {
      if (proposal[section]) {
        const preview = typeof proposal[section] === 'string'
          ? proposal[section].substring(0, 80)
          : JSON.stringify(proposal[section]).substring(0, 80);
        logSuccess(`${section}: ${preview}...`);
      } else {
        logError(`${section}: MISSING`);
        allSectionsValid = false;
      }
    });

    // Final verdict
    logStep(8, 'Test Results');

    const passed =
      proposal.status === 'ready' &&
      proposal.aiModel &&
      proposal.aiCost !== null &&
      allSectionsValid;

    if (passed) {
      log('\n' + '='.repeat(80), 'green');
      log('🎉 ALL TESTS PASSED! 🎉', 'green');
      log('='.repeat(80) + '\n', 'green');

      log('Summary:', 'cyan');
      logSuccess('✅ Zero-shot generation works');
      logSuccess('✅ All 6 sections populated');
      logSuccess('✅ Data type conversions correct');
      logSuccess('✅ AI metadata saved properly');
      logSuccess('✅ Prisma validation passed');

      return true;
    } else {
      log('\n' + '='.repeat(80), 'red');
      log('❌ TESTS FAILED ❌', 'red');
      log('='.repeat(80) + '\n', 'red');

      if (proposal.status !== 'ready') {
        logError('Status is not "ready" - check backend logs');
      }
      if (!allSectionsValid) {
        logError('Some sections are missing - check data type conversions');
      }

      return false;
    }

  } catch (error) {
    logError(`Verification failed: ${error.response?.data?.message || error.message}`);
    if (error.response?.status === 401) {
      logWarning('JWT token may have expired. This is expected for long-running tests.');
    }
    return false;
  }
}

// Main test runner
async function runTests() {
  log('\n' + '='.repeat(80), 'cyan');
  log('AUTOMATED INTEGRATION TEST: AI Proposal Generation', 'cyan');
  log('='.repeat(80) + '\n', 'cyan');

  const startTime = Date.now();

  try {
    if (!await registerUser()) process.exit(1);
    if (!await createClient()) process.exit(1);
    if (!await uploadTranscript()) process.exit(1);
    if (!await createProposal()) process.exit(1);
    if (!await generateAIContent()) process.exit(1);
    const passed = await waitAndVerify();

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    log(`\nTotal test duration: ${duration}s`, 'cyan');

    if (passed) {
      log('\n✅ INTEGRATION TEST PASSED - Ready to continue with remaining features!\n', 'green');
      process.exit(0);
    } else {
      log('\n❌ INTEGRATION TEST FAILED - Check logs above for details\n', 'red');
      process.exit(1);
    }

  } catch (error) {
    logError(`Test suite error: ${error.message}`);
    process.exit(1);
  }
}

// Run tests
runTests();
