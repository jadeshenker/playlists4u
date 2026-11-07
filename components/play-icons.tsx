/** Shared transport icons — kept in one place so the player and any other
 * playing/paused indicator (e.g. the track list) render identically. */

export function PlayIcon() {
  return (
    <svg viewBox="0 0 16 16" width="9" height="9" fill="currentColor">
      <path d="M3 1.5l11.5 6.5L3 14.5v-13z" />
    </svg>
  )
}

export function PauseIcon() {
  return (
    <svg viewBox="0 0 16 16" width="9" height="9" fill="currentColor">
      <rect x="3" y="1.5" width="3.5" height="13" />
      <rect x="9.5" y="1.5" width="3.5" height="13" />
    </svg>
  )
}

export function SkipPreviousIcon() {
  return (
    <svg viewBox="0 0 16 16" width="11" height="11" fill="currentColor">
      <rect x="1" y="1.5" width="1.75" height="13" />
      <path d="M14 1.5L7.5 8l6.5 6.5v-13z" />
      <path d="M7.75 1.5L1.25 8l6.5 6.5v-13z" />
    </svg>
  )
}

export function SkipNextIcon() {
  return (
    <svg viewBox="0 0 16 16" width="11" height="11" fill="currentColor">
      <path d="M2 1.5L8.5 8 2 14.5v-13z" />
      <path d="M8.25 1.5L14.75 8l-6.5 6.5v-13z" />
      <rect x="13.25" y="1.5" width="1.75" height="13" />
    </svg>
  )
}

/** A screen outline — toggles the mini player's floating video. */
export function VideoIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="2.75" width="14" height="9.5" />
      <path d="M6.5 5.5v4l3.5-2-3.5-2z" fill="currentColor" stroke="none" />
      <path d="M4.5 14.5h7" />
    </svg>
  )
}
