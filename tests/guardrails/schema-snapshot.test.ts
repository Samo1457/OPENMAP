// AD-9: CI fails if the Project schema changes without a new schemaVersion, a migration and a snapshot.
// The violating fixtures are asserted in guardrails.test.ts.
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { CURRENT_SCHEMA_VERSION, migrations, projectJsonSchema } from '../../src/core/schema'
import { projectSchemaV1, projectSchemaV2 } from '../../src/core/model/project'
import { readSnapshot, schemaSnapshotIssues } from './schema-check'

const ROOT = resolve(import.meta.dirname, '../..')

describe('Project schema snapshots', () => {
  it('match the current Zod schema, with a snapshot and a migration for every older version', () => {
    const issues = schemaSnapshotIssues({
      dir: join(ROOT, 'schemas'),
      currentVersion: CURRENT_SCHEMA_VERSION,
      schema: projectJsonSchema(),
      migrationVersions: Object.keys(migrations).map(Number),
    })
    expect(issues).toEqual([])
  })
})

describe('Project schema v1 snapshot', () => {
  it('is still the frozen shape of the kept v1 Zod schema (the migration source)', () => {
    expect(readSnapshot(join(ROOT, 'schemas/project-v1.schema.json'))).toEqual(z.toJSONSchema(projectSchemaV1))
  })
})

describe('Project schema v2 snapshot', () => {
  it('is still the frozen shape of the kept v2 Zod schema (the migration source)', () => {
    expect(readSnapshot(join(ROOT, 'schemas/project-v2.schema.json'))).toEqual(z.toJSONSchema(projectSchemaV2))
  })
})
