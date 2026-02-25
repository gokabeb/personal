/**
 * Format a date string or Date object to a readable format.
 * @param {string|Date} date
 * @returns {string}
 */
export function formatDate(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Convert a string to a URL-friendly slug.
 * @param {string} str
 * @returns {string}
 */
export function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Truncate a string to n characters, appending ellipsis if needed.
 * @param {string} str
 * @param {number} n
 * @returns {string}
 */
export function truncate(str, n) {
  if (str.length <= n) return str;
  return str.slice(0, n).trimEnd() + '…';
}
