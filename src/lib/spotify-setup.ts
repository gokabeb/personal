// One-time setup: getting Spotify's permission to read what Karan is playing.
// Used only by the two local-only pages in src/pages/api/spotify-*.ts.

/** Must match the Redirect URI saved in the Spotify developer dashboard, character for character. */
export const SPOTIFY_REDIRECT = 'http://127.0.0.1:4321/api/spotify-callback';

// The least that the Now page needs: what is playing, and saved albums.
const SCOPES = 'user-read-currently-playing user-library-read';

export function spotifyAuthUrl(clientId: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: SPOTIFY_REDIRECT,
    scope: SCOPES,
    state,
  });
  return `https://accounts.spotify.com/authorize?${params}`;
}

/** Add KEY=value to the text of a .env file, replacing any earlier line for the same key. */
export function upsertEnv(text: string, key: string, value: string): string {
  const lines = text.split('\n').filter((line) => line !== '' && !line.startsWith(`${key}=`));
  const old = text.split('\n').findIndex((line) => line.startsWith(`${key}=`));
  if (old >= 0) lines.splice(Math.min(old, lines.length), 0, `${key}=${value}`);
  else lines.push(`${key}=${value}`);
  return lines.join('\n') + '\n';
}
