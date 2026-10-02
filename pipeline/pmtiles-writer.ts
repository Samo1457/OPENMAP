// Minimal PMTiles v3 writer (Story 1.8). Output is deterministic: tiles are
// ordered by Hilbert tile id, identical tiles are stored once, gzip headers
// carry no timestamp.

import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import { zxyToTileId } from 'pmtiles'

export type PmtilesTileType = 'mvt' | 'png' | 'jpeg' | 'webp'

export interface InputTile {
  z: number
  x: number
  y: number
  /** Tile bytes exactly as they must be served (already encoded; gzip is applied here for `tileCompression: 'gzip'`). */
  data: Uint8Array
}

export interface WriteOptions {
  tiles: InputTile[]
  tileType: PmtilesTileType
  /** `gzip` for MVT, `none` for already-compressed images. */
  tileCompression: 'gzip' | 'none'
  /** Written as JSON metadata (name, attribution, vector_layers, ...). */
  metadata: Record<string, unknown>
  /** [west, south, east, north] in degrees. */
  bounds: [number, number, number, number]
  center: { lon: number; lat: number; zoom: number }
}

interface Entry {
  tileId: number
  offset: number
  length: number
  runLength: number
}

const HEADER_BYTES = 127
const ROOT_TARGET_BYTES = 16384 - HEADER_BYTES
const TILE_TYPE = { mvt: 1, png: 2, jpeg: 3, webp: 4 } as const

const gzip = (data: Uint8Array): Uint8Array => new Uint8Array(gzipSync(data, { level: 9 }))

function pushVarint(out: number[], value: number): void {
  let v = value
  while (v >= 0x80) {
    out.push((v % 0x80) | 0x80)
    v = Math.floor(v / 0x80)
  }
  out.push(v)
}

/** Serialises and gzips a directory (spec section "Directory Serialization"). */
export function serializeDirectory(entries: Entry[]): Uint8Array {
  const out: number[] = []
  pushVarint(out, entries.length)
  let last = 0
  for (const e of entries) {
    pushVarint(out, e.tileId - last)
    last = e.tileId
  }
  for (const e of entries) pushVarint(out, e.runLength)
  for (const e of entries) pushVarint(out, e.length)
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]
    const prev = entries[i - 1]
    pushVarint(out, i > 0 && e.offset === prev.offset + prev.length ? 0 : e.offset + 1)
  }
  return gzip(Uint8Array.from(out))
}

function buildRootAndLeaves(entries: Entry[], leafSize: number): { root: Uint8Array; leaves: Uint8Array[] } {
  const rootEntries: Entry[] = []
  const leaves: Uint8Array[] = []
  let offset = 0
  for (let i = 0; i < entries.length; i += leafSize) {
    const leaf = serializeDirectory(entries.slice(i, i + leafSize))
    rootEntries.push({ tileId: entries[i].tileId, offset, length: leaf.length, runLength: 0 })
    leaves.push(leaf)
    offset += leaf.length
  }
  return { root: serializeDirectory(rootEntries), leaves }
}

/** Keeps the header plus root directory inside the first 16 KiB, adding leaf directories when needed. */
export function buildDirectories(entries: Entry[]): { root: Uint8Array; leaves: Uint8Array[] } {
  const single = serializeDirectory(entries)
  if (single.length <= ROOT_TARGET_BYTES) return { root: single, leaves: [] }
  let leafSize = 4096
  for (;;) {
    const built = buildRootAndLeaves(entries, leafSize)
    if (built.root.length <= ROOT_TARGET_BYTES) return built
    leafSize = Math.ceil(leafSize * 1.2)
  }
}

export function writePmtiles(options: WriteOptions): Uint8Array {
  const sorted = options.tiles
    .map((tile) => ({ tile, id: zxyToTileId(tile.z, tile.x, tile.y) }))
    .sort((a, b) => a.id - b.id)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].id === sorted[i - 1].id) throw new Error(`duplicate tile ${sorted[i].tile.z}/${sorted[i].tile.x}/${sorted[i].tile.y}`)
  }

  const chunks: Uint8Array[] = []
  const byHash = new Map<string, { offset: number; length: number }>()
  const entries: Entry[] = []
  let dataLength = 0
  let clustered = true
  let contents = 0
  let minZoom = 255
  let maxZoom = 0

  for (const { tile, id } of sorted) {
    const stored = options.tileCompression === 'gzip' ? gzip(tile.data) : tile.data
    const hash = createHash('sha256').update(stored).digest('hex')
    let slot = byHash.get(hash)
    if (!slot) {
      slot = { offset: dataLength, length: stored.length }
      byHash.set(hash, slot)
      chunks.push(stored)
      dataLength += stored.length
      contents++
    } else {
      clustered = false
    }
    const prev = entries[entries.length - 1]
    if (prev && prev.offset === slot.offset && prev.length === slot.length && prev.tileId + prev.runLength === id) {
      prev.runLength++
    } else {
      entries.push({ tileId: id, offset: slot.offset, length: slot.length, runLength: 1 })
    }
    minZoom = Math.min(minZoom, tile.z)
    maxZoom = Math.max(maxZoom, tile.z)
  }
  if (sorted.length === 0) minZoom = 0

  const { root, leaves } = buildDirectories(entries)
  const metadata = gzip(new TextEncoder().encode(JSON.stringify(options.metadata)))
  const leafBytes = leaves.reduce((n, l) => n + l.length, 0)

  const rootOffset = HEADER_BYTES
  const metadataOffset = rootOffset + root.length
  const leafOffset = metadataOffset + metadata.length
  const dataOffset = leafOffset + leafBytes

  const header = new DataView(new ArrayBuffer(HEADER_BYTES))
  new TextEncoder().encodeInto('PMTiles', new Uint8Array(header.buffer, 0, 7))
  header.setUint8(7, 3)
  const u64 = (pos: number, value: number) => header.setBigUint64(pos, BigInt(value), true)
  u64(8, rootOffset)
  u64(16, root.length)
  u64(24, metadataOffset)
  u64(32, metadata.length)
  u64(40, leafOffset)
  u64(48, leafBytes)
  u64(56, dataOffset)
  u64(64, dataLength)
  u64(72, sorted.length)
  u64(80, entries.length)
  u64(88, contents)
  header.setUint8(96, clustered ? 1 : 0)
  header.setUint8(97, 2) // internal compression: gzip
  header.setUint8(98, options.tileCompression === 'gzip' ? 2 : 1)
  header.setUint8(99, TILE_TYPE[options.tileType])
  header.setUint8(100, minZoom)
  header.setUint8(101, maxZoom)
  const e7 = (v: number) => Math.round(v * 1e7)
  const [west, south, east, north] = options.bounds
  header.setInt32(102, e7(west), true)
  header.setInt32(106, e7(south), true)
  header.setInt32(110, e7(east), true)
  header.setInt32(114, e7(north), true)
  header.setUint8(118, options.center.zoom)
  header.setInt32(119, e7(options.center.lon), true)
  header.setInt32(123, e7(options.center.lat), true)

  return new Uint8Array(Buffer.concat([new Uint8Array(header.buffer), root, metadata, ...leaves, ...chunks]))
}
