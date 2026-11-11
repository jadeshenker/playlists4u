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

const CHAPTERS_REDIS_KEY_PREFIX = "youtube-chapters:"

export type VideoChapter = { seconds: number; label: string }

// In-memory L1 cache, same idea as matchCache above.
const chaptersCache = new Map<string, VideoChapter[]>()

// "1:23", "12:34", "1:02:03" (also "01:02:03"). Bounded by whitespace,
// brackets or line edges so things like "128:00 bpm" or ratios inside words
// don't count.
const TIMESTAMP_RE = /(?<![\d:])(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?![\d:])/g

// Characters commonly used to separate a timestamp from its label, e.g.
// "0:00 - intro", "intro | 0:00", "1. 0:00 intro". Brackets aren't trimmed
// here (that would eat the ")" in "Song (Remix)"); the empty "[]" / "()" a
// bracketed timestamp leaves behind is removed separately.
const LABEL_EDGE_RE = /^[\s\-–—|:•.,]+|[\s\-–—|:•.,]+$/g

/**
 * Pulls "timestamp + label" lines out of a video description (how creators
 * write tracklists / chapters). Unlike YouTube's own chapter rules, any
 * number of timestamps counts, and there's no requirement to start at 0:00.
 */
export function parseDescriptionTimestamps(description: string): VideoChapter[] {
  const chapters: VideoChapter[] = []
  const seen = new Set<number>()

  for (const line of description.split(/\r?\n/)) {
    const matches = [...line.matchAll(TIMESTAMP_RE)]
    if (matches.length === 0) continue

    // A line can hold a range ("0:00 - 3:20 song"); the first one is where to seek.
    const [, h, m, s] = matches[0]
    if (Number(s) > 59 || (h !== undefined && Number(m) > 59)) continue
    const seconds = Number(h ?? 0) * 3600 + Number(m) * 60 + Number(s)
    if (seen.has(seconds)) continue
    seen.add(seconds)

    const label = line
      .replace(TIMESTAMP_RE, " ")
      .replace(/[[(]\s*[\])]/g, " ")
      .replace(/^\s*\d{1,3}[.)]\s+/, "") // leading track numbers like "01." or "3)"
      .replace(LABEL_EDGE_RE, "")
      .replace(/\s{2,}/g, " ")
      .trim()

    chapters.push({ seconds, label })
  }

  return chapters
}

/** A video's description timestamps. Costs 1 quota unit (videos.list) per
 * uncached video, and results are cached in Redis indefinitely. */
export async function getVideoChapters(videoId: string): Promise<VideoChapter[]> {
  const memo = chaptersCache.get(videoId)
  if (memo) return memo

  const redis = getRedis()
  const redisKey = `${CHAPTERS_REDIS_KEY_PREFIX}${videoId}`
  if (redis) {
    try {
      const cached = await redis.get<{ chapters: VideoChapter[] }>(redisKey)
      if (cached) {
        chaptersCache.set(videoId, cached.chapters)
        return cached.chapters
      }
    } catch (error) {
      console.error("redis get failed, falling back to a live fetch:", error)
    }
  }

  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) throw new Error("Missing YOUTUBE_API_KEY")

  const params = new URLSearchParams({ part: "snippet", id: videoId, key: apiKey })
  const response = await fetch(`${YOUTUBE_API_BASE}/videos?${params.toString()}`, {
    cache: "no-store",
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`YouTube API error: ${response.status} ${text}`)
  }

  const data = (await response.json()) as { items?: { snippet: { description?: string } }[] }
  const description = data.items?.[0]?.snippet.description ?? ""
  const chapters = parseDescriptionTimestamps(description).map((chapter) => ({
    ...chapter,
    label: decodeHtmlEntities(chapter.label),
  }))

  chaptersCache.set(videoId, chapters)
  if (redis) {
    redis
      .set(redisKey, { chapters })
      .catch((error) => console.error("redis set failed:", error))
  }
  return chapters
}
