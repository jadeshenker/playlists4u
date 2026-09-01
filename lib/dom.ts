/** True if a keydown event's target is somewhere a keyboard shortcut shouldn't fire. */
export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return el?.tagName === "INPUT" || el?.tagName === "TEXTAREA" || Boolean(el?.isContentEditable)
}
