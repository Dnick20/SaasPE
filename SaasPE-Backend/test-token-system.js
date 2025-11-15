const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';

async function testTokenSystem() {
  try {
    console.log('🧪 Testing Token System\n');
    console.log('=' .repeat(60));

    // Step 1: Register a new user
    console.log('\n1️⃣  Registering test user...');
    const registerResponse = await axios.post(`${BASE_URL}/auth/register`, {
      email: `tokentest${Date.now()}@agency.com`,
      password: 'TestToken123!@#$',
      agencyName: 'Token Test Agency',
      firstName: 'Token',
      lastName: 'Tester',
      plan: 'professional'
    });

    const { tokens, user, tenant } = registerResponse.data;
    const tenantId = tenant.id;
    const accessToken = tokens.accessToken;

    console.log(`✅ User registered successfully`);
    console.log(`   Tenant ID: ${tenantId}`);
    console.log(`   User: ${user.firstName} ${user.lastName} (${user.email})`);
    console.log(`   Token: ${accessToken.substring(0, 20)}...`);

    const headers = { Authorization: `Bearer ${accessToken}` };

    // Step 2: Test Token Balance
    console.log('\n2️⃣  Testing token balance endpoint...');
    const balanceResponse = await axios.get(`${BASE_URL}/tokens/balance`, { headers });
    const balance = balanceResponse.data;

    console.log(`✅ Token Balance Retrieved:`);
    console.log(`   Available Tokens: ${balance.tokenBalance.toLocaleString()}`);
    console.log(`   Monthly Allocation: ${balance.monthlyAllocation.toLocaleString()}`);
    console.log(`   Used This Period: ${balance.tokensUsedThisPeriod.toLocaleString()}`);
    console.log(`   Usage: ${balance.usagePercentage.toFixed(2)}%`);
    console.log(`   Plan: ${balance.plan.displayName} ($${balance.plan.monthlyPrice}/mo)`);

    // Step 3: Test Pricing Catalog
    console.log('\n3️⃣  Testing pricing catalog endpoint...');
    const pricingResponse = await axios.get(`${BASE_URL}/tokens/pricing`, { headers });
    const pricing = pricingResponse.data;

    console.log(`✅ Pricing Catalog Retrieved (${pricing.length} action types):`);

    // Show AI/AWS features with updated prices
    const aiFeatures = pricing.filter(p =>
      ['transcription', 'proposal', 'email'].includes(p.category)
    ).slice(0, 8);

    console.log('\n   Updated AI/AWS Features (40% increase):');
    aiFeatures.forEach(p => {
      console.log(`   • ${p.displayName}: ${p.tokenCost} tokens`);
    });

    // Step 4: Test Transaction History (empty initially)
    console.log('\n4️⃣  Testing transaction history endpoint...');
    const transactionsResponse = await axios.get(`${BASE_URL}/tokens/transactions?limit=5`, { headers });
    const transactions = transactionsResponse.data;

    console.log(`✅ Transaction History Retrieved:`);
    console.log(`   Total Transactions: ${transactions.transactions.length}`);
    console.log(`   Summary: ${JSON.stringify(transactions.summary, null, 2)}`);

    // Step 5: Test Can Perform Action
    console.log('\n5️⃣  Testing action check endpoint...');
    const checkResponse = await axios.post(
      `${BASE_URL}/tokens/check`,
      { actionType: 'proposal_generation' },
      { headers }
    );

    console.log(`✅ Action Check for "proposal_generation":`);
    console.log(`   Can Perform: ${checkResponse.data.canPerform}`);
    console.log(`   Cost: ${checkResponse.data.cost} tokens`);
    console.log(`   Current Balance: ${checkResponse.data.currentBalance.toLocaleString()}`);

    // Step 6: Test actual token consumption (create client + transcription)
    console.log('\n6️⃣  Testing real token consumption...');

    // Create a client first
    const clientResponse = await axios.post(
      `${BASE_URL}/clients`,
      {
        companyName: 'Test Client Corp',
        industry: 'Technology',
        contactEmail: 'contact@testclient.com'
      },
      { headers }
    );
    const clientId = clientResponse.data.id;
    console.log(`   ✓ Client created: ${clientId}`);

    // Upload a text transcription
    const FormData = require('form-data');
    const form = new FormData();
    const testContent = 'This is a test meeting transcription. We discussed the project scope and timeline.';
    form.append('file', Buffer.from(testContent), {
      filename: 'test-meeting.txt',
      contentType: 'text/plain'
    });
    form.append('clientId', clientId);

    const uploadResponse = await axios.post(
      `${BASE_URL}/transcriptions`,
      form,
      {
        headers: {
          ...headers,
          ...form.getHeaders()
        }
      }
    );

    const transcriptionId = uploadResponse.data.id;
    console.log(`   ✓ Transcription uploaded: ${transcriptionId}`);

    // Analyze the transcription (this will consume tokens!)
    console.log('\n   Analyzing transcription (will consume 35 tokens)...');

    try {
      const analyzeResponse = await axios.post(
        `${BASE_URL}/transcriptions/${transcriptionId}/analyze`,
        {},
        { headers }
      );

      console.log(`   ✓ Analysis started: Job ${analyzeResponse.data.jobId}`);

      // Check balance again
      const newBalanceResponse = await axios.get(`${BASE_URL}/tokens/balance`, { headers });
      const newBalance = newBalanceResponse.data;

      console.log(`\n   Token Balance After Consumption:`);
      console.log(`   • Previous Balance: ${balance.tokenBalance.toLocaleString()}`);
      console.log(`   • New Balance: ${newBalance.tokenBalance.toLocaleString()}`);
      console.log(`   • Tokens Consumed: ${balance.tokenBalance - newBalance.tokenBalance}`);
      console.log(`   • Used This Period: ${newBalance.tokensUsedThisPeriod.toLocaleString()}`);

      // Get transaction history
      const newTransactionsResponse = await axios.get(`${BASE_URL}/tokens/transactions?limit=5`, { headers });
      const newTransactions = newTransactionsResponse.data;

      console.log(`\n   Recent Transactions:`);
      newTransactions.transactions.forEach((tx, i) => {
        console.log(`   ${i + 1}. ${tx.type.toUpperCase()}: ${tx.tokens} tokens`);
        console.log(`      ${tx.description}`);
        console.log(`      Balance: ${tx.balanceBefore} → ${tx.balanceAfter}`);
      });

    } catch (error) {
      if (error.response?.status === 403) {
        console.log(`   ⚠️  Token consumption prevented (insufficient balance)`);
      } else {
        throw error;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TOKEN SYSTEM TESTS PASSED!\n');

  } catch (error) {
    console.error('\n❌ Test Failed:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Error: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.error(`   ${error.message}`);
    }
    process.exit(1);
  }
}

testTokenSystem();
