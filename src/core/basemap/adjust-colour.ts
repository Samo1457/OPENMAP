// Basemap colour adjustments (FR-5, DESIGN.md « Réglages du Fond »): brightness, saturation and
// tint applied to the resolved Basemap palette by the evaluator, never by CSS filters or
// renderer-only properties, so the preview and the export show the same colours (AD-1, AD-6).
// Pure and deterministic: percent values in, `#RRGGBB` out.

import { BASEMAP_ADJUSTMENT_RANGES, type BasemapAdjustments } from '../model/project'
import { mapExtraColors } from './palettes'

/** The default tint colour (`map-tint`). */
export const DEFAULT_TINT_COLOUR: string = mapExtraColors['map-tint']

/** Adjustments with every default made explicit (stylized Basemaps: 0 %, 0 %, no tint). */
export interface ResolvedAdjustments {
  readonly brightness: number
  readonly saturation: number
  readonly tintColor: string
  readonly tintIntensity: number
}

export const DEFAULT_ADJUSTMENTS: ResolvedAdjustments = {
  brightness: 0,
  saturation: 0,
  tintColor: DEFAULT_TINT_COLOUR,
  tintIntensity: 0,
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** Fills the absent keys with the defaults and clamps each value to its range. */
export function resolveAdjustments(adjustments: BasemapAdjustments): ResolvedAdjustments {
  const { brightness, saturation, tintIntensity } = BASEMAP_ADJUSTMENT_RANGES
  return {
    brightness: clamp(adjustments.brightness ?? DEFAULT_ADJUSTMENTS.brightness, brightness.min, brightness.max),
    saturation: clamp(adjustments.saturation ?? DEFAULT_ADJUSTMENTS.saturation, saturation.min, saturation.max),
    tintColor: (adjustments.tintColor ?? DEFAULT_ADJUSTMENTS.tintColor).toUpperCase(),
    tintIntensity: clamp(adjustments.tintIntensity ?? DEFAULT_ADJUSTMENTS.tintIntensity, tintIntensity.min, tintIntensity.max),
  }
}

type Rgb = readonly [number, number, number]

const mapRgb = (rgb: Rgb, fn: (channel: number, index: number) => number): Rgb => [fn(rgb[0], 0), fn(rgb[1], 1), fn(rgb[2], 2)]

export function hexToRgb(hex: string): Rgb {
  const value = Number.parseInt(hex.slice(1), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

export function rgbToHex([r, g, b]: Rgb): string {
  const part = (channel: number) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0')
  return `#${part(r)}${part(g)}${part(b)}`.toUpperCase()
}

function rgbToHsl([r, g, b]: Rgb): [number, number, number] {
  const red = r / 255
  const green = g / 255
  const blue = b / 255
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const lightness = (max + min) / 2
  const delta = max - min
  if (delta === 0) return [0, 0, lightness]
  const saturation = delta / (1 - Math.abs(2 * lightness - 1))
  let hue: number
  if (max === red) hue = ((green - blue) / delta) % 6
  else if (max === green) hue = (blue - red) / delta + 2
  else hue = (red - green) / delta + 4
  return [(hue * 60 + 360) % 360, saturation, lightness]
}

function hslToRgb([hue, saturation, lightness]: [number, number, number]): Rgb {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = lightness - chroma / 2
  const sector = Math.floor(hue / 60) % 6
  const [r, g, b] = [
    [chroma, x, 0],
    [x, chroma, 0],
    [0, chroma, x],
    [0, x, chroma],
    [x, 0, chroma],
    [chroma, 0, x],
  ][sector]
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255]
}

/**
 * One colour of the Basemap with the adjustments applied, in this order: saturation (HSL
 * saturation × (1 + s)), brightness (mix toward white above 0, toward black below), tint (mix
 * toward the tint colour by the intensity). Defaults return the colour unchanged.
 */
export function adjustColour(hex: string, adjustments: BasemapAdjustments | ResolvedAdjustments): string {
  const { brightness, saturation, tintColor, tintIntensity } = resolveAdjustments(adjustments)
  if (brightness === 0 && saturation === 0 && tintIntensity === 0) return hex.toUpperCase()
  let rgb: Rgb = hexToRgb(hex)
  if (saturation !== 0) {
    const [hue, sat, lightness] = rgbToHsl(rgb)
    rgb = hslToRgb([hue, clamp(sat * (1 + saturation / 100), 0, 1), lightness])
  }
  if (brightness > 0) rgb = mapRgb(rgb, (c) => c + (255 - c) * (brightness / 100))
  else if (brightness < 0) rgb = mapRgb(rgb, (c) => c * (1 + brightness / 100))
  if (tintIntensity > 0) {
    const tint = hexToRgb(tintColor)
    rgb = mapRgb(rgb, (c, i) => c + (tint[i] - c) * (tintIntensity / 100))
  }
  return rgbToHex(rgb)
}

/** The adjustments without what equals the default, so an untouched Basemap is `{}` (« Rétablir » then has nothing to do). */
export function withoutDefaults(adjustments: BasemapAdjustments): BasemapAdjustments {
  const result: { -readonly [K in keyof BasemapAdjustments]: BasemapAdjustments[K] } = {}
  if (adjustments.brightness !== undefined && adjustments.brightness !== DEFAULT_ADJUSTMENTS.brightness) result.brightness = adjustments.brightness
  if (adjustments.saturation !== undefined && adjustments.saturation !== DEFAULT_ADJUSTMENTS.saturation) result.saturation = adjustments.saturation
  if (adjustments.tintColor !== undefined && adjustments.tintColor.toUpperCase() !== DEFAULT_ADJUSTMENTS.tintColor) result.tintColor = adjustments.tintColor.toUpperCase()
  if (adjustments.tintIntensity !== undefined && adjustments.tintIntensity !== DEFAULT_ADJUSTMENTS.tintIntensity) result.tintIntensity = adjustments.tintIntensity
  return result
}

/** `#RGB`, `RGB`, `#RRGGBB` or `RRGGBB` (any case) as `#RRGGBB` in capitals; undefined when it is not a colour. */
export function parseHexColour(input: string): string | undefined {
  const digits = input.trim().replace(/^#/, '')
  if (/^[0-9a-f]{3}$/i.test(digits)) return `#${digits.replace(/./g, (digit) => digit + digit)}`.toUpperCase()
  if (/^[0-9a-f]{6}$/i.test(digits)) return `#${digits}`.toUpperCase()
  return undefined
}
