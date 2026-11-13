import { test, expect } from 'vitest';
import { spotifyAuthUrl, upsertEnv, SPOTIFY_REDIRECT } from '../../src/lib/spotify-setup';

test('the approval link asks Spotify for exactly what the Now page reads', () => {
  const url = new URL(spotifyAuthUrl('abc123', 'state-1'));
  expect(url.origin + url.pathname).toBe('https://accounts.spotify.com/authorize');
  expect(url.searchParams.get('client_id')).toBe('abc123');
  expect(url.searchParams.get('response_type')).toBe('code');
  expect(url.searchParams.get('redirect_uri')).toBe(SPOTIFY_REDIRECT);
  expect(url.searchParams.get('scope')).toBe('user-read-currently-playing user-library-read');
  expect(url.searchParams.get('state')).toBe('state-1');
  expect(SPOTIFY_REDIRECT).toBe('http://127.0.0.1:4321/api/spotify-callback');
});

test('saving a setting adds it, or replaces the old value, and leaves the rest alone', () => {
  expect(upsertEnv('A=1\n', 'B', '2')).toBe('A=1\nB=2\n');
  expect(upsertEnv('A=1', 'B', '2')).toBe('A=1\nB=2\n');
  expect(upsertEnv('A=1\nB=old\nC=3\n', 'B', 'new')).toBe('A=1\nB=new\nC=3\n');
  expect(upsertEnv('', 'B', '2')).toBe('B=2\n');
  expect(upsertEnv('AB=1\n', 'B', '2')).toBe('AB=1\nB=2\n');
});
