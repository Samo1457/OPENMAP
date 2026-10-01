import { describe, expect, it } from 'vitest'
import { blankProject, roundTrip, withoutRevision } from '../testing/fixtures'
import { apply } from './apply'
import type { SetBasemapAdjustments } from './command'

const set = (adjustments: SetBasemapAdjustments['payload']['adjustments']): SetBasemapAdjustments => ({
  type: 'SET_BASEMAP_ADJUSTMENTS',
  payload: { adjustments },
})

describe('SET_BASEMAP_ADJUSTMENTS', () => {
  const project = blankProject()

  it('stores overrides, upper-cases the tint, and its inverse restores the defaults', () => {
    const { changed, inverse, reverted } = roundTrip(
      project,
      set({ brightness: -50, saturation: 50, tintColor: '#a35a2b', tintIntensity: 60 }),
    )
    expect(changed.map.basemap.adjustments).toEqual({ brightness: -50, saturation: 50, tintColor: '#A35A2B', tintIntensity: 60 })
    expect(inverse).toEqual(set({}))
    expect(withoutRevision(reverted)).toEqual(withoutRevision(project))
  })

  it('resets to the Basemap defaults with {} and its inverse restores the overrides', () => {
    const adjusted = apply(project, set({ saturation: -100 }))
    if (!adjusted.ok) throw new Error('setup failed')
    const { changed, inverse } = roundTrip(adjusted.value.project, set({}))
    expect(changed.map.basemap.adjustments).toEqual({})
    expect(inverse).toEqual(set({ saturation: -100 }))
  })

  it.each([
    [{ brightness: 51 }],
    [{ brightness: -51 }],
    [{ saturation: -101 }],
    [{ saturation: 51 }],
    [{ tintIntensity: 61 }],
    [{ tintIntensity: -1 }],
    [{ brightness: 1.5 }],
    [{ tintColor: 'red' }],
    [{ tintColor: '#A35A2B80' }],
    [{ contrast: 10 }],
  ])('refuses %j with invalid_payload', (adjustments) => {
    const result = apply(project, set(adjustments as never))
    expect(result.ok ? null : result.error.code).toBe('invalid_payload')
  })

  it('is a no-op when the overrides are unchanged, whatever the tint case', () => {
    const adjusted = apply(project, set({ tintColor: '#A35A2B' }))
    if (!adjusted.ok) throw new Error('setup failed')
    const current = adjusted.value.project
    expect(apply(current, set({ tintColor: '#a35a2b' }))).toEqual({ ok: true, value: { changed: false, project: current } })
    expect(apply(project, set({}))).toEqual({ ok: true, value: { changed: false, project } })
  })
})
