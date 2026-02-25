// Supabase client — scaffolded. Uncomment when env vars are configured.
//
// import { createClient } from '@supabase/supabase-js'
// const supabase = createClient(
//   import.meta.env.PUBLIC_SUPABASE_URL,
//   import.meta.env.PUBLIC_SUPABASE_ANON_KEY
// )
//
// ============================================================
// Schema
// ============================================================
//
// -- Commonplace entries with vector embeddings
// CREATE TABLE commonplace_entries (
//   id TEXT PRIMARY KEY,
//   quote TEXT NOT NULL,
//   source_author TEXT,
//   source_work TEXT,
//   source_year INTEGER,
//   annotation TEXT,
//   tags TEXT[],
//   embedding VECTOR(1536),  -- text-embedding-3-small dimensions
//   created_at TIMESTAMPTZ DEFAULT NOW()
// );
//
// -- Create vector index for similarity search
// CREATE INDEX ON commonplace_entries
//   USING ivfflat (embedding vector_cosine_ops)
//   WITH (lists = 100);
//
// -- Project updates feed
// CREATE TABLE project_updates (
//   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   project_slug TEXT NOT NULL,
//   update_date DATE NOT NULL,
//   text TEXT NOT NULL,
//   created_at TIMESTAMPTZ DEFAULT NOW()
// );
//
// -- Contact form submissions
// CREATE TABLE contact_submissions (
//   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   name TEXT,
//   email TEXT,
//   subject TEXT,
//   message TEXT,
//   created_at TIMESTAMPTZ DEFAULT NOW()
// );
//
// ============================================================
// Example queries
// ============================================================
//
// // Fetch all commonplace entries
// const { data, error } = await supabase
//   .from('commonplace_entries')
//   .select('*')
//   .order('created_at', { ascending: false });
//
// // Semantic similarity search (requires pgvector + match_documents RPC)
// const { data } = await supabase.rpc('match_commonplace', {
//   query_embedding: embedding,
//   match_threshold: 0.82,
//   match_count: 10
// });
//
// // Fetch project updates
// const { data } = await supabase
//   .from('project_updates')
//   .select('*')
//   .eq('project_slug', projectSlug)
//   .order('update_date', { ascending: false });

export const supabase = null; // Replace with createClient() when env vars are set
