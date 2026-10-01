// Schema snapshot check (AD-9), used by schema-snapshot.test.ts and guardrails.test.ts: the current
// Zod schema must match its committed JSON Schema snapshot, and every older version needs a
// snapshot and a migration. Snapshots are compared as parsed JSON, so line endings and
// formatting never count as drift.

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { isDeepStrictEqual } from 'node:util'

export interface SchemaCheckInput {
  /** Directory holding the committed `project-v<N>.schema.json` files. */
  readonly dir: string
  readonly currentVersion: number
  /** JSON Schema generated from the current Zod schema. */
  readonly schema: unknown
  /** Versions N that have a vN → vN+1 migration. */
  readonly migrationVersions: readonly number[]
}

const FILE = /^project-v(\d+)\.schema\.json$/
const file = (version: number) => `project-v${version}.schema.json`

export function readSnapshot(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'))
}

export function schemaSnapshotIssues({ dir, currentVersion, schema, migrationVersions }: SchemaCheckInput): string[] {
  const issues: string[] = []
  const current = join(dir, file(currentVersion))
  if (!existsSync(current)) {
    issues.push(`${file(currentVersion)} is missing: run npm run schema:snapshot and commit it.`)
  } else if (!isDeepStrictEqual(readSnapshot(current), schema)) {
    issues.push(
      `The Project schema changed but ${file(currentVersion)} is a frozen snapshot of v${currentVersion}. ` +
        `Do not edit it: bump CURRENT_SCHEMA_VERSION to ${currentVersion + 1} in src/core/schema, ` +
        `add a v${currentVersion} → v${currentVersion + 1} migration with a fixture test, then run npm run schema:snapshot (AD-9).`,
    )
  }
  for (let version = 1; version < currentVersion; version++) {
    if (!existsSync(join(dir, file(version)))) issues.push(`${file(version)} is missing: committed snapshots are never deleted (AD-9).`)
    if (!migrationVersions.includes(version)) issues.push(`The v${version} → v${version + 1} migration is missing (AD-9).`)
  }
  for (const name of readdirSync(dir)) {
    const match = FILE.exec(name)
    if (match && Number(match[1]) > currentVersion) issues.push(`${name} is newer than CURRENT_SCHEMA_VERSION ${currentVersion}.`)
  }
  return issues
}
