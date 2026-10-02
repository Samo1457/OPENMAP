import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { writeArrayBuffer } from 'geotiff'
import { describe, expect, it } from 'vitest'
import { openArchive, FIXTURES } from './test-helpers.ts'
import { writePmtiles } from './pmtiles-writer.ts'
import { buildReliefTiles, createWebpEncoder, hexToRgb, readGeoTiffGray, shadeTile } from './relief.ts'
import { mapExtraColors } from '../src/ui/theme/tokens.ts'

const gray = await readGeoTiffGray(readFileSync(join(FIXTURES, 'tiny-relief.tif')))

describe('relief source', () => {
  it('reads the world GeoTIFF as 8-bit luminance', () => {
    expect(gray.width).toBe(64)
    expect(gray.height).toBe(32)
    expect(gray.data[0]).toBe(0)
    expect(gray.data[63]).toBe(255)
  })

  it('refuses a raster that does not cover the world', async () => {
    const partial = writeArrayBuffer(new Uint8Array(16 * 16), {
      width: 16,
      height: 16,
      ModelPixelScale: [1, 1, 0],
      ModelTiepoint: [0, 0, 0, 0, 40, 0],
      GTModelTypeGeoKey: 2,
      GTRasterTypeGeoKey: 1,
      GeographicTypeGeoKey: 4326,
    })
    await expect(readGeoTiffGray(new Uint8Array(partial))).rejects.toThrow(/cover the world/)
  })
})

describe('shade tiles', () => {
  const colour = hexToRgb(mapExtraColors['map-shade-relief'])

  it('uses the map-shade-relief token colour with alpha equal to the darkness', () => {
    const pixels = shadeTile(gray, 0, 0, 0, colour, 8)
    expect([pixels[0], pixels[1], pixels[2]]).toEqual(colour)
    // West edge is black in the source (full shade), east edge white (no shade).
    expect(pixels[3]).toBeGreaterThan(230)
    expect(pixels[(8 * 4) - 1]).toBeLessThan(25)
  })

  it('rejects a malformed colour', () => {
    expect(() => hexToRgb('red')).toThrow(/#RRGGBB/)
  })
})

describe('relief tiles', () => {
  it('encodes WebP tiles for every z/x/y up to the max zoom and round-trips through PMTiles', async () => {
    const encode = await createWebpEncoder(60)
    const tiles = await buildReliefTiles(gray, { maxZoom: 1, tileSize: 32, encode })
    expect(tiles).toHaveLength(5)
    for (const tile of tiles) {
      expect(new TextDecoder().decode(tile.data.subarray(0, 4))).toBe('RIFF')
      expect(new TextDecoder().decode(tile.data.subarray(8, 12))).toBe('WEBP')
    }
    const bytes = writePmtiles({ tiles, tileType: 'webp', tileCompression: 'none', metadata: {}, bounds: [-180, -85, 180, 85], center: { lon: 0, lat: 0, zoom: 0 } })
    const got = await openArchive(bytes).getZxy(1, 0, 1)
    expect(got && new Uint8Array(got.data)).toEqual(tiles.find((t) => t.z === 1 && t.x === 0 && t.y === 1)!.data)
  })

  it('is deterministic', async () => {
    const encode = await createWebpEncoder(60)
    const a = await buildReliefTiles(gray, { maxZoom: 1, tileSize: 32, encode })
    const b = await buildReliefTiles(gray, { maxZoom: 1, tileSize: 32, encode })
    expect(a.every((t, i) => Buffer.compare(t.data, b[i].data) === 0)).toBe(true)
  })
})
