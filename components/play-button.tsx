"use client"

import { useTrackPlayer } from "@/components/track-player-provider"

export default function PlayButton({ trackId }: { trackId: string }) {
  const { matches, unplayableTrackIds, currentTrackId, isPlaying, playTrack } = useTrackPlayer()
  const match = matches[trackId]
  const isLoading = match === "loading" || match === undefined
  const isUnplayable = unplayableTrackIds.has(trackId)
  const showPause = currentTrackId === trackId && isPlaying

  const title =
    match === "error" || isUnplayable
      ? "playback unavailable"
      : match && match !== "loading"
        ? match.title
        : undefined

  const isDisabled = isLoading || match === null || match === "error" || isUnplayable

  return (
    <button
      onClick={() => playTrack(trackId)}
      disabled={isDisabled}
      data-tooltip={title}
      className={`flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center disabled:cursor-not-allowed ${title ? "tooltip" : ""}`}
    >
      <span className={isDisabled ? "opacity-40" : undefined}>{showPause ? "❚❚" : "▶"}</span>
    </button>
  )
}
