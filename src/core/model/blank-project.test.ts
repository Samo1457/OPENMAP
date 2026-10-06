import { describe, expect, it } from 'vitest'
import { createDeterministicIdSource, toProjectId } from '../ids'
import { validate } from '../schema'
import { createBlankProject, duplicateProject, generateBlankProjectIds } from './blank-project'

const ids = () => generateBlankProjectIds(createDeterministicIdSource('p'))

describe('createBlankProject', () => {
  const project = createBlankProject({ ...ids(), name: 'Projet sans titre', mapLocale: 'fr' })

  it('creates the v3 default document', () => {
    expect(project).toEqual({
      schemaVersion: 3,
      id: 'p00000000000000000001',
      seed: 'p00000000000000000002',
      revision: 0,
      name: 'Projet sans titre',
      mapLocale: 'fr',
      outputFormat: '16:9',
      referenceDate: { year: 1900 },
      map: { basemap: { id: 'parchment', adjustments: {} }, members: {} },
      steps: [{ id: 'p00000000000000000003' }],
      layers: [
        { id: 'p00000000000000000004', kind: 'territories', hidden: false, locked: false },
        { id: 'p00000000000000000005', kind: 'arrows', hidden: false, locked: false },
        { id: 'p00000000000000000006', kind: 'tokens', hidden: false, locked: false },
        { id: 'p00000000000000000007', kind: 'texts', hidden: false, locked: false },
        { id: 'p00000000000000000008', kind: 'images', hidden: false, locked: false },
      ],
      factions: [],
      pins: { geo: { dataset: 'cliopatria', version: '0.2.0' } },
      credit: { corner: 'bottom-left', prominence: 'discreet' },
    })
  })

  it('validates against the current schema and is deeply frozen', () => {
    expect(validate(project)).toEqual({ ok: true, value: project })
    expect(Object.isFrozen(project)).toBe(true)
    expect(Object.isFrozen(project.map.basemap)).toBe(true)
    expect(Object.isFrozen(project.layers[0])).toBe(true)
  })

  it('is deterministic: same inputs give a deep-equal document', () => {
    expect(createBlankProject({ ...ids(), name: 'Projet sans titre', mapLocale: 'fr' })).toEqual(project)
  })

  it('takes the Map language from the caller (the UI language at creation)', () => {
    expect(createBlankProject({ ...ids(), name: 'Untitled project', mapLocale: 'en' }).mapLocale).toBe('en')
  })

  it('throws on a programmer error: empty name or duplicate Layer ids', () => {
    expect(() => createBlankProject({ ...ids(), name: '  ', mapLocale: 'fr' })).toThrow(/too_small|>=1|string/i)
    const base = ids()
    expect(() =>
      createBlankProject({ ...base, layerIds: { ...base.layerIds, arrows: base.layerIds.territories }, name: 'x', mapLocale: 'fr' }),
    ).toThrow('Layer ids must be distinct.')
  })

})

describe('duplicateProject', () => {
  const project = createBlankProject({ ...ids(), name: 'Projet sans titre', mapLocale: 'fr' })

  it('keeps the seed and every inner id, takes the new id and starts at revision 0', () => {
    const copy = duplicateProject({ ...project, revision: 7 }, toProjectId('copy00000000000000001'))
    expect(copy).toEqual({ ...project, id: 'copy00000000000000001', revision: 0 })
    expect(copy.seed).toBe(project.seed)
    expect(validate(copy).ok).toBe(true)
  })

  it('refuses to reuse the same id', () => {
    expect(() => duplicateProject(project, project.id)).toThrow('A duplicate needs a new id.')
  })
})
