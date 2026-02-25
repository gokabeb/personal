import type { APIRoute } from 'astro';
import OpenAI from 'openai';
import { UMAP } from 'umap-js';
import { getDb } from '../../../lib/db';
import { verifySession } from '../../../lib/auth';

export const prerender = false;

async function recomputePositions(db: ReturnType<typeof import('../../../lib/db').getDb>) {
  const { data: entries } = await db
    .from('commonplace_entries')
    .select('id, embedding')
    .eq('published', true)
    .not('embedding', 'is', null);

  if (!entries || entries.length < 2) return;

  const embeddings = entries.map((e: any) =>
    typeof e.embedding === 'string' ? JSON.parse(e.embedding) : e.embedding
  );

  const nNeighbors = Math.min(15, entries.length - 1);
  const umap = new UMAP({ nComponents: 3, nNeighbors, minDist: 0.1 });
  const raw3d = umap.fit(embeddings);

  const xs = raw3d.map((p: number[]) => p[0]), ys = raw3d.map((p: number[]) => p[1]), zs = raw3d.map((p: number[]) => p[2]);
  const [minX, maxX] = [Math.min(...xs), Math.max(...xs)];
  const [minY, maxY] = [Math.min(...ys), Math.max(...ys)];
  const [minZ, maxZ] = [Math.min(...zs), Math.max(...zs)];
  const norm = (v: number, lo: number, hi: number) => hi === lo ? 0 : ((v - lo) / (hi - lo) - 0.5) * 18;

  const updates = entries.map((e: any, i: number) => ({
    id: e.id,
    pos_x: norm(raw3d[i][0], minX, maxX),
    pos_y: norm(raw3d[i][1], minY, maxY),
    pos_z: norm(raw3d[i][2], minZ, maxZ),
  }));

  await db.from('commonplace_entries').upsert(updates, { onConflict: 'id' });
}

const TABLES = { article: 'articles', project: 'projects', poem: 'poems', commonplace: 'commonplace_entries' } as const;

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
    // projects use 'headline' in the editor but the DB also requires 'title'
    ...(type === 'project' && data?.headline ? { title: data.headline } : {}),
    published: !draft,
    ...(draft ? {} : type === 'article' ? { published_at: new Date().toISOString() } : {}),
    ...(embedding ? { embedding } : {}),
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

  // Recompute 3D positions for all commonplace entries after a publish
  if (type === 'commonplace' && !draft) {
    recomputePositions(db).catch(() => {}); // non-blocking, non-fatal
  }

  // Trigger Vercel rebuild only when publishing (not drafts)
  if (!draft && import.meta.env.VERCEL_DEPLOY_HOOK_URL) {
    fetch(import.meta.env.VERCEL_DEPLOY_HOOK_URL, { method: 'POST' }).catch(() => {});
  }

  return new Response(JSON.stringify({ ok: true, item: result.data }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
