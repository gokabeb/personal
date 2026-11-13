import type { Page } from '@playwright/test';

/** Most tests want the page at rest, without the one-time intro shimmer. */
export async function skipIntro(page: Page) {
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem('ll:intro', '1');
    } catch {}
  });
}

export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}

export const door = (page: Page, slug: string) => page.locator(`main.page a.door[data-door="${slug}"]`);

export const fill = (el: Element) => getComputedStyle(el).getPropertyValue('-webkit-text-fill-color');

/** A point inside the first line of a link. A link that wraps onto two lines has a
 *  bounding box whose corners and centre can fall outside the link itself. */
export async function pointOn(link: import('@playwright/test').Locator, along = 0.5) {
  return link.evaluate((e, t) => {
    const r = e.getClientRects()[0];
    return { x: r.left + r.width * t, y: r.top + r.height / 2 };
  }, along);
}
