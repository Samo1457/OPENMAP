import { describe, expect, it } from 'vitest'
import { compareHistoricalDates } from './compare'

describe('compareHistoricalDates', () => {
  it('orders astronomical years, BCE before CE', () => {
    expect(compareHistoricalDates({ year: -51 }, { year: 0 })).toBeLessThan(0)
    expect(compareHistoricalDates({ year: 0 }, { year: 1 })).toBeLessThan(0)
    expect(compareHistoricalDates({ year: 1453 }, { year: -51 })).toBeGreaterThan(0)
    expect(compareHistoricalDates({ year: 1900 }, { year: 1900 })).toBe(0)
  })

  it('refines by month and day, a missing part sorting first', () => {
    expect(compareHistoricalDates({ year: 1453 }, { year: 1453, month: 1 })).toBeLessThan(0)
    expect(compareHistoricalDates({ year: 1453, month: 5 }, { year: 1453, month: 5, day: 29 })).toBeLessThan(0)
    expect(compareHistoricalDates({ year: 1453, month: 5, day: 29 }, { year: 1453, month: 6 })).toBeLessThan(0)
    expect(compareHistoricalDates({ year: 1453, month: 5, day: 29 }, { year: 1453, month: 5, day: 29 })).toBe(0)
  })

  it('is antisymmetric', () => {
    const a = { year: -3400 }
    const b = { year: 2024, month: 3 }
    expect(Math.sign(compareHistoricalDates(a, b))).toBe(-Math.sign(compareHistoricalDates(b, a)))
  })
})
