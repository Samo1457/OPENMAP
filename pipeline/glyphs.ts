// SDF glyph ranges (MapLibre `glyphs` PBF) generated from the two OFL fonts
// shipped with the app (Story 1.8). The styles declare the glyphs URL but have
// no text layer (labels are deck.gl, AD-6).

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { brotliDecompressSync } from 'node:zlib'
import TinySDF from '@mapbox/tiny-sdf'
import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import Pbf from 'pbf'
import { SANS_STACK, SERIF_STACK } from '../src/ui/theme/tokens.ts'

const FONT_SIZE = 24
const BUFFER = 3
/** MapLibre's own local glyph rasteriser offsets `top` by this at 24 px. */
const TOP_OFFSET = 17

export interface FontSpec {
  /** Fontstack name as requested in `{fontstack}`: the first family of the token stack. */
  stack: string
  /** woff2 files in priority order (the first face containing a code point wins). */
  files: string[]
}

const firstFamily = (stack: string): string => {
  const match = /^\s*'([^']+)'/.exec(stack)
  if (!match) throw new Error(`cannot read the first family of "${stack}"`)
  return match[1]
}

const fontFile = (pkg: string, file: string) =>
  fileURLToPath(new URL(`../node_modules/@fontsource-variable/${pkg}/files/${file}`, import.meta.url))

/** Latin and Latin Extended only: French and English Map text. */
export const FONTS: FontSpec[] = [
  {
    stack: firstFamily(SERIF_STACK),
    files: ['latin', 'latin-ext'].map((s) => fontFile('libre-baskerville', `libre-baskerville-${s}-wght-normal.woff2`)),
  },
  {
    stack: firstFamily(SANS_STACK),
    files: ['latin', 'latin-ext'].map((s) => fontFile('source-sans-3', `source-sans-3-${s}-wght-normal.woff2`)),
  },
]

// WOFF2 known table tags: only the indexes needed to size the table directory matter.
const GLYF = 10
const LOCA = 11
const CMAP = 0

function readBase128(bytes: Uint8Array, pos: number): [number, number] {
  let value = 0
  for (let i = 0; i < 5; i++) {
    const byte = bytes[pos + i]
    value = value * 128 + (byte & 0x7f)
    if ((byte & 0x80) === 0) return [value, pos + i + 1]
  }
  throw new Error('invalid WOFF2 UIntBase128')
}

/** Code points mapped by a WOFF2 font (cmap formats 4 and 12). */
export function woff2Codepoints(bytes: Uint8Array): Set<number> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (view.getUint32(0) !== 0x774f4632) throw new Error('not a WOFF2 file')
  const numTables = view.getUint16(12)
  const compressedSize = view.getUint32(20)
  let pos = 48
  let streamOffset = 0
  let cmap: { offset: number; length: number } | undefined
  for (let i = 0; i < numTables; i++) {
    const flags = bytes[pos++]
    const index = flags & 0x3f
    const version = flags >> 6
    if (index === 0x3f) pos += 4
    const [origLength, afterOrig] = readBase128(bytes, pos)
    pos = afterOrig
    const transformed = index === GLYF || index === LOCA ? version !== 3 : version !== 0
    let length = origLength
    if (transformed) [length, pos] = readBase128(bytes, pos)
    if (index === CMAP) cmap = { offset: streamOffset, length }
    streamOffset += length
  }
  if (!cmap) throw new Error('WOFF2 font has no cmap table')
  const dataStart = pos
  const table = new Uint8Array(brotliDecompressSync(bytes.subarray(dataStart, dataStart + compressedSize))).subarray(cmap.offset, cmap.offset + cmap.length)
  const t = new DataView(table.buffer, table.byteOffset, table.byteLength)
  const codepoints = new Set<number>()
  const records = t.getUint16(2)
  for (let r = 0; r < records; r++) {
    const platform = t.getUint16(4 + r * 8)
    const encoding = t.getUint16(6 + r * 8)
    const offset = t.getUint32(8 + r * 8)
    const unicode = platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10))
    if (!unicode) continue
    const format = t.getUint16(offset)
    if (format === 4) {
      const segCount = t.getUint16(offset + 6) / 2
      const ends = offset + 14
      const starts = ends + segCount * 2 + 2
      for (let s = 0; s < segCount; s++) {
        const end = t.getUint16(ends + s * 2)
        for (let c = t.getUint16(starts + s * 2); c <= end && c < 0xffff; c++) codepoints.add(c)
      }
    } else if (format === 12) {
      const groups = t.getUint32(offset + 12)
      for (let g = 0; g < groups; g++) {
        const base = offset + 16 + g * 12
        const end = t.getUint32(base + 4)
        for (let c = t.getUint32(base); c <= end; c++) codepoints.add(c)
      }
    }
  }
  return codepoints
}

class NodeTinySDF extends TinySDF {
  // The base class needs a DOM canvas; Skia canvas replaces it in Node.
  _createCanvas(size: number) {
    return createCanvas(size, size) as never
  }
}

interface Glyph {
  id: number
  bitmap?: Uint8Array
  width: number
  height: number
  left: number
  top: number
  advance: number
}

function writeGlyph(glyph: Glyph, pbf: Pbf) {
  pbf.writeVarintField(1, glyph.id)
  if (glyph.bitmap) pbf.writeBytesField(2, glyph.bitmap)
  pbf.writeVarintField(3, glyph.width)
  pbf.writeVarintField(4, glyph.height)
  pbf.writeSVarintField(5, glyph.left)
  pbf.writeSVarintField(6, glyph.top)
  pbf.writeVarintField(7, glyph.advance)
}

/** Encodes one `glyphs` message holding a single fontstack range. */
export function encodeGlyphRange(stack: string, range: string, glyphs: Glyph[]): Uint8Array {
  const pbf = new Pbf()
  pbf.writeMessage(
    1,
    (_: null, p: Pbf) => {
      p.writeStringField(1, stack)
      p.writeStringField(2, range)
      for (const glyph of glyphs) p.writeMessage(3, writeGlyph, glyph)
    },
    null,
  )
  return pbf.finish()
}

export interface GlyphFile {
  /** Path relative to the glyphs root: `<fontstack>/<start>-<end>.pbf`. */
  path: string
  data: Uint8Array
}

/** Renders every range of a font spec that contains at least one glyph. */
export function buildGlyphFiles(font: FontSpec): GlyphFile[] {
  const faces = font.files.map((file, index) => {
    const alias = `openmap-${font.stack}-${index}`
    if (!GlobalFonts.registerFromPath(file, alias)) throw new Error(`could not load font ${file}`)
    const bytes = readFileSync(file)
    return { alias, codepoints: woff2Codepoints(bytes), sdf: new NodeTinySDF({ fontSize: FONT_SIZE, buffer: BUFFER, radius: 8, cutoff: 0.25, fontFamily: `"${alias}"` }) }
  })

  const owner = new Map<number, number>()
  faces.forEach((face, index) => {
    for (const cp of face.codepoints) if (cp >= 32 && !owner.has(cp) && !(cp >= 0x7f && cp < 0xa0)) owner.set(cp, index)
  })
  const ranges = new Map<number, Glyph[]>()
  for (const cp of [...owner.keys()].sort((a, b) => a - b)) {
    const face = faces[owner.get(cp) as number]
    const g = face.sdf.draw(String.fromCodePoint(cp))
    const empty = g.glyphWidth === 0 || g.glyphHeight === 0
    const glyph: Glyph = {
      id: cp,
      bitmap: empty ? undefined : new Uint8Array(g.data.buffer, g.data.byteOffset, g.data.byteLength),
      width: empty ? 0 : g.glyphWidth,
      height: empty ? 0 : g.glyphHeight,
      left: g.glyphLeft,
      top: g.glyphTop - TOP_OFFSET,
      advance: Math.round(g.glyphAdvance),
    }
    const block = Math.floor(cp / 256)
    ranges.set(block, [...(ranges.get(block) ?? []), glyph])
  }
  return [...ranges.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([block, glyphs]) => {
      const range = `${block * 256}-${block * 256 + 255}`
      return { path: `${font.stack}/${range}.pbf`, data: encodeGlyphRange(font.stack, range, glyphs) }
    })
}
