import { describe, expect, it } from 'vitest'
import { adjustColour, DEFAULT_ADJUSTMENTS, hexToRgb, resolveAdjustments, parseHexColour, rgbToHex, withoutDefaults } from './adjust-colour'
import { mapColors } from './palettes'

describe('adjustColour (FR-5)', () => {
  const land = mapColors.parchment['map-land-neutral'] // #EEE8D7

  it('returns the colour unchanged for the defaults, whatever the tint colour', () => {
    expect(adjustColour(land, {})).toBe('#EEE8D7')
    expect(adjustColour(land, { tintColor: '#FF0000' })).toBe('#EEE8D7')
    expect(adjustColour(land, DEFAULT_ADJUSTMENTS)).toBe('#EEE8D7')
  })

  it('brightens toward white and darkens toward black (golden values)', () => {
    expect(adjustColour(land, { brightness: 50 })).toBe('#F7F4EB')
    expect(adjustColour(land, { brightness: -50 })).toBe('#77746C')
    expect(adjustColour('#000000', { brightness: 50 })).toBe('#808080')
    expect(adjustColour('#FFFFFF', { brightness: -50 })).toBe('#808080')
  })

  it('scales the saturation (golden values)', () => {
    expect(adjustColour(land, { saturation: -100 })).toBe('#E3E3E3')
    expect(adjustColour('#FF0000', { saturation: -50 })).toBe('#BF4040')
    // Already saturated: +50 % stays inside the gamut.
    expect(adjustColour('#FF0000', { saturation: 50 })).toBe('#FF0000')
    // Greys have no hue to saturate.
    expect(adjustColour('#808080', { saturation: 50 })).toBe('#808080')
  })

  it('mixes toward the tint colour by the intensity (golden values)', () => {
    expect(adjustColour(land, { tintColor: '#000000', tintIntensity: 50 })).toBe('#77746C')
    expect(adjustColour('#FFFFFF', { tintColor: '#FF0000', tintIntensity: 60 })).toBe('#FF6666')
    // Without an explicit colour the tint is map-tint.
    expect(adjustColour('#FFFFFF', { tintIntensity: 60 })).toBe(adjustColour('#FFFFFF', { tintColor: '#11161C', tintIntensity: 60 }))
  })

  it('applies saturation, then brightness, then tint', () => {
    const gray = adjustColour(land, { saturation: -100 }) // #E3E3E3
    expect(adjustColour(land, { saturation: -100, brightness: -50, tintColor: '#000000', tintIntensity: 20 })).toBe(
      adjustColour(adjustColour(gray, { brightness: -50 }), { tintColor: '#000000', tintIntensity: 20 }),
    )
  })

  it('clamps out-of-range values to the ranges of the Basemap settings', () => {
    expect(resolveAdjustments({ brightness: 500, saturation: -500, tintIntensity: 500 })).toMatchObject({
      brightness: 50,
      saturation: -100,
      tintIntensity: 60,
    })
  })

  it('round-trips hex and rgb', () => {
    expect(rgbToHex(hexToRgb('#0a1B2c'))).toBe('#0A1B2C')
  })

  it('drops what equals the default and upper-cases the tint colour', () => {
    expect(withoutDefaults({ brightness: 0, saturation: 0, tintIntensity: 0, tintColor: '#11161c' })).toEqual({})
    expect(withoutDefaults({ brightness: 5, saturation: 0, tintColor: '#abcdef', tintIntensity: 10 })).toEqual({
      brightness: 5,
      tintColor: '#ABCDEF',
      tintIntensity: 10,
    })
  })

  it('reads 3 or 6 hex digits with an optional #, and nothing else', () => {
    expect(parseHexColour('#f00')).toBe('#FF0000')
    expect(parseHexColour('0af')).toBe('#00AAFF')
    expect(parseHexColour(' #1a2B3c ')).toBe('#1A2B3C')
    for (const bad of ['', '#', '#ff', '#ffff', '#fffff', '#ggg', 'nope', '#1234567']) expect(parseHexColour(bad)).toBeUndefined()
  })
})
