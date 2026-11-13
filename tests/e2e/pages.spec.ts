import { test, expect, type Page } from '@playwright/test';

const fillOf = (page: Page, sel: string) =>
  page.locator(sel).first().evaluate((e) => getComputedStyle(e).getPropertyValue('-webkit-text-fill-color'));

test('the letter has three doorways and no hover hints', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('main.page a.door')).toHaveCount(3);
  for (const slug of ['writing', 'cv', 'now']) {
    await expect(page.locator(`main.page a.door[data-door="${slug}"]`)).toHaveAttribute('href', `/${slug}`);
  }
  await expect(page.locator('.door-hint')).toHaveCount(0);
  const d = page.locator('main.page a.door[data-door="cv"]');
  await d.hover();
  await expect(d).toHaveText("building things and gaining experience");
  // Every link in the letter leads somewhere real.
  await expect(page.locator('main.page a[href="mailto:kgupta1219@gmail.com"]')).toHaveText('say hi');
  await expect(page.locator('main.page a[href="https://playkits.org"]')).toHaveText('playkits.org');
  await expect(page.locator('main.page a')).toHaveCount(5);
  const text = await page.locator('main.page').innerText();
  expect(text.trim().startsWith('Hi, I’m Karan!')).toBe(true);
  expect(text.trim().endsWith('Karan Gupta')).toBe(true);
  expect(text).not.toContain('enouhg');
});

test('the old /work address leads to the resume', async ({ page }) => {
  await page.goto('/work');
  await expect(page).toHaveURL(/\/cv$/);
});

test.describe('resume', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/cv');
  });

  test('four sections in order, divided by thin lines', async ({ page }) => {
    await expect(page.locator('h1.door-title')).toHaveText("building things and gaining experience");
    await expect(page.locator('.cv-section h2')).toHaveText(['Education', 'Work & Research', 'Leadership & Projects', 'Honors']);
    for (const section of await page.locator('.cv-section').all()) {
      expect(await section.evaluate((e) => getComputedStyle(e).borderTopStyle)).toBe('solid');
      expect(parseFloat(await section.evaluate((e) => getComputedStyle(e).borderTopWidth))).toBeLessThanOrEqual(1);
    }
    await expect(page.locator('main.page details, main.page button, main.page ul')).toHaveCount(0);
  });

  test('each entry shows a role, an organisation, and dates on the right', async ({ page }) => {
    const item = page.locator('main.page .cv-item', { has: page.locator('.cv-sub', { hasText: /^Cardinal Robotics$/ }) });
    await expect(item.locator('.cv-heading')).toHaveText('Robotics Technician');
    await expect(item.locator('.cv-dates')).toHaveText('Nov 2024 – present');
    await expect(item.locator('.cv-desc')).toContainText('Zero-Trust Network for Robots and IoT');
    const heading = (await item.locator('.cv-heading').boundingBox())!;
    const dates = (await item.locator('.cv-dates').boundingBox())!;
    expect(dates.x).toBeGreaterThan(heading.x + heading.width);
    expect(Math.abs(dates.y - heading.y)).toBeLessThan(8);
  });

  test('key words shimmer; nothing private is listed', async ({ page }) => {
    const shine = page.locator('.cv-desc .shine');
    expect(await shine.count()).toBeGreaterThanOrEqual(6);
    await expect(shine.first()).toHaveText('78-claim provisional patent');
    expect(await fillOf(page, '.cv-desc .shine')).toBe('rgba(0, 0, 0, 0)');
    expect(await shine.first().evaluate((e) => e.getAnimations().some((a) => a.playState === 'running'))).toBe(true);
    const text = (await page.locator('main.page').innerText()).toLowerCase();
    // The specific private details are checked by `npm run check:private`, from a file that is never committed.
    for (const word of ['gpa', 'sat score', 'date of birth']) expect(text, word).not.toContain(word);
    await expect(page.locator('main.page')).not.toContainText('**');
  });

  test('on a phone the dates drop under the role and nothing overflows', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto('/cv');
    const item = page.locator('main.page .cv-item', { has: page.locator('.cv-sub', { hasText: /^Cardinal Robotics$/ }) });
    const heading = (await item.locator('.cv-heading').boundingBox())!;
    const dates = (await item.locator('.cv-dates').boundingBox())!;
    expect(dates.y).toBeGreaterThan(heading.y + heading.height - 4);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await ctx.close();
  });
});

test.describe('writing archive', () => {
  const rows = (page: Page) => page.locator('main.page .piece:visible');
  const titles = async (page: Page) => (await rows(page).locator('.piece-title').allTextContents()).map((t) => t.trim());
  const ALL = [
    'I Can Feel You Across the Seas',
    'Young poet transforms experiences into powerful stories',
    'More Than Just a Board Game',
    'Come Play With Me!',
  ];

  test.beforeEach(async ({ page }) => {
    await page.goto('/writing');
  });

  test('a search box, three filters, and the list newest first', async ({ page }) => {
    await expect(page.locator('h1.door-title')).toHaveText('anything with a pen and paper');
    await expect(page.getByRole('searchbox')).toHaveAttribute('placeholder', 'Search by title, keyword, or year...');
    await expect(page.locator('main.page .filters button')).toHaveText(['All', 'Poetry', 'Essays']);
    await expect(page.locator('main.page .filters button[aria-pressed="true"]')).toHaveText('All');
    expect(await titles(page)).toEqual(ALL);
    await expect(page.locator('main.page')).not.toContainText('Sample');
  });

  test('title on the left, category and year on the right', async ({ page }) => {
    const row = rows(page).first();
    await expect(row.locator('.piece-meta')).toHaveText('Poetry · 2026');
    const title = (await row.locator('.piece-title').boundingBox())!;
    const meta = (await row.locator('.piece-meta').boundingBox())!;
    expect(meta.x).toBeGreaterThan(title.x + title.width);
    const link = row.locator('a.piece-title');
    await expect(link).toHaveAttribute('href', /shop826valencia/);
    await expect(link).toHaveAttribute('rel', /noopener/);
  });

  test('typing narrows the list by title, keyword or year', async ({ page }) => {
    const box = page.getByRole('searchbox');
    await box.fill('board');
    expect(await titles(page)).toEqual(['More Than Just a Board Game']);
    await box.fill('KRON4 2026');
    expect(await titles(page)).toEqual(['Young poet transforms experiences into powerful stories']);
    await box.fill('2026');
    expect(await titles(page)).toEqual(ALL);
    await box.fill('zzzz');
    expect(await titles(page)).toEqual([]);
    await expect(page.locator('main.page .no-results')).toBeVisible();
    await box.fill('');
    expect(await titles(page)).toEqual(ALL);
    await expect(page.locator('main.page .no-results')).toBeHidden();
  });

  test('filters show one kind of writing, and combine with search', async ({ page }) => {
    await page.locator('main.page .filters button', { hasText: 'Essays' }).click();
    expect(await titles(page)).toEqual(['More Than Just a Board Game']);
    await expect(page.locator('main.page .filters button[aria-pressed="true"]')).toHaveText('Essays');
    await page.locator('main.page .filters button', { hasText: 'Poetry' }).click();
    expect(await titles(page)).toEqual(['I Can Feel You Across the Seas']);
    await page.getByRole('searchbox').fill('board');
    expect(await titles(page)).toEqual([]);
    await page.locator('main.page .filters button', { hasText: 'All' }).click();
    expect(await titles(page)).toEqual(['More Than Just a Board Game']);
  });

  test('the glass shows the list as it is filtered', async ({ page }) => {
    await page.getByRole('searchbox').fill('board');
    const t = (await rows(page).first().boundingBox())!;
    await page.mouse.move(t.x + 20, t.y + 5);
    await page.mouse.move(t.x + 60, t.y + t.height / 2, { steps: 4 });
    await expect(page.locator('.lens')).toBeVisible();
    await expect(page.locator('.lens-copy .piece:visible')).toHaveCount(1);
  });
});

test('a piece opens on its own quiet page, keeping line breaks and indents, and fits a phone', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto('/writing/sample-delete-me');
  await expect(page.locator('main.page input, main.page button')).toHaveCount(0);
  const text = page.locator('.piece-text');
  expect(await text.evaluate((e) => getComputedStyle(e).whiteSpace)).toBe('pre-wrap');
  const lines = text.locator('.line');
  await expect(lines).toHaveCount(7);
  expect(await lines.nth(2).textContent()).toBe('    This line starts with an indent.');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await ctx.close();
});

test.describe('now', () => {
  const albums = Array.from({ length: 12 }, (_, i) => ({ title: `Album ${i + 1}`, artist: `Artist ${i + 1}`, link: `https://open.spotify.com/album/${i + 1}` }));
  const FEEDS = {
    listening: {
      now: { title: 'Little Wing', artist: 'Jimi Hendrix', link: 'https://open.spotify.com/track/1' },
      albums,
      profile: 'https://open.spotify.com/user/x',
    },
    watching: {
      films: [{ title: 'Paddington 2', year: '2017', rating: 4.5, link: 'https://letterboxd.com/someone/film/paddington-2/' }],
      profile: 'https://letterboxd.com/someone/',
    },
  };

  test('the feed endpoint always answers with both sections', async ({ request }) => {
    const res = await request.get('/api/now.json');
    expect(res.status()).toBe(200);
    // Which sections have data depends on which accounts this machine has set up.
    expect(Object.keys(await res.json()).sort()).toEqual(['listening', 'watching']);
  });

  test('before any account is connected, only the notes show', async ({ page }) => {
    await page.route('**/api/now.json', (route) => route.fulfill({ json: { listening: null, watching: null } }));
    await page.goto('/now');
    await expect(page.locator('h1.door-title')).toHaveText("things I’m chasing now");
    await expect(page.locator('.now-section:visible h2')).toHaveText(['Thinking & Learning']);
    expect(await page.locator('main.page .now-notes li').count()).toBeGreaterThanOrEqual(1);
  });

  test('with accounts connected: listening, watching, then the notes', async ({ page }) => {
    await page.route('**/api/now.json', (route) => route.fulfill({ json: FEEDS }));
    await page.goto('/now');
    await expect(page.locator('.now-section:visible h2')).toHaveText(['Listening', 'Watching', 'Thinking & Learning']);

    const listening = page.locator('main.page .now-section[data-feed="listening"]');
    await expect(listening).toContainText('Little Wing');
    await expect(listening).toContainText('Latest saved albums');

    const watching = page.locator('main.page .now-section[data-feed="watching"]');
    await expect(watching).toContainText('Paddington 2');
    await expect(watching).toContainText('2017');
    await expect(watching).toContainText('★★★★½');

    // Links that arrive later look and behave like every other link.
    expect(await fillOf(page, '.now-section[data-feed="watching"] a')).toBe('rgba(0, 0, 0, 0)');
    await expect(watching.locator('a').first()).toHaveAttribute('rel', /noopener/);
    await expect(watching.locator('a.now-more')).toHaveAttribute('href', 'https://letterboxd.com/someone/');
    await expect(page.locator('main.page .now-section[data-feed]')).toHaveCount(2);
    await expect(page.locator('main.page img')).toHaveCount(0);
  });

  test('saved albums: five show, the rest are a scroll away, and the glass follows', async ({ page }) => {
    await page.route('**/api/now.json', (route) => route.fulfill({ json: FEEDS }));
    await page.goto('/now');
    const box = page.locator('main.page .now-scroll');
    await expect(box.locator('.now-line')).toHaveCount(12);
    const visible = async () => {
      const b = (await box.boundingBox())!;
      const rows = await box.locator('.now-line').evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((r) => [r.top, r.bottom]));
      return rows.filter(([top, bottom]) => top >= b.y - 1 && bottom <= b.y + b.height + 1).length;
    };
    expect(await visible()).toBe(5);
    await expect(box.locator('.now-line').first()).toHaveText('Album 1, Artist 1');
    await expect(box).toHaveAttribute('data-more', '');
    await expect(box).not.toHaveAttribute('data-end', '');

    // The glass shows the same list, scrolled to the same place.
    const b = (await box.boundingBox())!;
    await page.mouse.move(b.x + 30, b.y + 10);
    await page.mouse.move(b.x + 60, b.y + 30, { steps: 3 });
    await expect(page.locator('.lens')).toBeVisible();
    await box.evaluate((e) => e.scrollTo(0, e.scrollHeight));
    await expect(box).toHaveAttribute('data-end', '');
    await expect
      .poll(() => page.locator('.lens-copy .now-scroll').evaluate((e) => e.scrollTop))
      .toBe(await box.evaluate((e) => e.scrollTop));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });

  test('five or fewer albums: no scrolling, no fade', async ({ page }) => {
    await page.route('**/api/now.json', (route) =>
      route.fulfill({ json: { ...FEEDS, listening: { ...FEEDS.listening, albums: albums.slice(0, 3) } } }),
    );
    await page.goto('/now');
    const box = page.locator('main.page .now-scroll');
    await expect(box.locator('.now-line')).toHaveCount(3);
    await expect(box).not.toHaveAttribute('data-more', '');
    expect(await box.evaluate((e) => e.scrollHeight <= e.clientHeight)).toBe(true);
  });

  test('one source down: its section stays hidden, the rest show', async ({ page }) => {
    await page.route('**/api/now.json', (route) => route.fulfill({ json: { ...FEEDS, listening: null } }));
    await page.goto('/now');
    await expect(page.locator('.now-section:visible h2')).toHaveText(['Watching', 'Thinking & Learning']);
  });

  test('the whole feed failing leaves a complete page of notes and no errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.route('**/api/now.json', (route) => route.abort());
    await page.goto('/now');
    await expect(page.locator('.now-section:visible h2')).toHaveText(['Thinking & Learning']);
    expect(errors).toEqual([]);
  });
});

for (const path of ['/writing', '/cv', '/now']) {
  test(`${path} has a way back at the top and the bottom`, async ({ page }) => {
    await page.goto(path);
    const back = page.locator('a.back');
    await expect(back).toHaveCount(2);
    await expect(back.first()).toHaveAttribute('href', '/');
    await expect(back.first()).toHaveText('← back to the letter');
  });
}
