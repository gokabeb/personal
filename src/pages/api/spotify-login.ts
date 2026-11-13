import type { APIRoute } from 'astro';
import { spotifyAuthUrl } from '../../lib/spotify-setup';

// Setup step, on this computer only. It does not exist on the live site.
export const prerender = false;

export const GET: APIRoute = ({ cookies, redirect }) => {
  if (!import.meta.env.DEV) return new Response('Not found', { status: 404 });
  const clientId = import.meta.env.SPOTIFY_CLIENT_ID;
  if (!clientId) return new Response('SPOTIFY_CLIENT_ID is missing from .env', { status: 500 });
  // A random value Spotify must hand back, proving the reply belongs to this request.
  const state = crypto.randomUUID();
  cookies.set('spotify_state', state, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 600 });
  return redirect(spotifyAuthUrl(clientId, state));
};
