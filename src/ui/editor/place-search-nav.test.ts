import { describe, expect, it } from 'vitest'
import { nextActive } from './place-search-nav'

const ids = ['a', 'b', 'c']

describe('nextActive', () => {
  it('↓ goes to the first from nothing, then down, and wraps after the last', () => {
    expect(nextActive(ids, undefined, 'ArrowDown')).toBe('a')
    expect(nextActive(ids, 'a', 'ArrowDown')).toBe('b')
    expect(nextActive(ids, 'c', 'ArrowDown')).toBe('a')
  })

  it('↑ goes to the last from nothing, then up, and wraps before the first', () => {
    expect(nextActive(ids, undefined, 'ArrowUp')).toBe('c')
    expect(nextActive(ids, 'c', 'ArrowUp')).toBe('b')
    expect(nextActive(ids, 'a', 'ArrowUp')).toBe('c')
  })

  it('Home and End jump to the first and the last', () => {
    expect(nextActive(ids, 'b', 'Home')).toBe('a')
    expect(nextActive(ids, 'b', 'End')).toBe('c')
    expect(nextActive(ids, undefined, 'End')).toBe('c')
  })

  it('treats an active id that left the list as nothing', () => {
    expect(nextActive(ids, 'gone', 'ArrowDown')).toBe('a')
    expect(nextActive(ids, 'gone', 'ArrowUp')).toBe('c')
  })

  it('has nothing to activate in an empty list', () => {
    for (const key of ['ArrowDown', 'ArrowUp', 'Home', 'End'] as const) expect(nextActive([], undefined, key)).toBeUndefined()
  })

  it('stays on a single result', () => {
    expect(nextActive(['x'], 'x', 'ArrowDown')).toBe('x')
    expect(nextActive(['x'], 'x', 'ArrowUp')).toBe('x')
  })
})
