"use client"

import { useEffect, useRef, useState } from "react"

/** Header button that opens a popover which stays open until you click
 * elsewhere. */
export default function AboutButton() {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((isOpen) => !isOpen)}
        className="cursor-pointer text-xs underline"
      >
        about
      </button>
      {open && (
        <div className="absolute top-full right-0 z-50 mt-2 w-60 border border-black bg-white p-3 text-xs shadow-md">
           <p>a site that turns your Are.na channels into playlist moodboards  &lt;3. view your own by adding a channel to <a target="_blank" className="link" href="https://www.are.na/jade-s-d2yaygzp528/playlists4u">playlists4u</a>. happy listening x</p>
           <p className="pt-3">
        built 
          (づ˶•༝•˶)づ♡,
        {" "}
        <a href="https://jadeshenker.dev/" target="_blank" className="link">
          jade
        </a>
      </p>
        </div>
      )}
    </div>
  )
}
