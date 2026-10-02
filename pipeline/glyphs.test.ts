import { readFileSync } from 'node:fs'
import Pbf from 'pbf'
import { describe, expect, it } from 'vitest'
import { buildGlyphFiles, encodeGlyphRange, FONTS, woff2Codepoints } from './glyphs.ts'

interface Decoded {
  stack: string
  range: string
  glyphs: { id: number; bitmap?: Uint8Array; width: number; height: number; advance: number }[]
}

function decode(data: Uint8Array): Decoded {
  const out: Decoded = { stack: '', range: '', glyphs: [] }
  new Pbf(data).readFields((tag, _r, pbf) => {
    if (tag !== 1) return
    const end = pbf.readVarint() + pbf.pos
    pbf.readFields((t, _x, p) => {
      if (t === 1) out.stack = p.readString()
      else if (t === 2) out.range = p.readString()
      else if (t === 3) {
        const glyph = { id: 0, bitmap: undefined as Uint8Array | undefined, width: 0, height: 0, advance: 0 }
        const gEnd = p.readVarint() + p.pos
        p.readFields((gt, _g, gp) => {
          if (gt === 1) glyph.id = gp.readVarint()
          else if (gt === 2) glyph.bitmap = gp.readBytes()
          else if (gt === 3) glyph.width = gp.readVarint()
          else if (gt === 4) glyph.height = gp.readVarint()
          else if (gt === 5) gp.readSVarint()
          else if (gt === 6) gp.readSVarint()
          else if (gt === 7) glyph.advance = gp.readVarint()
        }, null, gEnd)
        out.glyphs.push(glyph)
      }
    }, null, end)
  }, null)
  return out
}

describe('font coverage', () => {
  it('reads the cmap of a WOFF2 subset', () => {
    const latin = woff2Codepoints(readFileSync(FONTS[0].files[0]))
    const latinExt = woff2Codepoints(readFileSync(FONTS[0].files[1]))
    expect(latin.has(0x41)).toBe(true)
    expect(latin.has(0xe9)).toBe(true)
    expect(latin.has(0x100)).toBe(false)
    expect(latinExt.has(0x100)).toBe(true)
  })

  it('rejects other formats', () => {
    expect(() => woff2Codepoints(new Uint8Array(64))).toThrow(/WOFF2/)
  })
})

describe('glyph ranges', () => {
  it('names the fontstacks after the first family of the token stacks', () => {
    expect(FONTS.map((f) => f.stack)).toEqual(['Libre Baskerville Variable', 'Source Sans 3 Variable'])
  })

  it('encodes a glyphs message that round-trips', () => {
    const bytes = encodeGlyphRange('Stack', '0-255', [{ id: 65, bitmap: new Uint8Array(4), width: 1, height: 1, left: -1, top: -2, advance: 9 }])
    expect(decode(bytes)).toMatchObject({ stack: 'Stack', range: '0-255', glyphs: [{ id: 65, width: 1, height: 1, advance: 9 }] })
  })

  it.each(FONTS)('renders SDF ranges for $stack, covering French letters', (font) => {
    const files = buildGlyphFiles(font)
    const paths = files.map((f) => f.path)
    expect(paths).toContain(`${font.stack}/0-255.pbf`)
    expect(paths).toContain(`${font.stack}/256-511.pbf`)
    expect(paths.every((p) => /^[\w ]+\/\d+-\d+\.pbf$/.test(p))).toBe(true)
    const basic = decode(files.find((f) => f.path.endsWith('/0-255.pbf'))!.data)
    expect(basic.stack).toBe(font.stack)
    expect(basic.range).toBe('0-255')
    const ids = new Set(basic.glyphs.map((g) => g.id))
    for (const ch of 'AZaz09 éèêçÉ«»') expect(ids.has(ch.codePointAt(0)!)).toBe(true)
    const a = basic.glyphs.find((g) => g.id === 65)!
    expect(a.width).toBeGreaterThan(5)
    expect(a.bitmap!.length).toBe((a.width + 6) * (a.height + 6))
    expect(a.bitmap!.some((v) => v > 200)).toBe(true)
    expect(a.bitmap!.some((v) => v < 50)).toBe(true)
    const space = basic.glyphs.find((g) => g.id === 32)!
    expect(space.bitmap).toBeUndefined()
    expect(space.advance).toBeGreaterThan(0)
  })
})
