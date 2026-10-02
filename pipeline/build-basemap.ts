// Orchestrates the basemap data pipeline (Story 1.8):
//   npm run pipeline:basemap [-- --vector-only] [-- --pin] [-- --out <dir>] [-- --cache <dir>]
// Licence gate first, then cached downloads, then tiles, styles and glyphs.
// Everything is built in memory and written in one step, so a failure leaves
// the previous output untouched.

import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { extractZipMember, fetchCached, sha256, type Fetcher } from './download.ts'
import { buildGlyphFiles, FONTS } from './glyphs.ts'
import { writePmtiles } from './pmtiles-writer.ts'
import { buildReliefTiles, createWebpEncoder, readGeoTiffGray, RELIEF_MAX_ZOOM } from './relief.ts'
import { loadManifest, type Manifest, type Source } from './sources.ts'
import { buildStyles } from './styles.ts'
import { buildVectorTiles, readShapefile, shapeLayer, VECTOR_MAX_ZOOM, type VectorLayerId } from './vector.ts'

const HERE = import.meta.dirname

export const VECTOR_FILE = 'natural-earth-v1.pmtiles'
export const RELIEF_FILE = 'natural-earth-relief-v1.pmtiles'
const WORLD_BOUNDS: [number, number, number, number] = [-180, -85.0511287798, 180, 85.0511287798]

export interface BuildOptions {
  manifestPath?: string
  outDir?: string
  cacheDir?: string
  /** Build only the vector tileset (no raster download), as in the sandbox. */
  vectorOnly?: boolean
  /** Record SHA-256 digests that the manifest leaves empty. */
  pin?: boolean
  fetcher?: Fetcher
  /** Test knob: lower the relief max zoom to keep fixture builds fast. */
  reliefMaxZoom?: number
  log?: (message: string) => void
  warn?: (message: string) => void
}

export interface BuildReport {
  outDir: string
  files: { path: string; bytes: number }[]
  totalBytes: number
}

const formatBytes = (n: number): string => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MiB` : `${(n / 1024).toFixed(1)} KiB`)

/** Aggregates the metadata of every source behind a dataset: a required credit is never dropped. */
function datasetMeta(list: Pick<Source, 'source' | 'licence' | 'attribution' | 'creditRequired'>[]) {
  const distinct = (pick: (s: (typeof list)[number]) => string, separator: string) => [...new Set(list.map(pick))].join(separator)
  return {
    source: distinct((s) => s.source, ', '),
    licence: distinct((s) => s.licence, ', '),
    attribution: distinct((s) => s.attribution, ' '),
    creditRequired: list.some((s) => s.creditRequired),
  }
}

/** The output directory is replaced wholesale, so only a directory this pipeline made (or an empty one) may be. */
export function assertReplaceable(outDir: string): void {
  if (!existsSync(outDir)) return
  if (!statSync(outDir).isDirectory()) throw new Error(`${outDir} exists and is not a directory`)
  if (readdirSync(outDir).length > 0 && !existsSync(join(outDir, 'library/v1/datasets.json'))) {
    throw new Error(`refusing to replace ${outDir}: it is not empty and is not a basemap pipeline output (no library/v1/datasets.json)`)
  }
}

/** Swaps `staging` in for `outDir`; the previous output survives any failure. */
function swapIn(staging: string, outDir: string): void {
  const backup = `${outDir}.old`
  rmSync(backup, { recursive: true, force: true })
  const hadPrevious = existsSync(outDir)
  if (hadPrevious) renameSync(outDir, backup)
  try {
    renameSync(staging, outDir)
  } catch (error) {
    if (hadPrevious) renameSync(backup, outDir)
    throw error
  }
  rmSync(backup, { recursive: true, force: true })
}

export async function buildBasemap(options: BuildOptions = {}): Promise<BuildReport> {
  const log = options.log ?? console.log
  const warn = options.warn ?? console.warn
  const manifestPath = options.manifestPath ?? join(HERE, 'sources.json')
  const outDir = resolve(options.outDir ?? join(HERE, 'out'))
  const cacheDir = resolve(options.cacheDir ?? join(HERE, 'cache'))

  assertReplaceable(outDir)

  // 1. Licence gate: before any download or write.
  const manifest: Manifest = loadManifest(manifestPath)
  const sources = manifest.sources.filter((s) => !(options.vectorOnly && s.kind === 'raster'))

  // 2. Cached, verified downloads.
  const data = new Map<string, Uint8Array>()
  let pinned = false
  for (const source of sources) {
    for (const file of source.files) {
      log(`Source ${source.id}: ${file.name}`)
      const bytes = await fetchCached({ url: file.url, dest: join(cacheDir, source.id, file.name), sha256: file.sha256, fetcher: options.fetcher, warn })
      const unpinned = file.sha256 === ''
      if (unpinned && options.pin) {
        file.sha256 = sha256(bytes)
        pinned = true
      }
      const cachePath = join(cacheDir, source.id, file.name)
      try {
        data.set(`${source.id}/${file.name}`, file.extract ? extractZipMember(bytes, file.extract) : bytes)
      } catch (error) {
        // Without a pinned checksum a corrupt cached archive would be trusted forever.
        if (unpinned) rmSync(cachePath, { force: true })
        throw error
      }
    }
  }
  if (pinned) {
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
    log(`Checksums recorded in ${manifestPath}`)
  }

  // 3. Vector tileset.
  const layers: Partial<Record<VectorLayerId, ReturnType<typeof shapeLayer>>> = {}
  for (const source of sources.filter((s) => s.kind === 'vector')) {
    const shp = data.get(`${source.id}/${source.files.find((f) => f.name.endsWith('.shp'))?.name}`)
    const dbf = data.get(`${source.id}/${source.files.find((f) => f.name.endsWith('.dbf'))?.name}`)
    if (!shp || !dbf) throw new Error(`source ${source.id} needs a .shp and a .dbf file`)
    const layer = source.layer as VectorLayerId
    layers[layer] = shapeLayer(layer, await readShapefile(shp, dbf))
  }
  const vectorSources = sources.filter((s) => s.kind === 'vector')
  const vector = buildVectorTiles(layers)
  log(`Vector tiles: ${vector.tiles.length}`)
  const vectorBytes = writePmtiles({
    tiles: vector.tiles,
    tileType: 'mvt',
    tileCompression: 'gzip',
    metadata: {
      name: 'natural-earth-v1',
      format: 'pbf',
      version: '1',
      attribution: datasetMeta(vectorSources).attribution,
      description: `Natural Earth ${manifest.naturalEarthRelease}: land, ocean, coastline, rivers, lakes, populated places`,
      vector_layers: vector.layers.map((l) => ({ id: l.id, fields: l.fields, minzoom: 0, maxzoom: VECTOR_MAX_ZOOM })),
    },
    bounds: WORLD_BOUNDS,
    center: { lon: 0, lat: 20, zoom: 1 },
  })

  // 4. Relief raster tileset.
  let reliefBytes: Uint8Array | undefined
  const reliefSource = sources.find((s) => s.kind === 'raster')
  if (reliefSource) {
    const tiff = data.get(`${reliefSource.id}/${reliefSource.files[0].name}`) as Uint8Array
    const gray = await readGeoTiffGray(tiff)
    const tiles = await buildReliefTiles(gray, { encode: await createWebpEncoder(), maxZoom: options.reliefMaxZoom })
    log(`Relief tiles: ${tiles.length}`)
    reliefBytes = writePmtiles({
      tiles,
      tileType: 'webp',
      tileCompression: 'none',
      metadata: { name: 'natural-earth-relief-v1', format: 'webp', version: '1', attribution: reliefSource.attribution, description: `Natural Earth ${manifest.naturalEarthRelease} shaded relief (shade mask)` },
      bounds: WORLD_BOUNDS,
      center: { lon: 0, lat: 20, zoom: 1 },
    })
  }

  // 5. Styles and glyphs.
  const styles = buildStyles()
  const glyphFiles = FONTS.flatMap((font) => buildGlyphFiles(font))

  // 6. Write everything into a fresh directory, then swap it in.
  const out: { path: string; data: Uint8Array | string }[] = [{ path: VECTOR_FILE, data: vectorBytes }]
  if (reliefBytes) out.push({ path: RELIEF_FILE, data: reliefBytes })
  for (const [id, style] of Object.entries(styles)) out.push({ path: `library/v1/styles/${id}.json`, data: `${JSON.stringify(style, null, 2)}\n` })
  for (const glyph of glyphFiles) out.push({ path: `library/v1/glyphs/${glyph.path}`, data: glyph.data })

  const inputs = (kind: Source['kind']) =>
    sources.filter((s) => s.kind === kind).map((s) => ({ id: s.id, version: s.version, files: s.files.map((f) => ({ name: f.name, sha256: f.sha256 })) }))
  const datasets = {
    schemaVersion: 1,
    datasets: [
      {
        id: 'natural-earth-v1',
        kind: 'vector-tiles',
        file: VECTOR_FILE,
        tiles: '/natural-earth-v1/{z}/{x}/{y}.mvt',
        tilejson: '/natural-earth-v1.json',
        maxzoom: VECTOR_MAX_ZOOM,
        ...datasetMeta(vectorSources),
        inputs: inputs('vector'),
      },
      ...(reliefSource
        ? [
            {
              id: 'natural-earth-relief-v1',
              kind: 'raster-tiles',
              file: RELIEF_FILE,
              tiles: '/natural-earth-relief-v1/{z}/{x}/{y}.webp',
              tilejson: '/natural-earth-relief-v1.json',
              maxzoom: RELIEF_MAX_ZOOM,
              ...datasetMeta([reliefSource]),
              inputs: inputs('raster'),
            },
          ]
        : []),
      {
        id: 'basemap-styles-v1',
        kind: 'styles',
        path: '/library/v1/styles/<basemap>.json',
        basemaps: Object.keys(styles),
        ...datasetMeta(vectorSources),
      },
      {
        id: 'glyphs-v1',
        kind: 'glyphs',
        path: '/library/v1/glyphs/{fontstack}/{range}.pbf',
        fontstacks: FONTS.map((f) => f.stack),
        source: 'Libre Baskerville, Source Sans 3 (fontsource)',
        licence: 'OFL-1.1',
        attribution: 'Libre Baskerville: Copyright The Libre Baskerville Project Authors. Source Sans 3: Copyright Adobe.',
        creditRequired: false,
      },
    ],
  }
  out.push({ path: 'library/v1/datasets.json', data: `${JSON.stringify(datasets, null, 2)}\n` })

  const staging = `${outDir}.tmp`
  rmSync(staging, { recursive: true, force: true })
  try {
    for (const file of out) {
      const target = join(staging, file.path)
      mkdirSync(dirname(target), { recursive: true })
      writeFileSync(target, file.data)
    }
    assertReplaceable(outDir)
    swapIn(staging, outDir)
  } catch (error) {
    rmSync(staging, { recursive: true, force: true })
    throw error
  }

  const files = out.map((f) => ({ path: f.path, bytes: typeof f.data === 'string' ? Buffer.byteLength(f.data) : f.data.byteLength }))
  const report: BuildReport = { outDir, files, totalBytes: files.reduce((n, f) => n + f.bytes, 0) }
  const sum = (prefix: string) => files.filter((f) => f.path.startsWith(prefix)).reduce((n, f) => n + f.bytes, 0)
  log(`\nOutput in ${outDir}`)
  log(`  ${VECTOR_FILE}: ${formatBytes(files.find((f) => f.path === VECTOR_FILE)?.bytes ?? 0)}`)
  if (reliefBytes) log(`  ${RELIEF_FILE}: ${formatBytes(reliefBytes.byteLength)}`)
  log(`  styles: ${formatBytes(sum('library/v1/styles/'))}`)
  log(`  glyphs: ${formatBytes(sum('library/v1/glyphs/'))}`)
  log(`  total: ${formatBytes(report.totalBytes)}`)
  return report
}

/** Total size of a directory tree, for the README measurement. */
export function directorySize(dir: string): number {
  let total = 0
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    total += entry.isDirectory() ? directorySize(path) : statSync(path).size
  }
  return total
}

export function parseArgs(argv: string[]): BuildOptions {
  const options: BuildOptions = {}
  const value = (flag: string, index: number): string => {
    const next = argv[index + 1]
    if (next === undefined || next === '' || next.startsWith('--')) throw new Error(`${flag} needs a value`)
    return next
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--vector-only') options.vectorOnly = true
    else if (arg === '--pin') options.pin = true
    else if (arg === '--out') options.outDir = value(arg, i++)
    else if (arg === '--cache') options.cacheDir = value(arg, i++)
    else if (arg === '--manifest') options.manifestPath = value(arg, i++)
    else throw new Error(`unknown option ${arg}`)
  }
  return options
}

if (import.meta.main) {
  try {
    await buildBasemap(parseArgs(process.argv.slice(2)))
  } catch (error) {
    console.error(`\nBasemap pipeline failed: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  }
}
