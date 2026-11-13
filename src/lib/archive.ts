import { straight } from './typography';

export type Kind = 'poem' | 'essay' | 'radio' | 'book' | 'press';
export type Filter = 'all' | 'poetry' | 'essays';

const LABELS: Record<Kind, string> = {
  poem: 'Poetry',
  essay: 'Essay',
  radio: 'Commentary',
  book: 'Book',
  press: 'Press',
};

export const kindLabel = (kind: Kind): string => LABELS[kind];

/** Which filter a piece shows under, besides "All". */
export function filterFor(kind: Kind): Exclude<Filter, 'all'> | null {
  if (kind === 'poem') return 'poetry';
  if (kind === 'essay' || kind === 'radio') return 'essays';
  return null;
}

/** Everything about a piece that search should look through, as one lowercase string. */
export function haystack(piece: { title: string; kind: Kind; year: number; blurb?: string; text?: string | null }): string {
  // Stored with straight quotes so a search matches whichever kind is typed.
  return straight([piece.title, kindLabel(piece.kind), piece.year, piece.blurb ?? '', piece.text ?? ''].join(' ')).toLowerCase();
}

/** Does a piece survive the current search box and filter? Every typed word must appear. */
export function matches(hay: string, group: string, query: string, filter: Filter): boolean {
  if (filter !== 'all' && group !== filter) return false;
  return straight(query)
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => hay.includes(word));
}
