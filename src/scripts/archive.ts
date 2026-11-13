import { matches, type Filter } from '../lib/archive';
import { refreshCopy } from './lens';

/** The Writing page: search box and filters narrow the list as you type. */
export function initArchive() {
  const root = document.querySelector<HTMLElement>('.archive');
  if (!root || root.dataset.wired) return;
  root.dataset.wired = '1';

  const box = root.querySelector<HTMLInputElement>('input[type="search"]')!;
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('.filters button')];
  const rows = [...root.querySelectorAll<HTMLElement>('.piece')];
  const empty = root.querySelector<HTMLElement>('.no-results')!;
  let filter: Filter = 'all';

  const apply = () => {
    let shown = 0;
    for (const row of rows) {
      const show = matches(row.dataset.search ?? '', row.dataset.group ?? '', box.value, filter);
      row.hidden = !show;
      if (show) shown++;
    }
    empty.hidden = shown > 0;
    for (const b of buttons) b.setAttribute('aria-pressed', String(b.dataset.filter === filter));
    // The glass holds a copy of the page; keep it showing the same rows.
    box.setAttribute('value', box.value);
    refreshCopy();
  };

  box.addEventListener('input', apply);
  for (const b of buttons) {
    b.addEventListener('click', () => {
      filter = b.dataset.filter as Filter;
      apply();
    });
  }
}
