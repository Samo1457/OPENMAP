// Proves every guardrail rejects a violating fixture (Story 1.1). Each check
// runs the real tool with the repo's own config inside a throwaway copy of the
// fixture tree, so the fixtures never pollute the normal lint/typecheck/depcruise runs.

import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { checkPackages, classifyLicence, parseOverrides } from '../../scripts/check-licences.mjs'

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
  ])('%s fails with rule %s', (fixture, rule) => {
    const result = depcruise(fixture)
    expect(result.status, result.output).not.toBe(0)
    expect(result.output).toContain(rule)
  })

  it.each(['adapter-imports-adapter-index', 'core-imports-core', 'core-test-imports-vitest'])('%s passes', (fixture) => {
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
