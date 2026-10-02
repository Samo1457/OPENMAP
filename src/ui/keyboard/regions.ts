// The six named Editor regions and Alt+1..6 (UX-DR113): top bar, tool rail, options bar, Map,
// properties panel, Timeline. Alt+N focuses the region container itself (tabIndex -1, the Map 0),
// which a screen reader announces by name; Tab then enters it.

import type { ShortcutDef } from './registry'

export const REGIONS = ['top', 'rail', 'options', 'map', 'panel', 'timeline'] as const
export type RegionId = (typeof REGIONS)[number]

/** Props that make an element a jump target. */
export function regionProps(region: RegionId): { 'data-region': RegionId; tabIndex: number } {
  return { 'data-region': region, tabIndex: region === 'map' ? 0 : -1 }
}

/** Moves the focus to `region`; false when it is not in the page. */
export function focusRegion(region: RegionId): boolean {
  const element = document.querySelector<HTMLElement>(`[data-region="${region}"]`)
  if (!element) return false
  // Chrome does not count an Alt+digit press as keyboard use, so a script focus would show no ring:
  // the jump marks the region itself until it loses the focus.
  element.dataset.jumped = ''
  element.addEventListener('blur', () => delete element.dataset.jumped, { once: true })
  element.focus()
  return true
}

/** The Alt+1..6 shortcuts, registered while the Editor is open. */
export function regionShortcuts(): ShortcutDef[] {
  return REGIONS.map((region, index) => ({
    id: `region.${region}`,
    group: 'navigation',
    nameKey: `keyboard.shortcuts.region.${region}`,
    keys: [{ code: `Digit${index + 1}`, alt: true }],
    inTextField: true, // they never type text
    run: () => void focusRegion(region),
  }))
}
