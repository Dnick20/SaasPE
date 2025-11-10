import { test, expect } from '@playwright/test';

test.describe('Proposal Wizard', () => {
  test('navigates to new proposal wizard and shows transcription flow', async ({ page }) => {
    // Navigate to proposals list (assumes dev server running and auth handled in test env)
    await page.goto('/dashboard/proposals');

    // Click Create Proposal CTA
    const createBtn = page.getByRole('button', { name: /create proposal/i });
    if (await createBtn.isVisible()) {
      await createBtn.click();
    } else {
      await page.goto('/dashboard/proposals/new');
    }

    // Verify wizard heading and transcription hint
    await expect(page.getByRole('heading', { name: /create new proposal/i })).toBeVisible();
    await expect(page.getByText(/Generate proposal from meeting transcription/i)).toBeVisible();
  });
});



