import { describe, expect, it } from 'vitest'
import { MAX_HISTORICAL_YEAR, MIN_HISTORICAL_YEAR } from '../dates/historical-date'
import { formatHistoricalDate, formatYear, parseYear } from './historical-date'

describe('formatYear', () => {
  it('writes years from 1 plainly', () => {
    expect(formatYear(1453, 'fr')).toBe('1453')
    expect(formatYear(1453, 'en')).toBe('1453')
    expect(formatYear(1, 'fr')).toBe('1')
  })

  it('counts BCE from 1 BCE = year 0, with non-breaking spaces in French', () => {
    expect(formatYear(-51, 'fr')).toBe('52\u00A0av.\u00A0J.-C.')
    expect(formatYear(-51, 'en')).toBe('52 BC')
    expect(formatYear(0, 'fr')).toBe('1\u00A0av.\u00A0J.-C.')
    expect(formatYear(0, 'en')).toBe('1 BC')
    expect(formatYear(-3399, 'en')).toBe('3400 BC')
  })

  it('formats a HistoricalDate at year precision', () => {
    expect(formatHistoricalDate({ year: -51, month: 3, day: 15 }, 'en')).toBe('52 BC')
    expect(formatHistoricalDate({ year: 1900 }, 'fr')).toBe('1900')
  })
})

describe('parseYear', () => {
  it.each([
    ['1453', 1453],
    [' 1453 ', 1453],
    ['+1453', 1453],
    ['-51', -51],
    ['−51', -51],
    ['52 av. J.-C.', -51],
    ['52 av. J.-C.', -51],
    ['52 av J-C', -51],
    ['52 BC', -51],
    ['52 bce', -51],
    ['52BCE', -51],
    ['1 BC', 0],
    ['1 av. J.-C.', 0],
    ['1453 AD', 1453],
    ['1453 ap. J.-C.', 1453],
    [String(MIN_HISTORICAL_YEAR), MIN_HISTORICAL_YEAR],
    [String(MAX_HISTORICAL_YEAR), MAX_HISTORICAL_YEAR],
  ])('reads %j as year %d', (text, year) => {
    expect(parseYear(text)).toEqual({ ok: true, value: year })
  })

  it.each([['0'], ['-0'], ['0 BC'], ['0 av. J.-C.']])('refuses %j as year_zero', (text) => {
    expect(parseYear(text)).toMatchObject({ ok: false, error: { code: 'year_zero' } })
  })

  it.each([[''], ['  '], ['abc'], ['14.5'], ['99999'], ['-99999'], ['2101'], ['-10001'], ['52 BCD'], ['BC'], ['12345678901234567890']])('refuses %j as not_a_year', (text) => {
    expect(parseYear(text)).toMatchObject({ ok: false, error: { code: 'not_a_year' } })
  })

  it('round-trips the formatter in both languages', () => {
    for (const year of [-3399, -51, 0, 1, 1453, 2024]) {
      for (const locale of ['fr', 'en'] as const) expect(parseYear(formatYear(year, locale))).toEqual({ ok: true, value: year })
    }
  })
})
