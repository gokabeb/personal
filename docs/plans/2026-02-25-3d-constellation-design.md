# 3D Semantic Constellation — Design Document

**Date:** 2026-02-25
**Status:** Approved

---

## Overview

Replace the hardcoded 2D D3 force simulation in the Commonplace Book with a three-mode view:
**3D semantic constellation (default) · 2D force graph · List**.

The 3D view uses OpenAI text embeddings reduced to three dimensions via UMAP to position entries
by semantic meaning — entries about attention and presence cluster together, entries about
identity and narrative cluster elsewhere. No manual tagging required for positioning.

---

## Approach

**Embeddings on publish, UMAP client-side, Three.js render.**

- On admin publish: call `openai.embeddings.create` (text-embedding-3-small), store `vector(1536)` in Supabase via pgvector
- At page load: Astro fetches entries including embeddings
- Client-side: `umap-js` reduces 1536-dim → [x, y, z] per entry (~150ms for ≤100 entries)
- Three.js renders the scene; existing `EntryModal` handles click events unchanged
- Mobile (< md): 3D mode hidden, default falls back to 2D constellation

---

## Database Changes

```sql
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE commonplace_entries ADD COLUMN embedding vector(1536);
```

The `commonplace.astro` select query adds `embedding` to its field list.
The seed script (`scripts/seed-commonplace.js`) gets a second pass to generate embeddings
for the 16 existing entries using the service role key.

---

## Component Structure

```
src/components/commonplace/
  CommonplaceBook.jsx     — add '3d' mode, mobile detection, mode order (3D·2D·List)
  ConstellationCanvas.jsx — unchanged
  Constellation3D.jsx     — NEW: UMAP + Three.js scene (self-contained)
  EntryModal.jsx          — unchanged
```

### CommonplaceBook.jsx changes
- Default mode: `'3d'` on desktop, `'2d'` on mobile (checked via `window.innerWidth` on mount)
- Mode buttons: **3D · 2D · List** — "3D" button hidden on mobile (`hidden md:block`)
- Passes `entries` (with `embedding` arrays) to both canvas components

### Constellation3D.jsx (new)
Self-contained React component. All Three.js and UMAP logic lives here.

**Props:** `{ entries, onSelectEntry, searchQuery }`

**Responsibilities:**
1. UMAP reduction — `useEffect` on entries change, produces `Map<id, {x,y,z}>`
2. Three.js scene setup — camera, renderer, lights, OrbitControls
3. Node rendering — `SphereGeometry` per entry, colored by primary tag
4. Edge rendering — `LineSegments`, opacity by Jaccard similarity
5. Interaction — raycasting for hover (tooltip) and click (onSelectEntry)
6. Cleanup — disposes all Three.js resources on unmount

---

## Three.js Scene Specification

**Container:** same `bg-[#111110]` dark div, `height: 70vh`, `minHeight: 500px`

**Nodes**
- `SphereGeometry(r, 16, 16)` — radius 0.3–0.8 scaled by connection count
- `MeshStandardMaterial` — color from existing `TAG_COLORS` map, `roughness: 0.4`, `metalness: 0.2`
- Hovered: emissive highlight + radius scales 1.4×

**Edges**
- `LineSegments` with `LineBasicMaterial`
- Opacity: `0.05 + jaccard * 0.25` (matches existing 2D formula)
- Only rendered for entry pairs with at least one shared tag

**Labels**
- Hover tooltip only (same dark card style as 2D): quote snippet + author
- No always-on labels

**Camera & Controls**
- `PerspectiveCamera` at z=20, looking at origin
- `OrbitControls` — rotate on drag, scroll to zoom, damping enabled
- Auto-rotate at 0.003 rad/frame when idle; stops on first user interaction

**Renderer**
- `antialias: true`, `alpha: true`
- `pixelRatio: Math.min(devicePixelRatio, 2)`

**Loading state**
- While UMAP computes: centered mono label "Mapping semantic space…" with subtle pulse
- Scene fades in on completion

---

## Data Flow

```
commonplace.astro
  → getPublicDb().from('commonplace_entries').select('*, embedding')
  → passes entries[] (with embedding: number[]) to <CommonplaceBook>

CommonplaceBook
  → detects mobile on mount, sets default mode
  → passes filteredEntries to <Constellation3D> or <ConstellationCanvas>

Constellation3D
  → useEffect: runs umap-js on entries[].embedding → positions Map
  → builds Three.js scene from positions + Jaccard edges
  → raycaster → hover tooltip | click → onSelectEntry(entry)
  → existing EntryModal renders on top
```

---

## New Dependencies

| Package | Purpose | Size |
|---------|---------|------|
| `three` | 3D renderer | ~600KB (tree-shaken to ~150KB) |
| `@types/three` | TypeScript types | dev only |
| `umap-js` | UMAP dimensionality reduction | ~50KB |

---

## Files Changed

| File | Change |
|------|--------|
| `docs/supabase-schema.sql` | Add pgvector extension + embedding column |
| `src/pages/api/content/publish.ts` | Generate embedding on commonplace publish |
| `scripts/seed-commonplace.js` | Add embedding generation pass for existing entries |
| `src/pages/commonplace.astro` | Add `embedding` to select query |
| `src/components/commonplace/CommonplaceBook.jsx` | Add 3D mode, mobile detection |
| `src/components/commonplace/Constellation3D.jsx` | NEW — full Three.js + UMAP component |
| `package.json` | Add `three`, `umap-js` |

---

## Out of Scope

- Persisting UMAP coordinates to DB (staleness risk outweighs load-time gain)
- Always-visible node labels (too cluttered)
- Touch-optimized 3D on mobile (degrades to 2D instead)
- Vector similarity search (nearest-neighbor queries via pgvector `<=>` operator)
