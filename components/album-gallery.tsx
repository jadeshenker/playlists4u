"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { useTrackPlayer, type PlayerTrack } from "@/components/track-player-provider"

const ACTIVE_SIZE = 132
const MIN_SIZE = 56
// Fixed spacing between cover centers. Deliberately smaller than
// ACTIVE_SIZE so the active cover overlaps its neighbors (z-index keeps it
// on top) — that overlap is what gives the strip its coverflow look.
const SLOT_WIDTH = 76
// A pointer has to travel this far before a press counts as a drag rather
// than a click-to-play.
const DRAG_THRESHOLD_PX = 6
const SNAP_TRANSITION = "transform 320ms cubic-bezier(0.22, 1, 0.36, 1)"

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
      className={`flex shrink-0 items-center justify-center overflow-hidden bg-gray-50 transition-[width,height,opacity] duration-150 ${
        isUnplayable ? "cursor-not-allowed" : "cursor-pointer"
      }`}
      style={{ width: size, height: size, opacity }}
    >
      {track.albumArt ? (
        <Image
          src={track.albumArt}
          alt={track.name}
          width={ACTIVE_SIZE}
          height={ACTIVE_SIZE}
          draggable={false}
          className="h-full w-full select-none object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <div className="h-px w-6 bg-gray-300" />
        </div>
      )}
    </button>
  )
}

type DragState = { startX: number; startFocusedIndex: number; dragging: boolean }

/**
 * A coverflow-style, click-and-drag carousel of every album in the
 * playlist. The currently playing track normally sits centered/largest,
 * but dragging (or a horizontal scroll/wheel gesture) lets the user browse
 * the strip independently — covers grow smoothly as they approach center —
 * without interrupting playback. Releasing snaps to the nearest cover;
 * clicking a cover (a press that never crossed the drag threshold) plays it.
 */
export default function AlbumGallery() {
  const { tracks, matches, unplayableTrackIds, currentTrackId, playTrack } = useTrackPlayer()

  const activeIndex = Math.max(
    0,
    tracks.findIndex((track) => track.id === currentTrackId)
  )

  const [focusedIndex, setFocusedIndex] = useState(activeIndex)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffsetPx, setDragOffsetPx] = useState(0)

  const dragStateRef = useRef<DragState | null>(null)
  const wheelAccumRef = useRef(0)

  // Follow whatever's actually playing, unless the user is mid-drag away
  // from it — a "next"/"previous" press, an ended-track auto-advance, or a
  // click elsewhere in the app should still recenter the strip.
  useEffect(() => {
    if (!dragStateRef.current?.dragging) setFocusedIndex(activeIndex)
  }, [activeIndex])

  // Keep focus in range if the registered track list changes size.
  useEffect(() => {
    setFocusedIndex((index) => Math.min(index, Math.max(tracks.length - 1, 0)))
  }, [tracks.length])

  if (tracks.length === 0) return null

  const liveCenter = isDragging ? focusedIndex - dragOffsetPx / SLOT_WIDTH : focusedIndex

  function isTrackUnplayable(track: PlayerTrack) {
    const match = matches[track.id]
    return match === "error" || unplayableTrackIds.has(track.id)
  }

  function settleDrag(finalDeltaX: number, startFocusedIndex: number) {
    const rawCenter = startFocusedIndex - finalDeltaX / SLOT_WIDTH
    const snapped = Math.round(Math.min(Math.max(rawCenter, 0), tracks.length - 1))
    setFocusedIndex(snapped)
    setDragOffsetPx(0)
    setIsDragging(false)
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return

    const state: DragState = { startX: event.clientX, startFocusedIndex: focusedIndex, dragging: false }
    dragStateRef.current = state

    function handleMove(moveEvent: PointerEvent) {
      const deltaX = moveEvent.clientX - state.startX
      if (!state.dragging) {
        if (Math.abs(deltaX) < DRAG_THRESHOLD_PX) return
        state.dragging = true
        setIsDragging(true)
      }
      moveEvent.preventDefault()
      setDragOffsetPx(deltaX)
    }

    function handleUp(upEvent: PointerEvent) {
      window.removeEventListener("pointermove", handleMove)
      window.removeEventListener("pointerup", handleUp)
      window.removeEventListener("pointercancel", handleUp)
      dragStateRef.current = null

      if (state.dragging) {
        settleDrag(upEvent.clientX - state.startX, state.startFocusedIndex)
        // The pointerup that ends a real drag still fires a trailing click
        // on whatever's underneath it — swallow just that one so releasing
        // a drag never doubles as "play this cover".
        window.addEventListener(
          "click",
          (clickEvent) => {
            clickEvent.preventDefault()
            clickEvent.stopPropagation()
          },
          { capture: true, once: true }
        )
      }
    }

    window.addEventListener("pointermove", handleMove)
    window.addEventListener("pointerup", handleUp)
    window.addEventListener("pointercancel", handleUp)
  }

  function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
    if (delta === 0) return
    event.preventDefault()

    wheelAccumRef.current += delta
    let step = 0
    while (Math.abs(wheelAccumRef.current) >= SLOT_WIDTH) {
      step += wheelAccumRef.current > 0 ? 1 : -1
      wheelAccumRef.current -= Math.sign(wheelAccumRef.current) * SLOT_WIDTH
    }
    if (step === 0) return

    setFocusedIndex((index) => Math.min(Math.max(index + step, 0), tracks.length - 1))
  }

  const trackOffsetPx = (liveCenter + 0.5) * SLOT_WIDTH

  return (
    <div className="w-full px-6 pt-10 pb-10">
      <div
        className="relative w-full touch-pan-y select-none overflow-hidden"
        style={{ height: ACTIVE_SIZE, cursor: isDragging ? "grabbing" : "grab" }}
        onPointerDown={handlePointerDown}
        onWheel={handleWheel}
        onDragStart={(event) => event.preventDefault()}
      >
        <div
          className="absolute top-0 flex h-full items-end"
          style={{
            left: "50%",
            transform: `translateX(-${trackOffsetPx}px)`,
            transition: isDragging ? "none" : SNAP_TRANSITION,
          }}
        >
          {tracks.map((track, index) => {
            const distance = Math.abs(index - liveCenter)
            return (
              <div
                key={track.id}
                className="flex shrink-0 items-end justify-center"
                style={{ width: SLOT_WIDTH, zIndex: Math.round(1000 - distance * 10) }}
              >
                <Cover
                  track={track}
                  distance={distance}
                  isUnplayable={isTrackUnplayable(track)}
                  onPlay={() => playTrack(track.id)}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
