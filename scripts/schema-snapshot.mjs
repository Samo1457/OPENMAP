// Writes schemas/project-v<CURRENT_SCHEMA_VERSION>.schema.json from the Zod schema in src/core (AD-9).
// A committed snapshot is frozen: this script never overwrites one. If the schema changed, bump
// CURRENT_SCHEMA_VERSION, add the migration and its fixture test, then run it again.

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createServer } from 'vite'

const ROOT = resolve(import.meta.dirname, '..')
const server = await createServer({ root: ROOT, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
try {
  const schema = await server.ssrLoadModule('/src/core/schema/index.ts')
  const version = schema.CURRENT_SCHEMA_VERSION
  const file = join(ROOT, 'schemas', schema.projectSchemaSnapshotFile(version))
  const text = schema.projectSchemaSnapshot()
  if (!existsSync(file)) {
    writeFileSync(file, text)
    console.log(`Wrote ${file}.`)
  } else if (readFileSync(file, 'utf8') === text) {
    console.log(`${file} is up to date.`)
  } else {
    console.error(
      `${file} is a committed snapshot and differs from the current schema. Never edit it: bump CURRENT_SCHEMA_VERSION in src/core/schema, add a v${version} → v${version + 1} migration with a fixture test, then rerun npm run schema:snapshot (AD-9).`,
    )
    process.exitCode = 1
  }
} finally {
  await server.close()
}
