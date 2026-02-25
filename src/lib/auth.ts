import { createHmac, timingSafeEqual } from 'crypto';

export function signSession(password: string, secret: string): string {
  return createHmac('sha256', secret).update(password).digest('hex');
}

export function verifySession(cookie: string, password: string, secret: string): boolean {
  if (!cookie) return false;
  const expected = signSession(password, secret);
  try {
    return timingSafeEqual(Buffer.from(cookie, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}
