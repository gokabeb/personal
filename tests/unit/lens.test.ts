import { test, expect } from 'vitest';
import { cloneOffset, rimBend, stretch } from '../../src/lib/lens';

test('cloneOffset puts the page point under the lens at the lens centre', () => {
  expect(cloneOffset(100, 50, 2, 80)).toEqual({ x: -120, y: -20 });
  expect(cloneOffset(0, 0, 1.45, 80)).toEqual({ x: 80, y: 80 });
});

test('rimBend is flat in the middle and rises smoothly to 1 at the edge', () => {
  expect(rimBend(0, 80, 26)).toBe(0);
  expect(rimBend(54, 80, 26)).toBe(0);
  expect(rimBend(80, 80, 26)).toBe(1);
  expect(rimBend(200, 80, 26)).toBe(1);
  let previous = 0;
  for (let r = 55; r <= 80; r++) {
    const bend = rimBend(r, 80, 26);
    expect(bend).toBeGreaterThan(previous);
    previous = bend;
  }
});

test('stretch: round at rest, capped when fast, never changes area', () => {
  expect(stretch(0, 0, 0.12)).toEqual({ angle: 0, sx: 1, sy: 1 });
  expect(stretch(9999, 0, 0.12).sx).toBe(1.15);
  expect(stretch(0, 20, 0.12).angle).toBeCloseTo(Math.PI / 2);
  for (const [vx, vy] of [[3, 4], [-30, 2], [0.1, 0], [9999, -9999]]) {
    const s = stretch(vx, vy, 0.12);
    expect(s.sx).toBeGreaterThanOrEqual(1);
    expect(s.sx * s.sy).toBeCloseTo(1, 9);
  }
});
