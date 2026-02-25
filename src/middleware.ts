import { defineMiddleware } from 'astro:middleware';
import { verifySession } from './lib/auth';

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Protect all /admin/* sub-routes (not /admin itself — that's the login page)
  const isProtected = pathname.startsWith('/admin/');

  if (isProtected) {
    const cookie = context.cookies.get('admin-session')?.value ?? '';
    const password = import.meta.env.ADMIN_PASSWORD ?? '';
    const secret = import.meta.env.ADMIN_SESSION_SECRET ?? '';

    if (!verifySession(cookie, password, secret)) {
      return context.redirect('/admin?error=unauthorized');
    }
  }

  return next();
});
