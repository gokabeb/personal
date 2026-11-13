import type { APIRoute } from 'astro';
import { readFile, writeFile } from 'node:fs/promises';
import { SPOTIFY_REDIRECT, upsertEnv } from '../../lib/spotify-setup';

// Setup step, on this computer only. Spotify sends the browser back here after
// "Agree"; this trades the one-time code for a long-lived refresh token and
// saves it to .env. The token is never shown on screen.
export const prerender = false;

const page = (message: string, status = 200) =>
  new Response(`<!doctype html><meta charset="utf-8"><title>Spotify</title><p style="font:20px/1.5 'Times New Roman',serif;max-width:32em;margin:18vh auto;padding:0 24px">${message}</p>`, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });

export const GET: APIRoute = async ({ url, cookies }) => {
  if (!import.meta.env.DEV) return new Response('Not found', { status: 404 });

  const expected = cookies.get('spotify_state')?.value;
  cookies.delete('spotify_state', { path: '/' });
  if (url.searchParams.get('error')) return page('Spotify was not connected: you chose not to allow it.', 400);
  const code = url.searchParams.get('code');
  if (!code || !expected || url.searchParams.get('state') !== expected) {
    return page('That link has expired. Start again from <a href="/api/spotify-login">/api/spotify-login</a>.', 400);
  }

  const { SPOTIFY_CLIENT_ID: id, SPOTIFY_CLIENT_SECRET: secret } = import.meta.env;
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${id}:${secret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: SPOTIFY_REDIRECT }).toString(),
  });
  const body = (await res.json().catch(() => ({}))) as { refresh_token?: string; error_description?: string };
  if (!res.ok || !body.refresh_token) {
    return page(`Spotify refused the request${body.error_description ? `: ${body.error_description}` : ''}.`, 502);
  }

  const env = await readFile('.env', 'utf8').catch(() => '');
  await writeFile('.env', upsertEnv(env, 'SPOTIFY_REFRESH_TOKEN', body.refresh_token));
  // The running server read .env when it started; hand it the new key directly too.
  process.env.SPOTIFY_REFRESH_TOKEN = body.refresh_token;
  return page('Spotify is connected. You can close this tab. The Listening section on <a href="/now">the Now page</a> will fill in within a few seconds.');
};
