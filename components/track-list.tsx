"use client"

import { useTrackPlayer } from "@/components/track-player-provider"
import { PlayIcon, PauseIcon } from "@/components/play-icons"

type Track = { id: string; name: string; artist: string }

/** A plain numbered tracklist — clicking a row plays it immediately. The
 * player up top (and its command bar underneath) handles pause/skip/seek
 * and copying links for whatever's currently loaded. */
export default function TrackList({ tracks }: { tracks: Track[] }) {
  const { matches, unplayableTrackIds, currentTrackId, isPlaying, playTrack } = useTrackPlayer()

  return (
    <ol className="list-none px-6 text-s">
      {tracks.map((track, index) => {
        const match = matches[track.id]
        const isLoading = match === "loading" || match === undefined
        const isUnplayable = match === "error" || unplayableTrackIds.has(track.id)
        const isCurrent = currentTrackId === track.id
        const showPause = isCurrent && isPlaying

        const disabled = isLoading || isUnplayable
        const tooltip = isUnplayable ? "Playback currently unavailable" : undefined

        return (
          <li className="pb-1" key={track.id}>
            <button
              onClick={() => {
                if (!disabled) playTrack(track.id)
              }}
              disabled={disabled}
              data-tooltip={tooltip}
              className={`flex w-full cursor-pointer items-center gap-2 text-left disabled:cursor-default ${tooltip ? "tooltip" : ""} ${isCurrent ? "text-purple-600" : ""}`}
            >
              <span className="text-gray-400 pr-6">{showPause ? <PauseIcon /> : <PlayIcon />}</span>
              <span className={disabled ? "opacity-40" : undefined}>
                {index + 1}. {track.name} <span>-</span> {track.artist}
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
