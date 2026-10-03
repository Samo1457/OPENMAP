// Pure logic of the edit camera's input (Story 1.10): continuous keyboard panning. The renderer does the motion (rAF, jumpTo); the numbers live here so they are testable (AD-1).

/** Screen px per second of a held arrow key or Z/Q/S/D, whatever the zoom. */
export const PAN_SPEED = 600
/** Shift multiplies the pan speed. */
export const PAN_FAST_FACTOR = 2.5

export interface PanKeys {
  readonly left: boolean
  readonly right: boolean
  readonly up: boolean
  readonly down: boolean
}

export const NO_PAN_KEYS: PanKeys = { left: false, right: false, up: false, down: false }

/** The pan velocity in screen px/s for the held keys: opposite keys cancel, diagonals keep the same speed. */
export function panVelocity(keys: PanKeys, fast: boolean): { x: number; y: number } {
  const x = (keys.right ? 1 : 0) - (keys.left ? 1 : 0)
  const y = (keys.down ? 1 : 0) - (keys.up ? 1 : 0)
  const length = Math.hypot(x, y)
  if (length === 0) return { x: 0, y: 0 }
  const speed = PAN_SPEED * (fast ? PAN_FAST_FACTOR : 1)
  return { x: (x / length) * speed, y: (y / length) * speed }
}
