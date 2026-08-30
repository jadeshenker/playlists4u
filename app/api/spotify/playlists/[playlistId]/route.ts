import { fetchAllPlaylistItems, fetchPlaylist } from "@/lib/spotify"

type RouteContext = { params: Promise<{ playlistId: string }> }

export async function GET(_request: Request, { params }: RouteContext) {
  const { playlistId } = await params

  try {
    const [playlist, items] = await Promise.all([
      fetchPlaylist(playlistId),
      fetchAllPlaylistItems(playlistId),
    ])

    return Response.json({ playlist, items })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}
