# 3D Semantic Constellation — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Three.js 3D constellation as the default view on `/commonplace`, where entry positions are semantically meaningful — computed from OpenAI text embeddings reduced to 3D via UMAP.

**Architecture:** On admin publish, generate a 1536-dim embedding (text-embedding-3-small) and store it in Supabase via pgvector. At page load, fetch entries with embeddings, run UMAP client-side in the browser (~150ms) to get x/y/z positions, render in Three.js with OrbitControls. Mobile devices degrade to the existing 2D constellation.

**Tech Stack:** `three`, `umap-js`, Supabase pgvector, OpenAI embeddings API, React 19, Astro 5

---

## Critical Context

- The current `ConstellationCanvas.jsx` (2D) uses D3 force simulation — it stays unchanged
- `CommonplaceBook.jsx` currently has two modes: `'list'` | `'constellation'` — we add `'3d'`
- `TAG_COLORS` map lives in `ConstellationCanvas.jsx` — copy it into `Constellation3D.jsx` (don't import cross-component)
- Supabase returns `vector` columns as **strings** like `"[0.1,0.2,...]"` — must `JSON.parse()` them
- The project has no git repo — skip git commit steps
- Build command: `npm run build` — must complete with zero errors

---

## Step 0 — SQL (user runs manually in Supabase SQL Editor)

Before any code changes, the user must run:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE commonplace_entries ADD COLUMN IF NOT EXISTS embedding vector(1536);
```

Also append to `docs/supabase-schema.sql`:

```sql
-- Enable pgvector and add embedding column to commonplace_entries
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE commonplace_entries ADD COLUMN IF NOT EXISTS embedding vector(1536);
```

---

## Task 1 — Install dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install three and umap-js**

```bash
npm install three umap-js
npm install --save-dev @types/three
```

**Step 2: Verify**

```bash
npm run build
```

Expected: build succeeds (no new errors — packages don't add any side effects at install time).

---

## Task 2 — Update `publish.ts` to generate embeddings on commonplace publish

**Files:**
- Modify: `src/pages/api/content/publish.ts`

When `type === 'commonplace'` and it's not a draft, generate an embedding for the quote (plus annotation if present) and include it in the DB payload.

**Step 1: Add embedding generation**

Open `src/pages/api/content/publish.ts`. After the `const db = getDb();` line, add the embedding logic:

```ts
import OpenAI from 'openai';
```

Add this import at the top of the file (after existing imports).

**Step 2: Replace the payload block**

Current payload block (lines ~29–35):
```ts
const payload = {
  ...data,
  ...(type === 'project' && data?.headline ? { title: data.headline } : {}),
  published: !draft,
  ...(draft ? {} : type === 'article' ? { published_at: new Date().toISOString() } : {}),
};
```

Replace with:
```ts
let embedding: number[] | undefined;
if (type === 'commonplace' && !draft) {
  const apiKey = import.meta.env.OPENAI_API_KEY;
  if (apiKey) {
    try {
      const openai = new OpenAI({ apiKey });
      const input = [data?.quote, data?.annotation].filter(Boolean).join('\n\n') as string;
      const res = await openai.embeddings.create({ model: 'text-embedding-3-small', input });
      embedding = res.data[0].embedding;
    } catch {
      // embedding failure is non-fatal — entry publishes without embedding
    }
  }
}

const payload = {
  ...data,
  ...(type === 'project' && data?.headline ? { title: data.headline } : {}),
  published: !draft,
  ...(draft ? {} : type === 'article' ? { published_at: new Date().toISOString() } : {}),
  ...(embedding ? { embedding } : {}),
};
```

**Step 3: Verify build**

```bash
npm run build
```

Expected: zero errors.

---

## Task 3 — Update seed script to generate embeddings for existing 16 entries

**Files:**
- Modify: `scripts/seed-commonplace.js`

**Step 1: Add embedding generation to seed**

Replace the entire file with:

```js
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { commonplaceEntries } from '../src/data/placeholder-commonplace.js';
import 'dotenv/config';

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Batch all 16 quotes in a single API call
const inputs = commonplaceEntries.map(e =>
  [e.quote, e.annotation].filter(Boolean).join('\n\n')
);

console.log('Generating embeddings…');
const embeddingRes = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: inputs,
});
const embeddings = embeddingRes.data.map(d => d.embedding);

const rows = commonplaceEntries.map((e, i) => ({
  legacy_id:     e.id,
  quote:         e.quote,
  source_author: e.sourceAuthor ?? '',
  source_work:   e.sourceWork ?? '',
  source_url:    e.sourceUrl ?? null,
  source_year:   e.sourceYear ?? null,
  annotation:    e.annotation ?? '',
  tags:          e.tags ?? [],
  published:     true,
  embedding:     embeddings[i],
}));

const { error } = await supabase
  .from('commonplace_entries')
  .upsert(rows, { onConflict: 'legacy_id' });

if (error) { console.error('Seed failed:', error.message); process.exit(1); }
console.log(`Seeded ${rows.length} entries with embeddings.`);
```

**Step 2: Run seed**

```bash
node scripts/seed-commonplace.js
```

Expected output:
```
Generating embeddings…
Seeded 16 entries with embeddings.
```

---

## Task 4 — Update `commonplace.astro` to pass embedding through

**Files:**
- Modify: `src/pages/commonplace.astro`

The `select('*')` query already fetches all columns including `embedding` once the column exists. The only change is to pass `embedding` through the mapping so `<Constellation3D>` receives it.

**Step 1: Add embedding to the entry mapping**

Find the `entries` mapping block (currently ends with `tags: e.tags ?? []`). Add one line:

```ts
const entries = (rawEntries ?? []).map((e: any) => ({
  id: e.id,
  quote: e.quote,
  sourceAuthor: e.source_author ?? '',
  sourceWork: e.source_work ?? '',
  sourceUrl: e.source_url ?? '',
  sourceYear: e.source_year ?? null,
  annotation: e.annotation ?? '',
  tags: e.tags ?? [],
  embedding: e.embedding ?? null,   // ADD THIS LINE
}));
```

**Step 2: Verify build**

```bash
npm run build
```

Expected: zero errors.

---

## Task 5 — Create `Constellation3D.jsx`

**Files:**
- Create: `src/components/commonplace/Constellation3D.jsx`

This is the main new component. Write the complete file:

```jsx
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { UMAP } from 'umap-js';

// Copied from ConstellationCanvas.jsx — keep in sync if tags are added
const TAG_COLORS = {
  grief: '#8B7355', technology: '#4A7C9E', 'san-francisco': '#6B8C42',
  play: '#9B7BAD', identity: '#C49A6C', poetry: '#B07070',
  learning: '#5A8C8C', philosophy: '#7A7A9E', neuroscience: '#6A9E8C',
  attention: '#9E9E4A', art: '#B08060', community: '#8C6A8C',
  resilience: '#7A9E6A', "beginner's-mind": '#6A8C9E', design: '#9E7A5A',
  media: '#6A7A9E', mind: '#8C7A9E', paradox: '#9E6A6A',
  creativity: '#C4906A', narrative: '#8C7A6A', self: '#9E8A6A',
  storytelling: '#8C7060', questions: '#7A9E8C', agency: '#9E8A7A',
  psychology: '#7A8CA0', place: '#6A8C7A', presence: '#8A9E7A',
  vision: '#7A8C9E', cities: '#8A9E9E', zen: '#9E9E8A',
  research: '#6A9E9E', emotion: '#B07890', craft: '#9E8070',
  communication: '#7890A0', ethics: '#9E7070', generosity: '#9E9070',
};

function getTagColor(tags) {
  for (const tag of (tags || [])) {
    if (TAG_COLORS[tag]) return TAG_COLORS[tag];
  }
  return '#6A7A8A';
}

function computeJaccardEdges(entries) {
  const links = [];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const tagsA = entries[i].tags ?? [];
      const tagsB = entries[j].tags ?? [];
      const shared = tagsA.filter(t => tagsB.includes(t));
      if (shared.length === 0) continue;
      const union = new Set([...tagsA, ...tagsB]).size;
      links.push({ i, j, similarity: shared.length / union });
    }
  }
  return links;
}

function normalizePositions(raw) {
  const xs = raw.map(p => p[0]);
  const ys = raw.map(p => p[1]);
  const zs = raw.map(p => p[2]);
  const [minX, maxX] = [Math.min(...xs), Math.max(...xs)];
  const [minY, maxY] = [Math.min(...ys), Math.max(...ys)];
  const [minZ, maxZ] = [Math.min(...zs), Math.max(...zs)];
  const scale = 18;
  const norm = (v, lo, hi) => hi === lo ? 0 : ((v - lo) / (hi - lo) - 0.5) * scale;
  return raw.map(p => ({
    x: norm(p[0], minX, maxX),
    y: norm(p[1], minY, maxY),
    z: norm(p[2], minZ, maxZ),
  }));
}

export default function Constellation3D({ entries = [], onSelectEntry, searchQuery = '' }) {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const nodeObjectsRef = useRef([]);
  const frameRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [hoveredEntry, setHoveredEntry] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Only entries that have embeddings can be positioned semantically
    const validEntries = entries.filter(e => e.embedding);
    if (!validEntries.length || !containerRef.current) return;

    let cancelled = false;

    async function buildScene() {
      // Parse embeddings — Supabase returns vector as string "[0.1,0.2,...]"
      const embeddings = validEntries.map(e =>
        typeof e.embedding === 'string' ? JSON.parse(e.embedding) : e.embedding
      );

      // UMAP: 1536-dim → 3D
      const nNeighbors = Math.min(15, validEntries.length - 1);
      const umap = new UMAP({ nComponents: 3, nNeighbors, minDist: 0.1 });
      const raw3d = await umap.fitAsync(embeddings);
      if (cancelled) return;

      const positions = normalizePositions(raw3d);

      const width = containerRef.current.clientWidth || 800;
      const height = containerRef.current.clientHeight || 500;

      // Scene
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
      camera.position.set(0, 0, 25);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      containerRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // Lights
      scene.add(new THREE.AmbientLight(0xffffff, 0.6));
      const dir = new THREE.DirectionalLight(0xffffff, 0.8);
      dir.position.set(10, 10, 10);
      scene.add(dir);

      // Controls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.3;
      controls.addEventListener('start', () => { controls.autoRotate = false; });

      // Jaccard edges for connection count + line geometry
      const edges = computeJaccardEdges(validEntries);
      const connectionCount = new Array(validEntries.length).fill(0);
      edges.forEach(({ i, j }) => { connectionCount[i]++; connectionCount[j]++; });

      // Nodes
      const nodeObjects = [];
      validEntries.forEach((entry, idx) => {
        const pos = positions[idx];
        const r = Math.min(0.3 + connectionCount[idx] * 0.1, 0.8);
        const geo = new THREE.SphereGeometry(r, 16, 16);
        const col = new THREE.Color(getTagColor(entry.tags));
        const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.4, metalness: 0.2 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(pos.x, pos.y, pos.z);
        mesh.userData = { entry, baseRadius: r };
        scene.add(mesh);
        nodeObjects.push(mesh);
      });
      nodeObjectsRef.current = nodeObjects;

      // Edge lines
      if (edges.length > 0) {
        const edgeVerts = [];
        edges.forEach(({ i, j }) => {
          const a = positions[i], b = positions[j];
          edgeVerts.push(a.x, a.y, a.z, b.x, b.y, b.z);
        });
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(edgeVerts, 3));
        const mat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1 });
        scene.add(new THREE.LineSegments(geo, mat));
      }

      // Raycasting
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();

      const onMouseMove = (e) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObjects(nodeObjects);
        if (hits.length > 0) {
          const mesh = hits[0].object;
          setHoveredEntry(mesh.userData.entry);
          setTooltipPos({ x: e.clientX - rect.left + 12, y: e.clientY - rect.top - 12 });
          nodeObjects.forEach(n => n.material.emissiveIntensity = 0);
          mesh.material.emissive = new THREE.Color(0.15, 0.15, 0.15);
          mesh.material.emissiveIntensity = 1;
          containerRef.current.style.cursor = 'pointer';
        } else {
          setHoveredEntry(null);
          nodeObjects.forEach(n => { n.material.emissive = new THREE.Color(0, 0, 0); });
          containerRef.current.style.cursor = 'default';
        }
      };

      const onClick = (e) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObjects(nodeObjects);
        if (hits.length > 0) onSelectEntry?.(hits[0].object.userData.entry);
      };

      const onResize = () => {
        if (!containerRef.current) return;
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };

      renderer.domElement.addEventListener('mousemove', onMouseMove);
      renderer.domElement.addEventListener('click', onClick);
      window.addEventListener('resize', onResize);

      const animate = () => {
        frameRef.current = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };
      animate();
      setLoading(false);

      // Cleanup stored on renderer for unmount
      rendererRef.current._cleanup = () => {
        cancelAnimationFrame(frameRef.current);
        renderer.domElement.removeEventListener('mousemove', onMouseMove);
        renderer.domElement.removeEventListener('click', onClick);
        window.removeEventListener('resize', onResize);
        controls.dispose();
        scene.traverse(obj => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) obj.material.dispose();
        });
        renderer.dispose();
        if (containerRef.current?.contains(renderer.domElement)) {
          containerRef.current.removeChild(renderer.domElement);
        }
      };
    }

    buildScene();

    return () => {
      cancelled = true;
      rendererRef.current?._cleanup?.();
    };
  }, [entries]);

  // Search: fade non-matching nodes
  useEffect(() => {
    const nodes = nodeObjectsRef.current;
    if (!nodes.length) return;
    const q = searchQuery.toLowerCase();
    nodes.forEach(mesh => {
      const { entry } = mesh.userData;
      if (!q) {
        mesh.material.opacity = 1;
        mesh.material.transparent = false;
        return;
      }
      const matches =
        entry.quote?.toLowerCase().includes(q) ||
        entry.sourceAuthor?.toLowerCase().includes(q) ||
        entry.tags?.some(t => t.toLowerCase().includes(q));
      mesh.material.opacity = matches ? 1 : 0.05;
      mesh.material.transparent = true;
    });
  }, [searchQuery]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="font-mono text-[0.65rem] tracking-widest uppercase text-white/40 animate-pulse">
            Mapping semantic space…
          </p>
        </div>
      )}
      {hoveredEntry && (
        <div
          className="absolute pointer-events-none z-10 max-w-[220px] bg-[#1A1A17]/90 border border-white/10 p-3 backdrop-blur-sm"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          <p className="font-display italic text-[0.75rem] text-white/90 leading-[1.4] mb-1.5 line-clamp-3">
            "{hoveredEntry.quote}"
          </p>
          <p className="font-mono text-[0.6rem] tracking-wider uppercase text-[#E85D75]">
            {hoveredEntry.sourceAuthor}
          </p>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Verify build**

```bash
npm run build
```

Expected: zero errors. The component won't be used yet.

---

## Task 6 — Update `CommonplaceBook.jsx` to add 3D mode

**Files:**
- Modify: `src/components/commonplace/CommonplaceBook.jsx`

**Step 1: Add Constellation3D import**

At the top of the file, after the existing imports:
```js
import Constellation3D from './Constellation3D.jsx';
```

**Step 2: Replace the mode state with mobile-aware default**

Current:
```js
const [mode, setMode] = useState('list');
```

Replace with:
```js
const [mode, setMode] = useState('3d'); // overridden on mount for mobile
useEffect(() => {
  if (window.innerWidth < 768) setMode('2d');
}, []);
```

Make sure `useEffect` is imported (it already is via `useState` import — check the import line and add it if missing).

**Step 3: Replace the mode toggle buttons**

Current:
```jsx
<div className="flex items-center gap-2 ml-auto">
  <button
    onClick={() => setMode('list')}
    className={`font-mono text-[0.65rem] tracking-[0.15em] uppercase px-3 py-1.5 border transition-colors duration-150 ${
      mode === 'list'
        ? 'border-ink bg-ink text-paper'
        : 'border-rule text-ink-muted hover:border-ink hover:text-ink'
    }`}
  >
    List
  </button>
  <button
    onClick={() => setMode('constellation')}
    className={`font-mono text-[0.65rem] tracking-[0.15em] uppercase px-3 py-1.5 border transition-colors duration-150 ${
      mode === 'constellation'
        ? 'border-ink bg-ink text-paper'
        : 'border-rule text-ink-muted hover:border-ink hover:text-ink'
    }`}
  >
    Constellation
  </button>
</div>
```

Replace with:
```jsx
<div className="flex items-center gap-2 ml-auto">
  <button
    onClick={() => setMode('3d')}
    className={`hidden md:block font-mono text-[0.65rem] tracking-[0.15em] uppercase px-3 py-1.5 border transition-colors duration-150 ${
      mode === '3d'
        ? 'border-ink bg-ink text-paper'
        : 'border-rule text-ink-muted hover:border-ink hover:text-ink'
    }`}
  >
    3D
  </button>
  <button
    onClick={() => setMode('2d')}
    className={`font-mono text-[0.65rem] tracking-[0.15em] uppercase px-3 py-1.5 border transition-colors duration-150 ${
      mode === '2d'
        ? 'border-ink bg-ink text-paper'
        : 'border-rule text-ink-muted hover:border-ink hover:text-ink'
    }`}
  >
    2D
  </button>
  <button
    onClick={() => setMode('list')}
    className={`font-mono text-[0.65rem] tracking-[0.15em] uppercase px-3 py-1.5 border transition-colors duration-150 ${
      mode === 'list'
        ? 'border-ink bg-ink text-paper'
        : 'border-rule text-ink-muted hover:border-ink hover:text-ink'
    }`}
  >
    List
  </button>
</div>
```

**Step 4: Add 3D view to the AnimatePresence block**

Current AnimatePresence block checks `mode === 'constellation'`. Add a 3D branch at the top:

```jsx
<AnimatePresence mode="wait">
  {mode === '3d' ? (
    <motion.div
      key="constellation-3d"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full bg-[#111110] rounded-none"
      style={{ height: '70vh', minHeight: '500px' }}
    >
      <Constellation3D
        entries={filteredEntries}
        onSelectEntry={setSelectedEntry}
        searchQuery={searchQuery}
      />
    </motion.div>
  ) : mode === 'constellation' ? (
```

And rename the existing `'constellation'` key to `'constellation-2d'` to avoid Framer Motion key collision:
```jsx
  ) : mode === 'constellation' ? (
    <motion.div
      key="constellation-2d"   {/* was "constellation" */}
```

**Step 5: Update the `mode === 'constellation'` check elsewhere**

The existing 2D mode check uses `mode === 'constellation'`. Since we renamed the mode value to `'2d'`, update the condition and button onClick:
- `mode === 'constellation'` → `mode === '2d'` (in the AnimatePresence)
- The button onClick was already updated in Step 3

**Step 6: Verify build**

```bash
npm run build
```

Expected: zero errors.

---

## Task 7 — Final verification

**Step 1: Run dev server**

```bash
npm run dev
```

Navigate to `http://localhost:4321/commonplace`.

**Checklist:**
- [ ] Page loads with "Mapping semantic space…" pulse text
- [ ] 3D scene fades in — spheres visible against dark background
- [ ] Scene auto-rotates slowly
- [ ] Click and drag rotates the scene; scroll zooms
- [ ] Hovering a node shows tooltip with quote + author
- [ ] Clicking a node opens EntryModal (if entries have embeddings — run seed first)
- [ ] "3D · 2D · List" buttons visible on desktop
- [ ] 2D button shows existing D3 constellation
- [ ] List button shows entry list
- [ ] Resize window below 768px: 3D button hidden, mode stays 2D
- [ ] Search query fades non-matching nodes in 3D view

**Step 2: Run build**

```bash
npm run build
```

Expected: zero errors, 8 pages built.

---

## Verification Checklist (end-to-end)

1. SQL run in Supabase → `commonplace_entries.embedding` column exists
2. `node scripts/seed-commonplace.js` → `Seeded 16 entries with embeddings.`
3. Admin publish a new commonplace entry → entry appears in 3D with correct semantic position
4. `/commonplace` → 3D default, smooth rotation, hover + click work
5. `/commonplace` on mobile → 2D constellation, no 3D button
6. `npm run build` → zero errors
