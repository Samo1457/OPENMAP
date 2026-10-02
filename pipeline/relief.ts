// Natural Earth shaded relief (GeoTIFF, EPSG:4326 world extent) to WebP raster
// tiles in Web Mercator, z0-6 (Story 1.8).
//
// Each tile is a shade mask: RGB is the `map-shade-relief` token colour and the
// alpha channel is the darkness of the source pixel. The style then draws the
// layer at 35 % opacity over land (UX-DR4); the ocean fill covers it at sea.

import { readFileSync } from 'node:fs'
import { fromArrayBuffer } from 'geotiff'
import { simd } from 'wasm-feature-detect'
import { mapExtraColors } from '../src/ui/theme/tokens.ts'
import type { InputTile } from './pmtiles-writer.ts'

export const RELIEF_MAX_ZOOM = 6
export const RELIEF_TILE_SIZE = 256

export interface GrayRaster {
  width: number
  height: number
  data: Uint8Array
}

export function hexToRgb(hex: string): [number, number, number] {
  const match = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!match) throw new Error(`expected a #RRGGBB colour, got "${hex}"`)
  const n = Number.parseInt(match[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Reads a world-covering GeoTIFF in EPSG:4326 as 8-bit luminance. */
export async function readGeoTiffGray(bytes: Uint8Array): Promise<GrayRaster> {
  const copy = new Uint8Array(bytes).buffer
  const tiff = await fromArrayBuffer(copy)
  const image = await tiff.getImage()
  const width = image.getWidth()
  const height = image.getHeight()
  const [west, south, east, north] = image.getBoundingBox()
  const tolerance = 0.5
  if (Math.abs(west + 180) > tolerance || Math.abs(east - 180) > tolerance || Math.abs(south + 90) > tolerance || Math.abs(north - 90) > tolerance) {
    throw new Error(`relief raster must cover the world in EPSG:4326, got [${west}, ${south}, ${east}, ${north}]`)
  }
  const bands = (await image.readRasters()) as unknown as ArrayLike<number>[]
  const data = new Uint8Array(width * height)
  const first = bands[0]
  const useColour = bands.length >= 3
  for (let i = 0; i < data.length; i++) {
    const value = useColour ? (bands[0][i] + bands[1][i] + bands[2][i]) / 3 : first[i]
    data[i] = Math.max(0, Math.min(255, Math.round(value)))
  }
  return { width, height, data }
}

function sample(gray: GrayRaster, lon: number, lat: number): number {
  const u = ((lon + 180) / 360) * gray.width - 0.5
  const v = Math.max(0, Math.min(gray.height - 1, ((90 - lat) / 180) * gray.height - 0.5))
  const x0 = Math.floor(u)
  const y0 = Math.floor(v)
  const fx = u - x0
  const fy = v - y0
  const wrap = (x: number) => ((x % gray.width) + gray.width) % gray.width
  const y1 = Math.min(gray.height - 1, y0 + 1)
  const at = (x: number, y: number) => gray.data[y * gray.width + wrap(x)]
  const top = at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx
  const bottom = at(x0, y1) * (1 - fx) + at(x0 + 1, y1) * fx
  return top * (1 - fy) + bottom * fy
}

/** RGBA pixels of one Web Mercator tile: constant shade colour, alpha = darkness. */
export function shadeTile(gray: GrayRaster, z: number, x: number, y: number, colour: [number, number, number], size = RELIEF_TILE_SIZE): Uint8ClampedArray {
  const out = new Uint8ClampedArray(size * size * 4)
  const n = 2 ** z
  for (let py = 0; py < size; py++) {
    const merc = Math.PI * (1 - (2 * (y + (py + 0.5) / size)) / n)
    const lat = (Math.atan(Math.sinh(merc)) * 180) / Math.PI
    for (let px = 0; px < size; px++) {
      const lon = ((x + (px + 0.5) / size) / n) * 360 - 180
      const lum = sample(gray, lon, lat)
      const o = (py * size + px) * 4
      out[o] = colour[0]
      out[o + 1] = colour[1]
      out[o + 2] = colour[2]
      out[o + 3] = Math.round(255 - lum)
    }
  }
  return out
}

export type WebpEncoder = (rgba: Uint8ClampedArray, width: number, height: number) => Promise<Uint8Array>

/** libwebp (WASM, jSquash). Loads the WASM from disk because Node has no fetch for file URLs. */
export async function createWebpEncoder(quality = 80): Promise<WebpEncoder> {
  const { init, default: encode } = await import('@jsquash/webp/encode.js')
  const wasm = (await simd()) ? 'webp_enc_simd.wasm' : 'webp_enc.wasm'
  const path = new URL(`../node_modules/@jsquash/webp/codec/enc/${wasm}`, import.meta.url)
  await init(await WebAssembly.compile(readFileSync(path)))
  return async (rgba, width, height) => {
    const buffer = await encode({ data: rgba, width, height, colorSpace: 'srgb' } as unknown as Parameters<typeof encode>[0], { quality, exact: 1 })
    return new Uint8Array(buffer)
  }
}

export interface ReliefOptions {
  maxZoom?: number
  tileSize?: number
  colour?: [number, number, number]
  encode: WebpEncoder
}

export async function buildReliefTiles(gray: GrayRaster, options: ReliefOptions): Promise<InputTile[]> {
  const maxZoom = options.maxZoom ?? RELIEF_MAX_ZOOM
  const colour = options.colour ?? hexToRgb(mapExtraColors['map-shade-relief'])
  const tiles: InputTile[] = []
  for (let z = 0; z <= maxZoom; z++) {
    for (let x = 0; x < 2 ** z; x++) {
      for (let y = 0; y < 2 ** z; y++) {
        const pixels = shadeTile(gray, z, x, y, colour, options.tileSize)
        const size = options.tileSize ?? RELIEF_TILE_SIZE
        tiles.push({ z, x, y, data: await options.encode(pixels, size, size) })
      }
    }
  }
  return tiles
}
