import { test, expect, type Locator } from '@playwright/test';

const TRANSPARENT = 'rgba(0, 0, 0, 0)';
const fillOf = (l: Locator) => l.evaluate((e) => getComputedStyle(e).getPropertyValue('-webkit-text-fill-color'));
const flowing = (l: Locator) =>
  l.evaluate((e) =>
    e.getAnimations().some((a) => (a as CSSAnimation).animationName === 'door-flow' && a.playState === 'running'),
  );
const underlineLayer = (l: Locator) => l.evaluate((e) => getComputedStyle(e).backgroundSize);

for (const path of ['/', '/writing', '/cv', '/now', '/writing/sample-delete-me']) {
  test(`${path}: every link shimmers; the way back shimmers only when hovered`, async ({ page }) => {
    // Keep the list of links fixed: live feeds would add links while the test is counting.
    await page.route('**/api/now.json', (route) => route.fulfill({ json: { listening: null, watching: null } }));
    await page.goto(path);
    const links = page.locator('main.page a');
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const link = links.nth(i);
      const label = `${path} link ${i}: ${(await link.textContent())!.trim().slice(0, 30)}`;
      const isBack = await link.evaluate((e) => e.classList.contains('back'));
      // Every link, the way back included, has the moving rainbow underline.
      expect(await underlineLayer(link), label).toContain('1.5px');
      expect(await flowing(link), label).toBe(true);
      expect(await fillOf(link), label).toBe(isBack ? 'rgb(0, 0, 0)' : TRANSPARENT);
    }
  });
}

test('hovering the way back fills its letters with colour, in the glass too', async ({ page }) => {
  await page.goto('/cv');
  const back = page.locator('main.page a.back').first();
  expect(await fillOf(back)).toBe('rgb(0, 0, 0)');
  const box = (await back.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 3 });
  await expect.poll(() => fillOf(back)).toBe(TRANSPARENT);
  await expect.poll(() => fillOf(page.locator('.lens-copy a.back').first())).toBe(TRANSPARENT);
  await page.mouse.move(box.x + 400, box.y + 200, { steps: 3 });
  await expect.poll(() => fillOf(back)).toBe('rgb(0, 0, 0)');
});

test('keyboard focus on the way back colours it as well', async ({ page }) => {
  await page.goto('/now');
  const back = page.locator('main.page a.back').first();
  await back.focus();
  await expect.poll(() => fillOf(back)).toBe(TRANSPARENT);
});

test('reduced motion: links are black with a still rainbow underline', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('/writing');
  for (const sel of ['main.page a.back', 'main.page a.piece-title']) {
    const link = page.locator(sel).first();
    expect(await fillOf(link)).toBe('rgb(0, 0, 0)');
    expect(await link.evaluate((e) => e.getAnimations().length)).toBe(0);
    expect(await link.evaluate((e) => getComputedStyle(e).borderImageSource)).toContain('gradient');
  }
  await ctx.close();
});
