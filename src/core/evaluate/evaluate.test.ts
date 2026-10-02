import { describe, expect, it } from 'vitest'
import { apply } from '../commands/apply'
import { BASEMAP_IDS, OUTPUT_FRAME_SIZES, type OutputFormat } from '../model/project'
import { adjustColour } from '../basemap/adjust-colour'
import { mapColors } from '../basemap/palettes'
import { blankProject } from '../testing/fixtures'
import { fitBounds, WORLD_BOUNDS } from './camera'
import { evaluate } from './evaluate'
import { frameRect, frameScale, scaleSize, zoomOffset } from './frame'
import { layerZ, Z_BANDS } from './z-bands'

const ctx = (format: OutputFormat = '16:9') => ({ geodata: {}, frame: OUTPUT_FRAME_SIZES[format] })

function withBasemap(basemap: (typeof BASEMAP_IDS)[number], adjustments = {}) {
  let project = blankProject()
  const picked = apply(project, { type: 'SET_BASEMAP', payload: { basemap } })
  if (picked.ok && picked.value.changed) project = picked.value.project
  const adjusted = apply(project, { type: 'SET_BASEMAP_ADJUSTMENTS', payload: { adjustments } })
  if (adjusted.ok && adjusted.value.changed) project = adjusted.value.project
  return project
}

describe('evaluate (AD-1)', () => {
  it('is deterministic and returns plain serializable data', () => {
    const project = blankProject()
    const first = evaluate(project, 0, ctx())
    expect(evaluate(project, 0, ctx())).toEqual(first)
    expect(JSON.parse(JSON.stringify(first))).toEqual(first)
  })

  it('does not read anything but its arguments (t is carried, the project is untouched)', () => {
    const project = blankProject()
    const before = JSON.stringify(project)
    expect(evaluate(project, 3.5, ctx()).t).toBe(3.5)
    expect(JSON.stringify(project)).toBe(before)
  })

  it.each(BASEMAP_IDS)('resolves the %s palette and style for the Basemap', (id) => {
    const scene = evaluate(withBasemap(id), 0, ctx())
    expect(scene.basemap).toMatchObject({
      id,
      styleUrl: `/library/v1/styles/${id}.json`,
      colours: { sea: mapColors[id]['map-sea'], land: mapColors[id]['map-land-neutral'], coast: mapColors[id]['map-coast'] },
    })
    expect('shade' in scene.basemap).toBe(id === 'relief')
  })

  it('gives each Basemap its own colours', () => {
    const lands = BASEMAP_IDS.map((id) => evaluate(withBasemap(id), 0, ctx()).basemap.colours.land)
    expect(new Set(lands).size).toBe(BASEMAP_IDS.length)
  })

  it('applies the adjustments to the Basemap colours only', () => {
    const adjustments = { brightness: 30, saturation: -40, tintColor: '#336699', tintIntensity: 25 }
    const plain = evaluate(withBasemap('clair'), 0, ctx())
    const scene = evaluate(withBasemap('clair', adjustments), 0, ctx())
    expect(scene.basemap.colours.land).toBe(adjustColour(mapColors.clair['map-land-neutral'], adjustments))
    expect(scene.basemap.colours.land).not.toBe(plain.basemap.colours.land)
    expect(scene.camera).toEqual(plain.camera)
    expect(scene.items).toEqual(plain.items)
  })

  it('keeps the adjustments when the Basemap changes (DESIGN.md)', () => {
    const adjustments = { brightness: 20 }
    const project = withBasemap('sombre', adjustments)
    expect(evaluate(project, 0, ctx()).basemap.colours.sea).toBe(adjustColour(mapColors.sombre['map-sea'], adjustments))
  })

  describe('the default camera makes the world cover the output frame (AD-23)', () => {
    const worldPx = (format: OutputFormat) => 512 * 2 ** evaluate(blankProject(), 0, ctx(format)).camera.zoom
    const mercatorLat = (halfHeightFraction: number) => (Math.atan(Math.sinh(Math.PI * 2 * halfHeightFraction)) * 180) / Math.PI

    it('is centred on the world, north up and flat', () => {
      const scene = evaluate(blankProject(), 0, ctx('16:9'))
      expect(scene.camera.center[0]).toBeCloseTo(0, 6)
      expect(scene.camera.center[1]).toBeCloseTo(0, 6)
      expect(scene.camera).toMatchObject({ bearing: 0, pitch: 0 })
    })

    it('16:9 fits the world width: no second copy of the Earth, about ±70° of latitude', () => {
      const world = worldPx('16:9')
      expect(world).toBeCloseTo(1920, 6) // the world is exactly as wide as the frame
      expect(world).toBeGreaterThanOrEqual(1080) // and tall enough: no flat polar band
      expect(mercatorLat(1080 / 2 / world)).toBeGreaterThan(70)
      expect(mercatorLat(1080 / 2 / world)).toBeLessThan(71)
    })

    it('1:1 shows the whole world', () => {
      expect(worldPx('1:1')).toBeCloseTo(1080, 6)
    })

    it('9:16 fits the world height: about 55 % of the longitudes, no flat band', () => {
      const world = worldPx('9:16')
      expect(world).toBeCloseTo(1920, 6)
      expect(1080 / world).toBeCloseTo(0.5625, 4)
    })

    it.each(['16:9', '9:16', '1:1'] as const)('%s: the world is at least as large as the frame on both axes', (format) => {
      const { width, height } = OUTPUT_FRAME_SIZES[format]
      expect(worldPx(format)).toBeGreaterThanOrEqual(Math.max(width, height) - 1e-6)
    })
  })
})

describe('fitBounds', () => {
  it('contains by default and covers on request', () => {
    const frame = { width: 1920, height: 1080 }
    expect(fitBounds(WORLD_BOUNDS, frame).zoom).toBeCloseTo(Math.log2(1080 / 512), 6)
    expect(fitBounds(WORLD_BOUNDS, frame, 'cover').zoom).toBeCloseTo(Math.log2(1920 / 512), 6)
  })

  it('centres and zooms on a regional box', () => {
    const camera = fitBounds([0, 40, 20, 50], { width: 1920, height: 1080 })
    expect(camera.center[0]).toBeCloseTo(10, 6)
    expect(camera.center[1]).toBeGreaterThan(44)
    expect(camera.zoom).toBeGreaterThan(fitBounds(WORLD_BOUNDS, { width: 1920, height: 1080 }).zoom)
  })
})

describe('z bands (AD-6)', () => {
  it('orders Basemap, personal background, Layers, place labels, screen overlays, credit', () => {
    const order = [Z_BANDS.basemap, Z_BANDS.personalBackground, Z_BANDS.projectLayers, Z_BANDS.placeLabels, Z_BANDS.screenOverlays, Z_BANDS.credit]
    expect([...order].sort((a, b) => a - b)).toEqual(order)
    expect(new Set(order).size).toBe(order.length)
  })

  it('keeps Project Layers in document order inside their band', () => {
    expect(layerZ(0)).toBeGreaterThanOrEqual(Z_BANDS.projectLayers)
    expect(layerZ(4)).toBeGreaterThan(layerZ(0))
    expect(layerZ(999)).toBeLessThan(Z_BANDS.placeLabels)
    expect(() => layerZ(1000)).toThrow(RangeError)
  })

  it('puts the Basemap in the lowest band', () => {
    expect(evaluate(blankProject(), 0, ctx()).basemap.z).toBe(Z_BANDS.basemap)
  })
})

describe('output frame and scale (AD-23)', () => {
  it('scales a 56 px label to about 16 px in a 562×316 frame', () => {
    expect(scaleSize(56, { width: 562, height: 316 })).toBeCloseTo(16.4, 1)
    expect(frameScale({ width: 316, height: 562 })).toBeCloseTo(316 / 1080, 10)
  })

  it('offsets the MapLibre zoom by log2(s)', () => {
    expect(zoomOffset({ width: 960, height: 540 })).toBeCloseTo(-1, 10)
    expect(zoomOffset({ width: 1920, height: 1080 })).toBe(0)
  })

  it.each([
    ['16:9', 16 / 9],
    ['9:16', 9 / 16],
    ['1:1', 1],
  ] as const)('centres a %s frame at the exact ratio with a margin of at least 24 px (40 more below)', (format, ratio) => {
    for (const area of [
      { width: 990, height: 640 },
      { width: 1200, height: 500 },
      { width: 400, height: 900 },
    ]) {
      const rect = frameRect(area, format)
      expect(rect.width / rect.height).toBeCloseTo(ratio, 10)
      expect(rect.x).toBeGreaterThanOrEqual(24 - 1e-9)
      expect(rect.y).toBeGreaterThanOrEqual(24 - 1e-9)
      expect(area.width - (rect.x + rect.width)).toBeGreaterThanOrEqual(24 - 1e-9)
      expect(area.height - (rect.y + rect.height)).toBeGreaterThanOrEqual(64 - 1e-9)
      // Centred in the free space.
      expect(rect.x - 24).toBeCloseTo(area.width - rect.x - rect.width - 24, 9)
      expect(rect.y - 24).toBeCloseTo(area.height - rect.y - rect.height - 64, 9)
    }
  })

  it('survives a degenerate area', () => {
    const rect = frameRect({ width: 10, height: 10 }, '16:9')
    expect(rect.width / rect.height).toBeCloseTo(16 / 9, 10)
    expect(rect.width).toBeGreaterThan(0)
  })
})
