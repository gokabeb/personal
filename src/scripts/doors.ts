import { feel } from '../lib/feel';
import { remember, remembered } from '../lib/storage';

// Where the reader was in the letter when they stepped through a doorway.
// Kept in memory only: it survives stepping between pages, and a fresh load
// of any page starts clean, so "back to the letter" can never go astray.
let letterY: number | null = null;
let restoreNext = false;

// The new page is in place but not yet shown: put the letter back where it was.
document.addEventListener('astro:after-swap', () => {
  if (restoreNext && letterY !== null && location.pathname === '/') scrollTo(0, letterY);
  restoreNext = false;
});


export function light(link: HTMLElement) {
  link.setAttribute('data-lit', '');
}

export function dim(door: HTMLElement) {
  if (door.matches(':hover') || door === document.activeElement) return;
  door.removeAttribute('data-lit');
}

/** Touch screens: glow for a moment, since nothing can hover. */
export function pass(door: HTMLElement) {
  light(door);
  setTimeout(() => dim(door), feel.glowMs);
}

/** Every link glows when hovered or focused. Setting an attribute (not just
 *  using :hover) lets the copy inside the glass lens show the same state. */
function wire(link: HTMLElement) {
  if (link.dataset.wired) return;
  link.dataset.wired = '1';
  link.addEventListener('pointerenter', (e) => {
    if (e.pointerType !== 'touch') light(link);
  });
  link.addEventListener('pointerleave', () => requestAnimationFrame(() => dim(link)));
  link.addEventListener('focus', () => light(link));
  link.addEventListener('blur', () => requestAnimationFrame(() => dim(link)));

  const slug = link.dataset.door;
  if (!slug) return;
  link.addEventListener('click', () => {
    remember(`visited-${slug}`);
    // Lets "back to the letter" return to this exact spot.
    if (link.closest('.letter')) letterY = scrollY;
  });
  if (remembered(`visited-${slug}`)) link.setAttribute('data-visited', '');
}

export function initDoors() {
  // Arriving on a doorway page counts as having been through that doorway.
  const here = document.querySelector<HTMLElement>('h1.door-title[data-door]');
  if (here) remember(`visited-${here.dataset.door}`);

  document.querySelectorAll<HTMLElement>('main.page a').forEach(wire);

  for (const back of document.querySelectorAll<HTMLAnchorElement>('a.back[href="/"]')) {
    if (back.dataset.back) continue;
    back.dataset.back = '1';
    back.addEventListener('click', () => {
      restoreNext = letterY !== null;
    });
  }

}
