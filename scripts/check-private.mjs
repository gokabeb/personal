// Scans the built site for private details that must never be published.
// The terms live in .private-terms (one per line, never committed).
//
//   node scripts/check-private.mjs [--dir <folder>]... [--terms <file>]
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const dirs = [];
let termsFile = '.private-terms';
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--dir') dirs.push(args[++i]);
  else if (args[i] === '--terms') termsFile = args[++i];
}
if (dirs.length === 0) dirs.push('dist', '.vercel/output/static');

if (!existsSync(termsFile)) {
  console.warn(`check-private: no terms file at ${termsFile}; nothing checked.`);
  process.exit(0);
}

const terms = readFileSync(termsFile, 'utf8')
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'));

const TEXT = /\.(html|css|js|mjs|json|xml|txt|svg|map)$/;

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (TEXT.test(name)) yield path;
  }
}

const hits = [];
for (const dir of dirs.filter((d) => existsSync(d))) {
  for (const file of files(dir)) {
    const text = readFileSync(file, 'utf8').toLowerCase();
    for (const term of terms) {
      if (text.includes(term.toLowerCase())) hits.push(`${file}: "${term}"`);
    }
  }
}

if (hits.length > 0) {
  console.error(`check-private: found ${hits.length} private detail(s) in the built site:\n  ${hits.join('\n  ')}`);
  process.exit(1);
}
console.log(`check-private: ${terms.length} terms checked, nothing found.`);
