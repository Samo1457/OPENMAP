import { describe, expect, it } from 'vitest'
import { blankProject } from '../testing/fixtures'
import { CURRENT_SCHEMA_VERSION, loadProject, migrate, migrateWith, migrations, projectJsonSchema, validate } from '.'

const asPlain = (value: unknown) => JSON.parse(JSON.stringify(value)) as Record<string, unknown>

describe('migrate (AD-9)', () => {
  it('is at version 1 with no migrations yet', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(1)
    expect(migrations).toEqual({})
  })

  it('passes a v1 document through unchanged (fixture: a stored blank Project)', () => {
    const stored = asPlain(blankProject())
    expect(migrate(stored)).toEqual({ ok: true, value: stored })
    const loaded = loadProject(stored)
    expect(loaded).toEqual({ ok: true, value: stored })
    expect(loaded.ok && Object.isFrozen(loaded.value)).toBe(true)
  })

  it('loadProject refuses a v2 document with schema_too_new', () => {
    expect(loadProject({ ...asPlain(blankProject()), schemaVersion: 2 })).toEqual({
      ok: false,
      error: { code: 'schema_too_new', params: { version: 2, supported: 1 } },
    })
  })

  it('loadProject refuses an invalid v1 document with invalid_document', () => {
    const result = loadProject({ ...asPlain(blankProject()), outputFormat: '4:3' })
    expect(result).toEqual({ ok: false, error: { code: 'invalid_document', params: { reason: 'schema', path: 'outputFormat' } } })
  })

  it('refuses a newer document with schema_too_new', () => {
    expect(migrate({ ...asPlain(blankProject()), schemaVersion: 2 })).toEqual({
      ok: false,
      error: { code: 'schema_too_new', params: { version: 2, supported: 1 } },
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
