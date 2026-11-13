export type DoorSlug = 'writing' | 'cv' | 'now';

export const DOOR_SLUGS: DoorSlug[] = ['writing', 'cv', 'now'];

export const FALLBACK_TITLES: Record<DoorSlug, string> = {
  writing: 'Writing',
  cv: 'Experience',
  now: 'Now',
};

/** Which doorway page a link points at, or null for any other link. */
export function doorForHref(href: string): DoorSlug | null {
  const match = /^\/(writing|cv|now)\/?(?:[?#].*)?$/.exec(href);
  return match ? (match[1] as DoorSlug) : null;
}

/** Each doorway page is titled with the phrase that links to it in the letter. */
export function doorTitles(letterSource: string): Record<DoorSlug, string> {
  const titles = { ...FALLBACK_TITLES };
  const seen = new Set<DoorSlug>();
  for (const [, text, href] of letterSource.matchAll(/\[([^\]]+)\]\(([^)\s]+)\)/g)) {
    const slug = doorForHref(href);
    if (slug && !seen.has(slug)) {
      seen.add(slug);
      titles[slug] = text.trim();
    }
  }
  return titles;
}
