// Versioned document schema with forward-only migrations (AD-9). Every load path runs
// `loadProject` (migrate, then validate). A newer-than-app document is refused with
// `schema_too_new`, and the caller opens it read-only (Story 1.4).

import { freeze } from 'immer'
import { z } from 'zod'
import { type Project, projectSchemaV1 } from '../model/project'
import { type Result, err, ok } from '../result'

export const CURRENT_SCHEMA_VERSION = 1

/** The Zod schema of the current schemaVersion. */
export const projectSchema = projectSchemaV1

/** A migration turns a document of version N into one of version N + 1. Pure; never deleted. */
export type Migration = (doc: Readonly<Record<string, unknown>>) => Record<string, unknown>

/**
 * Migration registry: key N migrates vN → vN+1, so it holds keys 1..CURRENT_SCHEMA_VERSION - 1.
 * Each entry has a fixture test. v1 is the first version: nothing to migrate yet.
 */
export const migrations: Readonly<Record<number, Migration>> = {}

export type UnknownDocument = Record<string, unknown> & { schemaVersion: number }

/** Chains migrations from the document's version up to `currentVersion`. Exposed for tests. */
export function migrateWith(doc: unknown, registry: Readonly<Record<number, Migration>>, currentVersion: number): Result<UnknownDocument> {
  if (typeof doc !== 'object' || doc === null || Array.isArray(doc)) return err('invalid_document', { reason: 'not_an_object' })
  const version = (doc as Record<string, unknown>).schemaVersion
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return err('invalid_document', { reason: 'schema_version' })
  }
  if (version > currentVersion) return err('schema_too_new', { version, supported: currentVersion })
  let current = doc as Record<string, unknown>
  for (let from = version; from < currentVersion; from++) {
    const step = registry[from]
    if (!step) throw new Error(`Missing migration v${from} → v${from + 1}.`)
    current = { ...step(current), schemaVersion: from + 1 }
  }
  return ok(current as UnknownDocument)
}

/** Brings a stored document up to CURRENT_SCHEMA_VERSION. */
export function migrate(doc: unknown): Result<UnknownDocument> {
  return migrateWith(doc, migrations, CURRENT_SCHEMA_VERSION)
}

/** Validates a current-version document; the result is a frozen Project. */
export function validate(doc: unknown): Result<Project> {
  const parsed = projectSchema.safeParse(doc)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return err('invalid_document', { reason: 'schema', path: issue ? issue.path.join('.') : '' })
  }
  return ok(freeze(parsed.data, true))
}

/** The single load path (AD-9): migrate, then validate. */
export function loadProject(doc: unknown): Result<Project> {
  const migrated = migrate(doc)
  return migrated.ok ? validate(migrated.value) : migrated
}

/** JSON Schema of the current Project schema, as committed in `schemas/project-v<N>.schema.json`. */
export function projectJsonSchema(): Record<string, unknown> {
  return z.toJSONSchema(projectSchema) as Record<string, unknown>
}

export const projectSchemaSnapshotFile = (version: number) => `project-v${version}.schema.json`

/** The exact text of the committed snapshot for the current schema. */
export function projectSchemaSnapshot(): string {
  return `${JSON.stringify(projectJsonSchema(), null, 2)}\n`
}
