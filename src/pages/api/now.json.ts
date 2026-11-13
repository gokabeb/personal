import type { APIRoute } from 'astro';
import { loadNow } from '../../lib/feeds';

// Runs on the server on each request, so account keys never reach the browser.
export const prerender = false;

export const GET: APIRoute = async () => {
  const env = { ...import.meta.env, ...process.env } as Record<string, string | undefined>;
  const data = await loadNow(env);
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      // Vercel keeps an answer for 5 minutes, and may serve an older one while it refreshes.
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
    },
  });
};
