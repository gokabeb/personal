import { test, expect } from '@playwright/test';

test('homepage is only the letter', async ({ page }) => {
  await page.goto('/');
  for (const sel of ['nav', 'header', 'footer', 'img', 'main svg']) {
    await expect(page.locator(sel)).toHaveCount(0);
  }
  const main = page.locator('main.page');
  expect(await main.evaluate((e) => getComputedStyle(e).fontFamily)).toMatch(/^"?Letter/);
  expect(await main.evaluate((e) => getComputedStyle(e).color)).toBe('rgb(0, 0, 0)');
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(255, 255, 255)');
  expect(await main.evaluate((e) => getComputedStyle(e).fontSize)).toBe('20px');
});

test('phone: 18px type and no sideways scroll', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto('/');
  expect(await page.locator('main.page').evaluate((e) => getComputedStyle(e).fontSize)).toBe('18px');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await ctx.close();
});
