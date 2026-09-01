import Link from "next/link"
import { notFound } from "next/navigation"
import { fetchPlaylistBySlug } from "@/lib/arena"
import { fetchTracksByIds } from "@/lib/spotify"
import TrackPlayerProvider from "@/components/track-player-provider"
import TrackList from "@/components/track-list"
import NowPlaying from "@/components/now-playing"
import AlbumGallery from "@/components/album-gallery"
import TagChips from "@/components/tag-chips"
import ContentGrid from "@/components/content-grid"

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
    <main className="flex flex-1 flex-col">
      <div className="py-2 border-b border-gray-600">
      <Link href="/" className="px-6 pb-2 block link">
        go home
      </Link>
      <div className="px-6">
      <p>
        <span className="font-semibold">title:</span> {playlist.title}
      </p>
      {playlist.description && <p className="pt-1">{playlist.description}</p>}
      {playlist.tags.length > 0 && (
          <div className="pt-1"><TagChips tags={playlist.tags} /></div>
      )}
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
        <ContentGrid blocks={playlist.otherBlocks} />
      </div>
    </main>
  )
}
