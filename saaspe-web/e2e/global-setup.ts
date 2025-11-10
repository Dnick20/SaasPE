import { chromium, FullConfig } from '@playwright/test';
import path from 'path';

async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3001';
  const storageStatePath = path.join(__dirname, '..', '.auth', 'user.json');

  console.log('Creating test user and authenticated session...');

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Try to register test user
    await page.goto(`${baseURL}/register`);

    await page.fill('input[name="tenantName"]', 'Test Agency');
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'User');
    await page.fill('input[name="email"]', 'test@testagency.com');
    await page.fill('input[name="password"]', 'TestPassword123!');

    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard or error
    await page.waitForURL(/.*/, { timeout: 5000 }).catch(() => {});

    console.log('Test user created or already exists');
  } catch (error) {
    console.log('Test user may already exist, continuing...');
  }

  // Now login to create authenticated session
  try {
    await page.goto(`${baseURL}/login`);
    await page.fill('input[name="email"]', 'test@testagency.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');

    // Wait for successful login (redirect to dashboard)
    await page.waitForURL(/.*dashboard/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Save authenticated state
    await context.storageState({ path: storageStatePath });
    console.log(`Authenticated session saved to ${storageStatePath}`);
  } catch (error) {
    console.log('Failed to create authenticated session:', error);
  } finally {
    await context.close();
    await browser.close();
  }
}

export default globalSetup;
