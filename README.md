# ilovemusic

next.js app scaffold with spotify + are.na integrations.

## stack

- next.js (app router)
- tailwind css v4
- route handlers for spotify + are.na + youtube api calls
- upstash redis for a persistent youtube-match cache (optional — falls back to an in-memory-only cache if unconfigured)
- no user auth

## spotify setup

uses the client-credentials flow (app-only token, no user login), so it can only
reach endpoints that don't require user data — e.g. looking up individual tracks
by id. as of spotify's february 2026 api migration, playlist-by-id endpoints only
work for playlists the authenticated user owns/collaborates on, so this app gets
track ids from are.na channels instead of from spotify playlists directly.

1. create an app in the spotify developer dashboard
2. copy the client id and client secret into `.env.local`

## are.na setup

1. grab a personal access token from are.na (dev settings)
2. copy it into `.env.local` as `ARENA_ACCESS_TOKEN`

`GET /api/arena/channels/[slug]` returns a channel and its first page of blocks.

## youtube setup

playback is entirely youtube-backed — spotify has no way to play a full track
without a user login (its no-auth embed only offers a 30-second preview), so
each track is matched to a youtube video and played headlessly from there. a
"listen on spotify" link is kept for sharing/saving. matching prefers official
"<artist> - topic" channels (youtube music's catalog mirror) for accuracy.

`search.list` costs 100 quota units per call (google's free daily quota is
100 searches/project) and has no batch equivalent, so matches are cached
aggressively — see the redis section below.

1. create a google cloud project and enable the "youtube data api v3"
2. create an api key and copy it into `.env.local` as `YOUTUBE_API_KEY`

`GET /api/youtube/match?trackId=&name=&artist=` returns `{ match: { videoId, title } | null }`.

## redis setup (optional)

youtube matches are cached in-memory per server process, then in upstash
redis if configured, so a track never needs to be re-searched once found —
important since search quota is scarce. without redis the app still works
fine, it just re-searches after every cold start/redeploy.

1. create a free upstash redis database (upstash.com)
2. copy the REST URL + token into `.env.local` as `UPSTASH_REDIS_REST_URL`
   and `UPSTASH_REDIS_REST_TOKEN`

don't add a credit card to the upstash account — without one, exceeding the
free tier (500k commands/month) just fails closed instead of billing you,
and the app falls back to a live search if a redis call fails.

## env

copy `.env.example` to `.env.local` and fill in the values.

## install

```bash
npm install
npm run dev
```

open `http://127.0.0.1:3000`.
