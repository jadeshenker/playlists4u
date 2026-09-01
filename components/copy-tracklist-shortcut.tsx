"use client"

import { useEffect, useRef } from "react"
import { useToast } from "@/components/toast-provider"
import KeySequence from "@/components/key-sequence"
import { copyToClipboard } from "@/lib/clipboard"
import { isTypingTarget } from "@/lib/dom"

type Track = { name: string; artist: string }

/** Header-level "C then L" shortcut that copies the whole numbered track
 * list (title - artist) to the clipboard — clickable too, not just a
 * keyboard hint. Standing/always live, unlike the per-row copy shortcuts
 * which only light up once their row is selected. */
export default function CopyTracklistShortcut({ tracks }: { tracks: Track[] }) {
  const { showToast } = useToast()
  const pendingRef = useRef(false)

  async function copyTrackList() {
    const text = tracks.map((track, i) => `${i + 1}. ${track.name} - ${track.artist}`).join("\n")
    if (await copyToClipboard(text)) showToast("copied track list")
  }

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

      if (key === "l") copyTrackList()
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      disarm()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- copyTrackList only closes over stable setters/refs
  }, [])

  return (
    <button
      onClick={copyTrackList}
      className="flex cursor-pointer items-center gap-1.5 font-mono text-[10px] text-gray-500"
    >
      <KeySequence active keys={["C", "L"]} />
      <span>cpy track list</span>
    </button>
  )
}
