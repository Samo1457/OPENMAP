// Where and how the Map credit is drawn (Story 1.13, AD-23, UX-DR21, UX-DR108). Pure geometry and
// text wrapping: no DOM, no deck.gl. The credit is anchored in the output frame, not in the viewport:
// the anchor is a corner of the frame (screen px), the margin and the type size are reference px
// multiplied by the scale `s`, and the text is wrapped to the frame width on at most two lines.

import type { CreditCorner, CreditProminence, Rect } from '@/core'

/** One credit type token (`map-credit-discreet` or `map-credit-legible`), in reference px. */
export interface CreditTypeStyle {
  readonly fontSize: number
  readonly fontWeight: number
  /** Unitless multiplier of the font size. */
  readonly lineHeight: number
}

/** The credit tokens, read by the UI from `src/ui/theme/tokens.ts` and handed to the view (the tokens' single source). */
export interface CreditStyle {
  /** CSS font-family stack of the credit (Source Sans 3). */
  readonly fontFamily: string
  /** `map-credit-margin`, reference px. */
  readonly margin: number
  readonly discreet: CreditTypeStyle
  readonly legible: CreditTypeStyle
}

/** The most lines a credit takes: a longer text is wrapped, then (if still too long) set a little smaller, never clipped. */
export const MAX_CREDIT_LINES = 2
/** Smallest fraction of the token size a long credit may shrink to before it takes a third line. */
export const MIN_CREDIT_SHRINK = 0.5
/** Padding of the « Lisible » band around the text, reference px [horizontal, vertical]. `[ASSUMPTION: DESIGN.md gives the band, not its padding.]` */
export const LEGIBLE_BAND_PADDING: readonly [number, number] = [12, 6]
/** Opacity of the « Lisible » band (`map-label-halo`), 0..1. `[ASSUMPTION]` */
export const LEGIBLE_BAND_OPACITY = 0.9
/** Width of the « Discrète » halo, reference px. */
export const DISCREET_HALO_WIDTH = 3

/** Width in px of `text` set at `fontPx`, in the credit's font and weight. */
export type MeasureText = (text: string, fontPx: number) => number

export interface CreditLayoutInput {
  readonly text: string
  readonly corner: CreditCorner
  readonly prominence: CreditProminence
  readonly style: CreditStyle
  /** The output frame in screen px, in the Map area's coordinates. */
  readonly frame: Rect
  /** `s = frameShortSide / 1080`. */
  readonly scale: number
  readonly measure: MeasureText
}

export interface CreditLayout {
  readonly lines: readonly string[]
  /** Font size on screen, px. */
  readonly fontPx: number
  readonly lineHeight: number
  readonly fontWeight: number
  /** The frame corner the text hangs from, screen px in the Map area. */
  readonly anchor: readonly [number, number]
  /** Distance from the anchor to the text edge, screen px (x grows right, y grows down). */
  readonly offset: readonly [number, number]
  readonly textAnchor: 'start' | 'end'
  readonly alignment: 'top' | 'bottom'
  /** Band padding, screen px [horizontal, vertical]; `[0, 0]` for « Discrète ». */
  readonly padding: readonly [number, number]
  /** Halo width, screen px; `0` for « Lisible » (the band is the halo). */
  readonly haloPx: number
  /** The width the text may use, screen px. */
  readonly maxWidth: number
  readonly legible: boolean
}

/** Greedy word wrap; a word wider than the line is cut by characters. */
export function wrapLines(text: string, maxWidth: number, fontPx: number, measure: MeasureText): string[] {
  const lines: string[] = []
  let line = ''
  const push = () => {
    if (line !== '') lines.push(line)
    line = ''
  }
  for (const word of text.split(/\s+/).filter((part) => part !== '')) {
    const candidate = line === '' ? word : `${line} ${word}`
    if (measure(candidate, fontPx) <= maxWidth) {
      line = candidate
      continue
    }
    push()
    if (measure(word, fontPx) <= maxWidth) {
      line = word
      continue
    }
    // A word longer than the whole line: break it by characters.
    for (const char of Array.from(word)) {
      if (line !== '' && measure(line + char, fontPx) > maxWidth) push()
      line += char
    }
  }
  push()
  return lines
}

/** Nothing to place in an empty or degenerate frame (no width, no height, no scale). */
export function layoutCredit(input: CreditLayoutInput): CreditLayout | undefined {
  const { text, corner, prominence, style, frame, scale, measure } = input
  if (!(frame.width > 0 && frame.height > 0 && scale > 0 && Number.isFinite(scale))) return undefined
  const legible = prominence === 'legible'
  const type = legible ? style.legible : style.discreet
  const margin = style.margin * scale
  const padding: [number, number] = legible ? [LEGIBLE_BAND_PADDING[0] * scale, LEGIBLE_BAND_PADDING[1] * scale] : [0, 0]
  const haloPx = legible ? 0 : DISCREET_HALO_WIDTH * scale
  // The halo (SDF padding) widens the text on both sides: it counts against the width too.
  const maxWidth = Math.max(1, frame.width - 2 * margin - 2 * padding[0] - 2 * haloPx)

  let fontPx = type.fontSize * scale
  let lines = wrapLines(text, maxWidth, fontPx, measure)
  // Never clipped: a text that needs a third line is set a little smaller instead, down to half size.
  for (let shrink = 1; lines.length > MAX_CREDIT_LINES && shrink > MIN_CREDIT_SHRINK; ) {
    shrink = Math.max(MIN_CREDIT_SHRINK, shrink - 0.05)
    fontPx = type.fontSize * scale * shrink
    lines = wrapLines(text, maxWidth, fontPx, measure)
  }

  const left = corner === 'bottom-left' || corner === 'top-left'
  const top = corner === 'top-left' || corner === 'top-right'
  return {
    lines,
    fontPx,
    lineHeight: type.lineHeight,
    fontWeight: type.fontWeight,
    anchor: [left ? frame.x : frame.x + frame.width, top ? frame.y : frame.y + frame.height],
    // The band's outer edge, not the text's, sits at the margin.
    offset: [(left ? 1 : -1) * (margin + padding[0]), (top ? 1 : -1) * (margin + padding[1])],
    textAnchor: left ? 'start' : 'end',
    alignment: top ? 'top' : 'bottom',
    padding,
    haloPx,
    maxWidth,
    legible,
  }
}

/**
 * A text measurer for `family` and `weight` backed by a canvas 2D context (measured at 100 px, then
 * scaled, so small sizes keep their precision). Without a canvas (a test, a worker) it estimates.
 */
export function createMeasure(family: string, weight: number): MeasureText {
  let context: { font: string; measureText(text: string): { width: number } } | null | undefined
  const canvas = () => {
    if (context !== undefined) return context
    try {
      const element = typeof document !== 'undefined' ? document.createElement('canvas') : undefined
      context = element?.getContext('2d') ?? null
    } catch {
      context = null
    }
    if (context) context.font = `${weight} 100px ${family}`
    return context
  }
  return (text, fontPx) => {
    const ctx = canvas()
    if (!ctx) return Array.from(text).length * fontPx * 0.5
    return (ctx.measureText(text).width * fontPx) / 100
  }
}
