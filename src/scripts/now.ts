import type { Album, Film, NowData, Track } from '../lib/feeds';
import { stars } from '../lib/feeds';
import { curly } from '../lib/typography';
import { initDoors } from './doors';
import { refreshCopy } from './lens';

// Small helpers that build elements with plain text, never HTML, so nothing
// a feed sends can inject markup into the page.
function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = curly(text);
  return node;
}

function link(text: string, href: string, className = ''): HTMLElement {
  if (!href) return el('span', className, text);
  const a = el('a', className, text);
  a.href = href;
  a.rel = 'noopener';
  return a;
}

function line(label: string, ...parts: (Node | string)[]): HTMLElement {
  const p = el('p', 'now-line');
  if (label) p.append(el('span', 'now-label', label), ' ');
  p.append(...parts);
  return p;
}

const by = (name: string) => (name ? `, ${curly(name)}` : '');
const track = (t: Track) => [link(t.title, t.link, 'now-title'), by(t.artist)];
const album = (a: Album) => [link(a.title, a.link, 'now-title'), by(a.artist)];
const film = (f: Film) => [
  link(f.title, f.link, 'now-title'),
  f.year ? ` (${f.year})` : '',
  f.rating !== null ? ` ${stars(f.rating)}` : '',
];

/** A list that shows its first five rows; the rest are a scroll away. */
function scroller(rows: HTMLElement[]): HTMLElement {
  const box = el('div', 'now-scroll');
  box.append(...rows);
  if (rows.length > 5) {
    // Drop the bottom fade once the reader has scrolled to the end.
    box.addEventListener('scroll', () => {
      box.toggleAttribute('data-end', box.scrollTop + box.clientHeight >= box.scrollHeight - 2);
    });
    box.dataset.more = '';
    box.tabIndex = 0;
    box.setAttribute('role', 'group');
    box.setAttribute('aria-label', `${rows.length} albums; scroll for more`);
  }
  return box;
}

function listening(data: NonNullable<NowData['listening']>): Node[] {
  const out: Node[] = [];
  if (data.now) out.push(line('Right now', ...track(data.now)));
  if (data.albums.length > 0) {
    out.push(line('Latest saved albums'), scroller(data.albums.map((a) => line('', ...album(a)))));
  }
  if (out.length === 0) return [];
  return [...out, line('', link('more on Spotify', data.profile, 'now-more'))];
}

function watching(data: NonNullable<NowData['watching']>): Node[] {
  if (data.films.length === 0) return [];
  return [
    line('Recently watched'),
    ...data.films.map((f) => line('', ...film(f))),
    line('', link('more on Letterboxd', data.profile, 'now-more')),
  ];
}

function fill(name: string, nodes: Node[]) {
  const section = document.querySelector<HTMLElement>(`.now-section[data-feed="${name}"]`);
  if (!section || nodes.length === 0) return;
  section.querySelector('.now-body')!.replaceChildren(...nodes);
  section.hidden = false;
}

/** Fetch what Karan is hearing and watching, and show whichever parts answer. */
export async function initNow() {
  if (!document.querySelector('.now-section[data-feed]')) return;
  let data: NowData;
  try {
    const res = await fetch('/api/now.json');
    if (!res.ok) return;
    data = await res.json();
  } catch {
    return; // The notes below are a complete page on their own.
  }
  if (data.listening) fill('listening', listening(data.listening));
  if (data.watching) fill('watching', watching(data.watching));
  // New links should glow like the rest, and the glass should show them.
  initDoors();
  refreshCopy();
}
