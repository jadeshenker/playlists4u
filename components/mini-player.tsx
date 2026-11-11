"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { useTrackPlayer, formatTrackTitle } from "@/components/track-player-provider"
import { useToast } from "@/components/toast-provider"
import KeySequence from "@/components/key-sequence"
import { copyToClipboard } from "@/lib/clipboard"
import { isTypingTarget } from "@/lib/dom"
import { formatMs } from "@/lib/format"
import type { VideoChapter } from "@/lib/youtube"
import { PlayIcon, PauseIcon, SkipPreviousIcon, SkipNextIcon, VideoIcon } from "@/components/play-icons"

// Keep in sync with the spacer height below the fixed bar — the bar's own
// height must exactly match it, or page content gets clipped/overlapped.
// Taller on mobile to fit the stacked 3-row layout.
const BAR_HEIGHT = "h-36 md:h-16"

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
    videoVisible,
    setVideoVisible,
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

  const songTitle = !currentTrack ? "" : formatTrackTitle(currentTrack)
  // Video entries (DJ sets etc.) have no Spotify track to link to.
  const spotifyUrl =
    currentTrack && !currentTrack.youtubeId ? `https://open.spotify.com/track/${currentTrack.id}` : null

  // Timestamps parsed from a video entry's (e.g. a DJ set's) YouTube
  // description, keyed by video ID so each is only fetched once per session.
  const [chaptersByVideo, setChaptersByVideo] = useState<Record<string, VideoChapter[]>>({})
  // Which video's timestamp list is expanded, so switching tracks collapses it.
  const [chaptersOpenFor, setChaptersOpenFor] = useState<string | null>(null)
  const setVideoId = currentTrack?.youtubeId ?? null
  const chapters = setVideoId ? (chaptersByVideo[setVideoId] ?? []) : []
  const chaptersOpen = chapters.length > 0 && chaptersOpenFor === setVideoId

  useEffect(() => {
    if (!setVideoId || chaptersByVideo[setVideoId]) return
    let cancelled = false
    fetch(`/api/youtube/chapters?videoId=${encodeURIComponent(setVideoId)}`)
      .then((response) => (response.ok ? response.json() : { chapters: [] }))
      .catch(() => ({ chapters: [] }))
      .then((data: { chapters?: VideoChapter[] }) => {
        if (cancelled) return
        setChaptersByVideo((prev) => ({ ...prev, [setVideoId]: data.chapters ?? [] }))
      })
    return () => {
      cancelled = true
    }
  }, [setVideoId, chaptersByVideo])

  function seekToChapter(chapter: VideoChapter) {
    if (duration <= 0) return
    seekToFraction(Math.min((chapter.seconds * 1000) / duration, 1))
  }

  // While the user is dragging the progress bar, this holds where they'd land
  // (0–1). The bar and timestamp preview it, and the actual seek only happens
  // on release so we don't spam the player with seeks mid-drag.
  const [scrubFraction, setScrubFraction] = useState<number | null>(null)

  const displayPosition = scrubFraction !== null ? scrubFraction * duration : position
  const progressPercent = duration > 0 ? (displayPosition / duration) * 100 : 0

  function fractionFromPointer(event: React.PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    return Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1)
  }

  function handleScrubStart(event: React.PointerEvent<HTMLDivElement>) {
    if (!currentTrack || duration <= 0) return
    if (event.pointerType === "mouse" && event.button !== 0) return
    // Capture keeps move/up events coming to the bar even when the pointer
    // strays off it mid-drag.
    event.currentTarget.setPointerCapture(event.pointerId)
    setScrubFraction(fractionFromPointer(event))
  }

  function handleScrubMove(event: React.PointerEvent<HTMLDivElement>) {
    if (scrubFraction === null) return
    setScrubFraction(fractionFromPointer(event))
  }

  function handleScrubEnd(event: React.PointerEvent<HTMLDivElement>) {
    if (scrubFraction === null) return
    seekToFraction(fractionFromPointer(event))
    setScrubFraction(null)
  }

  async function copyLink(url: string, label: string) {
    setMenuOpen(false)
    if (await copyToClipboard(url)) showToast(label)
  }

  async function copyTrackList() {
    setMenuOpen(false)
    const text = tracks
      .map((track, i) => `${i + 1}. ${track.artist ? `${track.name} - ${track.artist}` : track.name}`)
      .join("\n")
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
        if (spotifyUrl) copyLink(spotifyUrl, "copied spotify link")
      } else if (key === "l") {
        copyTrackList()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- copyLink/copyTrackList only close over stable setters/refs
  }, [currentTrack, videoId, spotifyUrl, menuOpen, tracks])

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

  // Bigger tap targets and icons on mobile; the icons are shared with the
  // track list, so they're scaled here rather than in play-icons.
  const controlButtonClass =
    "flex h-10 w-10 max-md:[&_svg]:h-3.5 max-md:[&_svg]:w-3.5 md:h-6 md:w-6 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-gray-300 hover:bg-gray-50"

  return (
    <>
      <div className={`${BAR_HEIGHT} shrink-0`} aria-hidden />

      {/* The bar is pinned to the bottom with no fixed height of its own, so
          when the timestamp panel below the controls expands, the whole bar
          grows upward to reveal it. */}
      <div className="mini-player-bar fixed bottom-0 left-0 right-0 z-50 border-t border-gray-300 bg-white">
        <div className={`mx-auto flex ${BAR_HEIGHT} w-full max-w-3xl flex-col justify-center gap-2 px-6 py-4 md:flex-row md:items-center md:gap-4 md:py-0`}>
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

            <div ref={menuRef} className="relative flex shrink-0 items-center gap-2 md:order-4 md:flex-col md:items-end md:gap-0.5">
              {/* Only for sets whose description has timestamps. Mobile: inline
                  before the copy glyph (the stacked rows have no room below).
                  Desktop: stacked under "for commands", the pair centered in the bar. */}
              {chapters.length > 0 && (
                <button
                  onClick={() => setChaptersOpenFor(chaptersOpen ? null : setVideoId)}
                  aria-expanded={chaptersOpen}
                  className="cursor-pointer whitespace-nowrap font-mono text-[10px] text-gray-500 md:order-last"
                >
                  {chaptersOpen ? "- timestamps" : "+ timestamps"}
                </button>
              )}
              {/* Mobile: no keyboard, so just a small copy glyph that opens
                  the same menu. */}
              <button
                onClick={() => setMenuOpen((open) => !open)}
                aria-label="copy links"
                className="flex h-10 w-10 cursor-pointer items-center justify-center text-gray-500 md:hidden"
              >
                ⧉
              </button>
              <button
                onClick={() => setMenuOpen((open) => !open)}
                className="hidden cursor-pointer items-center gap-1.5 font-mono text-[10px] text-gray-500 md:flex"
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
                    className="flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-1.5 max-md:py-2.5 text-left font-mono text-[10px] text-gray-600 hover:bg-gray-50 disabled:cursor-default disabled:opacity-40"
                  >
                    <span>⧉ cpy youtube link</span>
                    <span className="hidden md:inline">
                      <KeySequence active keys={["Y"]} />
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      if (spotifyUrl) copyLink(spotifyUrl, "copied spotify link")
                    }}
                    disabled={!spotifyUrl}
                    className="flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-1.5 max-md:py-2.5 text-left font-mono text-[10px] text-gray-600 hover:bg-gray-50 disabled:cursor-default disabled:opacity-40"
                  >
                    <span>⧉ cpy spotify link</span>
                    <span className="hidden md:inline">
                      <KeySequence active keys={["S"]} />
                    </span>
                  </button>
                  <button
                    onClick={copyTrackList}
                    disabled={tracks.length === 0}
                    className="flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-1.5 max-md:py-2.5 text-left font-mono text-[10px] text-gray-600 hover:bg-gray-50 disabled:cursor-default disabled:opacity-40"
                  >
                    <span>⧉ cpy track list</span>
                    <span className="hidden md:inline">
                      <KeySequence active keys={["L"]} />
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile row 2: progress + timestamps. */}
          <div className="flex min-w-0 items-center gap-3 md:order-3 md:flex-1">
            <div
              onPointerDown={handleScrubStart}
              onPointerMove={handleScrubMove}
              onPointerUp={handleScrubEnd}
              onPointerCancel={() => setScrubFraction(null)}
              className="h-3 flex-1 cursor-pointer touch-none bg-gray-200"
            >
              <div className="h-full bg-black" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="shrink-0 font-mono text-[10px] text-gray-400">
              {formatMs(displayPosition)} / {formatMs(duration)}
            </div>
          </div>

          {/* Mobile row 3: playback controls, centered. */}
          <div className="flex items-center justify-center gap-3 md:order-2 md:gap-1.5 md:shrink-0 md:justify-start">
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
            <button
              onClick={() => setVideoVisible(!videoVisible)}
              disabled={!videoId || isUnplayable}
              aria-pressed={videoVisible}
              aria-label={videoVisible ? "hide video" : "show video"}
              data-tooltip={videoVisible ? "hide video" : "show video"}
              className={`${controlButtonClass} tooltip tooltip-up disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent ${videoVisible ? "bg-black text-white hover:bg-black" : ""}`}
            >
              <VideoIcon />
            </button>
          </div>
        </div>

        {/* Animating grid-template-rows 0fr → 1fr transitions to the panel's
            natural height without measuring it. */}
        <div
          inert={!chaptersOpen}
          className={`grid transition-[grid-template-rows] duration-300 ease-out ${chaptersOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
        >
          <div className="overflow-hidden">
            {/* Padding lives outside the scroll area so the list scrolls
                edge to edge while still leaving room below it. */}
            <div className="mx-auto w-full max-w-3xl px-6 pt-2 pb-6">
              <div className="max-h-64 overflow-y-auto">
                {chapters.map((chapter) => (
                  <p key={chapter.seconds} className="truncate leading-relaxed">
                    <button
                      onClick={() => seekToChapter(chapter)}
                      className="cursor-pointer font-mono text-xs text-purple-600 hover:underline"
                    >
                      {formatMs(chapter.seconds * 1000)}
                    </button>{" "}
                    {chapter.label}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
