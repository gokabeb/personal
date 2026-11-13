import { test, expect } from 'vitest';
import { shimmerMarks } from '../../src/lib/marks';

test('words wrapped in ** become shimmering spans', () => {
  expect(shimmerMarks('Filed a **78-claim patent** last year')).toBe(
    'Filed a <span class="shine">78-claim patent</span> last year',
  );
  expect(shimmerMarks('**a** and **b**')).toBe('<span class="shine">a</span> and <span class="shine">b</span>');
});

test('everything else is treated as plain text, never as HTML', () => {
  expect(shimmerMarks('5 < 6 & "x" <b>')).toBe('5 &lt; 6 &amp; \u201cx\u201d &lt;b&gt;');
  expect(shimmerMarks('**<i>x</i>**')).toBe('<span class="shine">&lt;i&gt;x&lt;/i&gt;</span>');
});

test('unpaired or empty markers are left alone', () => {
  expect(shimmerMarks('2 ** 3')).toBe('2 ** 3');
  expect(shimmerMarks('****')).toBe('****');
  expect(shimmerMarks('')).toBe('');
});
