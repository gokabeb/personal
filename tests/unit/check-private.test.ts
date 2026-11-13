import { test, expect, beforeEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let dir: string;
let terms: string;
const run = (termsPath = terms) =>
  spawnSync('node', ['scripts/check-private.mjs', '--dir', dir, '--terms', termsPath], { encoding: 'utf8' });

beforeEach(() => {
  const root = mkdtempSync(join(tmpdir(), 'private-'));
  dir = join(root, 'site');
  mkdirSync(join(dir, 'nested'), { recursive: true });
  terms = join(root, 'terms');
  writeFileSync(terms, '# comment\nElm Street\n\n555-0100\n');
  writeFileSync(join(dir, 'index.html'), '<p>hello</p>');
});

test('a clean site passes', () => {
  const r = run();
  expect(r.status).toBe(0);
});

test('a private term anywhere in the site fails, naming the file and the term', () => {
  writeFileSync(join(dir, 'nested', 'page.html'), '<p>12 ELM STREET</p>');
  const r = run();
  expect(r.status).toBe(1);
  expect(r.stdout + r.stderr).toContain('page.html');
  expect(r.stdout + r.stderr).toContain('Elm Street');
});

test('with no terms file it warns and passes, so a fresh checkout still builds', () => {
  const r = run(join(dir, 'missing'));
  expect(r.status).toBe(0);
  expect(r.stdout + r.stderr).toMatch(/no .*terms/i);
});
