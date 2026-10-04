import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { Scene, SceneTerritory } from '@/core'

// The deck.gl layers of the selection outline (Story 1.12), with MapLibre and deck.gl stubbed: the
// stubs record the layers the adapter hands to the overlay.
const mocks = vi.hoisted(() => {
  const overlays: { props: { layers: { id: string; props: Record<string, unknown> }[] } }[] = []
  class FakeLayer {
    id: string
    props: Record<string, unknown>
    constructor(props: Record<string, unknown>) {
      this.id = props.id as string
      this.props = props
    }
  }
  class FakeMap {
    private center = { lng: 0, lat: 0 }
    private zoom = 0
    getCanvas() {
      const attributes = new Map<string, string>()
      return { getAttribute: (k: string) => attributes.get(k) ?? null, setAttribute: (k: string, v: string) => void attributes.set(k, v), hasAttribute: (k: string) => attributes.has(k), removeAttribute: (k: string) => void attributes.delete(k) }
    }
    getCanvasContainer() {
      return { addEventListener() {}, style: {} }
    }
    addControl() {}
    on() {}
    once() {}
    resize() {}
    jumpTo(options: { center?: [number, number]; zoom?: number }) {
      if (options.center) this.center = { lng: options.center[0], lat: options.center[1] }
      if (options.zoom !== undefined) this.zoom = options.zoom
    }
    triggerRepaint() {}
    getCenter() {
      return this.center
    }
    getZoom() {
      return this.zoom
    }
    getBearing() {
      return 0
    }
    getLayer() {
      return undefined
    }
    getStyle() {
      return { sources: {} }
    }
    isSourceLoaded() {
      return true
    }
    setStyle() {}
    setPaintProperty() {}
    project() {
      return { add: () => ({}) }
    }
    unproject() {
      return {}
    }
    remove() {}
  }
  return { overlays, FakeLayer, FakeMap }
})

vi.mock('maplibre-gl', () => ({ Map: mocks.FakeMap, LngLat: class {}, Point: class {}, setWorkerUrl: () => undefined }))
vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}))
vi.mock('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url', () => ({ default: '/worker.js' }))
vi.mock('@deck.gl/layers', () => ({ GeoJsonLayer: mocks.FakeLayer }))
vi.mock('@deck.gl/extensions', () => ({ PathStyleExtension: class { options: unknown; constructor(options: unknown) { this.options = options } } }))
vi.mock('@deck.gl/maplibre', () => ({
  MapLibreOverlay: class {
    props = { layers: [] as { id: string; props: Record<string, unknown> }[] }
    setProps(next: { layers: { id: string; props: Record<string, unknown> }[] }) {
      this.props = next
      mocks.overlays.push(this as never)
    }
  },
}))

const square = (x: number) => ({ type: 'Polygon' as const, coordinates: [[[x, 0], [x + 1, 0], [x + 1, 1], [x, 1], [x, 0]] as [number, number][]] })
const territory = (key: string, x: number): SceneTerritory => ({ kind: 'territory', z: 2000, key, geometry: square(x), outline: { colour: '#7A8590', width: 1.5 } })
const scene = (items: SceneTerritory[]): Scene => ({
  t: 0,
  frame: { width: 1920, height: 1080 },
  camera: { center: [0, 0], zoom: 1, bearing: 0, pitch: 0 },
  basemap: { kind: 'basemap', z: 0, id: 'parchment', styleUrl: '/library/v1/styles/parchment.json', colours: { sea: '#D0DBE0', land: '#EEE8D5', coast: '#7A8590' } },
  items,
})

const globals = globalThis as unknown as Record<string, unknown>
const saved: Record<string, unknown> = {}
beforeAll(() => {
  for (const key of ['window', 'MutationObserver', 'requestAnimationFrame', 'cancelAnimationFrame', 'fetch']) saved[key] = globals[key]
  globals.window = { location: { origin: 'http://localhost' }, addEventListener() {}, removeEventListener() {} }
  globals.MutationObserver = class { observe() {} disconnect() {} }
  globals.requestAnimationFrame = () => 0
  globals.cancelAnimationFrame = () => undefined
  globals.fetch = async () => {
    throw new Error('offline')
  }
})
afterAll(() => {
  for (const [key, value] of Object.entries(saved)) globals[key] = value
})

async function create(items: SceneTerritory[]) {
  const { createMapView } = await import('./map-view')
  const container = { dataset: {} as Record<string, string> } as unknown as HTMLElement
  const target = { addEventListener() {}, removeEventListener() {} } as unknown as HTMLElement
  const layout = { area: { width: 1000, height: 600 }, frame: { x: 20, y: 20, width: 960, height: 540 } }
  const view = createMapView({ container, keyTarget: target, scene: scene(items), layout, onEditCamera: () => undefined })
  const layers = () => mocks.overlays[mocks.overlays.length - 1].props.layers
  return { view, container, layers }
}

const INK = '#18222D'
const HALO = '#F7F3EA'

describe('the selection outline', () => {
  it('draws no selection layer until something is selected', async () => {
    const { view, layers, container } = await create([territory('k:a', 0)])
    expect(layers().map((l) => l.id)).toEqual(['territories'])
    expect(container.dataset.selection).toBe('')
    view.destroy()
  })

  it('adds selection-halo then selection-ink above the territories, 4.5 px and 1.6 px, ink on halo colours', async () => {
    const { view, layers, container } = await create([territory('k:a', 0), territory('k:b', 5)])
    view.setSelection({ key: 'k:b', ink: INK, halo: HALO })
    expect(layers().map((l) => l.id)).toEqual(['territories', 'selection-halo', 'selection-ink'])
    const [, halo, ink] = layers()
    expect(halo.props).toMatchObject({ getLineWidth: 4.5, getLineColor: [0xf7, 0xf3, 0xea, 255], lineWidthUnits: 'pixels' })
    expect(ink.props).toMatchObject({ getLineWidth: 1.6, getLineColor: [0x18, 0x22, 0x2d, 255], lineWidthUnits: 'pixels' })
    // Each outlines only the selected entity.
    for (const layer of [halo, ink]) expect((layer.props.data as { properties: { key: string } }[]).map((f) => f.properties.key)).toEqual(['k:b'])
    expect(container.dataset.selection).toBe('k:b')
    expect(container.dataset.selectionColours).toBe(`${INK} ${HALO}`)
    view.destroy()
  })

  it('dashes only the ink: the PathStyleExtension and a dash array on selection-ink, nothing on the halo or the territories', async () => {
    const { view, layers } = await create([territory('k:a', 0)])
    view.setSelection({ key: 'k:a', ink: INK, halo: HALO })
    const [territories, halo, ink] = layers()
    expect(ink.props.extensions).toHaveLength(1)
    expect((ink.props.extensions as { options: unknown }[])[0].options).toEqual({ dash: true })
    expect(ink.props.getDashArray).toEqual([5, 3])
    for (const layer of [territories, halo]) {
      expect(layer.props.extensions).toBeUndefined()
      expect(layer.props.getDashArray).toBeUndefined()
    }
    view.destroy()
  })

  it('draws nothing for a key that has no Territory in the Scene, and reports no selection', async () => {
    const { view, layers, container } = await create([territory('k:a', 0)])
    view.setSelection({ key: 'k:gone', ink: INK, halo: HALO })
    expect(layers().map((l) => l.id)).toEqual(['territories'])
    expect(container.dataset.selection).toBe('')
    expect(container.dataset.selectionColours).toBe('')
    view.destroy()
  })

  it('follows the Scene: the outline goes when its Territory leaves, and clearing removes it', async () => {
    const { view, layers, container } = await create([territory('k:a', 0)])
    view.setSelection({ key: 'k:a', ink: INK, halo: HALO })
    expect(layers()).toHaveLength(3)
    view.setScene(scene([territory('k:z', 3)]))
    expect(layers().map((l) => l.id)).toEqual(['territories'])
    expect(container.dataset.selection).toBe('')
    view.setScene(scene([territory('k:a', 0)]))
    expect(layers()).toHaveLength(3)
    view.setSelection(undefined)
    expect(layers().map((l) => l.id)).toEqual(['territories'])
    view.destroy()
  })
})
