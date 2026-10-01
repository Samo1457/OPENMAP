import { describe, expect, it } from 'vitest'
import { relativeTime } from './relative-time'

const at = (day: number, hours: number, minutes = 0, seconds = 0) => new Date(2026, 9, day, hours, minutes, seconds).getTime()

describe('relativeTime (card date)', () => {
  const now = at(5, 16, 0)

  it('says just now under a minute, then minutes, then hours on the same day', () => {
    expect(relativeTime(at(5, 15, 59, 30), now, 'fr')).toEqual({ key: 'justNow' })
    expect(relativeTime(at(5, 15, 55), now, 'fr')).toEqual({ key: 'minutes', n: 5 })
    expect(relativeTime(at(5, 15, 0, 1), now, 'fr')).toEqual({ key: 'minutes', n: 59 })
    expect(relativeTime(at(5, 14, 0), now, 'fr')).toEqual({ key: 'hours', n: 2 })
    expect(relativeTime(at(5, 0, 0), now, 'fr')).toEqual({ key: 'hours', n: 16 })
  })

  it('says yesterday for the previous calendar day, then the date', () => {
    expect(relativeTime(at(4, 23, 59), now, 'fr')).toEqual({ key: 'yesterday' })
    expect(relativeTime(at(4, 0, 0), now, 'fr')).toEqual({ key: 'yesterday' })
    expect(relativeTime(at(3, 23, 0), now, 'fr')).toEqual({ key: 'date', date: '3 oct. 2026' })
    expect(relativeTime(at(3, 23, 0), now, 'en')).toEqual({ key: 'date', date: 'Oct 3, 2026' })
  })

  it('gives the date for a time more than a minute in the future', () => {
    expect(relativeTime(now + 30_000, now, 'en')).toEqual({ key: 'justNow' })
    expect(relativeTime(at(5, 16, 2), now, 'en')).toEqual({ key: 'date', date: 'Oct 5, 2026' })
  })

  it('counts minutes across midnight before falling back to yesterday', () => {
    expect(relativeTime(at(4, 23, 50), at(5, 0, 10), 'en')).toEqual({ key: 'minutes', n: 20 })
    expect(relativeTime(at(4, 22, 0), at(5, 0, 10), 'en')).toEqual({ key: 'yesterday' })
  })
})
