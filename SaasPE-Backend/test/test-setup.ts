import { config } from 'dotenv';
import { join } from 'path';

// Load test environment variables from .env.test
config({ path: join(__dirname, '../.env.test') });

// Set test timeout globally
jest.setTimeout(30000);

// Suppress console logs in tests unless there's an error
if (process.env.CI || process.env.SILENT_TESTS === 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  };
}
