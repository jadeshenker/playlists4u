const ARENA_API_BASE = "https://api.are.na/v2"

/** The "channel of channels" — each sub-channel is one playlist. */
export const PLAYLISTS_CHANNEL_SLUG = "p4u-playlists4u"

export async function arenaFetch(path: string, init?: RequestInit) {
  const accessToken = process.env.ARENA_ACCESS_TOKEN

  const response = await fetch(`${ARENA_API_BASE}${path}`, {
    ...init,
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Are.na API error: ${response.status} ${text}`)
  }

  return response
}

type ArenaImageUrls = {
  thumb?: { url: string }
  square?: { url: string }
  display?: { url: string }
}

type ArenaContentItem = {
  id: number
  slug?: string
  title?: string | null
  generated_title?: string | null
  class: string
  length?: number
  connected_at?: string
  image?: ArenaImageUrls | null
  source?: { url?: string | null } | null
  metadata?: { description?: string | null } | null
}

type ArenaChannelResponse = {
  id: number
  slug: string
  title: string
  length: number
  contents?: ArenaContentItem[] | null
  metadata?: { description?: string | null } | null
}

export type ArenaBlockThumbnail = {
  id: number
  imageUrl: string | null
  title: string | null
}

export type ArenaPlaylistChannel = {
  slug: string
  appSlug: string
  title: string
  length: number
  addedAt: string | null
  thumbnails: ArenaBlockThumbnail[]
  tags: string[]
}

export type ArenaPlaylistDetail = {
  title: string
  appSlug: string
  trackIds: string[]
  tags: string[]
  description: string | null
}

/** Strips a "[P4U]" (any casing/spacing) tag out of a channel title. */
function stripTag(title: string): string {
  return title.replace(/\[p4u\]\s*/gi, "").trim()
}

const TAGS_MARKER_RE = /tagsURit:\s*/i

/**
 * Channel descriptions often include a "tagsURit:" marker followed by a
 * comma-separated list of tags, possibly alongside other free-text notes.
 * Splits the tags out from whatever description text remains.
 */
function splitDescriptionTags(description: string | null | undefined): {
  tags: string[]
  rest: string | null
} {
  if (!description) return { tags: [], rest: null }

  const match = description.match(TAGS_MARKER_RE)
  if (!match || match.index === undefined) {
    const rest = description.trim()
    return { tags: [], rest: rest.length > 0 ? rest : null }
  }

  const before = description.slice(0, match.index)
  const after = description.slice(match.index + match[0].length)
  const newlineIndex = after.indexOf("\n")
  const tagsPortion = newlineIndex === -1 ? after : after.slice(0, newlineIndex)
  const afterTags = newlineIndex === -1 ? "" : after.slice(newlineIndex + 1)

  const tags = tagsPortion
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)

  const rest = `${before}${afterTags}`.trim()

  return { tags, rest: rest.length > 0 ? rest : null }
}

/** Turns a display title into a URL-friendly slug by swapping spaces for dashes. */
export function titleToSlug(title: string): string {
  return title.trim().replace(/\s+/g, "-")
}

const SPOTIFY_TRACK_URL_RE = /open\.spotify\.com\/track\/([a-zA-Z0-9]+)/

function extractSpotifyTrackId(block: ArenaContentItem): string | null {
  const match = block.source?.url?.match(SPOTIFY_TRACK_URL_RE)
  return match ? match[1] : null
}

async function fetchChannel(slug: string, per: number): Promise<ArenaChannelResponse> {
  const response = await arenaFetch(`/channels/${slug}?per=${per}`)
  return (await response.json()) as ArenaChannelResponse
}

/** Fetches a channel (and its first page of blocks) by slug. */
export async function fetchArenaChannel(slug: string): Promise<ArenaChannelResponse> {
  return fetchChannel(slug, 20)
}

/**
 * A sub-channel's thumbnails (most-recently-added first — Are.na returns
 * contents oldest-first; the UI clips this list to whatever fits the
 * column's width, so recent thumbnails are favored over older ones) and
 * tags. Fetched from the sub-channel directly rather than trusted from the
 * parent list's embedded copy, whose `metadata.description` is sometimes
 * truncated (missing the "tagsURit:" prefix).
 */
async function fetchChannelExtras(
  slug: string,
  length: number
): Promise<{ thumbnails: ArenaBlockThumbnail[]; tags: string[] }> {
  const channel = await fetchChannel(slug, Math.max(length, 1))
  const contents = channel.contents ?? []

  const thumbnails = contents
    .map((block) => ({
      id: block.id,
      imageUrl: block.image?.square?.url ?? block.image?.thumb?.url ?? null,
      title: block.generated_title ?? block.title ?? null,
    }))
    .reverse()

  return { thumbnails, tags: splitDescriptionTags(channel.metadata?.description).tags }
}

/** Every playlist (sub-channel) inside the p4u-playlists4u channel, with its thumbnails. */
export async function fetchPlaylistChannels(): Promise<ArenaPlaylistChannel[]> {
  const parent = await fetchChannel(PLAYLISTS_CHANNEL_SLUG, 100)
  const subChannels = (parent.contents ?? []).filter(
    (item): item is ArenaContentItem & { slug: string } =>
      item.class === "Channel" && typeof item.slug === "string"
  )

  return Promise.all(
    subChannels.map(async (channel) => {
      const title = stripTag(channel.title ?? channel.slug)
      const { thumbnails, tags } = await fetchChannelExtras(channel.slug, channel.length ?? 0)
      return {
        slug: channel.slug,
        appSlug: titleToSlug(title),
        title,
        length: channel.length ?? 0,
        addedAt: channel.connected_at ?? null,
        thumbnails,
        tags,
      }
    })
  )
}

/**
 * Finds the sub-channel whose title slugifies to `appSlug` and returns the
 * Spotify track IDs for its Spotify blocks, in playlist order. Non-Spotify
 * blocks (images, text, etc.) are ignored for now.
 */
export async function fetchPlaylistBySlug(appSlug: string): Promise<ArenaPlaylistDetail | null> {
  const parent = await fetchChannel(PLAYLISTS_CHANNEL_SLUG, 100)
  const match = (parent.contents ?? []).find(
    (item): item is ArenaContentItem & { slug: string } =>
      item.class === "Channel" &&
      typeof item.slug === "string" &&
      titleToSlug(stripTag(item.title ?? item.slug)) === appSlug
  )
  if (!match) return null

  const channel = await fetchChannel(match.slug, Math.max(match.length ?? 1, 1))
  const trackIds = (channel.contents ?? [])
    .map(extractSpotifyTrackId)
    .filter((id): id is string => id !== null)

  const { tags, rest: description } = splitDescriptionTags(channel.metadata?.description)

  return {
    title: stripTag(match.title ?? match.slug),
    appSlug,
    trackIds,
    tags,
    description,
  }
}
