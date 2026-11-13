import { test, expect } from '@playwright/test';
import { skipIntro, door, pointOn } from './helpers';

test.use({ viewport: { width: 900, height: 520 } });

const vtName = (l: ReturnType<typeof door>) =>
  l.evaluate((e) => getComputedStyle(e).getPropertyValue('view-transition-name'));

test.beforeEach(async ({ page }) => {
  await skipIntro(page);
});

test('the clicked phrase and the page title are the same moving element', async ({ page }) => {
  await page.goto('/');
  expect(await vtName(door(page, 'cv'))).toBe('door-cv');
  await page.goto('/cv');
  expect(await vtName(page.locator('h1.door-title'))).toBe('door-cv');
});

test('stepping through does not reload the page, and the way back returns to the same spot', async ({ page }) => {
  await page.goto('/');
  const d = door(page, 'now');
  await d.scrollIntoViewIfNeeded();
  await page.evaluate(() => ((window as any).__marker = true));
  const y = await page.evaluate(() => scrollY);
  expect(y).toBeGreaterThan(200);
  await d.click();
  await expect(page).toHaveURL(/\/now$/);
  await expect(page.locator('h1.door-title')).toHaveText("things I’m chasing now");
  expect(await page.evaluate(() => (window as any).__marker)).toBe(true);

  await page.locator('a.back').first().click();
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(y - 20);
  expect(await page.evaluate(() => scrollY)).toBeLessThan(y + 20);
  await expect(door(page, 'now')).toHaveAttribute('data-visited', '');
});

test('the browser Back button does the same', async ({ page }) => {
  await page.goto('/');
  const d = door(page, 'now');
  await d.scrollIntoViewIfNeeded();
  const y = await page.evaluate(() => scrollY);
  await d.click();
  await expect(page).toHaveURL(/\/now$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(async () => Math.abs((await page.evaluate(() => scrollY)) - y)).toBeLessThan(20);
});

test('arriving on a page directly, the way back leads to the top of the letter', async ({ page }) => {
  await page.goto('/cv');
  await page.locator('a.back').last().click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('.letter')).toBeVisible();
  expect(await page.evaluate(() => scrollY)).toBe(0);
});

test('after a detour through a piece, the way back goes to the letter, not the piece', async ({ page }) => {
  await page.goto('/');
  await door(page, 'writing').click();
  await expect(page).toHaveURL(/\/writing$/);
  await page.goto('/writing/sample-delete-me');
  await page.locator('a.back').first().click();
  await expect(page).toHaveURL(/\/writing$/);
  await page.locator('a.back').first().click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('.letter')).toBeVisible();
});

test('doorways still shimmer and the glass shows the new page after stepping through', async ({ page }) => {
  await page.goto('/');
  await door(page, 'cv').click();
  await expect(page).toHaveURL(/\/cv$/);
  const h1 = (await page.locator('main.page h1').boundingBox())!;
  await page.mouse.move(h1.x + 10, h1.y + 5);
  await page.mouse.move(h1.x + 50, h1.y + h1.height / 2, { steps: 4 });
  await expect(page.locator('.lens')).toBeVisible();
  await expect(page.locator('.lens-copy h1')).toHaveText("building things and gaining experience");
  await expect(page.locator('.lens')).toHaveCount(1);

  await page.locator('a.back').first().click();
  await expect(page).toHaveURL(/\/$/);
  const d = door(page, 'writing');
  const at = await pointOn(d);
  await page.mouse.move(at.x, at.y, { steps: 3 });
  await expect(d).toHaveAttribute('data-lit', '');
  await expect(page.locator('.lens-copy .letter')).toHaveCount(1);
});

test('reduced motion: stepping through still works', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('/');
  await door(page, 'cv').click();
  await expect(page).toHaveURL(/\/cv$/);
  await page.locator('a.back').first().click();
  await expect(page.locator('.letter')).toBeVisible();
  await ctx.close();
});

test('the way back never lands on some other page from earlier in the tab', async ({ page }) => {
  await page.goto('/');
  await door(page, 'cv').click();
  await expect(page).toHaveURL(/\/cv$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await door(page, 'writing').click();
  await expect(page).toHaveURL(/\/writing$/);
  await page.goto('/now');
  await page.locator('a.back').first().click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('.letter')).toBeVisible();
});
