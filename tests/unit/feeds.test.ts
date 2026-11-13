import { test, expect } from 'vitest';
import { parseLetterboxd, stars, shapeTrack, shapeAlbum, loadNow } from '../../src/lib/feeds';

const letterboxd = `<rss xmlns:letterboxd="https://letterboxd.com"><channel>
<item><title>Paddington 2, 2017 - ★★★★½</title><link>https://letterboxd.com/someone/film/paddington-2/</link>
<letterboxd:watchedDate>2026-10-30</letterboxd:watchedDate><letterboxd:filmTitle>Paddington 2</letterboxd:filmTitle>
<letterboxd:filmYear>2017</letterboxd:filmYear><letterboxd:memberRating>4.5</letterboxd:memberRating></item>
<item><title>A list I made</title><link>https://letterboxd.com/someone/list/x/</link></item>
<item><link>https://letterboxd.com/someone/film/heat/</link><letterboxd:filmTitle>Heat</letterboxd:filmTitle><letterboxd:filmYear>1995</letterboxd:filmYear></item>
</channel></rss>`;

test('Letterboxd: films with year and rating; lists are skipped; unrated films are kept', () => {
  expect(parseLetterboxd(letterboxd)).toEqual([
    { title: 'Paddington 2', year: '2017', rating: 4.5, link: 'https://letterboxd.com/someone/film/paddington-2/' },
    { title: 'Heat', year: '1995', rating: null, link: 'https://letterboxd.com/someone/film/heat/' },
  ]);
});

test('ratings print as stars', () => {
  expect(stars(4.5)).toBe('★★★★½');
  expect(stars(3)).toBe('★★★');
  expect(stars(0.5)).toBe('½');
  expect(stars(null)).toBe('');
});

test('Spotify tracks are reduced to title, artists and a link', () => {
  expect(
    shapeTrack({ name: 'Little Wing', artists: [{ name: 'Jimi Hendrix' }, { name: 'Other' }], external_urls: { spotify: 'https://open.spotify.com/track/1' } }),
  ).toEqual({ title: 'Little Wing', artist: 'Jimi Hendrix, Other', link: 'https://open.spotify.com/track/1' });
  expect(shapeTrack(null)).toBeNull();
  expect(shapeTrack({})).toBeNull();
});

test('Spotify saved albums are reduced to title, artists and a link', () => {
  expect(
    shapeAlbum({ added_at: '2026-11-01', album: { name: 'Psychodrama', artists: [{ name: 'Dave' }], external_urls: { spotify: 'https://open.spotify.com/album/1' } } }),
  ).toEqual({ title: 'Psychodrama', artist: 'Dave', link: 'https://open.spotify.com/album/1' });
  expect(shapeAlbum({})).toBeNull();
  expect(shapeAlbum(null)).toBeNull();
});

test('with no accounts configured, nothing is fetched and every section is empty', async () => {
  let calls = 0;
  const data = await loadNow({}, async () => {
    calls++;
    return new Response('');
  });
  expect(data).toEqual({ listening: null, watching: null });
  expect(calls).toBe(0);
});

test('one failing source does not sink the other', async () => {
  const fakeFetch = async (url: string | URL | Request) => {
    const u = String(url);
    if (u.includes('letterboxd.com')) return new Response(letterboxd);
    throw new Error('Spotify is down');
  };
  const data = await loadNow(
    { LETTERBOXD_USERNAME: 'someone', SPOTIFY_CLIENT_ID: 'id', SPOTIFY_CLIENT_SECRET: 's', SPOTIFY_REFRESH_TOKEN: 'r' },
    fakeFetch as typeof fetch,
  );
  expect(data.watching?.films.map((f) => f.title)).toEqual(['Paddington 2', 'Heat']);
  expect(data.listening).toBeNull();
});

test('Spotify: what is playing now, plus saved albums, newest first', async () => {
  const album = (name: string) => ({ album: { name, artists: [{ name: 'X' }], external_urls: { spotify: `https://open.spotify.com/album/${name}` } } });
  const seen: string[] = [];
  const fakeFetch = async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url);
    seen.push(u);
    if (u.includes('accounts.spotify.com/api/token')) {
      expect(String(init?.body)).toContain('grant_type=refresh_token');
      expect((init?.headers as Record<string, string>).Authorization).toMatch(/^Basic /);
      return Response.json({ access_token: 'tok' });
    }
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    if (u.includes('currently-playing')) return Response.json({ is_playing: true, item: { name: 'A', artists: [{ name: 'X' }], external_urls: { spotify: 'https://open.spotify.com/track/A' } } });
    if (u.includes('/me/albums')) return Response.json({ items: [album('B'), album('C')] });
    return new Response('', { status: 404 });
  };
  const data = await loadNow(
    { SPOTIFY_CLIENT_ID: 'id', SPOTIFY_CLIENT_SECRET: 'secret', SPOTIFY_REFRESH_TOKEN: 'r' },
    fakeFetch as typeof fetch,
  );
  expect(data.listening?.now?.title).toBe('A');
  expect(data.listening?.albums.map((t) => t.title)).toEqual(['B', 'C']);
  expect(seen.some((u) => u.includes('/me/albums?limit=50'))).toBe(true);
  expect(seen.some((u) => u.includes('top/tracks'))).toBe(false);
});

test('Spotify: permission for saved albums not granted yet leaves an empty list, not an error', async () => {
  const fakeFetch = async (url: string | URL | Request) => {
    const u = String(url);
    if (u.includes('api/token')) return Response.json({ access_token: 'tok' });
    if (u.includes('currently-playing')) return new Response(null, { status: 204 });
    return new Response('', { status: 403 });
  };
  const data = await loadNow(
    { SPOTIFY_CLIENT_ID: 'id', SPOTIFY_CLIENT_SECRET: 'secret', SPOTIFY_REFRESH_TOKEN: 'r' },
    fakeFetch as typeof fetch,
  );
  expect(data.listening).toEqual({ now: null, albums: [], profile: 'https://open.spotify.com' });
});
