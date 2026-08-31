"use client"

import { useTrackPlayer } from "@/components/track-player-provider"

export default function TrackLinks({ trackId }: { trackId: string }) {
  const { matches } = useTrackPlayer()
  const match = matches[trackId]
  const isLoading = match === "loading" || match === undefined
  const videoId = match && match !== "loading" && match !== "error" ? match.videoId : null

  return (
    <span>
      <a
        href={`https://open.spotify.com/track/${trackId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="link"
      >
        spotify
      </a>
      {" | "}
      {isLoading ? (
        <span className="text-gray-400 italic">searching...</span>
      ) : videoId ? (
        <a
          href={`https://www.youtube.com/watch?v=${videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="link"
        >
          youtube
        </a>
      ) : (
        <span className="text-gray-400">youtube</span>
      )}
    </span>
  )
}
