import { notFound } from "next/navigation"
import { fetchPlaylistBySlug } from "@/lib/arena"
import { fetchTracksByIds } from "@/lib/spotify"
import TrackPlayerProvider from "@/components/track-player-provider"
import TrackList from "@/components/track-list"
import NowPlaying from "@/components/now-playing"
import AlbumGallery from "@/components/album-gallery"
import ContentGrid from "@/components/content-grid"
import ToastProvider from "@/components/toast-provider"
import CopyTracklistShortcut from "@/components/copy-tracklist-shortcut"
import GoHomeShortcut from "@/components/go-home-shortcut"

export const dynamic = "force-dynamic"

type PageProps = { params: Promise<{ slug: string }> }

export default async function PlaylistPage({ params }: PageProps) {
  const { slug } = await params
  const playlist = await fetchPlaylistBySlug(slug)
  if (!playlist) notFound()

  const tracks = await fetchTracksByIds(playlist.trackIds)
  const playerTracks = tracks.map((track) => ({
    id: track.id,
    uri: track.uri,
    name: track.name,
    artist: (track.artists ?? []).map((artist) => artist.name).join(", "),
    albumArt: playlist.trackImages[track.id] ?? null,
  }))

  return (
    <ToastProvider>
      <main className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-gray-600 py-2">
          <div className="px-6">
            <p className="text-sm">
              playlists 4u / <span className="font-semibold">{playlist.title}</span>
            </p>
            <div className="grid grid-cols-[5rem_1fr] gap-y-0.5 pt-3 text-xs">
              <span className="text-gray-500">tags</span>
              <span>{playlist.tags.length > 0 ? playlist.tags.join(" / ") : "--"}</span>
              <span className="text-gray-500">description</span>
              <span>{playlist.description || "--"}</span>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1 px-6">
            <GoHomeShortcut />
            <CopyTracklistShortcut tracks={playerTracks} />
          </div>
        </div>
        {/* Wide enough that a track row (title, artist, and its full command
            bar) fits on one line for most song names. */}
        <div className="mx-auto w-full max-w-3xl">
          <TrackPlayerProvider tracks={playerTracks}>
            <NowPlaying />
            <AlbumGallery />
            <TrackList tracks={playerTracks} />
          </TrackPlayerProvider>
          <p className="p-6 text-center">────── ⋆⋅☆⋅⋆ ──────</p>
          <ContentGrid blocks={playlist.otherBlocks} />
        </div>
      </main>
    </ToastProvider>
  )
}
