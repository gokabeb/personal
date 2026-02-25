import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db';
import { verifySession } from '../../../lib/auth';

export const prerender = false;

const TABLES = { article: 'articles', project: 'projects', poem: 'poems', commonplace: 'commonplace_entries' } as const;

export const POST: APIRoute = async ({ request, cookies }) => {
  const cookie = cookies.get('admin-session')?.value ?? '';
  if (!verifySession(cookie, import.meta.env.ADMIN_PASSWORD, import.meta.env.ADMIN_SESSION_SECRET)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  let body: { type?: string; id?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const { type, id } = body;
  const table = TABLES[type as keyof typeof TABLES];
  if (!table || !id) {
    return new Response(JSON.stringify({ error: 'type and id required' }), { status: 400 });
  }

  const db = getDb();
  const { error } = await db.from(table).delete().eq('id', id);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
