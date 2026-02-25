import { createClient } from '@supabase/supabase-js';
import { UMAP } from 'umap-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const { data: entries, error } = await supabase
  .from('commonplace_entries')
  .select('id, embedding')
  .eq('published', true)
  .not('embedding', 'is', null);

if (error) { console.error('Fetch failed:', error.message); process.exit(1); }
if (!entries.length) { console.log('No entries with embeddings found.'); process.exit(0); }

console.log(`Computing 3D positions for ${entries.length} entries…`);

const embeddings = entries.map(e =>
  typeof e.embedding === 'string' ? JSON.parse(e.embedding) : e.embedding
);

const nNeighbors = Math.min(15, entries.length - 1);
const umap = new UMAP({ nComponents: 3, nNeighbors, minDist: 0.1 });
const raw3d = umap.fit(embeddings);

// Normalize to [-9, 9]
const xs = raw3d.map(p => p[0]), ys = raw3d.map(p => p[1]), zs = raw3d.map(p => p[2]);
const [minX, maxX] = [Math.min(...xs), Math.max(...xs)];
const [minY, maxY] = [Math.min(...ys), Math.max(...ys)];
const [minZ, maxZ] = [Math.min(...zs), Math.max(...zs)];
const norm = (v, lo, hi) => hi === lo ? 0 : ((v - lo) / (hi - lo) - 0.5) * 18;

const updates = entries.map((e, i) => ({
  id: e.id,
  pos_x: norm(raw3d[i][0], minX, maxX),
  pos_y: norm(raw3d[i][1], minY, maxY),
  pos_z: norm(raw3d[i][2], minZ, maxZ),
}));

const { error: updateError } = await supabase
  .from('commonplace_entries')
  .upsert(updates, { onConflict: 'id' });

if (updateError) { console.error('Update failed:', updateError.message); process.exit(1); }
console.log(`Done — positions written for ${updates.length} entries.`);
