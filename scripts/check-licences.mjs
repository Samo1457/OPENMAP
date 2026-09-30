// AD-17 licence gate: every installed package (the whole tree, dev tooling
// included) must carry an allowlisted licence, or a reviewed entry in
// licence-overrides.json with a non-empty reason.
//
// Usage: node scripts/check-licences.mjs [--start <dir>] [--overrides <file>]

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

/** SPDX ids accepted without review (AD-17). */
export const ALLOWED_LICENCES = new Set([
  'MIT',
  'ISC',
  'Apache-2.0',
  '0BSD',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'Unlicense',
  'BlueOak-1.0.0',
  'OFL-1.1',
])

/**
 * Refused outright, even as one side of a dual licence, and never overridable (AD-17):
 * GPL/LGPL/AGPL, share-alike (CC-BY-SA-*), non-commercial (*-NC-*), ODbL.
 */
const REFUSED = /^(A|L)?GPL|-SA(-|$)|-NC(-|$)|^ODbL/i

/**
 * Splits an SPDX expression into tokens: identifiers, `AND`, `OR`, `(`, `)`.
 * `WITH <exception>` is folded into the preceding identifier.
 * @param {string} expression
 * @returns {string[]}
 */
function tokenize(expression) {
  const raw = expression.replace(/[()]/g, ' $& ').trim().split(/\s+/).filter(Boolean)
  /** @type {string[]} */
  const tokens = []
  for (let i = 0; i < raw.length; i++) {
    const upper = raw[i].toUpperCase()
    if (upper === 'WITH' && tokens.length > 0 && i + 1 < raw.length) {
      tokens[tokens.length - 1] += ` WITH ${raw[++i]}`
    } else if (upper === 'AND' || upper === 'OR') {
      tokens.push(upper)
    } else {
      tokens.push(raw[i])
    }
  }
  return tokens
}

/**
 * Normalizes one licence id as reported by license-checker ("MIT*" is a guess
 * from the licence file; "BSD" and "OFL" appear in older packages).
 * @param {string} id
 */
function normalizeId(id) {
  const clean = id.replace(/\*$/, '').trim()
  if (/^BSD$/i.test(clean)) return 'BSD-3-Clause'
  if (/^OFL$/i.test(clean) || /^SIL OFL 1\.1$/i.test(clean)) return 'OFL-1.1'
  return clean
}

/**
 * Evaluates an SPDX expression: `OR` needs one allowed side, `AND` needs both;
 * `AND` binds tighter than `OR`. Any refused id (see REFUSED) makes the whole expression
 * refused, and `refused: true` means no override may accept it.
 * @param {string | string[] | undefined} licences license-checker `licenses` field
 * @returns {{ allowed: boolean, reason: string, refused?: boolean }}
 */
export function classifyLicence(licences) {
  if (licences === undefined || licences === '') return { allowed: false, reason: 'no licence declared' }
  // A legacy `licenses` array lists alternatives.
  const expression = Array.isArray(licences) ? licences.map((l) => `(${l})`).join(' OR ') : licences
  let tokens
  try {
    tokens = tokenize(expression)
  } catch {
    return { allowed: false, reason: 'unparsable licence expression' }
  }
  const ids = tokens.filter((t) => t !== 'AND' && t !== 'OR' && t !== '(' && t !== ')').map(normalizeId)
  if (ids.length === 0) return { allowed: false, reason: 'no licence declared' }
  const refused = ids.find((id) => REFUSED.test(id))
  if (refused) return { allowed: false, refused: true, reason: `licence ${refused} is refused and cannot be overridden (AD-17)` }

  let pos = 0
  /** @returns {boolean} */
  const parseOr = () => {
    let value = parseAnd()
    while (tokens[pos] === 'OR') {
      pos++
      const right = parseAnd()
      value = value || right
    }
    return value
  }
  /** @returns {boolean} */
  const parseAnd = () => {
    let value = parseAtom()
    while (tokens[pos] === 'AND') {
      pos++
      const right = parseAtom()
      value = value && right
    }
    return value
  }
  /** @returns {boolean} */
  const parseAtom = () => {
    const token = tokens[pos++]
    if (token === undefined) throw new Error('unexpected end')
    if (token === '(') {
      const value = parseOr()
      if (tokens[pos++] !== ')') throw new Error('missing )')
      return value
    }
    if (token === ')' || token === 'AND' || token === 'OR') throw new Error(`unexpected ${token}`)
    return ALLOWED_LICENCES.has(normalizeId(token))
  }

  let allowed
  try {
    allowed = parseOr()
    if (pos !== tokens.length) throw new Error('trailing tokens')
  } catch {
    return { allowed: false, reason: `unparsable licence expression "${expression}"` }
  }
  return allowed
    ? { allowed: true, reason: 'allowlisted' }
    : { allowed: false, reason: `licence "${expression}" is not on the AD-17 allowlist` }
}

/**
 * @typedef {{ package: string, licence: string, reason: string }} LicenceOverride
 */

/**
 * Validates licence-overrides.json content. Every entry needs `package`,
 * `licence` and a non-empty `reason`.
 * @param {unknown} data
 * @returns {{ overrides: LicenceOverride[], errors: string[] }}
 */
export function parseOverrides(data) {
  /** @type {string[]} */
  const errors = []
  /** @type {LicenceOverride[]} */
  const overrides = []
  const list = data && typeof data === 'object' && 'overrides' in data ? data.overrides : undefined
  if (!Array.isArray(list)) return { overrides, errors: ['licence-overrides.json must be {"overrides": [...]}'] }
  list.forEach((entry, index) => {
    const ok =
      entry &&
      typeof entry === 'object' &&
      typeof entry.package === 'string' &&
      entry.package.trim() !== '' &&
      typeof entry.licence === 'string' &&
      entry.licence.trim() !== '' &&
      typeof entry.reason === 'string' &&
      entry.reason.trim() !== ''
    if (ok) overrides.push(entry)
    else errors.push(`override #${index} needs a non-empty "package", "licence" and "reason"`)
  })
  return { overrides, errors }
}

/**
 * `package` is an exact name, or a name prefix ending in `*` (platform binaries
 * such as lightningcss-linux-x64-gnu). The licence must match exactly, so a
 * licence change needs a new review.
 * @param {LicenceOverride} override
 * @param {string} name
 * @param {string} licence
 */
function overrideMatches(override, name, licence) {
  const nameOk = override.package.endsWith('*')
    ? name.startsWith(override.package.slice(0, -1))
    : name === override.package
  return nameOk && override.licence === licence
}

/**
 * @param {Record<string, { licenses?: string | string[] }>} packages license-checker output, keyed `name@version`
 * @param {LicenceOverride[]} overrides
 * @returns {{ violations: string[], overridden: string[], unusedOverrides: LicenceOverride[] }}
 */
export function checkPackages(packages, overrides) {
  /** @type {string[]} */
  const violations = []
  /** @type {string[]} */
  const overridden = []
  const used = new Set()
  for (const [key, info] of Object.entries(packages)) {
    const name = key.slice(0, key.lastIndexOf('@'))
    const licence = Array.isArray(info.licenses) ? info.licenses.join(' OR ') : (info.licenses ?? '')
    const verdict = classifyLicence(info.licenses)
    if (verdict.allowed) continue
    if (verdict.refused) {
      violations.push(`${key}: ${verdict.reason}`)
      continue
    }
    const override = overrides.find((o) => overrideMatches(o, name, licence))
    if (override) {
      used.add(override)
      overridden.push(`${key} (${licence}): ${override.reason}`)
    } else {
      violations.push(`${key}: ${verdict.reason}`)
    }
  }
  return { violations, overridden, unusedOverrides: overrides.filter((o) => !used.has(o)) }
}

/** @param {string} start */
async function scan(start) {
  const checker = await import('license-checker-rseidelsohn')
  const rootName = JSON.parse(readFileSync(resolve(start, 'package.json'), 'utf8')).name
  return new Promise((resolvePackages, reject) => {
    checker.init(
      { start, excludePackagesStartingWith: `${rootName}@` },
      /** @param {Error | undefined} err @param {Record<string, { licenses?: string | string[] }>} packages */
      (err, packages) => (err ? reject(err) : resolvePackages(packages)),
    )
  })
}

/** @param {string[]} argv */
async function main(argv) {
  /** @param {string} flag @param {string} fallback */
  const arg = (flag, fallback) => {
    const i = argv.indexOf(flag)
    return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback
  }
  const start = resolve(arg('--start', process.cwd()))
  const overridesFile = resolve(arg('--overrides', resolve(start, 'licence-overrides.json')))

  const { overrides, errors } = parseOverrides(JSON.parse(readFileSync(overridesFile, 'utf8')))
  if (errors.length > 0) {
    console.error(`Invalid ${overridesFile}:\n  ${errors.join('\n  ')}`)
    return 1
  }
  /** @type {Record<string, { licenses?: string | string[] }>} */
  const packages = /** @type {any} */ (await scan(start))
  const { violations, overridden, unusedOverrides } = checkPackages(packages, overrides)

  for (const line of overridden) console.log(`override  ${line}`)
  for (const o of unusedOverrides) console.log(`unused override: ${o.package} (${o.licence})`)
  if (violations.length > 0) {
    console.error(`\nAD-17: ${violations.length} package(s) with a licence outside the allowlist:`)
    for (const line of violations) console.error(`  ${line}`)
    console.error('\nRemove the dependency, or add a reviewed entry with a reason to licence-overrides.json.')
    return 1
  }
  console.log(`\nAD-17: ${Object.keys(packages).length} packages checked, all licences allowed.`)
  return 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (err) => {
      console.error(err)
      process.exit(1)
    },
  )
}
