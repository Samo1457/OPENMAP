import { describe, expect, it } from 'vitest'
import { blankProject, roundTrip, withoutRevision } from '../testing/fixtures'
import { apply } from './apply'

describe('SET_REFERENCE_DATE', () => {
  const project = blankProject()

  it.each([
    [{ year: -51 }],
    [{ year: 0 }],
    [{ year: 1453, month: 5, day: 29 }],
    [{ year: -10000 }],
    [{ year: 2100, month: 12, day: 31 }],
    [{ year: 2000, month: 2, day: 29 }],
    [{ year: 0, month: 2, day: 29 }],
  ])('sets %j and its inverse restores 1900', (referenceDate) => {
    const { changed, inverse, reverted } = roundTrip(project, { type: 'SET_REFERENCE_DATE', payload: { referenceDate } })
    expect(changed.referenceDate).toEqual(referenceDate)
    expect(inverse).toEqual({ type: 'SET_REFERENCE_DATE', payload: { referenceDate: { year: 1900 } } })
    expect(withoutRevision(reverted)).toEqual(withoutRevision(project))
  })

  it.each([
    [{ year: 1900, month: 13 }],
    [{ year: 1900, month: 0 }],
    [{ year: 1900, month: 13, day: 5 }],
    [{ year: 1900, month: 0, day: 5 }],
    [{ year: 1900, month: 4, day: 31 }],
    [{ year: 1900, month: 2, day: 29 }],
    [{ year: 1900, day: 3 }],
    [{ year: -10001 }],
    [{ year: 2101 }],
    [{ year: 1900.5 }],
    [{ year: 1900, era: 'BCE' }],
  ])('refuses %j with invalid_payload and keeps the previous date', (referenceDate) => {
    const result = apply(project, { type: 'SET_REFERENCE_DATE', payload: { referenceDate } } as never)
    expect(result.ok ? null : result.error.code).toBe('invalid_payload')
    expect(project.referenceDate).toEqual({ year: 1900 })
  })

  it('is a no-op for the current date', () => {
    expect(apply(project, { type: 'SET_REFERENCE_DATE', payload: { referenceDate: { year: 1900 } } })).toEqual({
      ok: true,
      value: { changed: false, project },
    })
  })
})
