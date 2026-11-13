import { test, expect } from '@playwright/test';

for (const path of ['/', '/cv', '/writing', '/now', '/writing/sample-delete-me']) {
  test(`${path}: every quote and apostrophe is curly`, async ({ page }) => {
    await page.route('**/api/now.json', (route) =>
      route.fulfill({
        json: {
          listening: { now: null, albums: [{ title: `The "Best" of O'Brien`, artist: `P. O'Toole`, link: 'https://x' }], profile: 'https://x' },
          watching: null,
        },
      }),
    );
    await page.goto(path);
    if (path === '/now') await expect(page.locator('main.page .now-section[data-feed="listening"]')).toBeVisible();
    const text = await page.locator('main.page').innerText();
    expect(text).not.toMatch(/['"]/);
    expect(await page.title()).not.toMatch(/['"]/);
  });
}

test('curly quotes are really there, not just missing', async ({ page }) => {
  await page.goto('/');
  const text = await page.locator('main.page').innerText();
  expect(text).toContain('Hi, I’m Karan!');
  expect(text).toContain('San Francisco’s first-ever Youth Poet Laureate');
  expect(text).toContain('I’ve never really stopped');
});

test('searching with a straight apostrophe still finds a curly title', async ({ page }) => {
  await page.goto('/writing/sample-delete-me');
  await page.goto('/writing');
  await page.getByRole('searchbox').fill('play with me!');
  await expect(page.locator('main.page .piece:visible')).toHaveCount(1);
});

test('selected text is highlighted in a colour that keeps moving through the spectrum', async ({ page }) => {
  await page.goto('/');
  const html = page.locator('html');
  await expect(html).not.toHaveClass(/selecting/);
  const p = page.locator('main.page p').nth(1);
  await p.selectText();
  await expect(html).toHaveClass(/selecting/);
  const colour = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--sel').trim());
  const highlight = () =>
    p.evaluate((e) => {
      const s = getComputedStyle(e, '::selection');
      return { bg: s.backgroundColor, fg: s.color };
    });
  const first = await colour();
  expect((await highlight()).fg).toBe('rgb(255, 255, 255)');
  expect((await highlight()).bg).not.toBe('rgba(0, 0, 0, 0)');
  await page.waitForTimeout(700);
  expect(await colour()).not.toBe(first);

  await page.evaluate(() => getSelection()!.removeAllRanges());
  await expect(html).not.toHaveClass(/selecting/);
});

test('reduced motion: selection is coloured but still', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('/');
  await page.locator('main.page p').nth(1).selectText();
  await expect(page.locator('html')).toHaveClass(/selecting/);
  expect(await page.evaluate(() => document.documentElement.getAnimations().length)).toBe(0);
  await ctx.close();
});

for (const path of ['/cv', '/writing', '/now']) {
  test(`${path}: the way back has room above and below it`, async ({ page }) => {
    await page.route('**/api/now.json', (route) => route.fulfill({ json: { listening: null, watching: null } }));
    await page.goto(path);
    const gaps = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('main.page .back-row')];
      const top = rows[0].getBoundingClientRect();
      const bottom = rows[1].getBoundingClientRect();
      const title = document.querySelector('main.page h1')!.getBoundingClientRect();
      const before = rows[1].previousElementSibling!.getBoundingClientRect();
      return { afterTop: title.top - top.bottom, beforeBottom: bottom.top - before.bottom };
    });
    expect(gaps.afterTop).toBeGreaterThanOrEqual(40);
    expect(gaps.beforeBottom).toBeGreaterThanOrEqual(60);
  });
}
