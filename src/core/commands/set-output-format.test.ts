import { describe, expect, it } from 'vitest'
import { blankProject, roundTrip, withoutRevision } from '../testing/fixtures'
import { apply } from './apply'

describe('SET_OUTPUT_FORMAT', () => {
  const project = blankProject()

  it.each(['9:16', '1:1'] as const)('sets %s and its inverse restores 16:9', (outputFormat) => {
    const { changed, inverse, reverted } = roundTrip(project, { type: 'SET_OUTPUT_FORMAT', payload: { outputFormat } })
    expect(changed.outputFormat).toBe(outputFormat)
    expect(withoutRevision(changed)).toEqual({ ...withoutRevision(project), outputFormat })
    expect(inverse).toEqual({ type: 'SET_OUTPUT_FORMAT', payload: { outputFormat: '16:9' } })
    expect(withoutRevision(reverted)).toEqual(withoutRevision(project))
  })

  it('refuses 4:3 with invalid_payload', () => {
    const result = apply(project, { type: 'SET_OUTPUT_FORMAT', payload: { outputFormat: '4:3' } } as never)
    expect(result.ok ? null : result.error.code).toBe('invalid_payload')
    expect(project.outputFormat).toBe('16:9')
  })

  it('is a no-op for the current format', () => {
    expect(apply(project, { type: 'SET_OUTPUT_FORMAT', payload: { outputFormat: '16:9' } })).toEqual({
      ok: true,
      value: { changed: false, project },
    })
  })
})
