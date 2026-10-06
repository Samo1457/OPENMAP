import { describe, expect, it } from 'vitest'
import { projectSchemaV1, projectSchemaV2 } from '../model/project'
import { blankProject } from '../testing/fixtures'
import { CURRENT_SCHEMA_VERSION, loadProject, migrate, migrateWith, migrations, projectJsonSchema, validate } from '.'

const asPlain = (value: unknown) => JSON.parse(JSON.stringify(value)) as Record<string, unknown>

/** A stored v1 document: the blank Project of Story 1.3 as it was saved before the geo pin and the credit. */
const storedV1 = (): Record<string, unknown> => {
  const { pins: _pins, credit: _credit, ...rest } = asPlain(blankProject())
  return { ...rest, schemaVersion: 1 }
}
const PIN = { geo: { dataset: 'cliopatria', version: '0.2.0' } }
const CREDIT = { corner: 'bottom-left', prominence: 'discreet' }

/** A stored v2 document: the blank Project of Story 1.11 as it was saved before the credit placement. */
const storedV2 = (): Record<string, unknown> => {
  const { credit: _credit, ...rest } = asPlain(blankProject())
  return { ...rest, schemaVersion: 2 }
}

describe('migrate (AD-9)', () => {
  it('is at version 3 with the v1 → v2 and v2 → v3 migrations', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(3)
    expect(Object.keys(migrations)).toEqual(['1', '2'])
  })

  it('v1 fixture: a stored v1 Project migrates to v3 with the geo pin and the credit default, nothing else changed', () => {
    const stored = storedV1()
    expect(projectSchemaV1.safeParse(stored).success).toBe(true)
    const expected = { ...stored, schemaVersion: 3, pins: PIN, credit: CREDIT }
    expect(migrate(stored)).toEqual({ ok: true, value: expected })
    const loaded = loadProject(stored)
    expect(loaded).toEqual({ ok: true, value: expected })
    expect(loaded.ok && Object.isFrozen(loaded.value)).toBe(true)
    expect(stored).not.toHaveProperty('pins') // the stored document is never mutated
  })

  it('the v1 → v2 migration pins cliopatria 0.2.0 whatever the current default', () => {
    expect(migrations[1]({ schemaVersion: 1 })).toEqual({ schemaVersion: 1, pins: { geo: { dataset: 'cliopatria', version: '0.2.0' } } })
  })

  it('v2 fixture: a stored v2 Project migrates to v3 with the credit default and nothing else changed', () => {
    const stored = storedV2()
    expect(projectSchemaV2.safeParse(stored).success).toBe(true)
    const expected = { ...stored, schemaVersion: 3, credit: CREDIT }
    expect(migrate(stored)).toEqual({ ok: true, value: expected })
    const loaded = loadProject(stored)
    expect(loaded).toEqual({ ok: true, value: expected })
    expect(loaded.ok && Object.isFrozen(loaded.value)).toBe(true)
    expect(stored).not.toHaveProperty('credit') // the stored document is never mutated
  })

  it('the v2 → v3 migration writes the literal default whatever the current one', () => {
    expect(migrations[2]({ schemaVersion: 2 })).toEqual({ schemaVersion: 2, credit: { corner: 'bottom-left', prominence: 'discreet' } })
  })

  it('passes a v3 document through unchanged (fixture: a stored blank Project)', () => {
    const stored = asPlain(blankProject())
    expect(stored).toMatchObject({ schemaVersion: 3, pins: PIN, credit: CREDIT })
    expect(migrate(stored)).toEqual({ ok: true, value: stored })
    const loaded = loadProject(stored)
    expect(loaded).toEqual({ ok: true, value: stored })
    expect(loaded.ok && Object.isFrozen(loaded.value)).toBe(true)
  })

  it('loadProject refuses a v4 document with schema_too_new', () => {
    expect(loadProject({ ...asPlain(blankProject()), schemaVersion: 4 })).toEqual({
      ok: false,
      error: { code: 'schema_too_new', params: { version: 4, supported: 3 } },
    })
  })

  it('loadProject refuses an invalid v3 document with invalid_document', () => {
    const result = loadProject({ ...asPlain(blankProject()), outputFormat: '4:3' })
    expect(result).toEqual({ ok: false, error: { code: 'invalid_document', params: { reason: 'schema', path: 'outputFormat' } } })
  })

  it('refuses a newer document with schema_too_new', () => {
    expect(migrate({ ...asPlain(blankProject()), schemaVersion: 4 })).toEqual({
      ok: false,
      error: { code: 'schema_too_new', params: { version: 4, supported: 3 } },
    })
  })

  it.each([[null], [[]], ['project'], [{}], [{ schemaVersion: 0 }], [{ schemaVersion: '1' }], [{ schemaVersion: 1.5 }]])(
    'refuses %j as invalid_document',
    (doc) => {
      const result = migrate(doc)
      expect(result.ok ? null : result.error.code).toBe('invalid_document')
    },
  )

  it('chains migrations vN → vN+1 up to the current version', () => {
    const registry = {
      1: (doc: Readonly<Record<string, unknown>>) => ({ ...doc, a: 1 }),
      2: (doc: Readonly<Record<string, unknown>>) => ({ ...doc, b: Number(doc.a) + 1 }),
    }
    expect(migrateWith({ schemaVersion: 1 }, registry, 3)).toEqual({ ok: true, value: { schemaVersion: 3, a: 1, b: 2 } })
    expect(migrateWith({ schemaVersion: 2, a: 5 }, registry, 3)).toEqual({ ok: true, value: { schemaVersion: 3, a: 5, b: 6 } })
  })

  it('throws when a migration step is missing (a programmer error)', () => {
    expect(() => migrateWith({ schemaVersion: 1 }, {}, 2)).toThrow('Missing migration v1 → v2.')
  })
})

describe('validate', () => {
  const stored = asPlain(blankProject())

  it.each([
    ['an unknown field', { ...stored, extra: true }],
    ['a missing field', { ...stored, layers: undefined }],
    ['a bad output format', { ...stored, outputFormat: '4:3' }],
    ['a missing pin', { ...stored, pins: undefined }],
    ['a missing credit', { ...stored, credit: undefined }],
    ['an unknown credit corner', { ...stored, credit: { corner: 'middle', prominence: 'discreet' } }],
    ['an unknown credit prominence', { ...stored, credit: { corner: 'top-left', prominence: 'loud' } }],
    ['a credit that can be hidden', { ...stored, credit: { corner: 'top-left', prominence: 'discreet', hidden: true } }],
    ['an optional-credit switch', { ...stored, credit: { corner: 'top-left', prominence: 'discreet', showOptional: false } }],
    ['a malformed pin', { ...stored, pins: { geo: { dataset: 'cliopatria', version: 'latest' } } }],
    ['an unknown pin', { ...stored, pins: { geo: PIN.geo, tiles: PIN.geo } }],
    ['a bad reference date', { ...stored, referenceDate: { year: 1900, month: 2, day: 30 } }],
    ['duplicate Layer ids', { ...stored, layers: [(stored.layers as unknown[])[0], (stored.layers as unknown[])[0]] }],
    ['duplicate Step ids', { ...stored, steps: [(stored.steps as unknown[])[0], (stored.steps as unknown[])[0]] }],
    ['a day with an out-of-range month', { ...stored, referenceDate: { year: 1900, month: 13, day: 5 } }],
    ['a name with a newline', { ...stored, name: 'a\nb' }],
    ['an empty name', { ...stored, name: '' }],
    ['an untrimmed name', { ...stored, name: ' x' }],
  ])('refuses %s with invalid_document', (_label, doc) => {
    const result = validate(doc)
    expect(result.ok ? null : result.error.code).toBe('invalid_document')
  })

  it('exposes a JSON Schema for the snapshot', () => {
    expect(projectJsonSchema()).toMatchObject({ type: 'object', additionalProperties: false })
  })
})
