import Link from "next/link"
import { notFound } from "next/navigation"
import { fetchPlaylistBySlug } from "@/lib/arena"
import { fetchTracksByIds } from "@/lib/spotify"
import TrackPlayerProvider from "@/components/track-player-provider"
import PlayButton from "@/components/play-button"
import TrackLinks from "@/components/track-links"
import UniversalPlayer from "@/components/universal-player"
import TagChips from "@/components/tag-chips"

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
  }))

  return (
    <main className="flex flex-1 flex-col pb-16">
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
      <p className="pb-2 font-semibold"></p>
      <TrackPlayerProvider tracks={playerTracks}>
        <table className="w-full table-fixed border-collapse">
          <colgroup>
            <col className="w-10" />
            <col className="w-10" />
            <col className="w-1/5" />
            <col className="w-1/6" />
            <col className="w-auto" />
          </colgroup>
          <tbody>
            {tracks.map((track, index) => {
              const artist = (track.artists ?? []).map((a) => a.name).join(", ")
              return (
                <tr key={track.id} className="border-b border-black">
                  <td className="py-1 pl-6 pr-4 align-middle text-gray-400">{index + 1}</td>
                  <td className="py-1 pr-4 align-middle">
                    <PlayButton trackId={track.id} />
                  </td>
                  <td className="truncate py-1 pr-4 align-middle">{track.name}</td>
                  <td className="truncate py-1 pr-4 align-middle">{artist}</td>
                  <td className="py-1 pr-6 align-middle">
                    <TrackLinks trackId={track.id} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <UniversalPlayer />
      </TrackPlayerProvider>
    </main>
  )
}
