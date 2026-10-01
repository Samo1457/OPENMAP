import { describe, expect, it } from 'vitest'
import { blankProject, roundTrip, withoutRevision } from '../testing/fixtures'
import { apply } from './apply'

describe('SET_BASEMAP', () => {
  const project = blankProject()

  it.each(['sombre', 'clair', 'relief'] as const)('switches to %s and its inverse restores parchment', (basemap) => {
    const { changed, inverse, reverted } = roundTrip(project, { type: 'SET_BASEMAP', payload: { basemap } })
    expect(changed.map.basemap.id).toBe(basemap)
    expect(inverse).toEqual({ type: 'SET_BASEMAP', payload: { basemap: 'parchment' } })
    expect(withoutRevision(reverted)).toEqual(withoutRevision(project))
  })

  it('keeps the adjustment overrides when the Basemap changes', () => {
    const adjusted = apply(project, { type: 'SET_BASEMAP_ADJUSTMENTS', payload: { adjustments: { brightness: 20 } } })
    if (!adjusted.ok) throw new Error('setup failed')
    const { changed } = roundTrip(adjusted.value.project, { type: 'SET_BASEMAP', payload: { basemap: 'sombre' } })
    expect(changed.map.basemap).toEqual({ id: 'sombre', adjustments: { brightness: 20 } })
  })

  it('refuses an unknown Basemap (satellite arrives in Epic 8)', () => {
    const result = apply(project, { type: 'SET_BASEMAP', payload: { basemap: 'satellite' } } as never)
    expect(result.ok ? null : result.error.code).toBe('invalid_payload')
  })

  it('is a no-op for the current Basemap', () => {
    expect(apply(project, { type: 'SET_BASEMAP', payload: { basemap: 'parchment' } })).toEqual({ ok: true, value: { changed: false, project } })
  })
})
