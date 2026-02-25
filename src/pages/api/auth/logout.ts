import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ cookies, redirect }) => {
  cookies.delete('admin-session', { path: '/' });
  return redirect('/admin', 302);
};
