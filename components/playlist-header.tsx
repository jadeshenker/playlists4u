"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { useBlockViewer } from "@/components/block-viewer-provider"

type PlaylistHeaderProps = {
  title: string
  creator: { name: string; avatarUrl: string | null }
  tags: string[]
  description: string | null
  link: string | null
  children: ReactNode
}

export default function PlaylistHeader({ title, creator, tags, description, link, children }: PlaylistHeaderProps) {
  const { selectedBlock, collapsed: viewerCollapsed } = useBlockViewer()
  const [scrolled, setScrolled] = useState(false)
  const headerRef = useRef<HTMLDivElement>(null)

  const collapsed = scrolled || (selectedBlock !== null && !viewerCollapsed)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      document.documentElement.style.setProperty("--playlist-header-height", `${entry.contentRect.height}px`)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={headerRef}
      className={`playlist-sidebar sticky top-0 z-20 flex items-center justify-between border-b border-gray-300 bg-white md:fixed md:top-0 md:left-0 md:z-10 md:w-86 md:flex-col md:items-stretch md:justify-start md:overflow-y-auto md:border-b-0 md:border-r md:border-gray-300 md:bg-white md:py-6 ${
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
  )
}
