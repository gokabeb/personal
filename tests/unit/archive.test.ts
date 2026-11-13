import { test, expect } from 'vitest';
import { filterFor, kindLabel, haystack, matches } from '../../src/lib/archive';

test('kinds map onto the two filters; books and press only appear under All', () => {
  expect(filterFor('poem')).toBe('poetry');
  expect(filterFor('essay')).toBe('essays');
  expect(filterFor('radio')).toBe('essays');
  expect(filterFor('book')).toBeNull();
  expect(filterFor('press')).toBeNull();
  expect(kindLabel('poem')).toBe('Poetry');
  expect(kindLabel('radio')).toBe('Commentary');
});

const piece = haystack({ title: 'Dear Dada', kind: 'poem', year: 2026, blurb: 'For my dad', text: 'My arms tangle around\nthe absence' });

test('search looks at title, category, year, blurb and the text itself', () => {
  for (const q of ['dear', 'DADA', 'poetry', '2026', 'my dad', 'tangle', 'absence']) {
    expect(matches(piece, 'poetry', q, 'all'), q).toBe(true);
  }
  expect(matches(piece, 'poetry', 'robots', 'all')).toBe(false);
});

test('every word typed has to match, in any order', () => {
  expect(matches(piece, 'poetry', 'dada 2026', 'all')).toBe(true);
  expect(matches(piece, 'poetry', '2026   dada', 'all')).toBe(true);
  expect(matches(piece, 'poetry', 'dada 2019', 'all')).toBe(false);
});

test('an empty search shows everything the filter allows', () => {
  expect(matches(piece, 'poetry', '', 'all')).toBe(true);
  expect(matches(piece, 'poetry', '  ', 'poetry')).toBe(true);
  expect(matches(piece, 'poetry', '', 'essays')).toBe(false);
  expect(matches(piece, '', '', 'poetry')).toBe(false);
  expect(matches(piece, '', '', 'all')).toBe(true);
});
