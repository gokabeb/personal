import { test, expect } from 'vitest';
import { doorForHref, doorTitles, FALLBACK_TITLES } from '../../src/lib/doors';

test('recognises links to the three doorway pages', () => {
  expect(doorForHref('/writing')).toBe('writing');
  expect(doorForHref('/now/')).toBe('now');
  expect(doorForHref('/cv#top')).toBe('cv');
  expect(doorForHref('/cv?x=1')).toBe('cv');
});

test('everything else is an ordinary link', () => {
  expect(doorForHref('/writing/dear-dada')).toBeNull();
  expect(doorForHref('https://kqed.org/writing')).toBeNull();
  expect(doorForHref('mailto:kgupta1219@gmail.com')).toBeNull();
  expect(doorForHref('/nowhere')).toBeNull();
  expect(doorForHref('')).toBeNull();
});

test('page titles come from the phrases linked in the letter', () => {
  expect(doorTitles('hi [poems, mostly](/writing) and [stuff](/cv)')).toEqual({
    writing: 'poems, mostly',
    cv: 'stuff',
    now: 'Now',
  });
  expect(doorForHref('/work')).toBeNull();
});

test('the first link to a doorway wins', () => {
  expect(doorTitles('[one](/now) [two](/now)').now).toBe('one');
});

test('a letter with no doorways falls back to plain titles', () => {
  expect(doorTitles('')).toEqual(FALLBACK_TITLES);
  expect(doorTitles('[mail](mailto:a@b.co) [x](https://e.com/cv)')).toEqual(FALLBACK_TITLES);
});
