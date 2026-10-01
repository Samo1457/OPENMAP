import { describe, expect, it } from 'vitest'
import { blankProject, roundTrip, withoutRevision } from '../testing/fixtures'
import { apply } from './apply'
import { type Batch, type Command, MAX_BATCH_DEPTH } from './command'

describe('BATCH', () => {
  const project = blankProject()

  it('applies every member, bumps revision once, and its inverse reverts all of them in reverse order', () => {
    const batch: Batch = {
      type: 'BATCH',
      payload: {
        commands: [
          { type: 'SET_BASEMAP', payload: { basemap: 'sombre' } },
          { type: 'SET_OUTPUT_FORMAT', payload: { outputFormat: '1:1' } },
          { type: 'SET_BASEMAP', payload: { basemap: 'relief' } },
        ],
      },
    }
    const { changed, inverse, reverted } = roundTrip(project, batch)
    expect(changed.revision).toBe(1)
    expect(changed.map.basemap.id).toBe('relief')
    expect(changed.outputFormat).toBe('1:1')
    expect(inverse).toEqual({
      type: 'BATCH',
      payload: {
        commands: [
          { type: 'SET_BASEMAP', payload: { basemap: 'sombre' } },
          { type: 'SET_OUTPUT_FORMAT', payload: { outputFormat: '16:9' } },
          { type: 'SET_BASEMAP', payload: { basemap: 'parchment' } },
        ],
      },
    })
    expect(withoutRevision(reverted)).toEqual(withoutRevision(project))
  })

  it('supports nested batches', () => {
    const { changed } = roundTrip(project, {
      type: 'BATCH',
      payload: { commands: [{ type: 'BATCH', payload: { commands: [{ type: 'SET_MAP_LOCALE', payload: { mapLocale: 'fr' } }] } }] },
    })
    expect(changed.mapLocale).toBe('fr')
  })

  it.each([
    ['a schema-invalid member', { type: 'SET_OUTPUT_FORMAT', payload: { outputFormat: '4:3' } }],
    ['a rule-invalid member', { type: 'SET_PROJECT_NAME', payload: { name: '  ' } }],
    ['an unknown Command type', { type: 'DELETE_EVERYTHING', payload: {} }],
  ])('rejects the whole batch for %s and leaves the document unchanged', (_label, bad) => {
    const before = JSON.parse(JSON.stringify(project)) as unknown
    const result = apply(project, {
      type: 'BATCH',
      payload: { commands: [{ type: 'SET_BASEMAP', payload: { basemap: 'sombre' } }, bad as never] },
    })
    expect(result.ok ? null : result.error.code).toBe('invalid_payload')
    expect(project).toEqual(before)
  })

  it('is a no-op when every member is', () => {
    const result = apply(project, {
      type: 'BATCH',
      payload: { commands: [{ type: 'SET_BASEMAP', payload: { basemap: 'parchment' } }] },
    })
    expect(result).toEqual({ ok: true, value: { changed: false, project } })
    expect(apply(project, { type: 'BATCH', payload: { commands: [] } })).toEqual({ ok: true, value: { changed: false, project } })
  })

  it('skips no-op members in the inverse', () => {
    const { inverse } = roundTrip(project, {
      type: 'BATCH',
      payload: {
        commands: [
          { type: 'SET_BASEMAP', payload: { basemap: 'parchment' } },
          { type: 'SET_MAP_LOCALE', payload: { mapLocale: 'fr' } },
        ],
      },
    })
    expect(inverse).toEqual({ type: 'BATCH', payload: { commands: [{ type: 'SET_MAP_LOCALE', payload: { mapLocale: 'en' } }] } })
  })

  it('is a no-op when its members cancel out', () => {
    const result = apply(project, {
      type: 'BATCH',
      payload: {
        commands: [
          { type: 'SET_BASEMAP', payload: { basemap: 'sombre' } },
          { type: 'SET_BASEMAP', payload: { basemap: 'parchment' } },
        ],
      },
    })
    expect(result).toEqual({ ok: true, value: { changed: false, project } })
  })

  const nest = (levels: number): Command => {
    let command: Command = { type: 'SET_MAP_LOCALE', payload: { mapLocale: 'fr' } }
    for (let i = 0; i < levels; i++) command = { type: 'BATCH', payload: { commands: [command] } }
    return command
  }

  it(`accepts ${MAX_BATCH_DEPTH} nested levels`, () => {
    expect(roundTrip(project, nest(MAX_BATCH_DEPTH)).changed.mapLocale).toBe('fr')
  })

  it.each([MAX_BATCH_DEPTH + 1, 5000])('refuses %i nested levels with invalid_payload instead of overflowing', (levels) => {
    expect(apply(project, nest(levels))).toEqual({ ok: false, error: { code: 'invalid_payload', params: { type: 'BATCH', maxDepth: MAX_BATCH_DEPTH } } })
  })
})
