# The Living Letter

Karan Gupta's personal site. The homepage is one letter; three phrases in it are doorways to deeper pages.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:4321.

## Edit it

Go to `/admin`. You can change the letter, the writing archive, the resume and your Now notes. Linking a phrase in the letter to `/writing`, `/cv` or `/now` turns it into a doorway.

Everything you save is a file in `src/content/`.

## Connect the Now page

Listening and Watching fill themselves in once these settings exist on the host (Vercel → Settings → Environment Variables). Each is optional; a section stays hidden until its setting is there.

| Setting | What it is |
|---|---|
| `LETTERBOXD_USERNAME` | Your Letterboxd username |
| `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN` | From a Spotify developer app you create. Get the refresh token by opening `http://127.0.0.1:4321/api/spotify-login` while running the site locally |
| `SPOTIFY_PROFILE_URL` | Optional: link to your Spotify profile |

To try them locally, put the same lines in a file named `.env` (never committed).

Nothing needs to be refreshed by hand or on a schedule. Each time someone opens the Now page it asks these accounts for the latest, and the host remembers the answer for five minutes so the accounts are not asked too often.

## Tune the feel

`src/lib/feel.ts` holds the numbers behind the shimmer and the glass lens: the colours, how fast the colour passes, how big the lens is, how much it magnifies and how liquid it moves. Change a number, save, look.

## Check it

```bash
npm test              # small logic tests
npm run e2e           # browser tests (Chrome and Safari engines)
npm run build
npm run check:private # scans the built site for private details
```

`check:private` reads `.private-terms`, a local file that is never committed.
