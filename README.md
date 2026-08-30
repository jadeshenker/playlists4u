# ilovemusic

next.js app scaffold with spotify + are.na integrations.

## stack

- next.js (app router)
- tailwind css v4
- route handlers for spotify + are.na api calls
- no user auth, no database

## spotify setup

uses the client-credentials flow (app-only token, no user login), so it can only
reach endpoints that don't require user data — e.g. public playlists, tracks,
albums, artists.

1. create an app in the spotify developer dashboard
2. copy the client id and client secret into `.env.local`

`GET /api/spotify/playlists/[playlistId]` returns a public playlist's metadata + tracks.

## are.na setup

1. grab a personal access token from are.na (dev settings)
2. copy it into `.env.local` as `ARENA_ACCESS_TOKEN`

`GET /api/arena/channels/[slug]` returns a channel and its first page of blocks.

## env

copy `.env.example` to `.env.local` and fill in the values.

## install

```bash
npm install
npm run dev
```

open `http://127.0.0.1:3000`.
