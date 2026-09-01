"use client"

import Image from "next/image"
import { useTrackPlayer } from "@/components/track-player-provider"
import { formatMs } from "@/lib/format"

function PlayIcon() {
  return (
    <svg viewBox="0 0 16 16" width="9" height="9" fill="currentColor">
      <path d="M3 1.5l11.5 6.5L3 14.5v-13z" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 16 16" width="9" height="9" fill="currentColor">
      <rect x="3" y="1.5" width="3.5" height="13" />
      <rect x="9.5" y="1.5" width="3.5" height="13" />
    </svg>
  )
}

function SkipPreviousIcon() {
  return (
    <svg viewBox="0 0 16 16" width="11" height="11" fill="currentColor">
      <rect x="1" y="1.5" width="1.75" height="13" />
      <path d="M14 1.5L7.5 8l6.5 6.5v-13z" />
      <path d="M7.75 1.5L1.25 8l6.5 6.5v-13z" />
    </svg>
  )
}

function SkipNextIcon() {
  return (
    <svg viewBox="0 0 16 16" width="11" height="11" fill="currentColor">
      <path d="M2 1.5L8.5 8 2 14.5v-13z" />
      <path d="M8.25 1.5L14.75 8l-6.5 6.5v-13z" />
      <rect x="13.25" y="1.5" width="1.75" height="13" />
    </svg>
  )
}

export default function NowPlaying() {
  const {
    tracks,
    matches,
    currentTrackId,
    isPlaying,
    position,
    duration,
    togglePlayPause,
    next,
    previous,
    seekToFraction,
  } = useTrackPlayer()

  const currentTrack = tracks.find((track) => track.id === currentTrackId) ?? null
  const match = currentTrackId ? matches[currentTrackId] : undefined

  const songName = !currentTrack
    ? "nothing playing"
    : match && match !== "loading" && match !== "error"
      ? match.title
      : `${currentTrack.name} — ${currentTrack.artist}`

  const progressPercent = duration > 0 ? (position / duration) * 100 : 0

  function handleSeek(event: React.MouseEvent<HTMLDivElement>) {
    if (!currentTrack) return
    const rect = event.currentTarget.getBoundingClientRect()
    const fraction = (event.clientX - rect.left) / rect.width
    seekToFraction(Math.min(Math.max(fraction, 0), 1))
  }

  const controlButtonClass =
    "flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-gray-300 hover:bg-gray-50"

  return (
    <div className="flex justify-center gap-6 px-6 py-8">
      <div className="flex h-40 w-40 shrink-0 items-center justify-center overflow-hidden border border-gray-200 bg-gray-50">
        {currentTrack?.albumArt ? (
          <Image
            src={currentTrack.albumArt}
            alt={currentTrack.name}
            width={160}
            height={160}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-px w-10 bg-gray-300" />
        )}
      </div>

      <div className="flex w-full max-w-sm flex-col justify-center gap-3">
        <div className="truncate font-semibold">{songName}</div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex shrink-0 items-center gap-1.5">
            <button onClick={previous} className={controlButtonClass}>
              <SkipPreviousIcon />
            </button>
            <button onClick={togglePlayPause} className={controlButtonClass}>
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>
            <button onClick={next} className={controlButtonClass}>
              <SkipNextIcon />
            </button>
          </div>

          <div onClick={handleSeek} className="h-3 flex-1 cursor-pointer bg-gray-200">
            <div className="h-full bg-black" style={{ width: `${progressPercent}%` }} />
          </div>

          <div className="shrink-0 text-gray-400">
            {formatMs(position)} / {formatMs(duration)}
          </div>
        </div>
      </div>
    </div>
  )
}
