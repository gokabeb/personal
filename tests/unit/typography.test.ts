import { test, expect } from 'vitest';
import { curly, straight } from '../../src/lib/typography';

test('apostrophes inside and at the end of words', () => {
  expect(curly("I'm sure it's the kids' game")).toBe('I’m sure it’s the kids’ game');
  expect(curly("what I've built")).toBe('what I’ve built');
});

test('double quotes open and close', () => {
  expect(curly('say "go do something useful," she said')).toBe('say “go do something useful,” she said');
  expect(curly('"Zero-Trust Network for Robots and IoT,"')).toBe('“Zero-Trust Network for Robots and IoT,”');
  expect(curly('("quoted")')).toBe('(“quoted”)');
});

test('single quotes used as quotation marks, and nested quotes', () => {
  expect(curly("the murmurs of 'mhmm' filled")).toBe('the murmurs of ‘mhmm’ filled');
  expect(curly(`"I said 'no'"`)).toBe('“I said ‘no’”');
});

test('a leading apostrophe for a dropped letter or decade stays an apostrophe', () => {
  expect(curly("rock 'n' roll in the '90s")).toBe('rock ’n’ roll in the ’90s');
});

test('already-curly text and text without quotes is left alone', () => {
  expect(curly('I’m “fine”')).toBe('I’m “fine”');
  expect(curly('70% hydration')).toBe('70% hydration');
  expect(curly('')).toBe('');
});

test('straight() undoes it, so search matches whichever kind is typed', () => {
  expect(straight('I’m “fine” ‘ok’')).toBe(`I'm "fine" 'ok'`);
});
