// Reads the outside accounts behind the Now page: Spotify (music) has an API
// that needs a key; Letterboxd (films) publishes a public feed. Nothing here knows
// about the page; it just turns each source into a small, plain shape.

export interface Album {
  title: string;
  artist: string;
  link: string;
}
export interface Film {
  title: string;
  year: string;
  rating: number | null;
  link: string;
}
export interface Track {
  title: string;
  artist: string;
  link: string;
}
export interface NowData {
  listening: { now: Track | null; albums: Album[]; profile: string } | null;
  watching: { films: Film[]; profile: string } | null;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'" };

function decode(text: string): string {
  return text
    .replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, '$1')
    .replace(/&(amp|lt|gt|quot|apos|#39);/g, (_, name) => ENTITIES[name])
    .trim();
}

const items = (xml: string): string[] => xml.match(/<item[\s>][\s\S]*?<\/item>/g) ?? [];

function tag(xml: string, name: string): string {
  const match = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`).exec(xml);
  return match ? decode(match[1].trim()) : '';
}

export function parseLetterboxd(xml: string): Film[] {
  return items(xml)
    .map((item) => {
      const rating = tag(item, 'letterboxd:memberRating');
      return {
        title: tag(item, 'letterboxd:filmTitle'),
        year: tag(item, 'letterboxd:filmYear'),
        rating: rating ? Number(rating) : null,
        link: tag(item, 'link'),
      };
    })
    .filter((film) => film.title);
}

export function stars(rating: number | null): string {
  if (rating === null) return '';
  return '★'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '½' : '');
}

export function shapeTrack(item: any): Track | null {
  if (!item?.name) return null;
  return {
    title: item.name,
    artist: (item.artists ?? []).map((a: any) => a.name).join(', '),
    link: item.external_urls?.spotify ?? '',
  };
}

export function shapeAlbum(saved: any): Album | null {
  const album = saved?.album;
  if (!album?.name) return null;
  return {
    title: album.name,
    artist: (album.artists ?? []).map((a: any) => a.name).join(', '),
    link: album.external_urls?.spotify ?? '',
  };
}

type Env = Record<string, string | undefined>;
type Fetch = typeof fetch;

const TIMEOUT_MS = 4000;
const text = async (fetcher: Fetch, url: string): Promise<string> => {
  const res = await fetcher(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${res.status} from ${url}`);
  return res.text();
};

async function watching(env: Env, fetcher: Fetch): Promise<NowData['watching']> {
  const user = env.LETTERBOXD_USERNAME;
  if (!user) return null;
  const films = parseLetterboxd(await text(fetcher, `https://letterboxd.com/${user}/rss/`));
  return { films: films.slice(0, 4), profile: `https://letterboxd.com/${user}/` };
}

async function listening(env: Env, fetcher: Fetch): Promise<NowData['listening']> {
  const { SPOTIFY_CLIENT_ID: id, SPOTIFY_CLIENT_SECRET: secret, SPOTIFY_REFRESH_TOKEN: refresh } = env;
  if (!id || !secret || !refresh) return null;
  const signal = () => AbortSignal.timeout(TIMEOUT_MS);
  const tokenRes = await fetcher('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${id}:${secret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refresh }).toString(),
    signal: signal(),
  });
  if (!tokenRes.ok) throw new Error(`Spotify token: ${tokenRes.status}`);
  const { access_token } = (await tokenRes.json()) as { access_token: string };
  const api = async (path: string) => {
    const res = await fetcher(`https://api.spotify.com/v1${path}`, {
      headers: { Authorization: `Bearer ${access_token}` },
      signal: signal(),
    });
    // 204 means "nothing playing"; treat any empty answer as no data.
    return res.status === 200 ? ((await res.json()) as any) : null;
  };
  // Saved albums come back newest first.
  const [playing, saved] = await Promise.all([api('/me/player/currently-playing'), api('/me/albums?limit=50')]);
  return {
    now: playing?.is_playing ? shapeTrack(playing.item) : null,
    albums: ((saved?.items ?? []) as any[]).map(shapeAlbum).filter((a): a is Album => a !== null),
    profile: env.SPOTIFY_PROFILE_URL ?? 'https://open.spotify.com',
  };
}

/** Each source stands alone: if one is not set up, or is down, the others still load. */
export async function loadNow(env: Env, fetcher: Fetch = fetch): Promise<NowData> {
  const safe = async <T>(job: Promise<T | null>): Promise<T | null> => job.catch(() => null);
  const [l, w] = await Promise.all([safe(listening(env, fetcher)), safe(watching(env, fetcher))]);
  return { listening: l, watching: w };
}
