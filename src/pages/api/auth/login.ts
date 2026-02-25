import type { APIRoute } from 'astro';
import { signSession } from '../../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const data = await request.formData();
  const password = (data.get('password') as string) ?? '';

  if (password !== import.meta.env.ADMIN_PASSWORD) {
    return redirect('/admin?error=invalid', 302);
  }

  const sessionValue = signSession(password, import.meta.env.ADMIN_SESSION_SECRET);
  cookies.set('admin-session', sessionValue, {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });

  return redirect('/admin/dashboard', 302);
};
