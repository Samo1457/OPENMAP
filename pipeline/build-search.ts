// Orchestrates the place search pipeline (Story 1.12):
//   npm run pipeline:search [-- --out <dir>] [-- --cache <dir>] [-- --manifest <file>]
// Licence gate first, then the cached, checksum-verified Natural Earth downloads, then one index
// file under library/v1/search/. Everything is built in memory and swapped in at once, so a failure
// leaves the previous output untouched. The output has its own root: the basemap build never deletes it.

import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { dirname, join, resolve } from 'node:path'
import { assertReplaceable, formatBytes, parseArgs, swapIn, type BuildOptions } from './build-basemap.ts'
import { fetchCached } from './download.ts'
import { assertSearchData, buildSearchData, SEARCH_FLOOR, type SearchData, type SearchFloor } from './search.ts'
import { loadSearchManifest, type Source } from './sources.ts'
import { readShapefile } from './vector.ts'

const HERE = import.meta.dirname

export const SEARCH_ROOT = 'library/v1/search'
export const SEARCH_INDEX = `${SEARCH_ROOT}/index.json`

export type SearchBuildOptions = Pick<BuildOptions, 'manifestPath' | 'outDir' | 'cacheDir' | 'fetcher' | 'log' | 'warn'> & {
  /** Fewest countries and places a build must hold (default `SEARCH_FLOOR`); fixture builds lower it. */
  floor?: SearchFloor
}

export interface SearchBuildReport {
  outDir: string
  countries: number
  places: number
  /** Places that name a country the list does not hold (kept, with the name). */
  unmatchedCountry: number
  /** Places whose French name differs from the English one. */
  frenchNames: number
  indexBytes: number
  gzipBytes: number
}

export async function buildSearch(options: SearchBuildOptions = {}): Promise<SearchBuildReport> {
  const log = options.log ?? console.log
  const warn = options.warn ?? console.warn
  const manifestPath = options.manifestPath ?? join(HERE, 'sources-search.json')
  const outDir = resolve(options.outDir ?? join(HERE, 'out-search'))
  const cacheDir = resolve(options.cacheDir ?? join(HERE, 'cache'))

  // 1. Licence gate: before anything else, then the directory check.
  const manifest = loadSearchManifest(manifestPath)
  assertReplaceable(outDir, SEARCH_INDEX, 'place search')

  // 2. Cached, verified downloads, then the shapefiles.
  const layers = new Map<string, Awaited<ReturnType<typeof readShapefile>>>()
  const meta = (list: Source[]) => ({
    source: [...new Set(list.map((s) => s.source))].join(', '),
    licence: [...new Set(list.map((s) => s.licence))].join(', '),
    attribution: [...new Set(list.map((s) => s.attribution))].join(' '),
    creditRequired: list.some((s) => s.creditRequired),
  })
  for (const source of manifest.sources) {
    const bytes = new Map<string, Uint8Array>()
    for (const file of source.files) {
      log(`Source ${source.id}: ${file.name}`)
      bytes.set(file.name.slice(file.name.lastIndexOf('.')), await fetchCached({ url: file.url, dest: join(cacheDir, source.id, file.name), sha256: file.sha256, fetcher: options.fetcher, warn }))
    }
    layers.set(source.layer, await readShapefile(bytes.get('.shp') as Uint8Array, bytes.get('.dbf') as Uint8Array))
  }

  // 3. The index.
  const build = buildSearchData(layers.get('countries') as never, layers.get('places') as never, meta(manifest.sources))
  const index: SearchData = build.index
  assertSearchData(index, options.floor ?? SEARCH_FLOOR)
  const data = `${JSON.stringify(index)}\n`

  // 4. Write into a fresh directory, then swap it in.
  const staging = `${outDir}.tmp`
  rmSync(staging, { recursive: true, force: true })
  try {
    const target = join(staging, SEARCH_INDEX)
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, data)
    assertReplaceable(outDir, SEARCH_INDEX, 'place search')
    swapIn(staging, outDir)
  } catch (error) {
    rmSync(staging, { recursive: true, force: true })
    throw error
  }

  const report: SearchBuildReport = {
    outDir,
    countries: index.countries.length,
    places: index.places.length,
    unmatchedCountry: build.unmatchedCountry,
    frenchNames: index.places.filter((place) => place[1] !== '').length,
    indexBytes: Buffer.byteLength(data),
    gzipBytes: gzipSync(data).length,
  }
  log(`\nOutput in ${outDir}`)
  log(`  countries: ${report.countries} (${build.skipped.countries} skipped)`)
  log(`  places: ${report.places} (${report.frenchNames} with a different French name, ${build.skipped.places} skipped, ${build.skipped.duplicatePlaces} duplicates, ${report.unmatchedCountry} with a country outside the list)`)
  log(`  index.json: ${formatBytes(report.indexBytes)} (${formatBytes(report.gzipBytes)} gzipped)`)
  return report
}

if (import.meta.main) {
  try {
    const argv = process.argv.slice(2)
    for (const flag of ['--vector-only', '--pin']) {
      if (argv.includes(flag)) throw new Error(`${flag} only applies to pipeline:basemap`)
    }
    const { outDir, cacheDir, manifestPath } = parseArgs(argv)
    await buildSearch({ outDir, cacheDir, manifestPath })
  } catch (error) {
    console.error(`\nPlace search pipeline failed: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  }
}
