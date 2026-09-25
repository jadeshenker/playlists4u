"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { useTrackPlayer } from "@/components/track-player-provider"
import { useToast } from "@/components/toast-provider"
import KeySequence from "@/components/key-sequence"
import { copyToClipboard } from "@/lib/clipboard"
import { isTypingTarget } from "@/lib/dom"
import { formatMs } from "@/lib/format"
import { PlayIcon, PauseIcon, SkipPreviousIcon, SkipNextIcon } from "@/components/play-icons"

// Keep in sync with the spacer height below the fixed bar — the bar's own
// height must exactly match it, or page content gets clipped/overlapped.
// Taller on mobile to fit the stacked 3-row layout; also kept in sync with
// the ".block-viewer" bottom offset in globals.css.
const BAR_HEIGHT = "h-32 md:h-16"

/** Fixed bar pinned to the bottom of the viewport, mounted once in the root
 * layout so it (and playback) survives navigation between the home page and
 * any playlist. Only rendered once a track has been loaded. */
export default function MiniPlayer() {
  const {
    tracks,
    currentTrack,
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
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const match = currentTrackId ? matches[currentTrackId] : undefined
  const isUnplayable = Boolean(
    currentTrackId && (match === "error" || unplayableTrackIds.has(currentTrackId))
  )
  const videoId = match && match !== "loading" && match !== "error" ? match.videoId : null

  const songTitle = !currentTrack ? "" : `${currentTrack.name} — ${currentTrack.artist}`

  const progressPercent = duration > 0 ? (position / duration) * 100 : 0

  function handleSeek(event: React.MouseEvent<HTMLDivElement>) {
    if (!currentTrack) return
    const rect = event.currentTarget.getBoundingClientRect()
    const fraction = (event.clientX - rect.left) / rect.width
    seekToFraction(Math.min(Math.max(fraction, 0), 1))
  }

  async function copyLink(url: string, label: string) {
    setMenuOpen(false)
    if (await copyToClipboard(url)) showToast(label)
  }

  async function copyTrackList() {
    setMenuOpen(false)
    const text = tracks.map((track, i) => `${i + 1}. ${track.name} - ${track.artist}`).join("\n")
    if (await copyToClipboard(text)) showToast("copied track list")
  }

  // "c" toggles the commands popup open/closed; while it's open, "y"/"s"/"l"
  // fire the matching copy action. Escape always closes it.
  useEffect(() => {
    if (!currentTrack) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false)
        return
      }
      if (isTypingTarget(event.target)) return
      const key = event.key.toLowerCase()

      if (key === "c") {
        setMenuOpen((open) => !open)
        return
      }
      if (!menuOpen) return

      if (key === "y") {
        if (videoId) copyLink(`https://www.youtube.com/watch?v=${videoId}`, "copied youtube link")
      } else if (key === "s") {
        if (currentTrack) copyLink(`https://open.spotify.com/track/${currentTrack.id}`, "copied spotify link")
      } else if (key === "l") {
        copyTrackList()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- copyLink/copyTrackList only close over stable setters/refs
  }, [currentTrack, videoId, menuOpen, tracks])

  // Click anywhere outside the menu to dismiss it.
  useEffect(() => {
    if (!menuOpen) return
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [menuOpen])

  if (!currentTrack) return null

  const controlButtonClass =
    "flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-gray-300 hover:bg-gray-50"

  return (
    <>
      <div className={`${BAR_HEIGHT} shrink-0`} aria-hidden />

      <div className={`mini-player-bar fixed bottom-0 left-0 right-0 z-50 ${BAR_HEIGHT} border-t border-gray-300 bg-white`}>
        <div className="mx-auto flex h-full w-full max-w-3xl flex-col justify-center gap-2 px-6 py-4 md:flex-row md:items-center md:gap-4 md:py-0">
          {/* Mobile row 1: title + commands. At md+, this wrapper vanishes
              (display: contents) and its two children rejoin the single row
              in their original desktop order via md:order-*. */}
          <div className="flex items-center justify-between gap-3 md:contents">
            <div className="flex min-w-0 flex-1 items-center gap-3 md:order-1">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden bg-gray-50">
                {currentTrack.albumArt ? (
                  <Image
                    src={currentTrack.albumArt}
                    alt={currentTrack.name}
                    width={44}
                    height={44}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-px w-4 bg-gray-300" />
                )}
              </div>
              <div className="min-w-0 truncate">{songTitle}</div>
            </div>

            <div ref={menuRef} className="relative hidden shrink-0 md:order-4 md:block">
              <button
                onClick={() => setMenuOpen((open) => !open)}
                className="flex cursor-pointer items-center gap-1.5 font-mono text-[10px] text-gray-500"
              >
                <KeySequence active keys={["C"]} />
                <span>for commands</span>
              </button>

              {menuOpen && (
                <div className="absolute bottom-full right-0 mb-2 w-44 border border-gray-300 bg-white py-1 shadow-md">
                  <button
                    onClick={() => {
                      if (videoId) copyLink(`https://www.youtube.com/watch?v=${videoId}`, "copied youtube link")
                    }}
                    disabled={!videoId}
                    className="flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-1.5 text-left font-mono text-[10px] text-gray-600 hover:bg-gray-50 disabled:cursor-default disabled:opacity-40"
                  >
                    <span>⧉ cpy youtube link</span>
                    <KeySequence active keys={["Y"]} />
                  </button>
                  <button
                    onClick={() => copyLink(`https://open.spotify.com/track/${currentTrack.id}`, "copied spotify link")}
                    className="flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-1.5 text-left font-mono text-[10px] text-gray-600 hover:bg-gray-50"
                  >
                    <span>⧉ cpy spotify link</span>
                    <KeySequence active keys={["S"]} />
                  </button>
                  <button
                    onClick={copyTrackList}
                    disabled={tracks.length === 0}
                    className="flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-1.5 text-left font-mono text-[10px] text-gray-600 hover:bg-gray-50 disabled:cursor-default disabled:opacity-40"
                  >
                    <span>⧉ cpy track list</span>
                    <KeySequence active keys={["L"]} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile row 2: progress + timestamps. */}
          <div className="flex min-w-0 items-center gap-3 md:order-3 md:flex-1">
            <div onClick={handleSeek} className="h-3 flex-1 cursor-pointer bg-gray-200">
              <div className="h-full bg-black" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="shrink-0 font-mono text-[10px] text-gray-400">
              {formatMs(position)} / {formatMs(duration)}
            </div>
          </div>

          {/* Mobile row 3: playback controls, centered. */}
          <div className="flex items-center justify-center gap-1.5 md:order-2 md:shrink-0 md:justify-start">
            <button onClick={previous} className={controlButtonClass}>
              <SkipPreviousIcon />
            </button>
            <button
              onClick={() => {
                if (!isUnplayable) togglePlayPause()
              }}
              disabled={isUnplayable}
              data-tooltip={isUnplayable ? "Playback currently unavailable" : undefined}
              className={`${controlButtonClass} disabled:cursor-default disabled:hover:bg-transparent ${isUnplayable ? "tooltip tooltip-up" : ""}`}
            >
              <span className={isUnplayable ? "opacity-40" : undefined}>
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
              </span>
            </button>
            <button onClick={next} className={controlButtonClass}>
              <SkipNextIcon />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
