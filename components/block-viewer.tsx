"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useBlockViewer } from "@/components/block-viewer-provider"
import type { ArenaContentBlock } from "@/lib/arena"
import { formatAddedAt } from "@/lib/format"

const MOBILE_QUERY = "(max-width: 47.9375rem)"

// How far the mobile sheet must be dragged down before letting go closes it.
const DISMISS_DISTANCE = 80

/** Shows the block last clicked in the content grid: its image/text, title,
 * description, and the date it was added to the channel. Nothing is shown
 * until a block is clicked. On desktop it expands inside the sidebar; on
 * mobile it's a bottom sheet over a backdrop, dismissed by tapping the
 * backdrop or dragging the sheet down. */
export default function BlockViewer() {
  const { selectedBlock, open, close } = useBlockViewer()
  const [dragStartY, setDragStartY] = useState<number | null>(null)
  const [dragOffset, setDragOffset] = useState(0)
  const [mounted, setMounted] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  // The sheet is portaled to <body> (client-only) so it isn't trapped in the
  // sticky header's stacking context, below the mini player.
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, close])

  // Lock page scroll behind the mobile sheet. Set on both <html> and <body>
  // since iOS Safari only honors it on <html>.
  useEffect(() => {
    if (!open || !window.matchMedia(MOBILE_QUERY).matches) return
    const { documentElement, body } = document
    const previous = [documentElement.style.overflow, body.style.overflow]
    documentElement.style.overflow = "hidden"
    body.style.overflow = "hidden"
    return () => {
      documentElement.style.overflow = previous[0]
      body.style.overflow = previous[1]
    }
  }, [open])

  // Dragging works from anywhere on the sheet, but only while its content is
  // scrolled to the top — otherwise a downward swipe scrolls the content.
  function onTouchStart(event: React.TouchEvent) {
    if ((contentRef.current?.scrollTop ?? 0) > 0) return
    setDragStartY(event.touches[0].clientY)
  }

  function onTouchMove(event: React.TouchEvent) {
    if (dragStartY === null) return
    setDragOffset(Math.max(0, event.touches[0].clientY - dragStartY))
  }

  function onTouchEnd() {
    if (dragOffset > DISMISS_DISTANCE) close()
    setDragStartY(null)
    setDragOffset(0)
  }

  return (
    <>
      {/* Mobile: bottom sheet */}
      {mounted &&
        createPortal(
          <div className="md:hidden">
            <div
              onClick={close}
              aria-hidden
              className={`fixed inset-0 z-[60] touch-none bg-black/30 transition-opacity duration-300 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
            />
            <div
              role="dialog"
              aria-modal
              aria-label="block viewer"
              inert={!open}
              style={{ transform: open ? `translateY(${dragOffset}px)` : "translateY(100%)" }}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              onTouchCancel={onTouchEnd}
              className={`fixed inset-x-0 bottom-0 z-[60] flex max-h-[95dvh] flex-col border-t border-gray-300 bg-white pb-[env(safe-area-inset-bottom)] ${dragStartY === null ? "transition-transform duration-300 ease-out" : ""}`}
            >
              <div className="shrink-0 touch-none py-3">
                <div className="mx-auto h-1 w-10 rounded-full bg-gray-300" />
              </div>
              <div
                ref={contentRef}
                className="min-h-0 overflow-y-auto overscroll-contain px-3 pb-3"
              >
                {selectedBlock && <BlockDetails block={selectedBlock} />}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Desktop: expands in place inside the sidebar */}
      <div
        inert={!open}
        className={`hidden w-full transition-[grid-template-rows] duration-300 ease-out md:grid ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="min-h-0 overflow-hidden">
          {selectedBlock && (
            <div className="border border-gray-300">
              <div className="flex items-center justify-end pl-3 text-xs">
                <CloseButton onClick={close} className="h-7 w-7" />
              </div>
              <BlockDetails block={selectedBlock} textClassName="px-3 pb-3" />
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function CloseButton({ onClick, className }: { onClick: () => void; className: string }) {
  return (
    <button
      onClick={onClick}
      aria-label="close block viewer"
      className={`flex cursor-pointer items-center justify-center text-base ${className}`}
    >
      ×
    </button>
  )
}

function BlockDetails({
  block,
  textClassName = "",
}: {
  block: ArenaContentBlock
  textClassName?: string
}) {
  return (
    <div className="flex flex-col gap-2 text-xs">
      <div className="flex aspect-square items-center justify-center overflow-hidden bg-gray-50">
        {block.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element -- natural size is unknown ahead of time
          <img
            src={block.imageUrl}
            alt={block.title ?? ""}
            className="h-full w-full object-contain"
          />
        ) : (
          <p className="h-full w-full overflow-hidden whitespace-pre-line p-2">{block.text}</p>
        )}
      </div>
      <div className={`flex flex-col gap-2 ${textClassName}`}>
        <p className="font-semibold">{block.title || "--"}</p>
        <p className="text-gray-500">{block.description || "--"}</p>
        <p className="text-gray-400">added {formatAddedAt(block.addedAt)}</p>
      </div>
    </div>
  )
}
