"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import KeySequence from "@/components/key-sequence"
import { isTypingTarget } from "@/lib/dom"

/** Header-level "C then H" shortcut that goes back to the playlist index —
 * clickable too, not just a keyboard hint. Standing/always live. */
export default function GoHomeShortcut() {
  const router = useRouter()
  const pendingRef = useRef(false)

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

      if (key === "h") router.push("/")
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      disarm()
    }
  }, [router])

  return (
    <button
      onClick={() => router.push("/")}
      className="flex cursor-pointer items-center gap-1.5 font-mono text-[10px] text-gray-500"
    >
      <KeySequence active keys={["C", "H"]} />
      <span>go home</span>
    </button>
  )
}
