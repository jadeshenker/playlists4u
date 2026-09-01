/**
 * A single key in a shortcut hint, e.g. the "C" or "Y" in "C then Y". Always
 * a pill, but a faint one when `active` is false — used to fade a per-row
 * hint in on hover, while a standing hint (like the header's) stays lit.
 */
function KeyBadge({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`rounded px-1 py-px leading-none ${active ? "bg-gray-200 text-gray-400" : "bg-gray-100"}`}
    >
      {children}
    </span>
  )
}

/** A shortcut hint made of one or more keys pressed in sequence: "C then Y". */
export default function KeySequence({ active, keys }: { active: boolean; keys: string[] }) {
  return (
    <span className="flex items-center gap-1">
      {keys.map((key, index) => (
        <span key={index} className="flex items-center gap-1">
          {index > 0 && <span>then</span>}
          <KeyBadge active={active}>{key}</KeyBadge>
        </span>
      ))}
    </span>
  )
}
