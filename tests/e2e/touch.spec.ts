import { test, expect } from '@playwright/test';
import { skipIntro, door } from './helpers';

test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
// Playwright's Safari build cannot emulate a phone's "no hover" setting.
test.skip(({ browserName }) => browserName === 'webkit', 'touch emulation is Chromium only');

const centre = (page: any, slug: string) =>
  page.evaluate((s: string) => {
    document.querySelector(`main.page a.door[data-door="${s}"]`)!.scrollIntoView({ block: 'center' });
  }, slug);

test('a doorway glows once as it reaches the middle of the screen', async ({ page }) => {
  await skipIntro(page);
  await page.goto('/');
  const d = door(page, 'now');
  await page.waitForTimeout(400);
  await expect(d).not.toHaveAttribute('data-lit', '');
  await centre(page, 'now');
  await expect(d).toHaveAttribute('data-lit', '');
  await expect(d).not.toHaveAttribute('data-lit', '', { timeout: 2400 + 1500 });

  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(300);
  await centre(page, 'now');
  await page.waitForTimeout(600);
  await expect(d).not.toHaveAttribute('data-lit', '');
});

test('no intro pass on phones: doorways off screen stay quiet', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).__lit = [];
    new MutationObserver((records) => {
      for (const r of records) {
        const el = r.target as HTMLElement;
        if (el.matches?.('a.door') && el.hasAttribute('data-lit')) (window as any).__lit.push(el.dataset.door);
      }
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-lit'] });
  });
  await page.goto('/');
  await page.waitForTimeout(1000 + 600 + 600);
  expect(await page.evaluate(() => (window as any).__lit)).not.toContain('now');
});

test('one tap opens a doorway, and there is no glass', async ({ page }) => {
  await skipIntro(page);
  await page.goto('/');
  await centre(page, 'cv');
  await door(page, 'cv').tap();
  await expect(page).toHaveURL(/\/cv$/);
  await expect(page.locator('.lens')).toHaveCount(0);
});

for (const path of ['/', '/writing', '/cv', '/now', '/writing/sample-delete-me']) {
  test(`${path} never scrolls sideways on a phone`, async ({ page }) => {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
