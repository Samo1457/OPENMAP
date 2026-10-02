import { describe, expect, it } from 'vitest'
import { Compression, TileType } from 'pmtiles'
import { openArchive } from './test-helpers.ts'
import { writePmtiles, type InputTile, type WriteOptions } from './pmtiles-writer.ts'

const base = (tiles: InputTile[], overrides: Partial<WriteOptions> = {}): WriteOptions => ({
  tiles,
  tileType: 'mvt',
  tileCompression: 'gzip',
  metadata: { name: 'test', attribution: 'Natural Earth' },
  bounds: [-180, -85, 180, 85],
  center: { lon: 0, lat: 20, zoom: 1 },
  ...overrides,
})

const bytesOf = (text: string) => new TextEncoder().encode(text)
const textOf = (data: ArrayBuffer) => new TextDecoder().decode(data)

describe('PMTiles writer', () => {
  it('round-trips header, metadata and tiles through the pmtiles reader', async () => {
    const tiles: InputTile[] = [
      { z: 1, x: 1, y: 0, data: bytesOf('one-one-zero') },
      { z: 0, x: 0, y: 0, data: bytesOf('root') },
      { z: 1, x: 0, y: 1, data: bytesOf('one-zero-one') },
    ]
    const archive = openArchive(writePmtiles(base(tiles)))
    const header = await archive.getHeader()
    expect(header.minZoom).toBe(0)
    expect(header.maxZoom).toBe(1)
    expect(header.tileType).toBe(TileType.Mvt)
    expect(header.tileCompression).toBe(Compression.Gzip)
    expect(header.numAddressedTiles).toBe(3)
    expect(header.minLon).toBeCloseTo(-180)
    expect(header.centerZoom).toBe(1)
    expect(await archive.getMetadata()).toMatchObject({ name: 'test', attribution: 'Natural Earth' })
    for (const tile of tiles) {
      const got = await archive.getZxy(tile.z, tile.x, tile.y)
      expect(got && textOf(got.data)).toBe(textOf(tile.data.buffer.slice(tile.data.byteOffset, tile.data.byteOffset + tile.data.byteLength) as ArrayBuffer))
    }
    expect(await archive.getZxy(1, 1, 1)).toBeUndefined()
    expect(await archive.getZxy(2, 0, 0)).toBeUndefined()
  })

  it('stores identical tiles once and keeps image tiles uncompressed', async () => {
    const same = bytesOf('RIFF-same')
    const tiles: InputTile[] = [0, 1].flatMap((x) => [0, 1].map((y) => ({ z: 1, x, y, data: same })))
    const archive = openArchive(writePmtiles(base(tiles, { tileType: 'webp', tileCompression: 'none' })))
    const header = await archive.getHeader()
    expect(header.tileType).toBe(TileType.Webp)
    expect(header.tileCompression).toBe(Compression.None)
    expect(header.numTileContents).toBe(1)
    expect(header.tileDataLength).toBe(same.length)
    const got = await archive.getZxy(1, 1, 1)
    expect(got && textOf(got.data)).toBe('RIFF-same')
  })

  it('is deterministic and independent of input order', () => {
    const tiles: InputTile[] = [
      { z: 0, x: 0, y: 0, data: bytesOf('a') },
      { z: 1, x: 0, y: 0, data: bytesOf('b') },
      { z: 1, x: 1, y: 1, data: bytesOf('c') },
    ]
    expect(writePmtiles(base(tiles))).toEqual(writePmtiles(base([...tiles].reverse())))
  })

  it('splits into leaf directories when the root would exceed 16 KiB, and still reads every tile', async () => {
    const tiles: InputTile[] = []
    for (let z = 0; z <= 8; z++) {
      for (let x = 0; x < 2 ** z; x++) {
        for (let y = 0; y < 2 ** z; y++) {
          // Pseudo-random lengths keep the directory from compressing below the 16 KiB root budget.
          const pad = Math.imul(tiles.length + 1, 2654435761) >>> 24
          tiles.push({ z, x, y, data: bytesOf(`${z}/${x}/${y}${'.'.repeat(pad)}`) })
        }
      }
    }
    const bytes = writePmtiles(base(tiles, { tileCompression: 'none' }))
    const archive = openArchive(bytes)
    const header = await archive.getHeader()
    expect(header.leafDirectoryLength).toBeGreaterThan(0)
    expect(header.rootDirectoryOffset + header.rootDirectoryLength).toBeLessThanOrEqual(16384)
    for (const [z, x, y] of [[0, 0, 0], [5, 17, 3], [8, 255, 255], [8, 0, 128], [7, 100, 99]]) {
      const got = await archive.getZxy(z, x, y)
      expect(got && textOf(got.data).replace(/\.+$/, '')).toBe(`${z}/${x}/${y}`)
    }
  })

  it('rejects duplicate tile coordinates', () => {
    const t = { z: 0, x: 0, y: 0, data: bytesOf('x') }
    expect(() => writePmtiles(base([t, t]))).toThrow(/duplicate tile/)
  })
})
