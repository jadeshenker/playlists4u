import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { fetchPlaylistBySlug } from "@/lib/arena"
import { fetchTracksByIds } from "@/lib/spotify"
import { formatDuration } from "@/lib/format"
import RegisterTracks from "@/components/register-tracks"
import TrackList from "@/components/track-list"
import AlbumGallery from "@/components/album-gallery"
import ContentGrid from "@/components/content-grid"
import GoHomeShortcut from "@/components/go-home-shortcut"
import PlaylistNav from "@/components/playlist-nav"
import BlockViewerProvider from "@/components/block-viewer-provider"
import BlockViewer from "@/components/block-viewer"
import PlaylistHeader from "@/components/playlist-header"

export const dynamic = "force-dynamic"

type PageProps = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const playlist = await fetchPlaylistBySlug(slug)
  if (!playlist) return {}

  return {
    title: `${playlist.title} | ilovemusic`,
  }
}

export default async function PlaylistPage({ params }: PageProps) {
  const { slug } = await params
  const playlist = await fetchPlaylistBySlug(slug)
  if (!playlist) notFound()

  const tracks = await fetchTracksByIds(playlist.trackIds)
  const totalDurationMs = tracks.reduce((sum, track) => sum + (track.duration_ms ?? 0), 0)
  const playerTracks = tracks.map((track) => ({
    id: track.id,
    uri: track.uri,
    name: track.name,
    artist: (track.artists ?? []).map((artist) => artist.name).join(", "),
    albumArt: playlist.trackImages[track.id] ?? null,
  }))

  return (
    <BlockViewerProvider>
      <main className="flex flex-1 flex-col md:flex-row pb-6">
        <RegisterTracks tracks={playerTracks} />
        <PlaylistHeader
          title={playlist.title}
          creator={playlist.creator}
          tags={playlist.tags}
          description={playlist.description}
          link={playlist.arenaUrl}
        >
          <div className="flex shrink-0 flex-col items-end gap-2 px-6 md:items-start md:mt-auto">
            <BlockViewer />
            <div className="flex flex-col items-end gap-2 md:items-start md:pt-2">
              <GoHomeShortcut />
              <PlaylistNav prev={playlist.prevPlaylist} next={playlist.nextPlaylist} />
            </div>
          </div>
        </PlaylistHeader>
        <div className="min-w-0 flex-1 md:ml-86">
          {/* Wide enough that a track row (title, artist, and its full command
              bar) fits on one line for most song names. */}
          <div className="mx-auto w-full max-w-3xl">
            <AlbumGallery />
            <div className="px-6 pb-4 font-mono">
              <p className="text-base">{playlist.title}</p>
              <p className="text-xs text-gray-500">
                {tracks.length} track{tracks.length === 1 ? "" : "s"}
                {totalDurationMs > 0 ? ` · ${formatDuration(totalDurationMs)}` : ""}
              </p>
            </div>
            <TrackList tracks={playerTracks} />
            <ContentGrid blocks={playlist.otherBlocks} />
          </div>
        </div>
      </main>
    </BlockViewerProvider>
  )
}
