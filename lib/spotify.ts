const SPOTIFY_API_BASE = "https://api.spotify.com/v1"
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"

let cachedToken: { accessToken: string; expiresAt: number } | null = null

/**
 * Client-credentials flow: gets an app-only access token (no user login).
 * Only works against endpoints that don't require user data, e.g. public
 * playlists, tracks, albums, artists.
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

export type SpotifyPlaylist = {
  id: string
  name: string
  description?: string | null
  owner?: { id: string; display_name?: string }
  tracks?: { total: number }
  public?: boolean | null
  images?: { url: string; height?: number | null; width?: number | null }[]
}

export type SpotifyPlaylistTrackItem = {
  added_at?: string
  track: {
    id: string
    name: string
    uri: string
    duration_ms?: number
    artists?: { name: string }[]
    album?: {
      name?: string
      images?: { url: string; height?: number | null; width?: number | null }[]
    }
  } | null
}

type SpotifyPaginatedPage<T> = {
  items?: T[]
  next?: string | null
}

function pathFromSpotifyNext(next: string): string {
  const url = new URL(next)
  return `${url.pathname.replace(/^\/v1/, "")}${url.search}`
}

/** Fetches metadata for a public playlist. */
export async function fetchPlaylist(playlistId: string): Promise<SpotifyPlaylist> {
  const response = await spotifyFetch(`/playlists/${playlistId}`)
  return (await response.json()) as SpotifyPlaylist
}

/** Fetches every page of a public playlist's tracks (Spotify max 100 per request). */
export async function fetchAllPlaylistItems(
  playlistId: string,
  limit = 100
): Promise<SpotifyPlaylistTrackItem[]> {
  const items: SpotifyPlaylistTrackItem[] = []
  let path: string | null = `/playlists/${playlistId}/tracks?limit=${limit}`

  while (path) {
    const response = await spotifyFetch(path)
    const data = (await response.json()) as SpotifyPaginatedPage<SpotifyPlaylistTrackItem>
    items.push(...(data.items ?? []))
    path = data.next ? pathFromSpotifyNext(data.next) : null
  }

  return items
}
