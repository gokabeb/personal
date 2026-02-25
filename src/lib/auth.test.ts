import { describe, it, expect } from 'vitest';
import { signSession, verifySession } from './auth';

describe('signSession', () => {
  it('returns a hex string', () => {
    const result = signSession('mypassword', 'mysecret');
    expect(result).toMatch(/^[a-f0-9]{64}$/);
  });

  it('same inputs produce same output', () => {
    const a = signSession('pw', 'secret');
    const b = signSession('pw', 'secret');
    expect(a).toBe(b);
  });

  it('different passwords produce different output', () => {
    const a = signSession('pw1', 'secret');
    const b = signSession('pw2', 'secret');
    expect(a).not.toBe(b);
  });
});

describe('verifySession', () => {
  it('returns true for a valid session cookie', () => {
    const cookie = signSession('mypassword', 'mysecret');
    expect(verifySession(cookie, 'mypassword', 'mysecret')).toBe(true);
  });

  it('returns false for a tampered cookie', () => {
    expect(verifySession('invalid-cookie', 'mypassword', 'mysecret')).toBe(false);
  });

  it('returns false for wrong password', () => {
    const cookie = signSession('right', 'secret');
    expect(verifySession(cookie, 'wrong', 'secret')).toBe(false);
  });

  it('returns false for empty cookie', () => {
    expect(verifySession('', 'mypassword', 'mysecret')).toBe(false);
  });
});
