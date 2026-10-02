import { describe, expect, it } from 'vitest'
import { nextFocusIndex } from './focus-trap'

describe('nextFocusIndex (dialog focus trap)', () => {
  it('moves forward and backward', () => {
    expect(nextFocusIndex(3, 0, false)).toBe(1)
    expect(nextFocusIndex(3, 1, true)).toBe(0)
  })

  it('wraps from the last stop to the first, and from the first to the last', () => {
    expect(nextFocusIndex(3, 2, false)).toBe(0)
    expect(nextFocusIndex(3, 0, true)).toBe(2)
  })

  it('enters at an end when the focus is on none of the stops', () => {
    expect(nextFocusIndex(3, -1, false)).toBe(0)
    expect(nextFocusIndex(3, -1, true)).toBe(2)
  })

  it('keeps a single stop focused, and has nowhere to go without stops', () => {
    expect(nextFocusIndex(1, 0, false)).toBe(0)
    expect(nextFocusIndex(1, 0, true)).toBe(0)
    expect(nextFocusIndex(0, -1, false)).toBeUndefined()
  })
})
