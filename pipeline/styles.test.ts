import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec'
import { describe, expect, it } from 'vitest'
import { mapColors, mapExtraColors } from '../src/ui/theme/tokens.ts'
import { BASEMAP_IDS, buildStyle, buildStyles, GLYPHS_PATH, RELIEF_SHADE_OPACITY, styleErrors } from './styles.ts'

const layerOf = (style: ReturnType<typeof buildStyle>, id: string) => style.layers.find((l) => l.id === id) as Record<string, any> | undefined

describe('basemap styles', () => {
  it('builds the four Basemaps of the Project model', () => {
    expect(BASEMAP_IDS).toEqual(['parchment', 'sombre', 'clair', 'relief'])
    expect(Object.keys(buildStyles())).toEqual(BASEMAP_IDS)
  })

  it.each(BASEMAP_IDS)('%s is valid against the MapLibre style spec', (id) => {
    expect(validateStyleMin(buildStyle(id) as never)).toEqual([])
    expect(styleErrors(buildStyle(id))).toEqual([])
  })

  it('reports spec violations', () => {
    const style = buildStyle('parchment')
    expect(styleErrors({ ...style, layers: [{ id: 'x', type: 'nope' }] }).length).toBeGreaterThan(0)
  })

  it.each(BASEMAP_IDS)('%s takes sea, land and coast colours from the tokens', (id) => {
    const style = buildStyle(id)
    expect(layerOf(style, 'background')?.paint['background-color']).toBe(mapColors[id]['map-sea'])
    expect(layerOf(style, 'land')?.paint['fill-color']).toBe(mapColors[id]['map-land-neutral'])
    expect(layerOf(style, 'coastline')?.paint['line-color']).toBe(mapColors[id]['map-coast'])
    expect(layerOf(style, 'lakes')?.paint['fill-color']).toBe(mapColors[id]['map-sea'])
  })

  it('Relief shades land at 35 % and paints sea back over the shade', () => {
    const style = buildStyle('relief')
    const ids = style.layers.map((l) => l.id)
    expect(RELIEF_SHADE_OPACITY).toBe(0.35)
    expect(layerOf(style, 'relief-shade')?.paint['raster-opacity']).toBe(0.35)
    expect(ids.indexOf('land')).toBeLessThan(ids.indexOf('relief-shade'))
    expect(ids.indexOf('relief-shade')).toBeLessThan(ids.indexOf('ocean'))
    expect(ids.indexOf('relief-shade')).toBeLessThan(ids.indexOf('lakes'))
    expect(style.metadata['openmap:shade-relief-colour']).toBe(mapExtraColors['map-shade-relief'])
    expect(style.sources['natural-earth-relief']).toMatchObject({ type: 'raster', url: '/natural-earth-relief-v1.json' })
  })

  it('only Relief has the raster source', () => {
    for (const id of ['parchment', 'sombre', 'clair'] as const) {
      const style = buildStyle(id)
      expect(Object.keys(style.sources)).toEqual(['natural-earth'])
      expect(style.layers.some((l) => l.type === 'raster')).toBe(false)
    }
  })

  it('has no text layer, no infrastructure layer and no third-party URL, yet declares glyphs', () => {
    for (const style of Object.values(buildStyles())) {
      expect(style.layers.some((l) => l.type === 'symbol')).toBe(false)
      expect(JSON.stringify(style.layers)).not.toMatch(/road|rail|transport/i)
      expect(style.glyphs).toBe(GLYPHS_PATH)
      expect(JSON.stringify(style)).not.toMatch(/https?:\/\//)
      expect(style.sources['natural-earth']).toMatchObject({ type: 'vector', url: '/natural-earth-v1.json' })
    }
  })

  it('is deterministic', () => {
    expect(JSON.stringify(buildStyles())).toBe(JSON.stringify(buildStyles()))
  })
})
