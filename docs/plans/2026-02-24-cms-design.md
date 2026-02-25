# CMS Design: Admin Panel + AI Formatting
**Date:** 2026-02-24
**Status:** Approved

---

## Problem

All content (projects, poems, articles) is hardcoded in JS files. Adding or updating content requires editing code. There is no way to publish new work from the website itself.

## Goal

A private admin panel at `/admin` where Karan can write freely and publish structured, formatted content that automatically appears on the correct public pages alongside existing content — without touching code.

---

## Decisions

| Question | Decision |
|---|---|
| Admin access | Password-only via session cookie (`ADMIN_PASSWORD` env var) |
| Storage | Supabase (already installed) |
| Publish speed | 1–2 min via Vercel deploy hook |
| Editor | Plain textarea — AI handles formatting |
| AI role | Structure only (titles, lede, pull quote, tags, paragraph breaks) — voice preserved |
| Deployment | Vercel |

---

## Architecture

### Mode change
Astro switches from `output: 'static'` to `output: 'hybrid'`.

- **Public pages** — remain `prerender: true` (static, fast, unchanged for visitors)
- **Admin pages** — `prerender: false` (server-rendered, auth-gated)
- **API endpoints** — `prerender: false`

### Auth
`src/middleware.ts` intercepts all `/admin/*` requests. Checks for a valid `admin-session` httpOnly cookie. Cookie value is an HMAC signature of `ADMIN_PASSWORD`. Invalid or missing cookie → redirect to `/admin` (login). Login POST → `/api/auth/login`. Logout → `/api/auth/logout`.

### Publish flow
1. User fills form in `/admin/new` or `/admin/edit/[id]`
2. POST to `/api/content/publish` → writes row to Supabase with `published: true`
3. Server POSTs to `VERCEL_DEPLOY_HOOK_URL` env var
4. Vercel rebuilds in ~90 seconds
5. Public pages re-fetch from Supabase at build time → new content appears

### Draft support
Every content item has a `published` boolean. Saving as draft writes to Supabase with `published: false`. Public pages only query `published = true`. User can return to `/admin/dashboard` to continue editing and publish when ready.

---

## Data Model

```sql
-- Articles (new content type)
articles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text UNIQUE NOT NULL,
  title         text NOT NULL,
  lede          text,
  body          text NOT NULL,          -- markdown, voice preserved
  pull_quote    text,
  tags          text[],
  published     boolean DEFAULT false,
  published_at  timestamptz,
  created_at    timestamptz DEFAULT now()
)

-- Projects (replaces src/data/projects.js)
projects (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text UNIQUE NOT NULL,
  title         text NOT NULL,
  label         text,                   -- NONPROFIT / RESEARCH / ENGINEERING / etc.
  category      text,
  headline      text NOT NULL,
  lede          text,
  body          text NOT NULL,          -- markdown
  pull_quote    text,
  updates       jsonb DEFAULT '[]',     -- [{ date: string, text: string }]
  video_url     text,
  published     boolean DEFAULT false,
  created_at    timestamptz DEFAULT now()
)

-- Poems (replaces src/data/placeholder-poems.js)
poems (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text UNIQUE NOT NULL,
  title         text NOT NULL,
  year          integer,
  body          text NOT NULL,          -- raw text, newlines preserved exactly
  tags          text[],
  audio_url     text,
  published     boolean DEFAULT false,
  created_at    timestamptz DEFAULT now()
)
```

**Migration:** a one-time `npm run seed` script reads existing `projects.js` and `placeholder-poems.js` and inserts all rows into Supabase with `published: true`.

---

## Admin UI — Four Screens

### `/admin` — Login
- Single password field
- POST to `/api/auth/login`
- On success: sets `admin-session` cookie, redirects to `/admin/dashboard`
- Styled in site's newspaper aesthetic

### `/admin/dashboard`
- Content listed in three sections: Articles, Projects, Poems
- Each row: title · type · status (Draft / Live) · date · Edit button · Delete button
- "New +" button top-right

### `/admin/new` — Three-step flow
**Step 1 — Pick type:** Article / Project / Poem (three buttons)

**Step 2 — Brain dump:** Large comfortable textarea.
- Article/Project prompt: *"Just write. Don't worry about formatting or titles — pour it all out."*
- Poem prompt: *"Write your poem. Line breaks will be preserved exactly."*
- "Process with AI →" button

**Step 3 — Preview & Publish:** Two-column layout.
- Left: structured form fields (title, lede, body, pull_quote, tags) — all editable
- Right: live preview rendered with actual site components (same ArticleCard / PullQuote / poem layout)
- "Save Draft" and "Publish" buttons
- Re-run AI button if user wants to try again

### `/admin/edit/[id]`
- Same as Step 3 above, pre-filled with existing content
- Can re-run AI or edit manually
- "Save Draft", "Publish", and "Unpublish" buttons

---

## AI Processing — `/api/ai/process`

**Input:**
```json
{ "type": "article" | "poem" | "project", "rawText": "..." }
```

**System prompt principle:** Extract structure, never rewrite. The author's sentences, word choices, and voice are preserved verbatim in the body. AI only generates: title, lede (1–2 sentence summary), pull_quote (strongest existing sentence lifted directly from the text), tags (3–6 topic keywords), and paragraph break structure.

**For poems:** AI does not touch the body text at all. It only generates a title (if none is detectable) and suggests tags.

**Output:** Structured JSON matching the target content type's schema.

**Model:** `gpt-4o-mini` (fast, cheap, sufficient for formatting tasks).

---

## Public Pages — Changes

| Page | Before | After |
|---|---|---|
| `/work` | imports `projects.js` | fetches `projects` from Supabase at build time |
| `/poetry` | imports `placeholder-poems.js` | fetches `poems` from Supabase at build time |
| `/` (homepage) | hardcoded featured content | fetches most recent published item per type |
| `/articles` | doesn't exist | new index page listing all published articles |
| `/articles/[slug]` | doesn't exist | new dynamic static route per article |

Homepage gets a new "From the Desk" section showing the most recent article alongside the existing work/poetry sections.

---

## Environment Variables (additions to `.env.example`)

```
ADMIN_PASSWORD=
ADMIN_SESSION_SECRET=
VERCEL_DEPLOY_HOOK_URL=
# Supabase (already present)
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # new — needed for server-side writes
# OpenAI (already present)
OPENAI_API_KEY=
```

---

## Files to Create / Modify

**New:**
- `src/middleware.ts`
- `src/pages/admin/index.astro` (login)
- `src/pages/admin/dashboard.astro`
- `src/pages/admin/new.astro`
- `src/pages/admin/edit/[id].astro`
- `src/pages/api/auth/login.ts`
- `src/pages/api/auth/logout.ts`
- `src/pages/api/ai/process.ts`
- `src/pages/api/content/publish.ts`
- `src/pages/api/content/delete.ts`
- `src/pages/articles/index.astro`
- `src/pages/articles/[slug].astro`
- `src/lib/db.ts` (Supabase server client with service role key)
- `scripts/seed.js` (one-time migration)

**Modified:**
- `astro.config.mjs` — `output: 'hybrid'`
- `src/lib/supabase.js` — activate client from env vars
- `src/pages/work.astro` — fetch from Supabase
- `src/pages/poetry.astro` — fetch from Supabase
- `src/pages/index.astro` — fetch from Supabase, add articles section
- `.env.example` — add new vars
