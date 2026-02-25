-- Run this SQL in your Supabase project → SQL Editor → New query

-- Articles (new content type)
CREATE TABLE articles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text UNIQUE NOT NULL,
  title         text NOT NULL,
  lede          text,
  body          text NOT NULL DEFAULT '',
  pull_quote    text,
  tags          text[] DEFAULT '{}',
  published     boolean DEFAULT false,
  published_at  timestamptz,
  created_at    timestamptz DEFAULT now()
);

-- Projects (replaces src/data/projects.js)
CREATE TABLE projects (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text UNIQUE NOT NULL,
  title         text NOT NULL,
  label         text DEFAULT 'WRITING',
  category      text DEFAULT 'WRITING',
  headline      text NOT NULL DEFAULT '',
  lede          text,
  body          text NOT NULL DEFAULT '',
  pull_quote    text,
  updates       jsonb DEFAULT '[]',
  video_url     text,
  tags          text[] DEFAULT '{}',
  published     boolean DEFAULT false,
  created_at    timestamptz DEFAULT now()
);

-- Poems (replaces src/data/placeholder-poems.js)
CREATE TABLE poems (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text UNIQUE NOT NULL,
  title         text NOT NULL,
  year          integer,
  body          text NOT NULL DEFAULT '',
  tags          text[] DEFAULT '{}',
  audio_url     text,
  published     boolean DEFAULT false,
  created_at    timestamptz DEFAULT now()
);

-- Row Level Security: allow anon read of published content only
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE poems    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read published articles" ON articles FOR SELECT USING (published = true);
CREATE POLICY "public read published projects" ON projects FOR SELECT USING (published = true);
CREATE POLICY "public read published poems"    ON poems    FOR SELECT USING (published = true);
-- Note: service role key bypasses RLS — used by admin panel for writes and reading drafts

-- Commonplace entries (replaces src/data/placeholder-commonplace.js)
CREATE TABLE IF NOT EXISTS commonplace_entries (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id     text UNIQUE,          -- for idempotent seed ('cp-001' etc.)
  quote         text NOT NULL,
  source_author text,
  source_work   text,
  source_url    text,
  source_year   integer,
  annotation    text,
  tags          text[] DEFAULT '{}',
  published     boolean DEFAULT false,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE commonplace_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published commonplace"
  ON commonplace_entries FOR SELECT
  USING (published = true);

-- Enable pgvector and add semantic embedding column
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE commonplace_entries ADD COLUMN IF NOT EXISTS embedding vector(1536);
