import { test, expect } from '@playwright/test';

// Skip proposal tests - require test data (transcriptions/proposals) that don't exist yet
test.describe.skip('Proposal Workflow', () => {
  // No beforeEach needed - using storageState for authentication

  test('should create proposal from transcription', async ({ page }) => {
    await page.goto('/dashboard/transcriptions');

    // Assuming there's a transcription available
    await page.locator('button:has-text("Create Proposal")').first().click();

    await page.fill('input[name="title"]', 'Test Proposal');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*proposals/);
    await expect(page.locator('text=Test Proposal')).toBeVisible();
  });

  test('should generate AI content for proposal', async ({ page }) => {
    await page.goto('/dashboard/proposals');

    await page.locator('tr').first().click();
    await page.click('button:has-text("Generate Content")');

    await expect(page.locator('text=/generating/i')).toBeVisible();
    // Wait for generation to complete
    await page.waitForSelector('text=/content.*ready/i', { timeout: 30000 });
  });

  test('should export proposal as PDF', async ({ page }) => {
    await page.goto('/dashboard/proposals');

    await page.locator('tr').first().click();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Export PDF")'),
    ]);

    expect(download.suggestedFilename()).toContain('.pdf');
  });
});
