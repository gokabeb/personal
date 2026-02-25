import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db';
import { verifySession } from '../../../lib/auth';

export const prerender = false;

const TABLES = { article: 'articles', project: 'projects', poem: 'poems' } as const;

export const POST: APIRoute = async ({ request, cookies }) => {
  const cookie = cookies.get('admin-session')?.value ?? '';
  if (!verifySession(cookie, import.meta.env.ADMIN_PASSWORD, import.meta.env.ADMIN_SESSION_SECRET)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  let body: { type?: string; id?: string; data?: Record<string, unknown>; draft?: boolean };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const { type, id, data, draft = false } = body;
  const table = TABLES[type as keyof typeof TABLES];
  if (!table) {
    return new Response(JSON.stringify({ error: 'Invalid type' }), { status: 400 });
  }

  const db = getDb();
  const payload = {
    ...data,
    published: !draft,
    ...(draft ? {} : { published_at: new Date().toISOString() }),
  };

  let result;
  if (id) {
    result = await db.from(table).update(payload).eq('id', id).select().single();
  } else {
    result = await db.from(table).insert(payload).select().single();
  }

  if (result.error) {
    return new Response(JSON.stringify({ error: result.error.message }), { status: 500 });
  }

  // Trigger Vercel rebuild only when publishing (not drafts)
  if (!draft && import.meta.env.VERCEL_DEPLOY_HOOK_URL) {
    fetch(import.meta.env.VERCEL_DEPLOY_HOOK_URL, { method: 'POST' }).catch(() => {});
  }

  return new Response(JSON.stringify({ ok: true, item: result.data }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
