import { pass } from './doors';

/** Phones and tablets: no cursor, so nothing can hover. */
export const isTouch = () => !matchMedia('(hover: hover) and (pointer: fine)').matches;

let observer: IntersectionObserver | null = null;

/**
 * On a touch screen each doorway shimmers once, with its hint, as it scrolls
 * through the middle of the screen. That is how a reader without a cursor
 * learns the words are alive.
 */
export function initTouch() {
  observer?.disconnect();
  observer = null;
  if (!isTouch()) return;
  const doors = document.querySelectorAll<HTMLElement>('.letter a.door');
  if (doors.length === 0) return;

  const done = new WeakSet<Element>();
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting || done.has(entry.target)) continue;
        done.add(entry.target);
        pass(entry.target as HTMLElement);
      }
    },
    // The middle of the screen. Wide enough that a doorway near the end of the
    // letter still reaches it when the page cannot scroll any further.
    { rootMargin: '-30% 0px -30% 0px' },
  );
  doors.forEach((door) => observer!.observe(door));
}
