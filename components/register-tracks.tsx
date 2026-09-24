"use client"

import { useEffect } from "react"
import { useTrackPlayer, type PlayerTrack } from "@/components/track-player-provider"

/** Renders nothing — just tells the shared player (mounted once in the root
 * layout) which tracks this playlist page has, so next/previous and the
 * coverflow know what to step through. */
export default function RegisterTracks({ tracks }: { tracks: PlayerTrack[] }) {
  const { registerTracks } = useTrackPlayer()

  useEffect(() => {
    registerTracks(tracks)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks])

  return null
}
