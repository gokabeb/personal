import { test, expect, type Page } from '@playwright/test';
import { skipIntro, door } from './helpers';

const lens = (page: Page) => page.locator('.lens');

async function settle(page: Page) {
  await page.waitForTimeout(700);
}

async function lensCentre(page: Page) {
  const b = (await lens(page).boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2, w: b.width, h: b.height };
}

test.beforeEach(async ({ page }) => {
  await skipIntro(page);
  await page.goto('/');
});

test('no lens until the mouse moves; then a round glass sits on the cursor', async ({ page }) => {
  await expect(lens(page)).toHaveCount(0);
  await page.mouse.move(520, 400);
  await page.mouse.move(540, 420, { steps: 4 });
  await expect(lens(page)).toBeVisible();
  await settle(page);
  const c = await lensCentre(page);
  expect(Math.abs(c.w - 92)).toBeLessThan(2);
  expect(Math.abs(c.h - 92)).toBeLessThan(2);
  expect(Math.hypot(c.x - 540, c.y - 420)).toBeLessThan(12);
  expect(await page.locator('.lens-view').evaluate((e) => getComputedStyle(e).borderTopLeftRadius)).toBe('50%');
  expect(await page.evaluate(() => getComputedStyle(document.body).cursor)).toBe('none');
});

test('the glass shows the text under it, 1.45 times larger', async ({ page }) => {
  const d = door(page, 'writing');
  const real = (await d.boundingBox())!;
  const x = real.x + real.width / 2;
  const y = real.y + real.height / 2;
  await page.mouse.move(x - 30, y - 30);
  await page.mouse.move(x, y, { steps: 5 });
  await settle(page);
  const copy = (await page.locator('.lens-copy a.door[data-door="writing"]').boundingBox())!;
  expect(copy.width / real.width).toBeCloseTo(1.45, 1);
  expect(Math.abs(copy.x + copy.width / 2 - x)).toBeLessThan(4);
  expect(Math.abs(copy.y + copy.height / 2 - y)).toBeLessThan(4);
});

test('the real page never moves, and the copy is invisible to assistive tech', async ({ page }) => {
  const before = await page.locator('main.page').boundingBox();
  await page.mouse.move(500, 300);
  await page.mouse.move(600, 500, { steps: 6 });
  await settle(page);
  expect(await page.locator('main.page').boundingBox()).toEqual(before);
  await expect(lens(page)).toHaveAttribute('aria-hidden', 'true');
  expect(await lens(page).evaluate((e) => (e as HTMLElement).inert)).toBe(true);
  await expect(page.locator('.lens-copy [id]')).toHaveCount(0);
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.getByRole('link', { name: /anything with a pen and paper/ })).toHaveCount(1);
  expect(await lens(page).evaluate((e) => getComputedStyle(e).pointerEvents)).toBe('none');
});

test('a doorway under the glass lights up inside the glass too, and still clicks', async ({ page }) => {
  const d = door(page, 'cv');
  const real = (await d.boundingBox())!;
  await page.mouse.move(real.x + real.width * 0.75, real.y + real.height / 2, { steps: 4 });
  await expect(d).toHaveAttribute('data-lit', '');
  const copy = page.locator('.lens-copy a.door[data-door="cv"]');
  await expect(copy).toHaveAttribute('data-lit', '');
  // The colour inside the glass moves in step with the colour on the page.
  const gap = await page.evaluate(() => {
    const t = (sel: string) =>
      Number(
        document
          .querySelector(sel)!
          .getAnimations()
          .find((x) => (x as CSSAnimation).animationName === 'door-flow')!.currentTime,
      );
    const cycle = 4000;
    const diff = Math.abs(t('main.page a.door[data-door="cv"]') - t('.lens-copy a.door[data-door="cv"]')) % cycle;
    return Math.min(diff, cycle - diff);
  });
  expect(gap).toBeLessThan(60);
  await page.mouse.click(real.x + real.width * 0.75, real.y + real.height / 2);
  await expect(page).toHaveURL(/\/cv$/);
});

test('the glass steps aside while selecting text and when the mouse leaves', async ({ page }) => {
  await page.mouse.move(520, 300);
  await page.mouse.move(540, 320, { steps: 3 });
  await expect(lens(page)).toBeVisible();
  await page.mouse.down();
  await expect(lens(page)).toBeHidden();
  await page.mouse.up();
  await page.mouse.move(545, 322);
  await expect(lens(page)).toBeVisible();
  await page.evaluate(() => document.documentElement.dispatchEvent(new MouseEvent('mouseleave')));
  await expect(lens(page)).toBeHidden();
  expect(await page.evaluate(() => getComputedStyle(document.body).cursor)).not.toBe('none');
});

test('it works on the other pages as well', async ({ page }) => {
  await page.goto('/cv');
  const h1 = (await page.locator('main.page h1').boundingBox())!;
  await page.mouse.move(h1.x + 5, h1.y + 5);
  await page.mouse.move(h1.x + 40, h1.y + h1.height / 2, { steps: 4 });
  await expect(lens(page)).toBeVisible();
  await expect(page.locator('.lens-copy h1')).toHaveText("building things and gaining experience");
});

test('reduced motion: no glass, ordinary cursor', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('/');
  await page.mouse.move(500, 300);
  await page.mouse.move(540, 340, { steps: 4 });
  await page.waitForTimeout(300);
  await expect(page.locator('.lens')).toHaveCount(0);
  expect(await page.evaluate(() => getComputedStyle(document.body).cursor)).not.toBe('none');
  await ctx.close();
});

test('rim bending is on in Chromium and off in Safari', async ({ page, browserName }) => {
  await page.mouse.move(500, 300);
  await page.mouse.move(540, 340, { steps: 4 });
  await expect(lens(page)).toBeVisible();
  const filter = await page.locator('.lens-bend').evaluate((e) => getComputedStyle(e).filter);
  if (browserName === 'webkit') expect(filter).toBe('none');
  else expect(filter).toContain('lens-bend');
});

test('a right-click, or a click whose release is lost, does not leave the glass switched off', async ({ page }) => {
  await page.mouse.move(520, 300);
  await page.mouse.move(540, 320, { steps: 3 });
  await expect(lens(page)).toBeVisible();
  await page.mouse.down({ button: 'right' });
  await expect(lens(page)).toBeVisible();
  await page.mouse.up({ button: 'right' });
  // A press whose release never arrives (a context menu can swallow it).
  await page.evaluate(() =>
    document.dispatchEvent(new PointerEvent('pointerdown', { button: 0, buttons: 1, pointerType: 'mouse', bubbles: true })),
  );
  await expect(lens(page)).toBeHidden();
  await page.mouse.move(560, 330, { steps: 2 });
  await expect(lens(page)).toBeVisible();
});
