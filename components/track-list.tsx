"use client"

import { useEffect, useRef, useState } from "react"
import { useTrackPlayer } from "@/components/track-player-provider"

type Track = { id: string; name: string; artist: string }

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch (error) {
    console.error("copy failed:", error)
  }
}

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return el?.tagName === "INPUT" || el?.tagName === "TEXTAREA" || Boolean(el?.isContentEditable)
}

/**
 * A single key in a shortcut hint, e.g. the "C" or "Y" in "C then Y". Always
 * a pill, but a faint one that fades in with the rest of the row on hover —
 * only once the row is actually selected does it get real contrast.
 */
function KeyBadge({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`rounded px-1 py-px leading-none ${active ? "bg-gray-200 text-gray-400" : "bg-gray-100"}`}
    >
      {children}
    </span>
  )
}

/** A shortcut hint made of one or more keys pressed in sequence: "C then Y". */
function KeySequence({ active, keys }: { active: boolean; keys: string[] }) {
  return (
    <span className="flex items-center gap-1">
      {keys.map((key, index) => (
        <span key={index} className="flex items-center gap-1">
          {index > 0 && <span>then</span>}
          <KeyBadge active={active}>{key}</KeyBadge>
        </span>
      ))}
    </span>
  )
}

/** Experimental alternate styling for the track table: a plain numbered
 * list where clicking a row reveals its actions (play, copy links) inline. */
export default function TrackList({ tracks }: { tracks: Track[] }) {
  const { matches, unplayableTrackIds, currentTrackId, isPlaying, playTrack } = useTrackPlayer()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const pendingRef = useRef(false)

  // "c" arms a pending command; whichever of y/s comes next (within a beat)
  // fires it, scoped to whichever row is currently selected. Any other key
  // — or waiting too long — disarms it. Not a held chord: c, then y or s.
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
      if (!selectedId) return

      if (key === "y") {
        const match = matches[selectedId]
        const videoId = match && match !== "loading" && match !== "error" ? match.videoId : null
        if (videoId) copyToClipboard(`https://www.youtube.com/watch?v=${videoId}`)
      } else if (key === "s") {
        copyToClipboard(`https://open.spotify.com/track/${selectedId}`)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      disarm()
    }
  }, [selectedId, matches])

  return (
    <ol className="list-none px-6 text-s">
      {tracks.map((track, index) => {
        const match = matches[track.id]
        const isLoading = match === "loading" || match === undefined
        const isUnplayable = match === "error" || unplayableTrackIds.has(track.id)
        const videoId = match && match !== "loading" && match !== "error" ? match.videoId : null
        const isSelected = selectedId === track.id
        const showPause = currentTrackId === track.id && isPlaying

        const playDisabled = isLoading || isUnplayable
        const playTooltip = isUnplayable ? "Playback currently unavailable" : undefined

        return (
          <li key={track.id}>
            <div
              onClick={() => setSelectedId(isSelected ? null : track.id)}
              className="group flex flex-wrap items-center gap-x-2 gap-y-0.5 cursor-pointer"
            >
              <span>
                {index + 1}. {track.name} <span>-</span> {track.artist}
              </span>

              <span
                className={`flex items-center gap-x-3 font-mono text-[10px] transition-opacity ${
                  isSelected
                    ? "text-gray-500"
                    : "pointer-events-none text-gray-400 opacity-0 group-hover:opacity-85"
                }`}
              >
                <button
                  onClick={(event) => {
                    event.stopPropagation()
                    if (!playDisabled) playTrack(track.id)
                  }}
                  disabled={playDisabled}
                  data-tooltip={playTooltip}
                  className={`flex cursor-pointer items-center gap-1 disabled:cursor-not-allowed ${playTooltip ? "tooltip" : ""}`}
                >
                  <span
                    className={`${isSelected ? "text-gray-500" : ""} ${playDisabled ? "opacity-40" : ""}`}
                  >
                    {showPause ? "❚❚" : "▶"} play
                  </span>
                </button>

                <button
                  onClick={(event) => {
                    event.stopPropagation()
                    if (videoId) copyToClipboard(`https://www.youtube.com/watch?v=${videoId}`)
                  }}
                  disabled={!videoId}
                  className="flex cursor-pointer items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className={isSelected ? "text-gray-500" : undefined}>⧉ cpy youtube link</span>
                  <KeySequence active={isSelected} keys={["C", "Y"]} />
                </button>

                <button
                  onClick={(event) => {
                    event.stopPropagation()
                    copyToClipboard(`https://open.spotify.com/track/${track.id}`)
                  }}
                  className="flex cursor-pointer items-center gap-1.5"
                >
                  <span className={isSelected ? "text-gray-500" : undefined}>⧉ cpy spotify link</span>
                  <KeySequence active={isSelected} keys={["C", "S"]} />
                </button>
              </span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
