import { test, expect } from '@playwright/test';

test('/admin leads to the admin page, which lists every editable thing', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/keystatic/);
  for (const label of ['Letter', 'Experience (resume)', 'Writing', 'Now (notes)']) {
    await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
  }
});
