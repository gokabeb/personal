import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db';
import { verifySession } from '../../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const cookie = cookies.get('admin-session')?.value ?? '';
  if (!verifySession(cookie, import.meta.env.ADMIN_PASSWORD, import.meta.env.ADMIN_SESSION_SECRET)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { key, value } = await request.json();
  if (!key) {
    return new Response(JSON.stringify({ error: 'key required' }), { status: 400 });
  }

  const db = getDb();
  const { error } = await db.from('site_content').upsert({ key, value }, { onConflict: 'key' });
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
};
