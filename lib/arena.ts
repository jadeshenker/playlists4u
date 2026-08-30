const ARENA_API_BASE = "https://api.are.na/v2"

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

export type ArenaChannel = {
  id: number
  slug: string
  title: string
  length: number
  contents?: ArenaBlock[]
}

export type ArenaBlock = {
  id: number
  title?: string | null
  class: string
  content?: string | null
  image?: { display?: { url: string } } | null
}

/** Fetches an Are.na channel (and its first page of blocks) by slug. */
export async function fetchArenaChannel(slug: string): Promise<ArenaChannel> {
  const response = await arenaFetch(`/channels/${slug}`)
  return (await response.json()) as ArenaChannel
}
