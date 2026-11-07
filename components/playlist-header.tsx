"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useRef, useState, type ReactNode } from "react"

type PlaylistHeaderProps = {
  title: string
  creator: { name: string; avatarUrl: string | null }
  tags: string[]
  description: string | null
  link: string | null
  children: ReactNode
}

// Default matches --sidebar-width in globals.css (21.5rem).
const DEFAULT_SIDEBAR_WIDTH = 344
const MIN_SIDEBAR_WIDTH = 240
const MAX_SIDEBAR_WIDTH = 760
// Always leave at least this much room for the track list.
const MIN_CONTENT_WIDTH = 420
const KEYBOARD_STEP = 24
const STORAGE_KEY = "sidebar-width"

function clampSidebarWidth(width: number) {
  const max = Math.max(
    DEFAULT_SIDEBAR_WIDTH,
    Math.min(MAX_SIDEBAR_WIDTH, window.innerWidth - MIN_CONTENT_WIDTH)
  )
  return Math.round(Math.min(Math.max(width, MIN_SIDEBAR_WIDTH), max))
}

function applySidebarWidth(width: number) {
  document.documentElement.style.setProperty("--sidebar-width", `${width}px`)
}

/** Drag-to-resize for the desktop sidebar. The width lives in a CSS variable
 * on <html> so the sidebar and the content's left margin stay in lockstep,
 * and it's remembered across visits. */
function useSidebarWidth() {
  const [width, setWidth] = useState(DEFAULT_SIDEBAR_WIDTH)

  useEffect(() => {
    let stored: number | null = null
    try {
      stored = Number(localStorage.getItem(STORAGE_KEY)) || null
    } catch {}
    if (stored) setWidth(clampSidebarWidth(stored))

    const onResize = () => setWidth((current) => clampSidebarWidth(current))
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  useEffect(() => {
    applySidebarWidth(width)
    try {
      localStorage.setItem(STORAGE_KEY, String(width))
    } catch {}
  }, [width])

  return [width, (next: number) => setWidth(clampSidebarWidth(next))] as const
}

function SidebarResizeHandle({
  width,
  onResize,
}: {
  width: number
  onResize: (width: number) => void
}) {
  const dragRef = useRef<{ pointerX: number; startWidth: number } | null>(null)
  const [dragging, setDragging] = useState(false)

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { pointerX: event.clientX, startWidth: width }
    document.documentElement.dataset.resizingSidebar = ""
    setDragging(true)
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (drag) onResize(drag.startWidth + event.clientX - drag.pointerX)
  }

  function onPointerUp() {
    dragRef.current = null
    delete document.documentElement.dataset.resizingSidebar
    setDragging(false)
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="resize sidebar"
      aria-valuenow={width}
      tabIndex={0}
      title="drag to resize · double-click to reset"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={() => onResize(DEFAULT_SIDEBAR_WIDTH)}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") onResize(width - KEYBOARD_STEP)
        else if (event.key === "ArrowRight") onResize(width + KEYBOARD_STEP)
      }}
      style={{ left: "var(--sidebar-width)" }}
      className="group fixed top-0 bottom-0 z-20 hidden w-3 -translate-x-1/2 cursor-col-resize touch-none justify-center outline-none md:flex"
    >
      {/* Sits over the sidebar's 1px border; darkens on hover/drag. */}
      <div
        className={`h-full w-px transition-colors group-hover:bg-gray-500 group-focus-visible:bg-gray-500 ${dragging ? "bg-gray-500" : "bg-transparent"}`}
      />
    </div>
  )
}

export default function PlaylistHeader({
  title,
  creator,
  tags,
  description,
  link,
  children,
}: PlaylistHeaderProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useSidebarWidth()

  useEffect(() => {
    const onScroll = () => setCollapsed(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <>
      <SidebarResizeHandle width={sidebarWidth} onResize={setSidebarWidth} />
      <div
        className={`playlist-sidebar sticky top-0 z-20 flex items-center justify-between border-b border-gray-300 bg-white md:fixed md:top-0 md:left-0 md:z-10 md:w-[var(--sidebar-width)] md:flex-col md:items-stretch md:justify-start md:overflow-y-auto md:border-b-0 md:border-r md:border-gray-300 md:bg-white md:py-6 ${
          collapsed ? "py-4" : "py-2"
        }`}
      >
        <div className="px-6">
          <p className="text-sm">
            <Link href="/" className="font-mono link">
              PLAYLISTS4U
            </Link>{" "}
            / <span className="font-semibold">{title}</span>
          </p>
          {collapsed ? (
            <p className="mt-1 flex items-center gap-1.5 text-xs md:hidden">
              <span className="text-gray-500">by</span>
              {creator.avatarUrl ? (
                <Image
                  src={creator.avatarUrl}
                  alt={creator.name}
                  width={16}
                  height={16}
                  className="h-4 w-4 shrink-0 rounded-full object-cover"
                />
              ) : null}
              <span>{creator.name}</span>
            </p>
          ) : null}
          <div
            className={`${collapsed ? "hidden md:grid" : "grid"} grid-cols-[5rem_1fr] items-center gap-y-1 pt-3 text-xs`}
          >
            <span className="text-gray-500">author</span>
            <div className="flex items-center gap-2">
              {creator.avatarUrl ? (
                <Image
                  src={creator.avatarUrl}
                  alt={creator.name}
                  width={20}
                  height={20}
                  className="h-5 w-5 shrink-0 rounded-full object-cover"
                />
              ) : null}
              <span>{creator.name}</span>
            </div>
            <span className="text-gray-500">tags</span>
            <span>{tags.length > 0 ? tags.join(" / ") : "--"}</span>
            <span className="text-gray-500">description</span>
            <span>{description || "--"}</span>
            <span className="text-gray-500">link</span>
            {link ? (
              <a href={link} target="_blank" rel="noopener noreferrer" className="link truncate">
                view on are.na
              </a>
            ) : (
              <span>--</span>
            )}
          </div>
        </div>
        {children}
      </div>
    </>
  )
}
