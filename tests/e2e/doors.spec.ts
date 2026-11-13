import { test, expect } from '@playwright/test';
import { skipIntro, collectErrors, door, pointOn } from './helpers';

const TRANSPARENT = 'rgba(0, 0, 0, 0)';
const fillOf = (l: ReturnType<typeof door>) =>
  l.evaluate((e) => getComputedStyle(e).getPropertyValue('-webkit-text-fill-color'));

test('a doorway always shimmers: coloured letters, moving colour, underline', async ({ page }) => {
  await page.goto('/');
  const d = door(page, 'writing');
  expect(await fillOf(d)).toBe(TRANSPARENT);
  expect(await d.evaluate((e) => getComputedStyle(e).backgroundImage)).toContain('gradient');
  // The underline is a second, 1.5px-tall layer of the same moving gradient.
  expect(await d.evaluate((e) => getComputedStyle(e).backgroundSize)).toContain('1.5px');
  expect(await d.evaluate((e) => getComputedStyle(e).backgroundClip)).toContain('border-box');
  const running = await d.evaluate((e) =>
    e.getAnimations().some((a) => a.playState === 'running' && a.effect!.getComputedTiming().iterations === Infinity),
  );
  expect(running).toBe(true);
  const at = () => d.evaluate((e) => getComputedStyle(e).backgroundPositionX);
  const first = await at();
  await page.waitForTimeout(400);
  expect(await at()).not.toBe(first);
});

test('hovering a doorway makes it glow, with no pop-up text', async ({ page }) => {
  await skipIntro(page);
  await page.goto('/');
  const d = door(page, 'writing');
  const before = await page.locator('main.page').innerText();
  const at = await pointOn(d);
  await page.mouse.move(at.x, at.y);
  await expect(d).toHaveAttribute('data-lit', '');
  expect(await d.evaluate((e) => getComputedStyle(e).textShadow)).not.toBe('none');
  expect(await page.locator('main.page').innerText()).toBe(before);
  await page.mouse.move(5, 5);
  await expect(d).not.toHaveAttribute('data-lit', '');
});

test('keyboard focus lights the doorway the same way', async ({ page }) => {
  await skipIntro(page);
  await page.goto('/');
  const d = door(page, 'writing');
  await d.focus();
  await expect(d).toHaveAttribute('data-lit', '');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/writing$/);
});

test('a doorway that wraps onto two lines is coloured on both', async ({ page }) => {
  await skipIntro(page);
  await page.goto('/');
  const d = door(page, 'cv');
  let wrapped = false;
  for (let w = 700; w >= 300; w -= 8) {
    await page.setViewportSize({ width: w, height: 800 });
    if ((await d.evaluate((e) => e.getClientRects().length)) > 1) {
      wrapped = true;
      break;
    }
  }
  expect(wrapped).toBe(true);
  const clone = await d.evaluate((e) => {
    const s = getComputedStyle(e) as any;
    return s.boxDecorationBreak || s.webkitBoxDecorationBreak;
  });
  expect(clone).toBe('clone');
});

test('reduced motion: a still spectrum underline, no animation', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('/');
  await page.waitForTimeout(1600);
  await expect(page.locator('a.door[data-lit]')).toHaveCount(0);
  const d = door(page, 'writing');
  expect(await d.evaluate((e) => e.getAnimations().length)).toBe(0);
  expect(await d.evaluate((e) => getComputedStyle(e).borderImageSource)).toContain('gradient');
  await d.hover();
  expect(await fillOf(d)).toBe('rgb(0, 0, 0)');
  expect(await d.evaluate((e) => e.getAnimations().length)).toBe(0);
  await ctx.close();
});

test('a doorway you have been through is remembered', async ({ page }) => {
  await skipIntro(page);
  await page.goto('/');
  await expect(door(page, 'cv')).not.toHaveAttribute('data-visited', '');
  await door(page, 'cv').click();
  await expect(page).toHaveURL(/\/cv$/);
  await page.locator('a.back').first().click();
  await expect(page).toHaveURL(/\/$/);
  await expect(door(page, 'cv')).toHaveAttribute('data-visited', '');
  await expect(door(page, 'now')).not.toHaveAttribute('data-visited', '');
});

test('with browser storage blocked, everything still works quietly', async ({ page }) => {
  const errors = collectErrors(page);
  await page.addInitScript(() => {
    for (const name of ['localStorage', 'sessionStorage']) {
      Object.defineProperty(window, name, {
        get() {
          throw new DOMException('blocked', 'SecurityError');
        },
      });
    }
  });
  await page.goto('/');
  const d = door(page, 'now');
  await d.hover();
  await expect(d).toHaveAttribute('data-lit', '');
  await d.click();
  await expect(page).toHaveURL(/\/now$/);
  expect(errors).toEqual([]);
});

test('a screen reader hears just the phrase as the link', async ({ page }) => {
  await skipIntro(page);
  await page.goto('/');
  await expect(door(page, 'writing')).toHaveAccessibleName('anything with a pen and paper');
});

test('reduced motion: keyboard focus on a doorway is clearly outlined', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('/');
  const d = door(page, 'writing');
  await d.focus();
  expect(await d.evaluate((e) => getComputedStyle(e).outlineStyle)).toBe('solid');
  await ctx.close();
});
