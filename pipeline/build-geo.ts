// Orchestrates the historical borders pipeline (Story 1.9):
//   npm run pipeline:geo [-- --out <dir>] [-- --cache <dir>] [-- --manifest <file>]
// Licence gate first, then the cached, checksum-verified Cliopatria download, then one
// GeoJSON file per entity state plus an index under library/v1/geo/. Everything is built
// in memory and swapped in at once, so a failure leaves the previous output untouched.

import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { dirname, join, resolve } from 'node:path'
import { assertReplaceable, directorySize, formatBytes, parseArgs, swapIn, type BuildOptions } from './build-basemap.ts'
import { extractZipMember, fetchCached } from './download.ts'
import { buildGeo, readRows, type GeoBuild } from './geo.ts'
import { loadGeoManifest } from './sources.ts'

const HERE = import.meta.dirname

export const GEO_ROOT = 'library/v1/geo'
export const GEO_INDEX = `${GEO_ROOT}/index.json`

export type GeoBuildOptions = Pick<BuildOptions, 'manifestPath' | 'outDir' | 'cacheDir' | 'fetcher' | 'log' | 'warn'>

export interface GeoBuildReport {
  outDir: string
  entities: number
  states: number
  indexBytes: number
  stateBytes: number
  totalBytes: number
  gzipBytes: number
  /** Size on disk of the output tree, directory entries and file system overhead aside. */
  diskBytes: number
  /** Rings and polygons removed by simplification and rounding. */
  droppedRings: number
  droppedPolygons: number
}

export async function buildGeoBorders(options: GeoBuildOptions = {}): Promise<GeoBuildReport> {
  const log = options.log ?? console.log
  const warn = options.warn ?? console.warn
  const manifestPath = options.manifestPath ?? join(HERE, 'sources-geo.json')
  const outDir = resolve(options.outDir ?? join(HERE, 'out-geo'))
  const cacheDir = resolve(options.cacheDir ?? join(HERE, 'cache'))

  // 1. Licence gate: before anything else, then the directory check.
  const manifest = loadGeoManifest(manifestPath)
  assertReplaceable(outDir, GEO_INDEX, 'historical borders')
  const [source] = manifest.sources
  const [file] = source.files

  // 2. Cached, verified download.
  log(`Source ${source.id}: ${file.name}`)
  const zip = await fetchCached({ url: file.url, dest: join(cacheDir, source.id, file.name), sha256: file.sha256, fetcher: options.fetcher, warn })
  const json = new TextDecoder().decode(extractZipMember(zip, file.extract as string))

  // 3. Entities and states.
  const rows = readRows(JSON.parse(json))
  log(`Rows read: ${rows.length}`)
  const geo: GeoBuild = buildGeo(rows, {
    id: source.id,
    version: source.version,
    source: source.source,
    licence: source.licence,
    attribution: source.attribution,
    creditRequired: source.creditRequired,
  })

  // 4. Write into a fresh directory, then swap it in.
  const indexData = `${JSON.stringify(geo.index)}\n`
  const staging = `${outDir}.tmp`
  rmSync(staging, { recursive: true, force: true })
  try {
    const write = (path: string, data: string) => {
      const target = join(staging, GEO_ROOT, path)
      mkdirSync(dirname(target), { recursive: true })
      writeFileSync(target, data)
    }
    for (const state of geo.states) write(state.path, state.data)
    write('index.json', indexData)
    assertReplaceable(outDir, GEO_INDEX, 'historical borders')
    swapIn(staging, outDir)
  } catch (error) {
    rmSync(staging, { recursive: true, force: true })
    throw error
  }

  const stateBytes = geo.states.reduce((n, s) => n + Buffer.byteLength(s.data), 0)
  const indexBytes = Buffer.byteLength(indexData)
  const gzipBytes = geo.states.reduce((n, s) => n + gzipSync(s.data).length, gzipSync(indexData).length)
  const { counts } = geo.index.dataset
  const report: GeoBuildReport = {
    outDir,
    entities: counts.entities,
    states: counts.states,
    indexBytes,
    stateBytes,
    totalBytes: indexBytes + stateBytes,
    gzipBytes,
    diskBytes: directorySize(outDir),
    droppedRings: geo.dropped.droppedRings,
    droppedPolygons: geo.dropped.droppedPolygons,
  }
  log(`\nOutput in ${outDir}`)
  log(`  entities: ${counts.entities} (${counts.polities} polities, ${counts.groups} groups, ${counts.relations} relations)`)
  log(`  states: ${counts.states}`)
  log(`  dropped: ${report.droppedRings} rings, ${report.droppedPolygons} polygons`)
  log(`  index.json: ${formatBytes(indexBytes)}`)
  log(`  state files: ${formatBytes(stateBytes)}`)
  log(`  total: ${formatBytes(report.totalBytes)} (${formatBytes(gzipBytes)} gzipped)`)
  return report
}

if (import.meta.main) {
  try {
    const argv = process.argv.slice(2)
    for (const flag of ['--vector-only', '--pin']) {
      if (argv.includes(flag)) throw new Error(`${flag} only applies to pipeline:basemap`)
    }
    const { outDir, cacheDir, manifestPath } = parseArgs(argv)
    await buildGeoBorders({ outDir, cacheDir, manifestPath })
  } catch (error) {
    console.error(`\nHistorical borders pipeline failed: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  }
}
