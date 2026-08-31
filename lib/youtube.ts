import { getRedis } from "@/lib/redis"

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3"
const REDIS_KEY_PREFIX = "youtube-match:"

export type YoutubeMatch = { videoId: string; title: string } | null

// Redis stores a wrapper object rather than the raw match, so a cached "no
// match" (`{ match: null }`) can be told apart from "not cached at all"
// (`redis.get` returning null) with a single GET.
type CachedMatch = { match: YoutubeMatch }

// In-memory L1 cache in front of Redis — avoids a network round-trip (and
// spends no Upstash command quota) for repeat lookups within the same warm
// server instance.
const matchCache = new Map<string, YoutubeMatch>()

type YoutubeSearchItem = {
  id: { videoId: string }
  snippet: { title: string; channelTitle: string }
}

// The YouTube API returns titles with HTML entities escaped (e.g. `&quot;`
// for `"`), which render as literal text rather than the actual character
// unless decoded first.
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&amp;/g, "&")
}

async function getCachedMatch(spotifyTrackId: string): Promise<YoutubeMatch | undefined> {
  if (matchCache.has(spotifyTrackId)) return matchCache.get(spotifyTrackId) ?? null

  const redis = getRedis()
  if (!redis) return undefined

  try {
    const cached = await redis.get<CachedMatch>(`${REDIS_KEY_PREFIX}${spotifyTrackId}`)
    if (!cached) return undefined
    matchCache.set(spotifyTrackId, cached.match)
    return cached.match
  } catch (error) {
    console.error("redis get failed, falling back to a live search:", error)
    return undefined
  }
}

function setCachedMatch(spotifyTrackId: string, match: YoutubeMatch) {
  matchCache.set(spotifyTrackId, match)

  const redis = getRedis()
  if (!redis) return

  redis
    .set(`${REDIS_KEY_PREFIX}${spotifyTrackId}`, { match } satisfies CachedMatch)
    .catch((error) => console.error("redis set failed:", error))
}

/**
 * Finds the best YouTube match for a Spotify track, preferring official
 * "<Artist> - Topic" auto-generated channels (YouTube Music's catalog
 * mirror) since those line up with Spotify's catalog far more reliably
 * than general search results.
 */
export async function findYoutubeMatch(
  spotifyTrackId: string,
  trackName: string,
  artist: string
): Promise<YoutubeMatch> {
  const cached = await getCachedMatch(spotifyTrackId)
  if (cached !== undefined) return cached

  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) throw new Error("Missing YOUTUBE_API_KEY")

  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    videoCategoryId: "10",
    maxResults: "5",
    q: `${artist} ${trackName}`,
    key: apiKey,
  })

  const response = await fetch(`${YOUTUBE_API_BASE}/search?${params.toString()}`, {
    cache: "no-store",
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`YouTube API error: ${response.status} ${text}`)
  }

  const data = (await response.json()) as { items?: YoutubeSearchItem[] }
  const items = data.items ?? []
  const topicMatch = items.find((item) => item.snippet.channelTitle.toLowerCase().includes("- topic"))
  const best = topicMatch ?? items[0]

  const match: YoutubeMatch = best
    ? { videoId: best.id.videoId, title: decodeHtmlEntities(best.snippet.title) }
    : null
  setCachedMatch(spotifyTrackId, match)
  return match
}
