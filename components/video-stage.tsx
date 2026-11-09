"use client"

import { useTrackPlayer, formatTrackTitle } from "@/components/track-player-provider"
import { PlayIcon } from "@/components/play-icons"

/** A video board's stand-in for the album coverflow: a slot the shared
 * YouTube embed gets pinned over while one of this board's videos is
 * playing. The slot's frame (border, padded 16:9 area) mirrors the docked
 * FloatingVideo exactly, so the embed lines up on top of it.
 *
 * Until something plays it shows the first video's thumbnail, and clicking
 * it starts the queue from the top. While a set is popped out into the
 * floating window, it shows that set's thumbnail, and clicking brings the
 * video back in here. */
export default function VideoStage() {
  const {
    tracks,
    currentTrackId,
    setVideoSlot,
    videoDocked,
    videoVisible,
    setVideoVisible,
    playTrack,
  } = useTrackPlayer()

  const first = tracks.find((track) => track.youtubeId)
  if (!first) return null
  const current = tracks.find((track) => track.id === currentTrackId) ?? null
  const shown = current ?? first
  const poppedOut = Boolean(current && videoVisible)

  return (
    <div className="w-full px-6 pt-10 pb-10">
      <div ref={setVideoSlot} className="border border-gray-300 bg-white p-1.5">
        <div className="relative aspect-video w-full bg-black">
          {!videoDocked && (
            <button
              onClick={() => (poppedOut ? setVideoVisible(false) : playTrack(first.id))}
              aria-label={poppedOut ? "bring video back" : `play ${first.name}`}
              className="flex h-full w-full cursor-pointer items-center justify-center"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- remote youtube thumbnail */}
              <img
                src={`https://i.ytimg.com/vi/${shown.youtubeId}/hqdefault.jpg`}
                alt=""
                className={`absolute inset-0 h-full w-full object-cover ${poppedOut ? "opacity-40" : ""}`}
              />
              {poppedOut ? (
                <span className="relative font-mono text-[10px] text-white">
                  playing in mini player · click to bring back
                </span>
              ) : (
                <span className="relative flex h-10 w-10 items-center justify-center rounded-sm border border-gray-300 bg-white">
                  <PlayIcon />
                </span>
              )}
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 pt-1">
        <p className="min-w-0 flex-1 truncate text-xs text-gray-500">{formatTrackTitle(shown)}</p>
        {videoDocked && (
          <button
            onClick={() => setVideoVisible(true)}
            className="shrink-0 cursor-pointer font-mono text-[10px] text-gray-500 hover:text-black"
          >
            ⧉ pop out
          </button>
        )}
      </div>
    </div>
  )
}
