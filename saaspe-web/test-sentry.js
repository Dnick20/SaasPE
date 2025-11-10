// Simple Sentry Test Script for Web Frontend
// Run with: node test-sentry.js

require('dotenv').config({ path: '.env.local' });
const Sentry = require('@sentry/nextjs');

// Initialize Sentry
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || 'development',
  tracesSampleRate: 0.1,
});

console.log('🚀 Sentry initialized for Web Frontend!');
console.log('📡 DSN:', process.env.NEXT_PUBLIC_SENTRY_DSN ? 'Configured ✅' : 'Missing ❌');
console.log('🌍 Environment:', process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || 'development');
console.log('\n🧪 Sending test error to Sentry...\n');

// Test 1: Undefined function error
try {
  myUndefinedFunction();
} catch (e) {
  Sentry.captureException(e, {
    tags: {
      test: 'manual',
      source: 'web-frontend',
    },
    extra: {
      testType: 'undefined_function',
      timestamp: new Date().toISOString(),
    },
  });
  console.log('❌ Test error 1 captured:', e.message);
}

// Test 2: Custom error
Sentry.captureMessage('Test message from SaasPE Web Frontend', 'info');
console.log('📨 Test message sent to Sentry');

console.log('\n✅ Tests completed!');
console.log('📊 Check your Sentry dashboard at: https://sentry.io');
console.log('   Organization: bv-studios');
console.log('   Project: saaspe-web\n');
console.log('⏳ Waiting 2 seconds for Sentry to send data...\n');

// Wait for Sentry to send the data
setTimeout(() => {
  console.log('✨ Done! Check your Sentry Issues page.');
  console.log('   You should see: ReferenceError: myUndefinedFunction is not defined\n');
  process.exit(0);
}, 2000);
