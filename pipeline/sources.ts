// Source manifest and licence gate for the basemap pipeline (Story 1.8, AD-17).
// The gate runs on the manifest alone, before any download or write.

import { readFileSync } from 'node:fs'

/** Data licences accepted for downloaded sources (AD-17). */
export const ALLOWED_DATA_LICENCES: ReadonlySet<string> = new Set(['Public-Domain', 'CC0-1.0', 'CC-BY-4.0'])

/** Refused outright: non-commercial, share-alike, ODbL, copyleft (AD-17). */
const REFUSED_DATA_LICENCE = /(^|[-\s])(NC|SA)([-\s]|$)|ODbL|^(A|L)?GPL/i

/** Layer ids that would add road, rail or other modern infrastructure (spec: never). */
const INFRASTRUCTURE_LAYER = /road|rail|airport|port|infrastructure|ferry|pipeline|trail/i

export interface SourceFile {
  name: string
  url: string
  /** Hex SHA-256; empty means "not pinned yet" (warn, never fail). */
  sha256: string
  /** For archives: the member to extract. */
  extract?: string
}

export interface Source {
  id: string
  kind: 'vector' | 'raster'
  layer: string
  version: string
  source: string
  licence: string
  attribution: string
  creditRequired: boolean
  files: SourceFile[]
}

export interface Manifest {
  naturalEarthRelease: string
  sources: Source[]
}

export class LicenceError extends Error {
  readonly sourceId: string
  constructor(sourceId: string, message: string) {
    super(`Source "${sourceId}": ${message}`)
    this.name = 'LicenceError'
    this.sourceId = sourceId
  }
}

export class ManifestError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ManifestError'
  }
}

/** Throws a LicenceError naming the first source whose licence is not acceptable. */
export function assertLicences(manifest: Manifest): void {
  for (const source of manifest.sources) {
    const licence = source.licence.trim()
    if (REFUSED_DATA_LICENCE.test(licence)) {
      throw new LicenceError(source.id, `licence "${licence}" is refused (non-commercial, share-alike, ODbL or copyleft, AD-17)`)
    }
    if (!ALLOWED_DATA_LICENCES.has(licence)) {
      throw new LicenceError(
        source.id,
        `licence "${licence}" is not on the data allowlist (${[...ALLOWED_DATA_LICENCES].join(', ')}) (AD-17)`,
      )
    }
    if (INFRASTRUCTURE_LAYER.test(source.layer) || INFRASTRUCTURE_LAYER.test(source.id)) {
      throw new LicenceError(source.id, 'road, rail and other modern infrastructure layers are not allowed in the basemap')
    }
  }
}

const VECTOR_URL = /^https:\/\/raw\.githubusercontent\.com\/nvkelso\/natural-earth-vector\/v\d+\.\d+\.\d+\//
const RASTER_URL = /^https:\/\/naciscdn\.org\/naturalearth\//

/** Structural checks: required fields, pinned and allowed URLs, well-formed checksums. */
export function validateManifest(data: unknown): Manifest {
  if (!data || typeof data !== 'object') throw new ManifestError('manifest must be an object')
  const { naturalEarthRelease, sources } = data as Partial<Manifest>
  if (typeof naturalEarthRelease !== 'string' || !Array.isArray(sources) || sources.length === 0) {
    throw new ManifestError('manifest needs "naturalEarthRelease" and a non-empty "sources" list')
  }
  const ids = new Set<string>()
  for (const source of sources) {
    const where = `source "${String(source?.id)}"`
    if (
      typeof source?.id !== 'string' ||
      (source.kind !== 'vector' && source.kind !== 'raster') ||
      typeof source.layer !== 'string' ||
      typeof source.version !== 'string' ||
      typeof source.source !== 'string' ||
      typeof source.licence !== 'string' ||
      typeof source.attribution !== 'string' ||
      typeof source.creditRequired !== 'boolean' ||
      !Array.isArray(source.files) ||
      source.files.length === 0
    ) {
      throw new ManifestError(`${where} is missing required fields`)
    }
    if (ids.has(source.id)) throw new ManifestError(`duplicate source id "${source.id}"`)
    ids.add(source.id)
    for (const file of source.files) {
      if (typeof file?.name !== 'string' || typeof file.url !== 'string' || typeof file.sha256 !== 'string') {
        throw new ManifestError(`${where} has a malformed file entry`)
      }
      if (file.sha256 !== '' && !/^[0-9a-f]{64}$/.test(file.sha256)) {
        throw new ManifestError(`${where}: checksum of ${file.name} is not a SHA-256 hex digest`)
      }
      if (!(source.kind === 'vector' ? VECTOR_URL : RASTER_URL).test(file.url)) {
        throw new ManifestError(`${where}: URL ${file.url} is not a version-pinned Natural Earth URL`)
      }
    }
  }
  return { naturalEarthRelease, sources }
}

/** Reads, validates and licence-gates a manifest file. Nothing is downloaded. */
export function loadManifest(path: string): Manifest {
  const manifest = validateManifest(JSON.parse(readFileSync(path, 'utf8')))
  assertLicences(manifest)
  return manifest
}
