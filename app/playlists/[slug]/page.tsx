import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
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

export const dynamic = "force-dynamic"

type PageProps = { params: Promise<{ slug: string }> }

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
      <main className="flex flex-1 flex-col lg:flex-row pb-6">
        <RegisterTracks tracks={playerTracks} />
        <div className="playlist-sidebar flex items-center justify-between border-b border-gray-600 py-2 lg:fixed lg:top-0 lg:left-0 lg:z-10 lg:w-80 lg:flex-col lg:items-stretch lg:justify-start lg:overflow-y-auto lg:border-b-0 lg:border-r lg:bg-white lg:py-6">
          <div className="px-6">
            <p className="text-sm">
              <Link href="/" className="link">
                PLAYLISTS4U
              </Link>{" "}
              / <span className="font-semibold">{playlist.title}</span>
            </p>
            <div className="grid grid-cols-[5rem_1fr] items-center gap-y-1 pt-3 text-xs">
              <span className="text-gray-500">author</span>
              <div className="flex items-center gap-2">
                {playlist.creator.avatarUrl ? (
                  <Image
                    src={playlist.creator.avatarUrl}
                    alt={playlist.creator.name}
                    width={20}
                    height={20}
                    className="h-5 w-5 shrink-0 rounded-full object-cover"
                  />
                ) : null}
                <span>{playlist.creator.name}</span>
              </div>
              <span className="text-gray-500">tags</span>
              <span>{playlist.tags.length > 0 ? playlist.tags.join(" / ") : "--"}</span>
              <span className="text-gray-500">description</span>
              <span>{playlist.description || "--"}</span>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2 px-6 lg:items-start lg:mt-auto">
            <BlockViewer />
            <div className="flex flex-col items-end gap-2 lg:items-start lg:pt-2">
              <GoHomeShortcut />
              <PlaylistNav prev={playlist.prevPlaylist} next={playlist.nextPlaylist} />
            </div>
          </div>
        </div>
        <div className="min-w-0 flex-1 lg:ml-80">
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
