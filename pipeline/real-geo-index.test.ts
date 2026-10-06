import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { geoSourceMeta, parseGeoIndex } from '../src/core/geo/index.ts'

// Runs only where `npm run pipeline:geo` has been run (never in CI): the real Cliopatria index must
// satisfy the client schema, which requires the four source metadata fields of AD-17 (no Territory is
// drawn without its credit).
const PATH = join(import.meta.dirname, 'out-geo/library/v1/geo/index.json')

describe.skipIf(!existsSync(PATH))('the real geo index (pipeline/out-geo)', () => {
  it('carries source, licence, attribution and creditRequired, and is accepted by the client schema', () => {
    const raw = JSON.parse(readFileSync(PATH, 'utf8')) as { dataset: { id: string; version: string } }
    const parsed = parseGeoIndex(raw, { dataset: raw.dataset.id, version: raw.dataset.version })
    expect(parsed.ok).toBe(true)
    expect(parsed.ok && geoSourceMeta(parsed.value)).toMatchObject({
      id: 'cliopatria',
      licence: 'CC-BY-4.0',
      attribution: expect.stringContaining('Cliopatria'),
      creditRequired: true,
    })
  })
})
