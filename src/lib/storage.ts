type Where = 'local' | 'session';

const PREFIX = 'll:';

// Private browsing and strict settings can make storage throw on access.
// Nothing here is essential, so every failure is swallowed.
function store(where: Where): Storage | null {
  try {
    return (where === 'session' ? globalThis.sessionStorage : globalThis.localStorage) ?? null;
  } catch {
    return null;
  }
}

export function remember(key: string, where: Where = 'local'): void {
  try {
    store(where)?.setItem(PREFIX + key, '1');
  } catch {}
}

export function remembered(key: string, where: Where = 'local'): boolean {
  try {
    return store(where)?.getItem(PREFIX + key) === '1';
  } catch {
    return false;
  }
}
