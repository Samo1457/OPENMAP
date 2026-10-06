// Proves every guardrail rejects a violating fixture (Story 1.1). Each check
// runs the real tool with the repo's own config inside a throwaway copy of the
// fixture tree, so the fixtures never pollute the normal lint/typecheck/depcruise runs.

import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { loadGeoManifest, loadManifest, loadSearchManifest, LicenceError } from '../../pipeline/sources.ts'
import { checkPackages, classifyLicence, parseOverrides } from '../../scripts/check-licences.mjs'
import { readSnapshot, schemaSnapshotIssues } from './schema-check'

const ROOT = resolve(import.meta.dirname, '../..')
const FIXTURES = join(ROOT, 'tests/guardrails/fixtures')
const BIN = join(ROOT, 'node_modules/.bin')
const workDirs: string[] = []

afterAll(() => {
  for (const dir of workDirs) rmSync(dir, { recursive: true, force: true })
})

/** Copies a fixture tree plus the given repo config files into a fresh temp project. */
function workspace(fixture: string, configs: string[]): string {
  const dir = mkdtempSync(join(tmpdir(), 'openmap-guardrail-'))
  workDirs.push(dir)
  cpSync(join(FIXTURES, fixture), dir, { recursive: true })
  for (const file of configs) cpSync(join(ROOT, file), join(dir, file))
  symlinkSync(join(ROOT, 'node_modules'), join(dir, 'node_modules'), 'dir')
  return dir
}

function run(cwd: string, command: string, args: string[]) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' })
  return { status: result.status, output: `${result.stdout}${result.stderr}` }
}

describe('oxlint bans (AD-1, AD-2)', () => {
  const dir = workspace('oxlint', ['.oxlintrc.json'])
  const lint = run(dir, join(BIN, 'oxlint'), ['--format', 'json', 'src'])
  const report = JSON.parse(lint.output.slice(lint.output.indexOf('{'))) as {
    diagnostics: { filename: string; help?: string; message: string }[]
  }
  const diagnosticsFor = (file: string) =>
    report.diagnostics.filter((d) => d.filename === file).map((d) => `${d.message} ${d.help ?? ''}`)

  it('fails the lint run', () => {
    expect(lint.status).not.toBe(0)
  })

  it.each([
    'src/core/math-random.ts',
    'src/core/date-now.ts',
    'src/core/performance-now.ts',
    'src/core/new-date.ts',
    'src/core/crypto-random.ts',
    'src/core/global-this-date.ts',
    'src/core/global-this-performance.ts',
    'src/core/global-this-crypto.ts',
  ])('rejects %s with an AD-2 message', (file) => {
    const found = diagnosticsFor(file)
    expect(found.length).toBeGreaterThan(0)
    expect(found.join('\n')).toContain('AD-2')
  })

  it.each([
    'src/render/fly-to.ts',
    'src/render/ease-to.ts',
    'src/ui/pan-to.ts',
    'src/render/fit-bounds.ts',
    'src/ui/zoom-in.ts',
    'src/core/fly-to.ts',
  ])(
    'rejects %s with an AD-1 message',
    (file) => {
      const found = diagnosticsFor(file)
      expect(found.length).toBeGreaterThan(0)
      expect(found.join('\n')).toContain('AD-1')
    },
  )

  it('allows clocks and randomness outside src/core, and jumpTo everywhere', () => {
    expect(diagnosticsFor('src/ui/allowed.ts')).toEqual([])
  })
})

describe('dependency-cruiser layer rules', () => {
  const depcruise = (fixture: string) =>
    run(workspace(`depcruise/${fixture}`, ['.dependency-cruiser.cjs', 'tsconfig.app.json']), join(BIN, 'depcruise'), [
      'src',
      '--config',
      '.dependency-cruiser.cjs',
    ])

  it.each([
    ['core-imports-react', 'core-no-react-map-libs'],
    ['core-imports-react-dom', 'core-no-react-map-libs'],
    ['core-imports-maplibre', 'core-no-react-map-libs'],
    ['core-imports-deckgl', 'core-no-react-map-libs'],
    ['core-imports-i18n', 'core-no-ui-or-i18n'],
    ['core-imports-adapter', 'core-no-adapters'],
    ['core-imports-node-builtin', 'core-only-pure-libs'],
    ['core-imports-installed-package', 'core-only-pure-libs'],
    ['core-test-imports-installed-package', 'core-tests-only-pure-libs-and-vitest'],
    ['unresolvable-import', 'not-to-unresolvable'],
    ['entry-imports-adapter-internal', 'ui-imports-adapter-index-only'],
    ['adapter-imports-adapter-internal', 'adapter-imports-other-adapter-index-only'],
    ['adapter-imports-ui', 'adapters-no-ui'],
    ['ui-imports-adapter-internal', 'ui-imports-adapter-index-only'],
    ['ui-imports-core-testing', 'core-testing-only-from-tests'],
  ])('%s fails with rule %s', (fixture, rule) => {
    const result = depcruise(fixture)
    expect(result.status, result.output).not.toBe(0)
    expect(result.output).toContain(rule)
  })

  it.each(['adapter-imports-adapter-index', 'core-imports-core', 'core-test-imports-vitest', 'core-test-imports-core-testing'])('%s passes', (fixture) => {
    const result = depcruise(fixture)
    expect(result.status, result.output).toBe(0)
  })
})

describe('src/core is typechecked without the DOM', () => {
  it('rejects a core file that touches document', () => {
    const dir = workspace('tsc-core', ['tsconfig.core.json'])
    const result = run(dir, join(BIN, 'tsc'), ['-p', 'tsconfig.core.json'])
    expect(result.status).not.toBe(0)
    expect(result.output).toContain("Cannot find name 'document'")
  })
})

describe('licence check (AD-17)', () => {
  it.each([
    'MIT',
    'ISC',
    'Apache-2.0',
    '0BSD',
    'BSD-2-Clause',
    'BSD-3-Clause',
    'Unlicense',
    'BlueOak-1.0.0',
    'OFL-1.1',
    'MIT*',
    '(MIT OR CC0-1.0)',
    '(Apache-2.0 AND MIT)',
    'MIT OR (ISC AND BSD-3-Clause)',
  ])('allows %s', (licence) => {
    expect(classifyLicence(licence).allowed).toBe(true)
  })

  it.each([
    'GPL-3.0',
    'LGPL-2.1-only',
    'AGPL-3.0-or-later',
    '(MIT OR GPL-3.0-or-later)',
    'CC-BY-4.0',
    'CC-BY-SA-4.0',
    'CC-BY-NC-4.0',
    'ODbL-1.0',
    'MPL-2.0',
    '(MIT AND CC-BY-4.0)',
    'UNLICENSED',
    'UNKNOWN',
    'Custom: LICENSE',
    '',
    undefined,
  ])('refuses %s', (licence) => {
    expect(classifyLicence(licence).allowed).toBe(false)
  })

  it('accepts a refused licence only through an override with a reason', () => {
    const packages = { 'mediabunny@1.61.0': { licenses: 'MPL-2.0' }, 'left-pad@1.0.0': { licenses: 'GPL-3.0' } }
    const { overrides } = parseOverrides({
      overrides: [{ package: 'mediabunny', licence: 'MPL-2.0', reason: 'Unmodified, AD-17.' }],
    })
    const result = checkPackages(packages, overrides)
    expect(result.violations).toEqual([expect.stringContaining('left-pad@1.0.0')])
    expect(result.overridden).toEqual([expect.stringContaining('mediabunny@1.61.0')])
  })

  it.each(['GPL-3.0', '(MIT OR GPL-3.0-or-later)', 'LGPL-2.1-only', 'AGPL-3.0', 'CC-BY-SA-4.0', 'CC-BY-NC-4.0', 'ODbL-1.0'])(
    'refuses %s even with a matching override',
    (licence) => {
      const { overrides } = parseOverrides({ overrides: [{ package: 'copyleft-lib', licence, reason: 'Tried anyway.' }] })
      const result = checkPackages({ 'copyleft-lib@1.0.0': { licenses: licence } }, overrides)
      expect(result.violations).toEqual([expect.stringContaining('copyleft-lib@1.0.0')])
      expect(result.overridden).toEqual([])
    },
  )

  it('does not apply an override whose licence differs from the detected one', () => {
    const { overrides } = parseOverrides({
      overrides: [{ package: 'mediabunny', licence: 'MPL-2.0', reason: 'Unmodified, AD-17.' }],
    })
    const result = checkPackages({ 'mediabunny@2.0.0': { licenses: 'GPL-3.0' } }, overrides)
    expect(result.violations).toHaveLength(1)
  })

  it.each([
    { package: 'x', licence: 'MPL-2.0' },
    { package: 'x', licence: 'MPL-2.0', reason: '   ' },
    { licence: 'MPL-2.0', reason: 'why' },
  ])('rejects an override without package, licence and reason: %j', (entry) => {
    expect(parseOverrides({ overrides: [entry] }).errors).toHaveLength(1)
  })

  describe('end to end on a dependency tree', () => {
    function project(licence: string, overrides: object[]) {
      const dir = mkdtempSync(join(tmpdir(), 'openmap-licences-'))
      workDirs.push(dir)
      const pkg = join(dir, 'node_modules/copyleft-lib')
      mkdirSync(pkg, { recursive: true })
      writeFileSync(join(pkg, 'package.json'), JSON.stringify({ name: 'copyleft-lib', version: '1.0.0', license: licence }))
      writeFileSync(
        join(dir, 'package.json'),
        JSON.stringify({ name: 'fixture-root', version: '0.0.0', private: true, dependencies: { 'copyleft-lib': '1.0.0' } }),
      )
      writeFileSync(join(dir, 'licence-overrides.json'), JSON.stringify({ overrides }))
      return run(ROOT, process.execPath, ['scripts/check-licences.mjs', '--start', dir])
    }

    it.each(['GPL-3.0', 'CC-BY-4.0'])('exits non-zero and lists the package for %s', (licence) => {
      const result = project(licence, [])
      expect(result.status).not.toBe(0)
      expect(result.output).toContain('copyleft-lib@1.0.0')
      expect(result.output).toContain('AD-17')
    })

    it('passes when the package has a reviewed override', () => {
      const result = project('CC-BY-4.0', [{ package: 'copyleft-lib', licence: 'CC-BY-4.0', reason: 'Reviewed.' }])
      expect(result.status, result.output).toBe(0)
    })

    it('fails when an override has an empty reason', () => {
      const result = project('CC-BY-4.0', [{ package: 'copyleft-lib', licence: 'CC-BY-4.0', reason: '' }])
      expect(result.status).not.toBe(0)
    })
  })
})

describe('schema snapshot check (AD-9)', () => {
  const SCHEMA_FIXTURES = join(FIXTURES, 'schema')
  const committedV1 = readSnapshot(join(ROOT, 'schemas/project-v1.schema.json'))

  it('the committed v1 snapshot passes the check it is compared against below', () => {
    // A directory with the v1 snapshot alone, as at the time v1 was current.
    const dir = mkdtempSync(join(tmpdir(), 'openmap-schema-v1-'))
    workDirs.push(dir)
    writeFileSync(join(dir, 'project-v1.schema.json'), JSON.stringify(committedV1))
    expect(schemaSnapshotIssues({ dir, currentVersion: 1, schema: committedV1, migrationVersions: [] })).toEqual([])
  })

  it('the committed v1, v2 and v3 snapshots pass the check for the current version, with the v1 → v2 and v2 → v3 migrations', () => {
    const committedV3 = readSnapshot(join(ROOT, 'schemas/project-v3.schema.json'))
    expect(schemaSnapshotIssues({ dir: join(ROOT, 'schemas'), currentVersion: 3, schema: committedV3, migrationVersions: [1, 2] })).toEqual([])
    // Without a migration the same snapshots fail: a version bump needs its migration (AD-9).
    expect(schemaSnapshotIssues({ dir: join(ROOT, 'schemas'), currentVersion: 3, schema: committedV3, migrationVersions: [1] })).toEqual(['The v2 → v3 migration is missing (AD-9).'])
    expect(schemaSnapshotIssues({ dir: join(ROOT, 'schemas'), currentVersion: 3, schema: committedV3, migrationVersions: [] })).toEqual(['The v1 → v2 migration is missing (AD-9).', 'The v2 → v3 migration is missing (AD-9).'])
  })

  it('drifted: a v1 snapshot that differs from the v1 schema fails with instructions', () => {
    const issues = schemaSnapshotIssues({
      dir: join(SCHEMA_FIXTURES, 'drifted'),
      currentVersion: 1,
      schema: committedV1,
      migrationVersions: [],
    })
    expect(issues).toHaveLength(1)
    expect(issues[0]).toContain('bump CURRENT_SCHEMA_VERSION to 2')
    expect(issues[0]).toContain('npm run schema:snapshot')
  })

  it('ignores formatting and line endings: only the parsed JSON counts', () => {
    const dir = mkdtempSync(join(tmpdir(), 'openmap-schema-'))
    workDirs.push(dir)
    writeFileSync(join(dir, 'project-v1.schema.json'), JSON.stringify(committedV1, null, 4).replaceAll('\n', '\r\n'))
    expect(schemaSnapshotIssues({ dir, currentVersion: 1, schema: committedV1, migrationVersions: [] })).toEqual([])
  })

  it('missing-migration: a v2 without the v1 snapshot or the v1 → v2 migration, and a stray v3, fail', () => {
    const dir = join(SCHEMA_FIXTURES, 'missing-migration')
    const issues = schemaSnapshotIssues({
      dir,
      currentVersion: 2,
      schema: readSnapshot(join(dir, 'project-v2.schema.json')),
      migrationVersions: [],
    })
    expect(issues).toEqual([
      'project-v1.schema.json is missing: committed snapshots are never deleted (AD-9).',
      'The v1 → v2 migration is missing (AD-9).',
      'project-v3.schema.json is newer than CURRENT_SCHEMA_VERSION 2.',
    ])
  })

  it('fails when the current version has no snapshot yet', () => {
    const issues = schemaSnapshotIssues({ dir: join(SCHEMA_FIXTURES, 'drifted'), currentVersion: 2, schema: {}, migrationVersions: [1] })
    expect(issues).toContain('project-v2.schema.json is missing: run npm run schema:snapshot and commit it.')
  })
})

describe('basemap data licence gate (AD-17, Story 1.8)', () => {
  const pipelineFixture = (name: string) => join(FIXTURES, 'pipeline', name)
  const dataDir = mkdtempSync(join(tmpdir(), 'openmap-pipeline-'))
  workDirs.push(dataDir)

  it.each([
    ['sources-noncommercial.json', 'nc-dataset', 'CC-BY-NC-4.0'],
    ['sources-odbl.json', 'odbl-dataset', 'ODbL-1.0'],
    ['sources-sharealike.json', 'share-alike-dataset', 'CC-BY-SA-4.0'],
  ])('%s is refused, naming the source', (file, id, licence) => {
    expect(() => loadManifest(pipelineFixture(file))).toThrow(LicenceError)
    expect(() => loadManifest(pipelineFixture(file))).toThrow(new RegExp(`${id}.*${licence}`))
  })

  it('a road layer is refused', () => {
    expect(() => loadManifest(pipelineFixture('sources-roads.json'))).toThrow(/infrastructure/)
  })

  it('the pipeline command exits non-zero before downloading or writing anything', () => {
    const out = join(dataDir, 'out')
    const cache = join(dataDir, 'cache')
    const result = run(ROOT, process.execPath, [
      'pipeline/build-basemap.ts',
      '--manifest',
      pipelineFixture('sources-noncommercial.json'),
      '--out',
      out,
      '--cache',
      cache,
    ])
    expect(result.status).not.toBe(0)
    expect(result.output).toContain('nc-dataset')
    expect(existsSync(out)).toBe(false)
    expect(existsSync(cache)).toBe(false)
  })
})

describe('historical borders licence gate (AD-17, Story 1.9)', () => {
  const pipelineFixture = (name: string) => join(FIXTURES, 'pipeline', name)
  const dataDir = mkdtempSync(join(tmpdir(), 'openmap-geo-pipeline-'))
  workDirs.push(dataDir)

  it.each([
    ['sources-geo-noncommercial.json', 'nc-borders', 'CC-BY-NC-4.0'],
    ['sources-geo-odbl.json', 'odbl-borders', 'ODbL-1.0'],
  ])('%s is refused, naming the source', (file, id, licence) => {
    expect(() => loadGeoManifest(pipelineFixture(file))).toThrow(LicenceError)
    expect(() => loadGeoManifest(pipelineFixture(file))).toThrow(new RegExp(`${id}.*${licence}`))
  })

  it('the geo pipeline command exits non-zero before downloading or writing anything', () => {
    const out = join(dataDir, 'out-geo')
    const cache = join(dataDir, 'cache')
    const result = run(ROOT, process.execPath, ['pipeline/build-geo.ts', '--manifest', pipelineFixture('sources-geo-odbl.json'), '--out', out, '--cache', cache])
    expect(result.status).not.toBe(0)
    expect(result.output).toContain('odbl-borders')
    expect(existsSync(out)).toBe(false)
    expect(existsSync(cache)).toBe(false)
  })
})

describe('place search licence gate (AD-17, Story 1.12)', () => {
  const pipelineFixture = (name: string) => join(FIXTURES, 'pipeline', name)
  const dataDir = mkdtempSync(join(tmpdir(), 'openmap-search-pipeline-'))
  workDirs.push(dataDir)

  it.each([
    ['sources-search-noncommercial.json', 'nc-names', 'CC-BY-NC-4.0'],
    ['sources-search-odbl.json', 'odbl-names', 'ODbL-1.0'],
    ['sources-search-sharealike.json', 'sa-names', 'CC-BY-SA-4.0'],
  ])('%s is refused, naming the source', (file, id, licence) => {
    expect(() => loadSearchManifest(pipelineFixture(file))).toThrow(LicenceError)
    expect(() => loadSearchManifest(pipelineFixture(file))).toThrow(new RegExp(`${id}.*${licence}`))
  })

  it('the search pipeline command exits non-zero before downloading or writing anything', () => {
    const out = join(dataDir, 'out-search')
    const cache = join(dataDir, 'cache')
    const result = run(ROOT, process.execPath, ['pipeline/build-search.ts', '--manifest', pipelineFixture('sources-search-odbl.json'), '--out', out, '--cache', cache])
    expect(result.status).not.toBe(0)
    expect(result.output).toContain('odbl-names')
    expect(existsSync(out)).toBe(false)
    expect(existsSync(cache)).toBe(false)
  })
})
