import { curly } from './typography';

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

/**
 * Turns plain text into safe HTML, with one piece of markup: words wrapped
 * in **double asterisks** become spans that shimmer like the links do.
 */
export function shimmerMarks(text: string): string {
  return curly(text)
    .replace(/[&<>"]/g, (c) => ESCAPES[c])
    .replace(/\*\*(?!\s)([^*]+?)(?<!\s)\*\*/g, '<span class="shine">$1</span>');
}
