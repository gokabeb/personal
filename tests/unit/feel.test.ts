import { test, expect, afterEach } from 'vitest';
import { feel } from '../../src/lib/feel';
import { contrastOnWhite } from '../../src/lib/contrast';
import { remember, remembered } from '../../src/lib/storage';

test('contrast against white follows the WCAG formula', () => {
  expect(contrastOnWhite('#000000')).toBeCloseTo(21, 5);
  expect(contrastOnWhite('#ffffff')).toBeCloseTo(1, 5);
  expect(contrastOnWhite('#767676')).toBeCloseTo(4.54, 1);
});

test('every colour in the spectrum is readable as body text on white', () => {
  expect(feel.spectrum.length).toBeGreaterThanOrEqual(5);
  for (const colour of feel.spectrum) {
    expect(contrastOnWhite(colour), colour).toBeGreaterThanOrEqual(4.5);
  }
});

const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
afterEach(() => {
  if (original) Object.defineProperty(globalThis, 'localStorage', original);
  else delete (globalThis as Record<string, unknown>).localStorage;
});

test('remembering works when storage works', () => {
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => data.set(k, v) },
  });
  expect(remembered('seen')).toBe(false);
  remember('seen');
  expect(remembered('seen')).toBe(true);
});

test('blocked storage never throws; nothing is remembered', () => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      throw new Error('blocked');
    },
  });
  expect(() => remember('seen')).not.toThrow();
  expect(remembered('seen')).toBe(false);
});
