import { describe, expect, it } from 'vitest'
import { evaluate, OUTPUT_FRAME_SIZES } from '@/core'
import { blankProject } from '@/core/testing/fixtures'
import { absolutizeStyle, fallbackStyle, loadBasemapStyle, paintTargets, type BasemapStyle } from './style'

const basemap = evaluate(blankProject(), 0, { geodata: {}, frame: OUTPUT_FRAME_SIZES['16:9'] }).basemap
const ORIGIN = 'http://localhost:5173'

const style: BasemapStyle = {
  version: 8,
  glyphs: '/library/v1/glyphs/{fontstack}/{range}.pbf',
  sources: { 'natural-earth': { type: 'vector', url: '/natural-earth-v1.json' } },
  layers: [{ id: 'background', type: 'background' }],
}

const respond = (body: string, init: ResponseInit = {}): typeof fetch => async () => new Response(body, init)

describe('paintTargets (AD-6)', () => {
  it('repaints the style layers by id from the Scene colours', () => {
    const targets = paintTargets(basemap, { tilesArrived: true })
    const colour = (layer: string) => targets.find((target) => target.layer === layer)?.colour
    expect(colour('background')).toBe(basemap.colours.sea)
    expect(colour('land')).toBe(basemap.colours.land)
    expect(colour('ocean')).toBe(basemap.colours.sea)
    expect(colour('lakes')).toBe(basemap.colours.sea)
    expect(colour('rivers')).toBe(basemap.colours.sea)
    expect(colour('coastline')).toBe(basemap.colours.coast)
  })

  it('shows the plain land colour until the tiles arrive', () => {
    const pending = paintTargets(basemap, { tilesArrived: false })
    expect(pending.find((target) => target.layer === 'background')?.colour).toBe(basemap.colours.land)
  })
})

describe('basemap style loading', () => {
  it('resolves root-relative paths against the app origin', () => {
    const absolute = absolutizeStyle(style, ORIGIN)
    expect(absolute.glyphs).toBe(`${ORIGIN}/library/v1/glyphs/{fontstack}/{range}.pbf`)
    expect(absolute.sources['natural-earth']).toEqual({ type: 'vector', url: `${ORIGIN}/natural-earth-v1.json` })
    expect(style.sources['natural-earth'].url).toBe('/natural-earth-v1.json')
  })

  it('loads a valid style from the app origin', async () => {
    let requested = ''
    const fetcher: typeof fetch = async (input) => {
      requested = String(input)
      return new Response(JSON.stringify(style), { status: 200 })
    }
    const loaded = await loadBasemapStyle(basemap, { origin: ORIGIN, fetcher })
    expect(requested).toBe(`${ORIGIN}/library/v1/styles/parchment.json`)
    expect(loaded?.layers).toHaveLength(1)
  })

  it.each([
    ['a 404', respond('Basemap data not built', { status: 404 })],
    ['the SPA fallback page', respond('<!doctype html><html></html>', { status: 200, headers: { 'Content-Type': 'text/html' } })],
    ['invalid JSON', respond('{"version": 8,', { status: 200 })],
    ['a JSON document that is not a style', respond('{"version": 7, "layers": []}', { status: 200 })],
    [
      'a network error',
      (async () => {
        throw new TypeError('Failed to fetch')
      }) as typeof fetch,
    ],
  ])('gives no style for %s, without throwing', async (_name, fetcher) => {
    await expect(loadBasemapStyle(basemap, { origin: ORIGIN, fetcher })).resolves.toBeUndefined()
  })

  it('falls back to the land colour of the active Basemap', () => {
    const fallback = fallbackStyle(basemap)
    expect(fallback.layers).toEqual([{ id: 'background', type: 'background', paint: { 'background-color': basemap.colours.land } }])
    expect(Object.keys(fallback.sources)).toEqual([])
  })
})
