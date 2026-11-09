"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"

type Position = { left: number; top: number }
type DockRect = { left: number; top: number; width: number }

/** Where `el` sits in document coordinates, kept current as layout shifts.
 * Document coordinates + `position: absolute` means scrolling needs no
 * updates. A size observer on `el` alone isn't enough: dragging the sidebar
 * can move the slot sideways without resizing it, so we also re-measure on
 * any ancestor resize and on every change to the root element's inline
 * style (where the sidebar writes `--sidebar-width`). */
function useDockRect(el: HTMLElement | null): DockRect | null {
  const [rect, setRect] = useState<DockRect | null>(null)

  useLayoutEffect(() => {
    if (!el) {
      setRect(null)
      return
    }
    function measure() {
      if (!el) return
      const box = el.getBoundingClientRect()
      const next = {
        left: box.left + window.scrollX,
        top: box.top + window.scrollY,
        width: box.width,
      }
      setRect((prev) =>
        prev &&
        prev.left === next.left &&
        prev.top === next.top &&
        prev.width === next.width
          ? prev
          : next
      )
    }
    measure()

    const resizeObserver = new ResizeObserver(measure)
    for (let node: HTMLElement | null = el; node; node = node.parentElement) {
      resizeObserver.observe(node)
    }
    const mutationObserver = new MutationObserver(measure)
    mutationObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["style"] })
    window.addEventListener("resize", measure)
    return () => {
      resizeObserver.disconnect()
      mutationObserver.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [el])

  return rect
}

// Keep the window at least this far inside the viewport edges while dragging.
const EDGE_MARGIN = 8

/** The YouTube embed's container. Hidden, it parks the iframe off-screen
 * (audio-only playback); visible, it's a small framed window with a title bar
 * that can be dragged anywhere on screen.
 *
 * Only CSS changes between the two states — the iframe is never moved in the
 * DOM, since that would reload it and restart playback. For the same reason
 * every element here is always rendered (just hidden), so React never has
 * to insert a node next to the div the IFrame API replaced with its iframe. */
export default function FloatingVideo({
  videoRef,
  visible: floatingVisible,
  dockTarget,
  title,
  onClose,
}: {
  videoRef: React.RefObject<HTMLDivElement | null>
  visible: boolean
  // When set, the embed is pinned over this element (a video board's
  // placeholder) instead of floating — docked wins over floating.
  dockTarget: HTMLElement | null
  title: string
  onClose: () => void
}) {
  const windowRef = useRef<HTMLDivElement>(null)
  // null = the default spot, bottom-right just above the mini player bar
  // (bottom-40 / md:bottom-20 — keep in sync with BAR_HEIGHT in mini-player). Once
  // dragged, it's pinned to explicit coordinates for the rest of the session.
  const [position, setPosition] = useState<Position | null>(null)
  const dragRef = useRef<{ pointerX: number; pointerY: number; start: Position } | null>(null)
  const [dragging, setDragging] = useState(false)
  const dockRect = useDockRect(dockTarget)
  const docked = dockRect !== null
  const visible = floatingVisible && !docked

  function clamp(next: Position): Position {
    const rect = windowRef.current?.getBoundingClientRect()
    const width = rect?.width ?? 0
    const height = rect?.height ?? 0
    return {
      left: Math.min(Math.max(next.left, EDGE_MARGIN), window.innerWidth - width - EDGE_MARGIN),
      top: Math.min(Math.max(next.top, EDGE_MARGIN), window.innerHeight - height - EDGE_MARGIN),
    }
  }

  // Keep a dragged window on screen when the viewport shrinks.
  useEffect(() => {
    if (!position) return
    const onResize = () => setPosition((current) => (current ? clamp(current) : current))
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- clamp only reads refs/window
  }, [position === null])

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    // Let the close button click through instead of starting a drag.
    if ((event.target as HTMLElement).closest("button")) return
    const rect = windowRef.current?.getBoundingClientRect()
    if (!rect) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      start: { left: rect.left, top: rect.top },
    }
    setDragging(true)
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag) return
    setPosition(
      clamp({
        left: drag.start.left + event.clientX - drag.pointerX,
        top: drag.start.top + event.clientY - drag.pointerY,
      })
    )
  }

  function onPointerUp() {
    dragRef.current = null
    setDragging(false)
  }

  // Docked is a plain bordered, padded 16:9 frame (VideoStage draws the
  // identical frame as the slot, and captions it underneath); floating adds
  // the draggable title bar and shadow on top of that.
  const framed = visible || docked

  return (
    <div
      ref={windowRef}
      style={
        dockRect
          ? { left: dockRect.left, top: dockRect.top, width: dockRect.width }
          : visible && position
            ? { left: position.left, top: position.top }
            : undefined
      }
      className={
        docked
          ? "absolute z-10 border border-gray-300 bg-white"
          : visible
            ? `fixed z-50 w-[min(360px,calc(100vw-2rem))] border border-gray-300 bg-white shadow-md ${position ? "" : "bottom-40 right-4 md:bottom-20"}`
            : "fixed left-[-9999px] top-0"
      }
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={`${visible ? "flex" : "hidden"} h-7 touch-none select-none items-center gap-2 border-b border-gray-300 pl-2 font-mono text-[10px] text-gray-500 ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
      >
        <span aria-hidden className="tracking-[-0.2em] text-gray-400">
          ⋮⋮
        </span>
        <span className="min-w-0 flex-1 truncate">{title}</span>
        <button
          onClick={onClose}
          aria-label="hide video"
          className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center text-base text-gray-600 hover:bg-gray-50"
        >
          ×
        </button>
      </div>
      <div className={framed ? "p-1.5" : undefined}>
        {/* While dragging, the iframe would swallow pointer events whenever
            the cursor passes over it, stalling the drag. */}
        <div
          className={`${framed ? "aspect-video w-full bg-black" : "h-[113px] w-[200px]"} [&_iframe]:h-full [&_iframe]:w-full ${dragging ? "[&_iframe]:pointer-events-none" : ""}`}
        >
          <div ref={videoRef} />
        </div>
      </div>
    </div>
  )
}
