import { describe, expect, it } from 'vitest'
import { blankProject, roundTrip, withoutRevision } from '../testing/fixtures'
import { apply } from './apply'

describe('SET_MAP_LOCALE', () => {
  const project = blankProject({ mapLocale: 'fr' })

  it('sets the Map language and its inverse restores the previous one', () => {
    const { changed, inverse, reverted } = roundTrip(project, { type: 'SET_MAP_LOCALE', payload: { mapLocale: 'en' } })
    expect(changed.mapLocale).toBe('en')
    expect(inverse).toEqual({ type: 'SET_MAP_LOCALE', payload: { mapLocale: 'fr' } })
    expect(withoutRevision(reverted)).toEqual(withoutRevision(project))
  })

  it('refuses an unsupported locale', () => {
    const result = apply(project, { type: 'SET_MAP_LOCALE', payload: { mapLocale: 'de' } } as never)
    expect(result.ok ? null : result.error.code).toBe('invalid_payload')
  })

  it('is a no-op for the current locale', () => {
    expect(apply(project, { type: 'SET_MAP_LOCALE', payload: { mapLocale: 'fr' } })).toEqual({ ok: true, value: { changed: false, project } })
  })
})
