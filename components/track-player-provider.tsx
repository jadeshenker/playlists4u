"use client"

import { createContext, useContext, useEffect, useRef, useState } from "react"
import { isTypingTarget } from "@/lib/dom"
import FloatingVideo from "@/components/floating-video"

export type YoutubeMatch = { videoId: string; title: string } | null

// "loading": search in flight. "error": the search itself failed (e.g. quota
// exceeded) — distinct from a `null` match, which means we searched fine and
// genuinely found nothing.
export type MatchState = YoutubeMatch | "loading" | "error"

export type PlayerTrack = {
  id: string
  uri: string
  name: string
  artist: string
  albumArt: string | null
  // Set for entries that *are* a YouTube video (e.g. a DJ set on a video
  // board) — played directly, with no Spotify track or match lookup behind it.
  youtubeId?: string
}

/** "Name — Artist", or just the name when there's no artist (video entries). */
export function formatTrackTitle(track: PlayerTrack): string {
  return track.artist ? `${track.name} — ${track.artist}` : track.name
}

type TrackPlayerContextValue = {
  // The currently displayed playlist's tracks, in order — used for coverflow
  // and for stepping to the next/previous track.
  tracks: PlayerTrack[]
  // The actually-playing (or last-played) track, looked up across every
  // playlist the player has ever seen — stays populated even after
  // navigating away from the playlist it came from.
  currentTrack: PlayerTrack | null
  matches: Record<string, MatchState | undefined>
  // Tracks whose embed actually failed at play time (e.g. the owner blocks
  // embedded playback on this domain) — distinct from `matches`, since the
  // video is a real, valid match; it just can't play here. The "youtube"
  // link should still work fine since that opens youtube.com directly.
  unplayableTrackIds: Set<string>
  currentTrackId: string | null
  isPlaying: boolean
  position: number
  duration: number
  // Called by whichever playlist page is currently mounted, so the shared
  // player knows what "next"/"previous" should step through and can start
  // resolving youtube matches for any tracks it hasn't seen yet.
  registerTracks: (tracks: PlayerTrack[]) => void
  playTrack: (trackId: string) => void
  togglePlayPause: () => void
  pause: () => void
  // Whether the (normally off-screen) YouTube embed is shown as a floating
  // video above the mini player, instead of playing audio-only.
  videoVisible: boolean
  setVideoVisible: (visible: boolean) => void
  // A video board's in-page placeholder. While it's mounted and one of that
  // board's videos is current, the embed is pinned over it instead of
  // floating or hiding.
  setVideoSlot: (el: HTMLDivElement | null) => void
  videoDocked: boolean
  next: () => void
  previous: () => void
  seekToFraction: (fraction: number) => void
}

const TrackPlayerContext = createContext<TrackPlayerContextValue | null>(null)

export function useTrackPlayer() {
  const context = useContext(TrackPlayerContext)
  if (!context) throw new Error("useTrackPlayer must be used inside TrackPlayerProvider")
  return context
}

function isPlayableMatch(match: MatchState | undefined): match is { videoId: string; title: string } {
  return Boolean(match) && match !== "loading" && match !== "error"
}

type YoutubePlayerInstance = {
  loadVideoById: (videoId: string) => void
  playVideo: () => void
  pauseVideo: () => void
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
  getCurrentTime: () => number
  getDuration: () => number
}
type YoutubePlayerOptions = {
  height: string
  width: string
  playerVars?: Record<string, string | number>
  events: {
    onReady: () => void
    onStateChange: (event: { data: number }) => void
    onError: (event: { data: number }) => void
  }
}

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void
    YT?: { Player: new (element: HTMLElement, options: YoutubePlayerOptions) => YoutubePlayerInstance }
  }
}

// YouTube player states: https://developers.google.com/youtube/iframe_api_reference#Playback_status
const YT_STATE_ENDED = 0
const YT_STATE_PLAYING = 1
const YT_STATE_PAUSED = 2
const PROGRESS_POLL_MS = 400

// The IFrame API only ever fires its "ready" callback once per page load,
// so cache the promise at module scope to reuse across client-side
// navigations between playlist pages.
let youtubeApiPromise: Promise<void> | null = null

function loadYoutubeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve()
  if (youtubeApiPromise) return youtubeApiPromise

  youtubeApiPromise = new Promise((resolve) => {
    window.onYouTubeIframeAPIReady = () => resolve()
    const script = document.createElement("script")
    script.src = "https://www.youtube.com/iframe_api"
    script.async = true
    document.body.appendChild(script)
  })
  return youtubeApiPromise
}

// Mounted once in the root layout so playback (and the hidden YouTube
// embed) survives client-side navigation between the home page and any
// playlist — only the *displayed* tracks change as pages mount/unmount via
// registerTracks; the player itself never remounts.
export default function TrackPlayerProvider({ children }: { children: React.ReactNode }) {
  const youtubeElRef = useRef<HTMLDivElement>(null)
  const youtubePlayerRef = useRef<YoutubePlayerInstance | null>(null)
  const youtubePlayerPromiseRef = useRef<Promise<YoutubePlayerInstance | null> | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const currentTrackIdRef = useRef<string | null>(null)
  // Tracks whose youtube match has already been requested (or resolved) —
  // keeps revisiting a playlist from re-hitting the match API.
  const requestedMatchIdsRef = useRef<Set<string>>(new Set())
  // The player's onStateChange callback is wired up once at creation, so it
  // needs a ref (not the `step` closure) to always call the latest version.
  const stepRef = useRef<(direction: 1 | -1) => void>(() => {})

  const [tracksById, setTracksById] = useState<Record<string, PlayerTrack>>({})
  const [activeTrackIds, setActiveTrackIds] = useState<string[]>([])
  // The playlist that next/previous (and auto-advance) step through: a
  // snapshot of the displayed playlist taken when the user starts playing
  // from it. Kept separate from activeTrackIds so browsing to another
  // playlist mid-set doesn't hijack what plays next — only starting
  // something on that other playlist does.
  const [queueTrackIds, setQueueTrackIds] = useState<string[]>([])
  const [matches, setMatches] = useState<Record<string, MatchState | undefined>>({})
  const [unplayableTrackIds, setUnplayableTrackIds] = useState<Set<string>>(new Set())
  const [currentTrackId, setCurrentTrackIdState] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)
  const [videoVisible, setVideoVisible] = useState(false)
  const [videoSlot, setVideoSlot] = useState<HTMLDivElement | null>(null)

  // The player's events are wired up once at creation, so onError needs a
  // ref (not the currentTrackId state) to know which track was attempted.
  function setCurrentTrackId(trackId: string | null) {
    currentTrackIdRef.current = trackId
    setCurrentTrackIdState(trackId)
  }

  function registerTracks(newTracks: PlayerTrack[]) {
    setTracksById((prev) => {
      let changed = false
      const next = { ...prev }
      for (const track of newTracks) {
        if (!next[track.id]) {
          next[track.id] = track
          changed = true
        }
      }
      return changed ? next : prev
    })
    setActiveTrackIds(newTracks.map((track) => track.id))

    // Direct video entries already know their video — no search needed.
    const directVideos = newTracks.filter(
      (track) => track.youtubeId && !requestedMatchIdsRef.current.has(track.id)
    )
    if (directVideos.length > 0) {
      directVideos.forEach((track) => requestedMatchIdsRef.current.add(track.id))
      setMatches((prev) => {
        const next = { ...prev }
        for (const track of directVideos) next[track.id] = { videoId: track.youtubeId!, title: track.name }
        return next
      })
    }

    const toFetch = newTracks.filter((track) => !requestedMatchIdsRef.current.has(track.id))
    if (toFetch.length === 0) return
    toFetch.forEach((track) => requestedMatchIdsRef.current.add(track.id))

    setMatches((prev) => {
      const next = { ...prev }
      for (const track of toFetch) next[track.id] = "loading"
      return next
    })

    toFetch.forEach((track) => {
      const params = new URLSearchParams({ trackId: track.id, name: track.name, artist: track.artist })
      fetch(`/api/youtube/match?${params.toString()}`)
        .then(async (response) => {
          // A non-2xx response still has a JSON body (an error, not a
          // match) — treat it the same as "no match" instead of leaving
          // the row stuck on "loading" forever.
          if (!response.ok) {
            console.error(`youtube match failed for "${track.name}":`, await response.text())
            return "error" as const
          }
          const data = (await response.json()) as { match: YoutubeMatch }
          return data.match
        })
        .catch((error) => {
          console.error(`youtube match failed for "${track.name}":`, error)
          return "error" as const
        })
        .then((match) => {
          setMatches((prev) => ({ ...prev, [track.id]: match }))
        })
    })
  }

  // Pre-create the hidden player on mount instead of waiting for the first
  // play click — script-load + player construction is async, and letting
  // that async chain run *after* the click risks outlasting the browser's
  // grace period for treating playback as user-initiated (silent autoplay block).
  useEffect(() => {
    ensureYoutubePlayer()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  // The YouTube embed has no time-update event — poll it instead while playing.
  useEffect(() => {
    if (isPlaying) {
      pollRef.current = setInterval(() => {
        const player = youtubePlayerRef.current
        if (!player) return
        setPosition(player.getCurrentTime() * 1000)
        setDuration(player.getDuration() * 1000)
      }, PROGRESS_POLL_MS)
    } else {
      stopPolling()
    }
    return stopPolling
  }, [isPlaying])

  async function ensureYoutubePlayer(): Promise<YoutubePlayerInstance | null> {
    if (youtubePlayerRef.current) return youtubePlayerRef.current
    if (youtubePlayerPromiseRef.current) return youtubePlayerPromiseRef.current
    if (!youtubeElRef.current) return null

    const promise = createYoutubePlayer()
    youtubePlayerPromiseRef.current = promise
    return promise
  }

  async function createYoutubePlayer(): Promise<YoutubePlayerInstance | null> {
    await loadYoutubeApi()

    return new Promise((resolve) => {
      if (!youtubeElRef.current || !window.YT) return resolve(null)
      const player = new window.YT.Player(youtubeElRef.current, {
        height: "113",
        width: "200",
        // Without playsinline, iOS Safari hijacks playback into its native
        // fullscreen video player instead of keeping the embed hidden.
        // controls: 0 — the mini player owns play/seek/skip, so YouTube's
        // own bar would just be a second, competing set of controls.
        // rel: 0 keeps end-of-video suggestions to the same channel.
        playerVars: { playsinline: 1, controls: 0, rel: 0, iv_load_policy: 3 },
        events: {
          onReady: () => resolve(player),
          // Ignore transient states (buffering, cued, unstarted) that fire
          // while a track loads — reacting to them here fights with the
          // optimistic setIsPlaying(true) in playTrack and flickers the icon.
          onStateChange: (event) => {
            if (event.data === YT_STATE_PLAYING) setIsPlaying(true)
            else if (event.data === YT_STATE_PAUSED) setIsPlaying(false)
            else if (event.data === YT_STATE_ENDED) {
              setIsPlaying(false)
              stepRef.current(1)
            }
          },
          // Some official/label videos report embeddable:true via the Data
          // API but still refuse to actually play in an embed (per-domain
          // restrictions enforced only at play time) — this is the only way
          // to detect that. Codes: 2 invalid param, 5 HTML5 error, 100 not
          // found, 101/150 embedding disallowed by the owner.
          onError: (event) => {
            const trackId = currentTrackIdRef.current
            console.error(`youtube playback error (code ${event.data}) for track`, trackId)
            if (!trackId) return
            setUnplayableTrackIds((prev) => new Set(prev).add(trackId))
            setIsPlaying(false)
          },
        },
      })
      youtubePlayerRef.current = player
    })
  }

  // Spacebar play/pause, global (works from any page, not just while a
  // track row or the mini player has focus).
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.code !== "Space") return
      if (isTypingTarget(event.target)) return
      event.preventDefault()
      if (!currentTrackId) return
      const match = matches[currentTrackId]
      if (match === "error" || unplayableTrackIds.has(currentTrackId)) return

      if (isPlaying) {
        youtubePlayerRef.current?.pauseVideo()
        setIsPlaying(false)
      } else {
        youtubePlayerRef.current?.playVideo()
        setIsPlaying(true)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [currentTrackId, isPlaying, matches, unplayableTrackIds])

  function togglePlayPause() {
    if (!currentTrackId) return
    if (isPlaying) {
      youtubePlayerRef.current?.pauseVideo()
      setIsPlaying(false)
    } else {
      youtubePlayerRef.current?.playVideo()
      setIsPlaying(true)
    }
  }

  function pause() {
    if (!isPlaying) return
    youtubePlayerRef.current?.pauseVideo()
    setIsPlaying(false)
  }

  // Called by the UI: playing something from the displayed playlist makes
  // that playlist the queue.
  function playTrack(trackId: string) {
    if (activeTrackIds.includes(trackId)) setQueueTrackIds(activeTrackIds)
    return loadTrack(trackId)
  }

  async function loadTrack(trackId: string) {
    const match = matches[trackId]
    if (!isPlayableMatch(match) || unplayableTrackIds.has(trackId)) return

    if (currentTrackId === trackId) {
      togglePlayPause()
      return
    }

    setCurrentTrackId(trackId)
    setPosition(0)
    setDuration(0)
    const player = await ensureYoutubePlayer()
    player?.loadVideoById(match.videoId)
    setIsPlaying(true)
  }

  // Steps to the next/previous track within the queue (the playlist the
  // current track was started from, wherever the user has since browsed)
  // with a resolved match, skipping past any tracks with no match (yet, or ever).
  function step(direction: 1 | -1) {
    if (!currentTrackId) return
    const index = queueTrackIds.indexOf(currentTrackId)
    if (index === -1) return

    for (let offset = 1; offset <= queueTrackIds.length; offset++) {
      const candidateId = queueTrackIds[(index + direction * offset + queueTrackIds.length) % queueTrackIds.length]
      if (isPlayableMatch(matches[candidateId]) && !unplayableTrackIds.has(candidateId)) {
        loadTrack(candidateId)
        return
      }
    }
  }

  useEffect(() => {
    stepRef.current = step
  })

  function seekToFraction(fraction: number) {
    if (duration <= 0) return
    youtubePlayerRef.current?.seekTo(Math.floor((fraction * duration) / 1000), true)
    setPosition(fraction * duration)
  }

  const tracks = activeTrackIds.reduce<PlayerTrack[]>((list, id) => {
    const track = tracksById[id]
    if (track) list.push(track)
    return list
  }, [])
  const currentTrack = currentTrackId ? (tracksById[currentTrackId] ?? null) : null
  // A floating (popped-out) video wins over docking, so the user can pop a
  // set out on its board's page and keep watching it while browsing away.
  const videoDocked = Boolean(
    !videoVisible && videoSlot && currentTrack?.youtubeId && activeTrackIds.includes(currentTrack.id)
  )

  return (
    <TrackPlayerContext.Provider
      value={{
        tracks,
        currentTrack,
        matches,
        unplayableTrackIds,
        currentTrackId,
        isPlaying,
        position,
        duration,
        registerTracks,
        playTrack,
        togglePlayPause,
        pause,
        videoVisible,
        setVideoVisible,
        setVideoSlot,
        videoDocked,
        next: () => step(1),
        previous: () => step(-1),
        seekToFraction,
      }}
    >
      <FloatingVideo
        videoRef={youtubeElRef}
        visible={videoVisible && currentTrack !== null}
        dockTarget={videoDocked ? videoSlot : null}
        title={currentTrack ? formatTrackTitle(currentTrack) : ""}
        onClose={() => setVideoVisible(false)}
      />
      {children}
    </TrackPlayerContext.Provider>
  )
}
