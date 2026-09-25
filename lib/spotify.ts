const SPOTIFY_API_BASE = "https://api.spotify.com/v1"
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"

let cachedToken: { accessToken: string; expiresAt: number } | null = null

/**
 * Client-credentials flow: gets an app-only access token (no user login).
 * Only works against endpoints that don't require user data, e.g. looking
 * up a track by id.
 */
async function getAppAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.accessToken
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error("Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET")
  }

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Spotify token error: ${response.status} ${text}`)
  }

  const data = (await response.json()) as { access_token: string; expires_in: number }
  // Refresh a little early to avoid edge-of-expiry failures.
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  }

  return cachedToken.accessToken
}

export async function spotifyFetch(path: string, init?: RequestInit) {
  const accessToken = await getAppAccessToken()

  const response = await fetch(`${SPOTIFY_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Spotify API error: ${response.status} ${text}`)
  }

  return response
}

export type SpotifyTrack = {
  id: string
  name: string
  uri: string
  duration_ms?: number
  artists?: { name: string }[]
}

/**
 * Fetches tracks by ID, one request per track — Spotify removed the batch
 * `GET /tracks?ids=` endpoint in its February 2026 API migration.
 */
export async function fetchTracksByIds(ids: string[]): Promise<SpotifyTrack[]> {
  const tracks = await Promise.all(
    ids.map(async (id) => {
      const response = await spotifyFetch(`/tracks/${id}`)
      return (await response.json()) as SpotifyTrack
    })
  )

  return tracks
}
