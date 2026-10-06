import { describe, expect, it } from 'vitest'
import { createMeasure, type CreditStyle, layoutCredit, MAX_CREDIT_LINES, wrapLines } from './credit-layout'

const STYLE: CreditStyle = {
  fontFamily: 'sans-serif',
  margin: 24,
  discreet: { fontSize: 18, fontWeight: 400, lineHeight: 1.2 },
  legible: { fontSize: 24, fontWeight: 500, lineHeight: 1.2 },
}
/** Every character is half the font size wide. */
const measure = (text: string, fontPx: number) => Array.from(text).length * fontPx * 0.5
const TEXT = 'Historical borders: Cliopatria, Seshat Global History Databank, CC BY 4.0.'

/** The output frames of AD-23 shown at their reference size (s = 1). */
const FRAMES = {
  '16:9': { x: 0, y: 0, width: 1920, height: 1080 },
  '9:16': { x: 0, y: 0, width: 1080, height: 1920 },
  '1:1': { x: 0, y: 0, width: 1080, height: 1080 },
}

describe('wrapLines', () => {
  it('keeps a short text on one line and wraps a long one at word boundaries', () => {
    expect(wrapLines('one two', 100, 10, measure)).toEqual(['one two'])
    expect(wrapLines('aaaa bbbb cccc', 40, 10, measure)).toEqual(['aaaa', 'bbbb', 'cccc'])
    expect(wrapLines('aaaa bbbb cccc', 60, 10, measure)).toEqual(['aaaa bbbb', 'cccc'])
  })

  it('breaks a word wider than the line by characters, losing nothing', () => {
    const lines = wrapLines('abcdefghij', 25, 10, measure)
    expect(lines.length).toBeGreaterThan(1)
    expect(lines.join('')).toBe('abcdefghij')
    for (const line of lines) expect(measure(line, 10)).toBeLessThanOrEqual(25)
  })

  it('gives no line for an empty text', () => {
    expect(wrapLines('  ', 100, 10, measure)).toEqual([])
  })
})

describe('layoutCredit', () => {
  const input = (overrides: Partial<Parameters<typeof layoutCredit>[0]> = {}) => ({
    text: TEXT,
    corner: 'bottom-left' as const,
    prominence: 'discreet' as const,
    style: STYLE,
    frame: FRAMES['16:9'],
    scale: 1,
    measure,
    ...overrides,
  })
  const layout = (overrides: Partial<Parameters<typeof layoutCredit>[0]> = {}) => layoutCredit(input(overrides))!

  it('places nothing in a degenerate frame or at a degenerate scale', () => {
    for (const overrides of [{ scale: 0 }, { scale: -1 }, { scale: Number.NaN }, { frame: { x: 0, y: 0, width: 0, height: 100 } }, { frame: { x: 0, y: 0, width: 100, height: 0 } }]) {
      expect(layoutCredit(input(overrides))).toBeUndefined()
    }
  })

  it('keeps the halo inside the width: the discreet text is wrapped 2 × halo narrower than the margins leave', () => {
    expect(layout().maxWidth).toBe(1920 - 48 - 2 * 3)
    expect(layout({ prominence: 'legible' }).maxWidth).toBe(1920 - 48 - 24)
  })

  it('uses the discreet token (18/400) and the legible one (24/500), times s', () => {
    expect(layout()).toMatchObject({ fontPx: 18, fontWeight: 400, lineHeight: 1.2, legible: false })
    expect(layout({ prominence: 'legible' })).toMatchObject({ fontPx: 24, fontWeight: 500, legible: true })
    expect(layout({ scale: 0.29 }).fontPx).toBeCloseTo(18 * 0.29)
  })

  it('anchors every corner of the frame at the 24 reference px margin times s, inside the frame', () => {
    const frame = { x: 100, y: 50, width: 480, height: 270 }
    const at = (corner: Parameters<typeof layoutCredit>[0]['corner']) => layout({ corner, frame, scale: 0.25 })
    expect(at('bottom-left')).toMatchObject({ anchor: [100, 320], offset: [6, -6], textAnchor: 'start', alignment: 'bottom' })
    expect(at('bottom-right')).toMatchObject({ anchor: [580, 320], offset: [-6, -6], textAnchor: 'end', alignment: 'bottom' })
    expect(at('top-left')).toMatchObject({ anchor: [100, 50], offset: [6, 6], textAnchor: 'start', alignment: 'top' })
    expect(at('top-right')).toMatchObject({ anchor: [580, 50], offset: [-6, 6], textAnchor: 'end', alignment: 'top' })
  })

  it('puts the legible band edge, not the text, at the margin', () => {
    expect(layout({ prominence: 'legible' })).toMatchObject({ padding: [12, 6], offset: [36, -30], haloPx: 0 })
    expect(layout()).toMatchObject({ padding: [0, 0], haloPx: 3 })
  })

  it.each(Object.entries(FRAMES))('wraps the Cliopatria credit inside a %s frame, within the frame width, in at most 2 lines, whatever the prominence', (_format, frame) => {
    for (const prominence of ['discreet', 'legible'] as const) {
      const result = layout({ frame, prominence })
      expect(result.lines.length).toBeLessThanOrEqual(MAX_CREDIT_LINES)
      expect(result.lines.join(' ')).toBe(TEXT)
      const widest = Math.max(...result.lines.map((line) => measure(line, result.fontPx)))
      expect(widest).toBeLessThanOrEqual(result.maxWidth + 1e-9)
      expect(result.maxWidth).toBeLessThanOrEqual(frame.width - 48)
    }
  })

  it('takes two lines when the text is wider than the frame', () => {
    const long = `${TEXT} ${TEXT}`
    const result = layout({ text: long, frame: FRAMES['9:16'] })
    expect(result.lines).toHaveLength(2)
    expect(result.fontPx).toBe(18) // the token size, not shrunk
  })

  it('sets a text that would need a third line a little smaller instead of clipping or adding a line', () => {
    const long = Array.from({ length: 5 }, () => TEXT).join(' ')
    const result = layout({ text: long, frame: FRAMES['9:16'] })
    expect(result.lines.length).toBeLessThanOrEqual(2)
    expect(result.fontPx).toBeLessThan(18)
    expect(result.lines.join(' ')).toBe(long)
  })

  it('scales the margin and the size with the frame, so the proportions hold at any on-screen size', () => {
    const small = layout({ frame: { x: 0, y: 0, width: 562, height: 316 }, scale: 316 / 1080 })
    expect(small.fontPx).toBeCloseTo((18 * 316) / 1080)
    expect(small.offset[0]).toBeCloseTo((24 * 316) / 1080)
  })
})

describe('createMeasure', () => {
  it('estimates the width when there is no canvas (Node), proportionally to the size', () => {
    const measured = createMeasure('sans-serif', 400)
    expect(measured('abcd', 10)).toBeGreaterThan(0)
    expect(measured('abcd', 20)).toBeCloseTo(measured('abcd', 10) * 2)
  })
})
