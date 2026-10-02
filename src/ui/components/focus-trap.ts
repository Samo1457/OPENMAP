// Focus containment for modal dialogs (UX-DR67): Tab and Shift+Tab cycle inside the dialog.

/** Elements that can take keyboard focus, before visibility and `inert` filtering. */
export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',')

/**
 * Where Tab (or Shift+Tab when `backwards`) moves the focus among `count` stops, wrapping at both
 * ends. `current` is -1 when the focus is on none of them (on the dialog itself): Tab then goes to
 * the first stop and Shift+Tab to the last. `undefined` when there is no stop.
 */
export function nextFocusIndex(count: number, current: number, backwards: boolean): number | undefined {
  if (count <= 0) return undefined
  if (current < 0 || current >= count) return backwards ? count - 1 : 0
  return backwards ? (current - 1 + count) % count : (current + 1) % count
}

/**
 * The Tab stops inside `container`, in DOM order: visible, not inert, and not taken out of the tab
 * order (`tabindex="-1"`, as the unselected tabs and radios of a roving group).
 */
export function focusableWithin(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => element.tabIndex >= 0 && !element.closest('[inert]') && element.getClientRects().length > 0,
  )
}
