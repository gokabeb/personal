// One-time migration: seeds existing hardcoded data into Supabase
// Run once with: npm run seed
// Safe to re-run — uses upsert on slug

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));

// Read .env file manually (no dotenv dependency)
let env = {};
try {
  const envFile = readFileSync(join(__dir, '../.env'), 'utf-8');
  env = Object.fromEntries(
    envFile.split('\n')
      .filter(l => l.includes('=') && !l.startsWith('#') && l.trim())
      .map(l => {
        const idx = l.indexOf('=');
        return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
      })
  );
} catch {
  console.error('No .env file found — set env vars manually or create .env');
  process.exit(1);
}

const supabase = createClient(
  env.PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

const { projects } = await import('../src/data/projects.js');
const { poems } = await import('../src/data/placeholder-poems.js');

function slugify(str) {
  return str.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
}

// Seed projects
console.log('Seeding projects...');
for (const p of projects) {
  const body = Array.isArray(p.bodyParagraphs) ? p.bodyParagraphs.join('\n\n') : '';
  const { error } = await supabase.from('projects').upsert({
    slug:       p.slug,
    title:      p.title,
    label:      p.label,
    category:   p.category,
    headline:   p.headline,
    lede:       p.lede,
    body,
    pull_quote: p.pullQuote,
    updates:    p.updates ?? [],
    video_url:  p.videoUrl ?? null,
    published:  true,
  }, { onConflict: 'slug' });
  if (error) console.error(`  ✗ ${p.slug}:`, error.message);
  else console.log(`  ✓ ${p.slug}`);
}

// Seed poems
console.log('Seeding poems...');
for (const p of poems) {
  const slug = slugify(p.title);
  const body = Array.isArray(p.lines) ? p.lines.join('\n') : p.body ?? '';
  const { error } = await supabase.from('poems').upsert({
    slug,
    title:     p.title,
    year:      p.year ?? null,
    body,
    tags:      [],
    audio_url: p.audioUrl ?? null,
    published: true,
  }, { onConflict: 'slug' });
  if (error) console.error(`  ✗ ${slug}:`, error.message);
  else console.log(`  ✓ ${slug}`);
}

console.log('\nDone. Run the SQL in docs/supabase-schema.sql in your Supabase project first.');
