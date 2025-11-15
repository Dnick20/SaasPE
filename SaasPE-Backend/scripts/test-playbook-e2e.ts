/**
 * End-to-End Test Script for Playbook Implementation
 * Tests all playbook functionality including new fields and script structure
 * 
 * Run with: npx ts-node scripts/test-playbook-e2e.ts
 * Requires: Backend server running on http://localhost:3000
 */

import axios, { AxiosInstance } from 'axios';

const BASE_URL = process.env.API_URL || 'http://localhost:3000/api/v1';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

class PlaybookE2ETest {
  private client: AxiosInstance;
  private accessToken: string = '';
  private tenantId: string = '';
  private userId: string = '';
  private clientId: string = '';
  private playbookId: string = '';
  private results: TestResult[] = [];

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 30000,
    });
  }

  private log(message: string) {
    console.log(message);
  }

  private async runTest(name: string, testFn: () => Promise<void>): Promise<void> {
    try {
      await testFn();
      this.results.push({ name, passed: true });
      this.log(`  ✅ ${name}`);
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message || 'Unknown error';
      this.results.push({ name, passed: false, error: errorMsg, details: error.response?.data });
      this.log(`  ❌ ${name}: ${errorMsg}`);
      throw error;
    }
  }

  async setup() {
    this.log('\n🔧 Setting up test environment...');

    // Try to login with existing test user
    try {
      const loginResponse = await this.client.post('/auth/login', {
        email: 'test@testagency.com',
        password: 'Test1234!',
      });

      this.accessToken = loginResponse.data.tokens.accessToken;
      this.tenantId = loginResponse.data.user.tenantId;
      this.userId = loginResponse.data.user.id;

      this.client.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`;
      this.log('  ✅ Logged in with existing test user');
    } catch (error) {
      // Create new test user
      this.log('  ⚠️  Creating new test user...');
      const registerResponse = await this.client.post('/auth/register', {
        email: `playbook-test-${Date.now()}@test.com`,
        password: 'Test1234!',
        agencyName: 'Playbook Test Agency',
        firstName: 'Test',
        lastName: 'User',
        plan: 'professional',
      });

      this.accessToken = registerResponse.data.tokens.accessToken;
      this.tenantId = registerResponse.data.tenant.id;
      this.userId = registerResponse.data.user.id;

      this.client.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`;
      this.log('  ✅ Created and logged in as new test user');
    }

    // Get or create a client
    try {
      const clientsResponse = await this.client.get('/clients');
      if (clientsResponse.data.length > 0) {
        this.clientId = clientsResponse.data[0].id;
        this.log(`  ✅ Using existing client: ${this.clientId}`);
      } else {
        // Create a test client
        const clientResponse = await this.client.post('/clients', {
          companyName: 'Test Client Company',
          contactEmail: 'client@test.com',
          contactFirstName: 'Test',
          contactLastName: 'Client',
        });
        this.clientId = clientResponse.data.id;
        this.log(`  ✅ Created test client: ${this.clientId}`);
      }
    } catch (error: any) {
      this.log(`  ⚠️  Could not get/create client: ${error.message}`);
      this.log('  (Some tests will be skipped)');
    }
  }

  async testScriptGeneration() {
    this.log('\n📝 Testing Script Generation with New Structure...');

    await this.runTest('Generate scripts with new structure', async () => {
      const response = await this.client.post('/playbooks/generate-scripts', {
        targetICP: {
          industry: 'Technology',
          companySize: '50-200',
          roles: ['CTO', 'VP Engineering'],
          painPoints: ['Scaling issues', 'Legacy systems'],
        },
        tone: 'professional',
        ctas: ['Schedule a call', 'Download guide'],
      });

      const scripts = response.data;

      // Verify email script structure
      if (!scripts.emailScript.subject) throw new Error('Missing emailScript.subject');
      if (!scripts.emailScript.body) throw new Error('Missing emailScript.body');
      if (!scripts.emailScript.ctaText) throw new Error('Missing emailScript.ctaText');
      if (!Array.isArray(scripts.emailScript.followUpSequence)) {
        throw new Error('emailScript.followUpSequence should be an array');
      }

      // Verify LinkedIn script structure
      if (!scripts.linkedInScript.connectionRequest) {
        throw new Error('Missing linkedInScript.connectionRequest');
      }
      if (!scripts.linkedInScript.firstMessage) {
        throw new Error('Missing linkedInScript.firstMessage');
      }
      if (!scripts.linkedInScript.followUpMessage) {
        throw new Error('Missing linkedInScript.followUpMessage');
      }

      // Verify old structure is NOT present
      if (scripts.emailScript.variants) {
        throw new Error('Old field "variants" should not be present');
      }
      if (scripts.emailScript.followUps) {
        throw new Error('Old field "followUps" should not be present');
      }
      if (scripts.linkedInScript.inMail) {
        throw new Error('Old field "inMail" should not be present');
      }
      if (scripts.linkedInScript.messageSequence) {
        throw new Error('Old field "messageSequence" should not be present');
      }

      this.log(`    ✓ Email script: "${scripts.emailScript.subject.substring(0, 50)}..."`);
      this.log(`    ✓ CTA: "${scripts.emailScript.ctaText}"`);
      this.log(`    ✓ LinkedIn first message: "${scripts.linkedInScript.firstMessage.substring(0, 50)}..."`);
    });
  }

  async testPlaybookCreation() {
    if (!this.clientId) {
      this.log('\n⏭️  Skipping playbook creation tests (no client available)');
      return;
    }

    this.log('\n📚 Testing Playbook Creation with New Fields...');

    await this.runTest('Create playbook with new fields', async () => {
      const playbookData = {
        clientId: this.clientId,
        targetICP: {
          industry: 'Technology',
          companySize: '50-200',
          roles: ['CTO'],
          painPoints: ['Scaling'],
        },
        emailScript: {
          subject: 'Solving Scaling Issues for [Company]',
          body: 'Hi [First Name], I noticed your company is facing scaling challenges...',
          ctaText: 'Schedule a call',
          ctaUrl: 'https://calendly.com/test',
          followUpSequence: [
            'Follow-up 1: Still interested?',
            'Follow-up 2: Final check-in',
          ],
        },
        linkedInScript: {
          connectionRequest: 'Hi [First Name], would love to connect!',
          firstMessage: 'Thank you for connecting! I noticed...',
          followUpMessage: 'Following up on our conversation...',
        },
        coldCallScript: {
          opener: 'Hi [First Name], this is [Your Name]...',
          discovery: ['What challenges are you facing?', 'How are you handling it now?'],
          objectionHandling: {
            'Not interested': 'I understand. What if I could show you...',
          },
          close: 'Would you be open to a quick 15-minute call?',
        },
        tone: 'professional',
        structure: {
          phases: ['Awareness', 'Consideration'],
          touchpoints: 5,
        },
        ctas: ['Schedule a call'],
        campaignStrategy: {
          channels: ['Email', 'LinkedIn'],
          touchpoints: 5,
        },
        version: 1,
        isTemplate: false,
      };

      const response = await this.client.post('/playbooks', playbookData);
      this.playbookId = response.data.id;

      // Verify response includes new fields
      if (!response.data.version) throw new Error('Missing version field');
      if (response.data.isTemplate === undefined) throw new Error('Missing isTemplate field');
      if (!response.data.createdBy) throw new Error('Missing createdBy field');

      // Verify script structures
      if (!response.data.linkedInScript.firstMessage) {
        throw new Error('Missing linkedInScript.firstMessage');
      }
      if (!response.data.linkedInScript.followUpMessage) {
        throw new Error('Missing linkedInScript.followUpMessage');
      }
      if (!response.data.emailScript.ctaText) {
        throw new Error('Missing emailScript.ctaText');
      }

      this.log(`    ✓ Playbook created: ${this.playbookId}`);
      this.log(`    ✓ Version: ${response.data.version}`);
      this.log(`    ✓ Is Template: ${response.data.isTemplate}`);
      this.log(`    ✓ Created By: ${response.data.createdBy}`);
    });
  }

  async testPlaybookRetrieval() {
    if (!this.playbookId) {
      this.log('\n⏭️  Skipping playbook retrieval tests (no playbook created)');
      return;
    }

    this.log('\n📖 Testing Playbook Retrieval...');

    await this.runTest('Get playbook by ID', async () => {
      const response = await this.client.get(`/playbooks/${this.playbookId}`);

      if (!response.data.version) throw new Error('Missing version in response');
      if (response.data.isTemplate === undefined) throw new Error('Missing isTemplate in response');
      if (!response.data.createdBy) throw new Error('Missing createdBy in response');

      // Verify script structures
      const linkedIn = response.data.linkedInScript;
      if (!linkedIn.firstMessage || !linkedIn.followUpMessage) {
        throw new Error('LinkedIn script missing new fields');
      }
      if (linkedIn.inMail || linkedIn.messageSequence) {
        throw new Error('LinkedIn script contains old fields');
      }

      const email = response.data.emailScript;
      if (!email.ctaText) {
        throw new Error('Email script missing ctaText');
      }
      if (email.variants || email.followUps) {
        throw new Error('Email script contains old fields');
      }

      this.log(`    ✓ Playbook retrieved successfully`);
      this.log(`    ✓ All new fields present`);
      this.log(`    ✓ Script structures correct`);
    });
  }

  async testPlaybookUpdate() {
    if (!this.playbookId) {
      this.log('\n⏭️  Skipping playbook update tests (no playbook created)');
      return;
    }

    this.log('\n✏️  Testing Playbook Update...');

    await this.runTest('Update playbook with new fields', async () => {
      const updateData = {
        version: 2,
        isTemplate: true,
        emailScript: {
          subject: 'Updated Subject',
          body: 'Updated body',
          ctaText: 'Updated CTA',
          ctaUrl: 'https://updated.com',
          followUpSequence: ['Updated follow-up'],
        },
      };

      const response = await this.client.patch(`/playbooks/${this.playbookId}`, updateData);

      if (response.data.version !== 2) {
        throw new Error(`Version not updated. Expected 2, got ${response.data.version}`);
      }
      if (response.data.isTemplate !== true) {
        throw new Error(`isTemplate not updated. Expected true, got ${response.data.isTemplate}`);
      }
      if (response.data.emailScript.ctaText !== 'Updated CTA') {
        throw new Error('Email script CTA not updated');
      }

      this.log(`    ✓ Version updated to ${response.data.version}`);
      this.log(`    ✓ Is Template updated to ${response.data.isTemplate}`);
      this.log(`    ✓ Email script updated`);
    });
  }

  async testPlaybookList() {
    this.log('\n📋 Testing Playbook List...');

    await this.runTest('List all playbooks', async () => {
      const response = await this.client.get('/playbooks');

      if (!Array.isArray(response.data)) {
        throw new Error('Response is not an array');
      }

      if (response.data.length > 0) {
        const playbook = response.data[0];
        if (!playbook.version && playbook.version !== 0) {
          throw new Error('Playbook missing version field');
        }
        if (playbook.isTemplate === undefined) {
          throw new Error('Playbook missing isTemplate field');
        }
        if (!playbook.createdBy) {
          throw new Error('Playbook missing createdBy field');
        }
      }

      this.log(`    ✓ Retrieved ${response.data.length} playbook(s)`);
      if (response.data.length > 0) {
        this.log(`    ✓ All playbooks have new fields`);
      }
    });
  }

  async cleanup() {
    if (this.playbookId) {
      try {
        await this.client.delete(`/playbooks/${this.playbookId}`);
        this.log(`\n🧹 Cleaned up test playbook: ${this.playbookId}`);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }

  async runAllTests() {
    console.log('\n🧪 Playbook E2E Test Suite');
    console.log('='.repeat(60));
    console.log(`API URL: ${BASE_URL}\n`);

    try {
      await this.setup();
      await this.testScriptGeneration();
      await this.testPlaybookCreation();
      await this.testPlaybookRetrieval();
      await this.testPlaybookUpdate();
      await this.testPlaybookList();
    } catch (error) {
      // Error already logged in runTest
    } finally {
      await this.cleanup();
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Summary');
    console.log('='.repeat(60));

    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;

    this.results.forEach(result => {
      const icon = result.passed ? '✅' : '❌';
      console.log(`${icon} ${result.name}`);
      if (!result.passed && result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    console.log('\n' + '='.repeat(60));
    console.log(`Total: ${this.results.length} | Passed: ${passed} | Failed: ${failed}`);
    console.log('='.repeat(60));

    if (failed > 0) {
      console.log('\n❌ Some tests failed. Check the errors above.');
      process.exit(1);
    } else {
      console.log('\n✅ All tests passed!');
      process.exit(0);
    }
  }
}

// Run tests
const tester = new PlaybookE2ETest();
tester.runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

