import { test, expect } from '@playwright/test';

// Simple production smoke test
// Usage:
//   APP_BASE_URL=https://app.saasope.com \
//   API_BASE_URL=https://api.saasope.com/api/v1 \
//   npx playwright test tests/e2e/prod-smoke.spec.ts --project=chromium

const APP_BASE_URL = process.env.APP_BASE_URL || process.env.PROD_BASE_URL || 'https://app.saasope.com';
const API_BASE_URL = process.env.API_BASE_URL || 'https://api.saasope.com/api/v1';

test.describe('Production smoke @smoke', () => {
  test('API health responds OK', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/health`);
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    // Expect a minimal shape without over-constraining
    expect(json).toHaveProperty('status');
    expect(String(json.status).toLowerCase()).toContain('ok');
  });

  test('App root loads without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err?.message || String(err)}`));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(`console.error: ${msg.text()}`);
    });

    // Check the origin responds (accept 2xx or 3xx status codes)
    // 307 redirect to /login is expected for unauthenticated users
    const res = await page.request.get(APP_BASE_URL);
    expect(res.status()).toBeGreaterThanOrEqual(200);
    expect(res.status()).toBeLessThan(400);

    await page.goto(APP_BASE_URL, { waitUntil: 'networkidle' });

    // Basic sanity of content painted
    await expect(page.locator('body')).toBeVisible();

    // No runtime errors
    expect(consoleErrors, consoleErrors.join('\n')).toHaveLength(0);
  });
});


