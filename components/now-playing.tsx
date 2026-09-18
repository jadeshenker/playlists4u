"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"
import { useTrackPlayer } from "@/components/track-player-provider"
import { useToast } from "@/components/toast-provider"
import KeySequence from "@/components/key-sequence"
import { copyToClipboard } from "@/lib/clipboard"
import { isTypingTarget } from "@/lib/dom"
import { formatMs } from "@/lib/format"
import { PlayIcon, PauseIcon, SkipPreviousIcon, SkipNextIcon } from "@/components/play-icons"

export default function NowPlaying() {
  const {
    tracks,
    matches,
    unplayableTrackIds,
    currentTrackId,
    isPlaying,
    position,
    duration,
    togglePlayPause,
    next,
    previous,
    seekToFraction,
  } = useTrackPlayer()
  const { showToast } = useToast()
  const pendingRef = useRef(false)

  const currentTrack = tracks.find((track) => track.id === currentTrackId) ?? null
  const match = currentTrackId ? matches[currentTrackId] : undefined
  const isUnplayable = Boolean(
    currentTrackId && (match === "error" || unplayableTrackIds.has(currentTrackId))
  )
  const videoId = match && match !== "loading" && match !== "error" ? match.videoId : null

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

  async function copyLink(url: string, label: string) {
    if (await copyToClipboard(url)) showToast(label)
  }

  // "c" arms a pending command; whichever of y/s comes next (within a beat)
  // fires it, for whatever track is currently loaded. Any other key — or
  // waiting too long — disarms it. Not a held chord: c, then y or s.
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null

    function disarm() {
      if (timeout) {
        clearTimeout(timeout)
        timeout = null
      }
      pendingRef.current = false
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) return
      const key = event.key.toLowerCase()

      if (key === "c") {
        pendingRef.current = true
        if (timeout) clearTimeout(timeout)
        timeout = setTimeout(disarm, 1500)
        return
      }
      if (!pendingRef.current) return
      disarm()
      if (!currentTrack) return

      if (key === "y") {
        if (videoId) copyLink(`https://www.youtube.com/watch?v=${videoId}`, "copied youtube link")
      } else if (key === "s") {
        copyLink(`https://open.spotify.com/track/${currentTrack.id}`, "copied spotify link")
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      disarm()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- copyLink only closes over stable setters/refs
  }, [currentTrack, videoId])

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
            <button
              onClick={() => {
                if (!isUnplayable) togglePlayPause()
              }}
              disabled={isUnplayable}
              data-tooltip={isUnplayable ? "Playback currently unavailable" : undefined}
              className={`${controlButtonClass} disabled:cursor-default disabled:hover:bg-transparent ${isUnplayable ? "tooltip" : ""}`}
            >
              <span className={isUnplayable ? "opacity-40" : undefined}>
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
              </span>
            </button>
            <button onClick={next} className={controlButtonClass}>
              <SkipNextIcon />
            </button>
          </div>

          <div onClick={handleSeek} className="h-3 flex-1 cursor-pointer bg-gray-200">
            <div className="h-full bg-black" style={{ width: `${progressPercent}%` }} />
          </div>

          <div className="shrink-0 font-mono text-gray-400">
            {formatMs(position)} / {formatMs(duration)}
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-[10px] text-gray-500">
          <button
            onClick={() => {
              if (videoId) copyLink(`https://www.youtube.com/watch?v=${videoId}`, "copied youtube link")
            }}
            disabled={!videoId}
            className="flex cursor-pointer items-center gap-1.5 disabled:cursor-default disabled:opacity-40"
          >
            <span>⧉ cpy youtube link</span>
            <KeySequence active keys={["C", "Y"]} />
          </button>

          <button
            onClick={() => {
              if (currentTrack)
                copyLink(`https://open.spotify.com/track/${currentTrack.id}`, "copied spotify link")
            }}
            disabled={!currentTrack}
            className="flex cursor-pointer items-center gap-1.5 disabled:cursor-default disabled:opacity-40"
          >
            <span>⧉ cpy spotify link</span>
            <KeySequence active keys={["C", "S"]} />
          </button>
        </div>
      </div>
    </div>
  )
}
