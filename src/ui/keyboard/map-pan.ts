// Continuous panning of the edit camera (Story 1.10 decision): with the Map focused, the arrows and
// Z/Q/S/D pan while held, Shift faster. Z/Q/S/D are the physical positions of W/A/S/D (`event.code`),
// so they work on AZERTY and QWERTY: movement keys follow the physical key, unlike the mnemonic
// letter shortcuts. They are read here, not by the registry, because they need keyup and blur.

import { NO_PAN_KEYS, panVelocity, type PanKeys } from '@/core'
import { isTextEntry } from './registry'
import { mapHasFocus } from './map-shortcuts'

const DIRECTION: Readonly<Record<string, keyof PanKeys>> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
}

function modalOpen(): boolean {
  return document.querySelector('[aria-modal="true"]') !== null
}

/**
 * Listens on `target` (the window) and reports the pan velocity in screen px/s: non-zero while a pan
 * key is held with the Map focused. A held key stops on keyup, on blur, when the Map loses the focus,
 * and never starts from a text field, with Ctrl, Alt or Cmd held, or while a dialog is open.
 * Returns the uninstaller (which also stops the pan).
 */
export function installMapPan(target: EventTarget, setVelocity: (x: number, y: number) => void): () => void {
  let held: PanKeys = NO_PAN_KEYS
  let fast = false

  function report() {
    const { x, y } = panVelocity(held, fast)
    setVelocity(x, y)
  }
  function stop() {
    held = NO_PAN_KEYS
    fast = false
    report()
  }

  const onKeyDown = (event: Event) => {
    const key = event as KeyboardEvent
    // Every keydown, auto-repeat included, re-checks the guards: a dialog opened or Ctrl pressed while a
    // key is held stops the pan.
    const allowed = !(key.ctrlKey || key.metaKey || key.altKey || key.isComposing) && !isTextEntry(key.target) && !modalOpen() && mapHasFocus()
    if (!allowed) return stop()
    const direction = DIRECTION[key.code]
    if (!direction) return
    key.preventDefault() // no page scroll, no browser find-as-you-type
    held = { ...held, [direction]: true }
    fast = key.shiftKey
    report()
  }
  const onKeyUp = (event: Event) => {
    const key = event as KeyboardEvent
    const direction = DIRECTION[key.code]
    if (direction) held = { ...held, [direction]: false }
    fast = key.shiftKey
    report()
  }
  // The focus left the Map (a click elsewhere, Tab, a dialog): the keys can no longer be released there.
  const onFocusOut = (event: Event) => {
    // Moving inside the Map region (to a zoom button) keeps the pan.
    const next = (event as FocusEvent).relatedTarget
    const region = document.querySelector('[data-region="map"]')
    if (next && region?.contains(next as Node)) return
    if (!mapHasFocus()) stop()
  }
  target.addEventListener('keydown', onKeyDown)
  target.addEventListener('keyup', onKeyUp)
  target.addEventListener('blur', stop)
  target.addEventListener('focusout', onFocusOut)
  return () => {
    target.removeEventListener('keydown', onKeyDown)
    target.removeEventListener('keyup', onKeyUp)
    target.removeEventListener('blur', stop)
    target.removeEventListener('focusout', onFocusOut)
    stop()
  }
}
