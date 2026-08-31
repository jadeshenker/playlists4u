"use client"

import { useTrackPlayer } from "@/components/track-player-provider"
import { formatMs } from "@/lib/format"

export default function UniversalPlayer() {
  const { tracks, matches, currentTrackId, isPlaying, position, duration, togglePlayPause, next, previous, seekToFraction } =
    useTrackPlayer()

  const currentTrack = tracks.find((track) => track.id === currentTrackId) ?? null
  const match = currentTrackId ? matches[currentTrackId] : undefined

  const label = !currentTrack
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

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center gap-3 border-t border-white bg-black px-3 py-2 font-mono text-xs text-white">
      <div className="flex shrink-0 gap-1">
        <button onClick={previous} className="h-6 w-6 cursor-pointer border border-white">
          ◀◀
        </button>
        <button onClick={togglePlayPause} className="h-6 w-6 cursor-pointer border border-white">
          {isPlaying ? "❚❚" : "▶"}
        </button>
        <button onClick={next} className="h-6 w-6 cursor-pointer border border-white">
          ▶▶
        </button>
      </div>

      <div className="min-w-0 flex-1 truncate sm:w-96 sm:flex-none">{label}</div>

      <div onClick={handleSeek} className="hidden h-3 flex-1 cursor-pointer bg-gray-700 sm:block">
        <div className="h-full bg-white" style={{ width: `${progressPercent}%` }} />
      </div>

      <div className="w-24 shrink-0 text-right">
        {formatMs(position)} / {formatMs(duration)}
      </div>
    </div>
  )
}
