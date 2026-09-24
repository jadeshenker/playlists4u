"use client"

import Image from "next/image"
import { useTrackPlayer, type PlayerTrack } from "@/components/track-player-provider"

const ACTIVE_SIZE = 132
const MIN_SIZE = 56

function Cover({
  track,
  distance,
  isUnplayable,
  onPlay,
}: {
  track: PlayerTrack
  distance: number
  isUnplayable: boolean
  onPlay: () => void
}) {
  const isActive = distance === 0
  const size = isActive ? ACTIVE_SIZE : Math.max(ACTIVE_SIZE - 14 - distance * 14, MIN_SIZE)
  const opacity = isUnplayable
    ? Math.min(isActive ? 1 : Math.max(0.9 - distance * 0.18, 0.4), 0.5)
    : isActive
      ? 1
      : Math.max(0.9 - distance * 0.18, 0.4)

  return (
    <button
      onClick={() => {
        if (!isUnplayable) onPlay()
      }}
      disabled={isUnplayable}
      className={`shrink-0 overflow-hidden bg-gray-50 transition-all duration-200 ${
        isUnplayable ? "cursor-not-allowed" : "cursor-pointer"
      }`}
      style={{ width: size, height: size, opacity }}
    >
      {track.albumArt ? (
        <Image
          src={track.albumArt}
          alt={track.name}
          width={size}
          height={size}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <div className="h-px w-6 bg-gray-300" />
        </div>
      )}
    </button>
  )
}

/**
 * A coverflow-style shelf of every album in the playlist, the currently
 * playing one largest and dead-center — clicking any cover jumps to it.
 * Always rendered (even with nothing playing, in which case the first
 * track leads). Tracks before/after the active one sit in two independent
 * side groups, each just growing/shrinking to fill its half of the row —
 * that's what keeps the active cover exactly centered even when the
 * playlist length is even and the two sides can't have equal counts.
 */
export default function AlbumGallery() {
  const { tracks, matches, unplayableTrackIds, currentTrackId, playTrack } = useTrackPlayer()

  if (tracks.length === 0) return null

  const activeIndex = Math.max(
    0,
    tracks.findIndex((track) => track.id === currentTrackId)
  )

  const before = tracks.slice(0, activeIndex)
  const active = tracks[activeIndex]
  const after = tracks.slice(activeIndex + 1)

  function isTrackUnplayable(track: PlayerTrack) {
    const match = matches[track.id]
    return match === "error" || unplayableTrackIds.has(track.id)
  }

  return (
    <div className="flex w-full items-end gap-3 px-6 pt-10 pb-10">
      <div className="flex flex-1 items-end justify-end gap-3 overflow-hidden">
        {before.map((track, i) => (
          <Cover
            key={track.id}
            track={track}
            distance={before.length - i}
            isUnplayable={isTrackUnplayable(track)}
            onPlay={() => playTrack(track.id)}
          />
        ))}
      </div>

      <Cover
        track={active}
        distance={0}
        isUnplayable={isTrackUnplayable(active)}
        onPlay={() => playTrack(active.id)}
      />

      <div className="flex flex-1 items-end justify-start gap-3 overflow-hidden">
        {after.map((track, i) => (
          <Cover
            key={track.id}
            track={track}
            distance={i + 1}
            isUnplayable={isTrackUnplayable(track)}
            onPlay={() => playTrack(track.id)}
          />
        ))}
      </div>
    </div>
  )
}
