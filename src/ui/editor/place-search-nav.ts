// Which result is active after a key in the place search list (ARIA combobox, Story 1.12): ↓ and ↑ move
// and wrap, Home and End jump to the first and the last. Pure, so it is unit tested.

export type NavKey = 'ArrowDown' | 'ArrowUp' | 'Home' | 'End'

/** The id of the next active result: from nothing, ↓ goes to the first and ↑ to the last. `undefined` for an empty list. */
export function nextActive(ids: readonly string[], current: string | undefined, key: NavKey): string | undefined {
  if (ids.length === 0) return undefined
  const at = current === undefined ? -1 : ids.indexOf(current)
  if (key === 'Home') return ids[0]
  if (key === 'End') return ids[ids.length - 1]
  if (key === 'ArrowDown') return ids[at < 0 || at === ids.length - 1 ? 0 : at + 1]
  return ids[at <= 0 ? ids.length - 1 : at - 1]
}
