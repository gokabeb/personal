import { getEntry } from 'astro:content';
import { doorTitles, type DoorSlug } from './doors';
import { curly } from './typography';

/** The title for a doorway page, read from the letter as it is written today. */
export async function titleFor(slug: DoorSlug): Promise<string> {
  const letter = await getEntry('letter', 'index');
  return curly(doorTitles(letter?.body ?? '')[slug]);
}

export function longDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}
