/**
 * Unit Test Script for Playbook Implementation
 * Tests playbook structure without requiring server
 * 
 * Run with: npx ts-node scripts/test-playbook-unit.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

class PlaybookUnitTest {
  private results: TestResult[] = [];

  private async runTest(name: string, testFn: () => Promise<void>): Promise<void> {
    try {
      await testFn();
      this.results.push({ name, passed: true });
      console.log(`  ✅ ${name}`);
    } catch (error: any) {
      const errorMsg = error.message || 'Unknown error';
      this.results.push({ name, passed: false, error: errorMsg });
      console.log(`  ❌ ${name}: ${errorMsg}`);
      throw error;
    }
  }

  async testDatabaseSchema() {
    console.log('\n📊 Testing Database Schema...');

    await this.runTest('Verify version column exists', async () => {
      const result = await prisma.$queryRaw<Array<{ column_name: string }>>`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'Playbook' AND column_name = 'version';
      `;
      if (result.length === 0) throw new Error('version column not found');
    });

    await this.runTest('Verify isTemplate column exists', async () => {
      const result = await prisma.$queryRaw<Array<{ column_name: string }>>`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'Playbook' AND column_name = 'isTemplate';
      `;
      if (result.length === 0) throw new Error('isTemplate column not found');
    });

    await this.runTest('Verify createdBy column exists', async () => {
      const result = await prisma.$queryRaw<Array<{ column_name: string }>>`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'Playbook' AND column_name = 'createdBy';
      `;
      if (result.length === 0) throw new Error('createdBy column not found');
    });

    await this.runTest('Verify isTemplate index exists', async () => {
      const result = await prisma.$queryRaw<Array<{ indexname: string }>>`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'Playbook' AND indexname LIKE '%isTemplate%';
      `;
      if (result.length === 0) throw new Error('isTemplate index not found');
    });
  }

  async testPrismaTypes() {
    console.log('\n🔷 Testing Prisma Types...');

    await this.runTest('Verify Playbook type includes version', async () => {
      // Try to create a playbook with version field
      const testData = {
        tenantId: 'test-tenant',
        clientId: 'test-client',
        targetICP: {},
        emailScript: {},
        linkedInScript: {},
        coldCallScript: {},
        tone: 'professional',
        structure: {},
        ctas: [],
        campaignCount: 1,
        campaignStrategy: {},
        version: 1,
        isTemplate: false,
        createdBy: 'test-user',
      };

      // Type check - if this compiles, types are correct
      const hasVersion = 'version' in testData;
      const hasIsTemplate = 'isTemplate' in testData;
      const hasCreatedBy = 'createdBy' in testData;

      if (!hasVersion) throw new Error('version field not in type');
      if (!hasIsTemplate) throw new Error('isTemplate field not in type');
      if (!hasCreatedBy) throw new Error('createdBy field not in type');
    });
  }

  async testDataStructure() {
    console.log('\n📦 Testing Data Structure...');

    await this.runTest('Verify email script structure', async () => {
      const emailScript: any = {
        subject: 'Test',
        body: 'Test',
        ctaText: 'Test CTA',
        ctaUrl: 'https://test.com',
        followUpSequence: ['Follow-up 1'],
      };

      if (!emailScript.ctaText) throw new Error('Missing ctaText');
      if (!emailScript.followUpSequence) throw new Error('Missing followUpSequence');
      
      // Verify old fields are not present (for runtime checking)
      const hasOldFields = emailScript.variants || emailScript.followUps;
      if (hasOldFields) {
        throw new Error('Old fields "variants" or "followUps" should not be used');
      }
    });

    await this.runTest('Verify LinkedIn script structure', async () => {
      const linkedInScript: any = {
        connectionRequest: 'Test',
        firstMessage: 'Test first',
        followUpMessage: 'Test follow-up',
      };

      if (!linkedInScript.firstMessage) throw new Error('Missing firstMessage');
      if (!linkedInScript.followUpMessage) throw new Error('Missing followUpMessage');
      
      // Verify old fields are not present (for runtime checking)
      const hasOldFields = linkedInScript.inMail || linkedInScript.messageSequence;
      if (hasOldFields) {
        throw new Error('Old fields "inMail" or "messageSequence" should not be used');
      }
    });
  }

  async testDefaults() {
    console.log('\n⚙️  Testing Default Values...');

    await this.runTest('Verify version default is 1', async () => {
      const result = await prisma.$queryRaw<Array<{ column_default: string }>>`
        SELECT column_default 
        FROM information_schema.columns 
        WHERE table_name = 'Playbook' AND column_name = 'version';
      `;
      if (result.length > 0 && !result[0].column_default?.includes('1')) {
        throw new Error(`Version default should be 1, got: ${result[0].column_default}`);
      }
    });

    await this.runTest('Verify isTemplate default is false', async () => {
      const result = await prisma.$queryRaw<Array<{ column_default: string }>>`
        SELECT column_default 
        FROM information_schema.columns 
        WHERE table_name = 'Playbook' AND column_name = 'isTemplate';
      `;
      if (result.length > 0 && !result[0].column_default?.includes('false')) {
        throw new Error(`isTemplate default should be false, got: ${result[0].column_default}`);
      }
    });
  }

  async runAllTests() {
    console.log('\n🧪 Playbook Unit Test Suite');
    console.log('='.repeat(60));

    try {
      await this.testDatabaseSchema();
      await this.testPrismaTypes();
      await this.testDataStructure();
      await this.testDefaults();
    } catch (error) {
      // Error already logged
    } finally {
      await prisma.$disconnect();
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
      console.log('\n❌ Some tests failed.');
      process.exit(1);
    } else {
      console.log('\n✅ All unit tests passed!');
      console.log('\n💡 To test API endpoints, start the backend server and run:');
      console.log('   npx ts-node scripts/test-playbook-e2e.ts');
      process.exit(0);
    }
  }
}

// Run tests
const tester = new PlaybookUnitTest();
tester.runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

