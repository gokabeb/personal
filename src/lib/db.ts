import { createClient } from '@supabase/supabase-js';

// Server-side client using service role key — never expose to browser
export function getDb() {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const key = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not set');
  return createClient(url, key);
}

// Read-only client using anon key — safe for build-time fetches
export function getPublicDb() {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null; // graceful fallback before env vars set
  return createClient(url, key);
}
