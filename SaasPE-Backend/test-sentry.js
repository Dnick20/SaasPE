// Simple Sentry Test Script
// Run with: node test-sentry.js

require('dotenv').config();
const Sentry = require('@sentry/node');

// Initialize Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || 'development',
  tracesSampleRate: 0.1,
});

console.log('🚀 Sentry initialized successfully!');
console.log('📡 DSN:', process.env.SENTRY_DSN ? 'Configured ✅' : 'Missing ❌');
console.log('\n🧪 Sending test error to Sentry...\n');

// Create a test error
try {
  // This function doesn't exist - it will throw an error
  foo();
} catch (e) {
  // Capture the error in Sentry
  Sentry.captureException(e);
  console.log('❌ Test error captured:', e.message);
}

// Add some context
Sentry.captureMessage('Test message from SaasPE backend', 'info');

console.log('\n✅ Test error sent to Sentry!');
console.log('📊 Check your Sentry dashboard at: https://sentry.io\n');
console.log('⏳ Waiting 2 seconds for Sentry to send data...\n');

// Wait for Sentry to send the data
setTimeout(() => {
  console.log('✨ Done! Check your Sentry Issues page.');
  console.log('   You should see a ReferenceError: foo is not defined\n');
  process.exit(0);
}, 2000);
