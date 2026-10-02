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
  kind: 'vector' | 'raster' | 'geo'
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

/** Manifest of the historical borders pipeline (Story 1.9): one pinned Cliopatria release. */
export interface GeoManifest {
  cliopatriaRelease: string
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
export function assertLicences(manifest: { sources: Source[] }): void {
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
const GEO_URL = /^https:\/\/raw\.githubusercontent\.com\/Seshat-Global-History-Databank\/cliopatria\/v\d+\.\d+\.\d+\//

const URL_PATTERN: Record<Source['kind'], RegExp> = { vector: VECTOR_URL, raster: RASTER_URL, geo: GEO_URL }
const URL_LABEL: Record<Source['kind'], string> = { vector: 'Natural Earth', raster: 'Natural Earth', geo: 'Cliopatria' }

/** Field, URL and checksum checks shared by both manifests. `kinds` are the source kinds the manifest accepts. */
function validateSources(sources: unknown[], kinds: Source['kind'][], requirePinned: boolean): Source[] {
  const ids = new Set<string>()
  for (const entry of sources) {
    const source = entry as Partial<Source> | undefined
    const where = `source "${String(source?.id)}"`
    if (
      typeof source?.id !== 'string' ||
      !kinds.includes(source.kind as Source['kind']) ||
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
      if (requirePinned && file.sha256 === '') {
        throw new ManifestError(`${where}: checksum of ${file.name} must be pinned`)
      }
      if (!URL_PATTERN[source.kind as Source['kind']].test(file.url)) {
        throw new ManifestError(`${where}: URL ${file.url} is not a version-pinned ${URL_LABEL[source.kind as Source['kind']]} URL`)
      }
    }
  }
  return sources as Source[]
}

/** Structural checks: required fields, pinned and allowed URLs, well-formed checksums. */
export function validateManifest(data: unknown): Manifest {
  if (!data || typeof data !== 'object') throw new ManifestError('manifest must be an object')
  const { naturalEarthRelease, sources } = data as Partial<Manifest>
  if (typeof naturalEarthRelease !== 'string' || !Array.isArray(sources) || sources.length === 0) {
    throw new ManifestError('manifest needs "naturalEarthRelease" and a non-empty "sources" list')
  }
  return { naturalEarthRelease, sources: validateSources(sources, ['vector', 'raster'], false) }
}

/** Structural checks of the Cliopatria manifest: exactly one source, one archive file, checksum pinned. */
export function validateGeoManifest(data: unknown): GeoManifest {
  if (!data || typeof data !== 'object') throw new ManifestError('manifest must be an object')
  const { cliopatriaRelease, sources } = data as Partial<GeoManifest>
  if (typeof cliopatriaRelease !== 'string' || !Array.isArray(sources) || sources.length !== 1) {
    throw new ManifestError('geo manifest needs "cliopatriaRelease" and exactly one source')
  }
  const [source] = validateSources(sources, ['geo'], true)
  if (source.files.length !== 1 || !source.files[0].extract) {
    throw new ManifestError(`source "${source.id}" needs exactly one archive file with an "extract" member`)
  }
  if (source.version !== cliopatriaRelease) {
    throw new ManifestError(`source "${source.id}": version ${source.version} differs from cliopatriaRelease ${cliopatriaRelease}`)
  }
  for (const file of source.files) {
    const tag = /\/cliopatria\/v(\d+\.\d+\.\d+)\//.exec(file.url)?.[1]
    if (tag !== cliopatriaRelease) {
      throw new ManifestError(`source "${source.id}": URL ${file.url} is pinned to tag v${tag}, not release v${cliopatriaRelease}`)
    }
  }
  return { cliopatriaRelease, sources: [source] }
}

/** Reads, validates and licence-gates a manifest file. Nothing is downloaded. */
export function loadManifest(path: string): Manifest {
  const manifest = validateManifest(JSON.parse(readFileSync(path, 'utf8')))
  assertLicences(manifest)
  return manifest
}

/** Reads, validates and licence-gates the Cliopatria manifest. Nothing is downloaded. */
export function loadGeoManifest(path: string): GeoManifest {
  const manifest = validateGeoManifest(JSON.parse(readFileSync(path, 'utf8')))
  assertLicences(manifest)
  return manifest
}
