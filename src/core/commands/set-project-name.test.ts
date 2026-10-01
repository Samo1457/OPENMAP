import { describe, expect, it } from 'vitest'
import { blankProject, roundTrip, withoutRevision } from '../testing/fixtures'
import { apply } from './apply'

describe('SET_PROJECT_NAME', () => {
  const project = blankProject({ name: 'Projet sans titre' })

  it('renames, trimming the name, and its inverse restores the previous name', () => {
    const { changed, inverse, reverted } = roundTrip(project, { type: 'SET_PROJECT_NAME', payload: { name: '  Sièges de Vienne  ' } })
    expect(changed.name).toBe('Sièges de Vienne')
    expect(changed.revision).toBe(1)
    expect(inverse).toEqual({ type: 'SET_PROJECT_NAME', payload: { name: 'Projet sans titre' } })
    expect(withoutRevision(reverted)).toEqual(withoutRevision(project))
    expect(reverted.revision).toBe(2)
  })

  it('accepts exactly 120 characters', () => {
    const { changed } = roundTrip(project, { type: 'SET_PROJECT_NAME', payload: { name: 'a'.repeat(120) } })
    expect(changed.name).toHaveLength(120)
  })

  it('counts code points: 120 emoji pass, 121 do not', () => {
    expect(roundTrip(project, { type: 'SET_PROJECT_NAME', payload: { name: '🗺'.repeat(120) } }).changed.name).toBe('🗺'.repeat(120))
    const result = apply(project, { type: 'SET_PROJECT_NAME', payload: { name: '🗺'.repeat(121) } })
    expect(result.ok ? null : result.error.code).toBe('invalid_payload')
  })

  it.each([[''], ['   '], ['a'.repeat(121)], ['Vienne\n1683'], ['Vienne\t1683'], ['Vienne\u00001683']])('refuses %j with invalid_payload and keeps the name', (name) => {
    const result = apply(project, { type: 'SET_PROJECT_NAME', payload: { name } })
    expect(result).toEqual({ ok: false, error: { code: 'invalid_payload', params: { type: 'SET_PROJECT_NAME', field: 'name' } } })
    expect(project.name).toBe('Projet sans titre')
  })

  it('is a no-op when the trimmed name equals the current one', () => {
    const result = apply(project, { type: 'SET_PROJECT_NAME', payload: { name: ' Projet sans titre ' } })
    expect(result).toEqual({ ok: true, value: { changed: false, project } })
  })

  it('refuses a malformed payload', () => {
    const result = apply(project, { type: 'SET_PROJECT_NAME', payload: { name: 42 } } as never)
    expect(result.ok ? null : result.error.code).toBe('invalid_payload')
  })
})
