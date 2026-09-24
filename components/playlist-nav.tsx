import Link from "next/link"
import type { ArenaPlaylistNeighbor } from "@/lib/arena"

/**
 * Prev/next links to neighboring playlists, in homepage list order. Renders
 * only the side(s) that exist — nothing at all when there's neither (a
 * single-playlist list), and just one side at the first/last playlist.
 */
export default function PlaylistNav({
  prev,
  next,
}: {
  prev: ArenaPlaylistNeighbor | null
  next: ArenaPlaylistNeighbor | null
}) {
  if (!prev && !next) return null

  return (
    <div className="flex items-center gap-3 font-mono text-[10px] text-gray-500">
      {prev && (
        <Link
          href={`/playlists/${prev.appSlug}`}
          className="flex items-center gap-1 hover:text-black"
          title="Previous playlist"
        >
          <span>←</span>
          <span className="max-w-[10rem] truncate">{prev.title}</span>
        </Link>
      )}
      {next && (
        <Link
          href={`/playlists/${next.appSlug}`}
          className="flex items-center gap-1 hover:text-black"
          title="Next playlist"
        >
          <span className="max-w-[10rem] truncate">{next.title}</span>
          <span>→</span>
        </Link>
      )}
    </div>
  )
}
