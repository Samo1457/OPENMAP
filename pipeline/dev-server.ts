// Dev-only middleware serving the pipeline output at the future data-origin
// paths (Story 1.8), so no code changes when Epic 7 moves it to the VPS.
// In dev the data origin is the app origin.

import { createReadStream, existsSync, statSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { open } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { PMTiles, type RangeResponse, type Source } from 'pmtiles'

export type Middleware = (req: IncomingMessage, res: ServerResponse, next: () => void) => void

export interface DataMiddlewareOptions {
  /** Pipeline output directory. */
  outDir?: string
  /** Historical borders pipeline output directory (Story 1.9). */
  geoOutDir?: string
  /** One-line hints for missing output. */
  hint?: (message: string) => void
}

class FileSource implements Source {
  readonly path: string
  constructor(path: string) {
    this.path = path
  }
  getKey(): string {
    return this.path
  }
  async getBytes(offset: number, length: number): Promise<RangeResponse> {
    const handle = await open(this.path, 'r')
    try {
      const buffer = new Uint8Array(length)
      const { bytesRead } = await handle.read(buffer, 0, length, offset)
      return { data: buffer.buffer.slice(0, bytesRead) as ArrayBuffer }
    } finally {
      await handle.close()
    }
  }
}

const TILESETS = {
  'natural-earth-v1': { file: 'natural-earth-v1.pmtiles', extension: 'mvt', contentType: 'application/vnd.mapbox-vector-tile' },
  'natural-earth-relief-v1': { file: 'natural-earth-relief-v1.pmtiles', extension: 'webp', contentType: 'image/webp' },
} as const

type TilesetId = keyof typeof TILESETS

const SAFE_SEGMENT = /^[\w .-]+$/

export function createDataMiddleware(options: DataMiddlewareOptions = {}): Middleware {
  const outDir = resolve(options.outDir ?? join(import.meta.dirname, 'out'))
  const geoOutDir = resolve(options.geoOutDir ?? join(import.meta.dirname, 'out-geo'))
  const hint = options.hint ?? ((message: string) => console.warn(message))
  const hinted = new Set<string>()
  const archives = new Map<string, { mtimeMs: number; archive: PMTiles }>()

  const missing = (res: ServerResponse, what: string) => {
    if (!hinted.has(what)) {
      hinted.add(what)
      hint(`[openmap] No basemap data for ${what}: run "npm run pipeline:basemap" once.`)
    }
    res.statusCode = 404
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.end('Basemap data not built')
  }

  const missingGeo = (res: ServerResponse) => {
    if (!hinted.has('geo')) {
      hinted.add('geo')
      hint('[openmap] No historical borders data: run "npm run pipeline:geo" once.')
    }
    res.statusCode = 404
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.end('Historical borders data not built')
  }

  const archiveFor = (id: TilesetId): PMTiles | undefined => {
    const path = join(outDir, TILESETS[id].file)
    if (!existsSync(path)) return undefined
    const { mtimeMs } = statSync(path)
    const cached = archives.get(id)
    if (cached && cached.mtimeMs === mtimeMs) return cached.archive
    const archive = new PMTiles(new FileSource(path))
    archives.set(id, { mtimeMs, archive })
    return archive
  }

  const sendJson = (res: ServerResponse, body: unknown) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache')
    res.end(JSON.stringify(body))
  }

  const sendFile = (res: ServerResponse, path: string, contentType: string) => {
    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'no-cache')
    createReadStream(path).on('error', () => res.end()).pipe(res)
  }

  return (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next()
    const url = new URL(req.url ?? '/', 'http://localhost')
    const pathname = url.pathname
    const fail = (error: unknown) => {
      res.statusCode = 500
      res.end(error instanceof Error ? error.message : String(error))
    }

    // Historical borders: the index and one file per entity state. Anything else below
    // the prefix is a 404 here, never a fall-through to the app.
    if (pathname === '/library/v1/geo' || pathname.startsWith('/library/v1/geo/')) {
      const route = /^\/library\/v1\/geo\/(?:(index)\.json|([a-z0-9][a-z0-9.-]*)\/(-?\d+)\.json)$/.exec(pathname)
      const notFound = () => {
        res.statusCode = 404
        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        res.end('Not found')
      }
      if (!route || (route[2] !== undefined && route[2].includes('..'))) return notFound()
      const geoRoot = join(geoOutDir, 'library/v1/geo')
      if (!existsSync(join(geoRoot, 'index.json'))) return missingGeo(res)
      const path = route[1] ? join(geoRoot, 'index.json') : join(geoRoot, route[2], `${route[3]}.json`)
      if (!existsSync(path)) return notFound()
      return sendFile(res, path, 'application/json; charset=utf-8')
    }

    const tile = /^\/(natural-earth(?:-relief)?-v1)\/(\d+)\/(\d+)\/(\d+)\.(mvt|webp)$/.exec(pathname)
    if (tile) {
      const id = tile[1] as TilesetId
      const spec = TILESETS[id]
      if (tile[5] !== spec.extension) return next()
      const [z, x, y] = [Number(tile[2]), Number(tile[3]), Number(tile[4])]
      if (z > 30 || x >= 2 ** z || y >= 2 ** z) {
        res.statusCode = 404
        return res.end()
      }
      const archive = archiveFor(id)
      if (!archive) return missing(res, id)
      archive
        .getZxy(z, x, y)
        .then((tileData) => {
          if (!tileData) {
            res.statusCode = 204
            return res.end()
          }
          res.setHeader('Content-Type', spec.contentType)
          res.setHeader('Cache-Control', 'no-cache')
          res.end(Buffer.from(tileData.data))
        })
        .catch(fail)
      return
    }

    const tilejson = /^\/(natural-earth(?:-relief)?-v1)\.json$/.exec(pathname)
    if (tilejson) {
      const id = tilejson[1] as TilesetId
      const spec = TILESETS[id]
      const archive = archiveFor(id)
      if (!archive) return missing(res, id)
      Promise.all([archive.getHeader(), archive.getMetadata()])
        .then(([header, metadata]) => {
          const meta = metadata as Record<string, unknown>
          const origin = `http://${req.headers.host ?? 'localhost'}`
          sendJson(res, {
            tilejson: '3.0.0',
            scheme: 'xyz',
            name: meta.name ?? id,
            attribution: meta.attribution,
            description: meta.description,
            tiles: [`${origin}/${id}/{z}/{x}/{y}.${spec.extension}`],
            minzoom: header.minZoom,
            maxzoom: header.maxZoom,
            bounds: [header.minLon, header.minLat, header.maxLon, header.maxLat],
            center: [header.centerLon, header.centerLat, header.centerZoom],
            ...(meta.vector_layers ? { vector_layers: meta.vector_layers } : {}),
          })
        })
        .catch(fail)
      return
    }

    const style = /^\/library\/v1\/styles\/([a-z0-9-]+)\.json$/.exec(pathname)
    if (style) {
      const path = join(outDir, 'library/v1/styles', `${style[1]}.json`)
      if (!existsSync(path)) return missing(res, `style ${style[1]}`)
      return sendFile(res, path, 'application/json; charset=utf-8')
    }

    if (pathname === '/library/v1/datasets.json') {
      const path = join(outDir, 'library/v1/datasets.json')
      if (!existsSync(path)) return missing(res, 'datasets.json')
      return sendFile(res, path, 'application/json; charset=utf-8')
    }

    const glyphs = /^\/library\/v1\/glyphs\/([^/]+)\/(\d+-\d+)\.pbf$/.exec(pathname)
    if (glyphs) {
      let stacks: string[]
      try {
        stacks = decodeURIComponent(glyphs[1]).split(',')
      } catch {
        res.statusCode = 400
        return res.end()
      }
      const found = stacks.filter((s) => SAFE_SEGMENT.test(s) && s !== '..' && s !== '.').map((s) => join(outDir, 'library/v1/glyphs', s, `${glyphs[2]}.pbf`)).find((p) => existsSync(p))
      if (!found) return missing(res, `glyphs ${glyphs[1]}`)
      return sendFile(res, found, 'application/x-protobuf')
    }

    next()
  }
}

/** Vite plugin: serves the pipeline output in `npm run dev`. */
export function basemapDataPlugin(options: DataMiddlewareOptions = {}) {
  const middleware = createDataMiddleware(options)
  return {
    name: 'openmap-basemap-data',
    configureServer(server: { middlewares: { use: (fn: Middleware) => void } }) {
      server.middlewares.use(middleware)
    },
  }
}
