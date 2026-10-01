import { describe, expect, it } from 'vitest'
import { daysInMonth, isLeapYear, isValidHistoricalDate } from './historical-date'

describe('HistoricalDate', () => {
  it.each([
    [{ year: 1900 }],
    [{ year: 0 }],
    [{ year: -51 }],
    [{ year: -10000 }],
    [{ year: 2100 }],
    [{ year: 1453, month: 5 }],
    [{ year: 1453, month: 5, day: 29 }],
    [{ year: 2000, month: 2, day: 29 }],
    [{ year: -4, month: 2, day: 29 }],
  ])('accepts %j', (date) => {
    expect(isValidHistoricalDate(date)).toBe(true)
  })

  it.each([
    [{ year: -10001 }],
    [{ year: 2101 }],
    [{ year: 1.5 }],
    [{ year: 1900, month: 13 }],
    [{ year: 1900, month: 0 }],
    [{ year: 1900, month: 13, day: 5 }],
    [{ year: 1900, month: 2, day: 29 }],
    [{ year: -1, month: 2, day: 29 }],
    [{ year: 2023, month: 6, day: 31 }],
    [{ year: 2023, day: 1 }],
    [{ year: 2023, month: 1, day: 0 }],
    [{ month: 1 }],
    [{ year: '1900' }],
    [null],
  ])('refuses %j', (date) => {
    expect(isValidHistoricalDate(date)).toBe(false)
  })

  it('uses proleptic Gregorian leap years on astronomical numbering', () => {
    expect([0, -4, 2000, 1600].map(isLeapYear)).toEqual([true, true, true, true])
    expect([-1, 1900, 2100, -100].map(isLeapYear)).toEqual([false, false, false, false])
    expect(daysInMonth(1900, 2)).toBe(28)
    expect(daysInMonth(0, 2)).toBe(29)
  })
})
