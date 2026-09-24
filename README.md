# playlists4u

next.js app that creates playlist moodboards from are.na channels in the [PLAYLISTS4U](https://www.are.na/jade-s-d2yaygzp528/playlists4u) channel. any spotify links in the channel become the tracks in the playlist, and all remaining content displays in a grid below. a miniplayer plays the tracks (from youtube) as users browses different subchannels. 

## stack

- next.js (app router)
- tailwind css v4
- route handlers for spotify + are.na + youtube api calls
- upstash redis for a persistent youtube-match cache (optional — falls back to an in-memory-only cache if unconfigured)

## spotify setup

uses the client-credentials flow (app-only token, no user login), so it can only
reach endpoints that don't require user data — e.g. looking up individual tracks
by id.

1. create an app in the spotify developer dashboard
2. copy the client id and client secret into `.env.local`

## are.na setup

1. grab a personal access token from are.na (dev settings)
2. copy it into `.env.local` as `ARENA_ACCESS_TOKEN`

`GET /api/arena/channels/[slug]` returns a channel and its first page of blocks.

## youtube setup

playback is youtube-backed — each track is matched to a youtube video and played headlessly from there. 
a "listen on spotify" link is kept for sharing/saving. matching prefers official
"<artist> - topic" channels (youtube music's catalog mirror) for accuracy.

1. create a google cloud project and enable the "youtube data api v3"
2. create an api key and copy it into `.env.local` as `YOUTUBE_API_KEY`

`GET /api/youtube/match?trackId=&name=&artist=` returns `{ match: { videoId, title } | null }`.

## redis setup (optional)

youtube matches are cached in-memory per server process, then in upstash
redis if configured, so a track never needs to be re-searched once found —
important since search quota is scarce (100 per day). without redis the app still works
fine, it just re-searches after every cold start/redeploy.

1. create a free upstash redis database (upstash.com)
2. copy the REST URL + token into `.env.local` as `UPSTASH_REDIS_REST_URL`
   and `UPSTASH_REDIS_REST_TOKEN`

## env

copy `.env.example` to `.env.local` and fill in the values.

## install

```bash
npm install
npm run dev
```

open `http://127.0.0.1:3000`.
