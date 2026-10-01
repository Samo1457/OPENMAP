// AD-9: CI fails if the Project schema changes without a new schemaVersion, a migration and a snapshot.
// The violating fixtures are asserted in guardrails.test.ts.
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CURRENT_SCHEMA_VERSION, migrations, projectJsonSchema } from '../../src/core/schema'
import { schemaSnapshotIssues } from './schema-check'

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
