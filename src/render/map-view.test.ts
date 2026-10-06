import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { type CreditCorner, type CreditProminence, mapColors, type Scene, type SceneCredit, type SceneItem, type SceneTerritory } from '@/core'
import type { CreditStyle } from './credit-layout'

// The deck.gl layers of the selection outline (Story 1.12), with MapLibre and deck.gl stubbed: the
// stubs record the layers the adapter hands to the overlay.
const mocks = vi.hoisted(() => {
  const handlers: Record<string, ((event?: unknown) => void)[]> = {}
  const canvasSize = { width: 0, height: 0 }
  type Overlay = { props: { layers: { id: string; props: Record<string, unknown> }[] }; options: { interleaved?: boolean; views?: { props: Record<string, unknown> } } }
  const overlays: Overlay[] = []
  const constructed: Overlay[] = []
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
      return { width: canvasSize.width, height: canvasSize.height, getAttribute: (k: string) => attributes.get(k) ?? null, setAttribute: (k: string, v: string) => void attributes.set(k, v), hasAttribute: (k: string) => attributes.has(k), removeAttribute: (k: string) => void attributes.delete(k) }
    }
    getCanvasContainer() {
      return { addEventListener() {}, style: {} }
    }
    addControl() {}
    on(name: string, handler: (event?: unknown) => void) {
      ;(handlers[name] ??= []).push(handler)
    }
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
    unproject(point: number[] | { x: number; y: number }) {
      // A readable stand-in that follows the camera: the screen point relative to the Map area's centre
      // (500, 300) as lng/lat (x, -y), shifted by the camera centre.
      const [x, y] = Array.isArray(point) ? point : [point.x, point.y]
      return { lng: this.center.lng + x - 500, lat: this.center.lat - (y - 300) }
    }
    remove() {}
  }
  return { overlays, constructed, handlers, canvasSize, FakeLayer, FakeMap }
})

vi.mock('maplibre-gl', () => ({ Map: mocks.FakeMap, LngLat: class {}, Point: class {}, setWorkerUrl: () => undefined }))
vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}))
vi.mock('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url', () => ({ default: '/worker.js' }))
vi.mock('@deck.gl/layers', () => ({ GeoJsonLayer: mocks.FakeLayer, TextLayer: mocks.FakeLayer }))
vi.mock('@deck.gl/extensions', () => ({ PathStyleExtension: class { options: unknown; constructor(options: unknown) { this.options = options } } }))
vi.mock('@deck.gl/core', () => ({
  MapView: class {
    props: Record<string, unknown>
    constructor(props: Record<string, unknown>) {
      this.props = props
    }
  },
}))
vi.mock('@deck.gl/maplibre', () => ({
  MapLibreOverlay: class {
    props = { layers: [] as { id: string; props: Record<string, unknown> }[] }
    options: { interleaved?: boolean; views?: { props: Record<string, unknown> } }
    constructor(options: { interleaved?: boolean; views?: { props: Record<string, unknown> } }) {
      this.options = options
      mocks.constructed.push(this as never)
    }
    setProps(next: { layers: { id: string; props: Record<string, unknown> }[] }) {
      this.props = next
      mocks.overlays.push(this as never)
    }
  },
}))

const square = (x: number) => ({ type: 'Polygon' as const, coordinates: [[[x, 0], [x + 1, 0], [x + 1, 1], [x, 1], [x, 0]] as [number, number][]] })
const territory = (key: string, x: number): SceneTerritory => ({ kind: 'territory', z: 2000, key, geometry: square(x), outline: { colour: '#7A8590', width: 1.5 } })
const scene = (items: SceneItem[]): Scene => ({
  t: 0,
  frame: { width: 1920, height: 1080 },
  camera: { center: [0, 0], zoom: 1, bearing: 0, pitch: 0 },
  basemap: { kind: 'basemap', z: 0, id: 'parchment', styleUrl: '/library/v1/styles/parchment.json', colours: { sea: '#D0DBE0', land: '#EEE8D5', coast: '#7A8590' } },
  items,
})

const globals = globalThis as unknown as Record<string, unknown>
const saved: Record<string, unknown> = {}
beforeAll(() => {
  for (const key of ['window', 'document', 'MutationObserver', 'requestAnimationFrame', 'cancelAnimationFrame', 'fetch']) saved[key] = globals[key]
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

/** The layers now on both overlays: the last set each one was given (the Territories one, then the credit one). */
function currentLayers() {
  const lastOf = (credit: boolean) => [...mocks.overlays].reverse().find((overlay) => (overlay.options.interleaved === false) === credit)
  return [...(lastOf(false)?.props.layers ?? []), ...(lastOf(true)?.props.layers ?? [])]
}

async function create(items: SceneItem[]) {
  const { createMapView } = await import('./map-view')
  const container = { dataset: {} as Record<string, string> } as unknown as HTMLElement
  const target = { addEventListener() {}, removeEventListener() {} } as unknown as HTMLElement
  const layout = { area: { width: 1000, height: 600 }, frame: { x: 20, y: 20, width: 960, height: 540 } }
  const view = createMapView({ container, keyTarget: target, scene: scene(items), layout, onEditCamera: () => undefined })
  const layers = () => currentLayers()
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

// --- The credit (Story 1.13): one TextLayer anchored at a corner of the output frame.
const STYLE: CreditStyle = {
  fontFamily: "'Source Sans 3 Variable', sans-serif",
  margin: 24,
  discreet: { fontSize: 18, fontWeight: 400, lineHeight: 1.2 },
  legible: { fontSize: 24, fontWeight: 500, lineHeight: 1.2 },
}
const TEXT = 'Historical borders: Cliopatria, Seshat Global History Databank, CC BY 4.0.'
const credit = (corner: CreditCorner = 'bottom-left', prominence: CreditProminence = 'discreet', text = TEXT): SceneCredit => ({ kind: 'credit', z: 5000, text, corner, prominence })
/** `create()`'s frame is x 20, y 20, 960 × 540 screen px, so s = 0.5. */

async function withCredit(item: SceneCredit | undefined, style: CreditStyle | null = STYLE) {
  const made = await create([territory('k:a', 0), ...(item ? [item] : [])])
  made.view.setCreditStyle(style ?? undefined)
  const text = () => made.layers().find((layer) => layer.id === 'credit-text')
  return { ...made, text }
}

describe('the credit overlay', () => {
  it('is its own overlay: not interleaved, and not repeated in world copies (a wide frame would show the credit twice)', async () => {
    const before = mocks.constructed.length
    const { view } = await create([territory('k:a', 0)])
    const made = mocks.constructed.slice(before)
    expect(made).toHaveLength(2)
    expect(made[0].options.interleaved).toBe(true)
    expect(made[1].options.interleaved).toBe(false)
    expect(made[1].options.views?.props).toMatchObject({ id: 'maplibre', repeat: false })
    view.destroy()
  })

  it('puts the credit in the same world copy the view is centred on: a longitude beyond 180 is wrapped like the view state', async () => {
    const { view, text } = await withCredit(credit('bottom-left'))
    view.setCamera({ center: [400, 5], zoom: 2, bearing: 0, pitch: 0 })
    // The stand-in unproject adds the centre (400) to the offset; the view state wraps the centre to 40.
    expect(layersAnchor(text())[0]).toBe(40 + (20 - 500))
    view.destroy()
  })

  it('lays the text out again when the corner changes: the text layout triggers follow the anchor, baseline and size', async () => {
    const { view, text } = await withCredit(credit('bottom-left', 'discreet'))
    const triggers = () => text()!.props.updateTriggers as { getText: unknown[]; getTextAnchor: unknown[]; getAlignmentBaseline: unknown[]; getSize: unknown[] }
    const first = triggers()
    view.setScene(scene([territory('k:a', 0), credit('top-right', 'legible')]))
    const next = triggers()
    expect(next.getTextAnchor).toEqual(['end'])
    expect(next.getAlignmentBaseline).toEqual(['top'])
    expect(next.getText).not.toEqual(first.getText)
    expect(next.getSize).not.toEqual(first.getSize)
    view.destroy()
  })
})

describe('the credit layer', () => {
  it('is drawn above the Territories as one text layer holding the Scene text, never translated', async () => {
    const { view, layers, text, container } = await withCredit(credit())
    expect(layers().map((l) => l.id)).toEqual(['territories', 'credit-text'])
    expect((text()!.props.data as { text: string }[])[0].text).toBe(TEXT)
    expect(container.dataset.credit).toBe(TEXT)
    expect(container.dataset.creditState).toBe('drawn')
    view.destroy()
  })

  it('draws nothing without the credit tokens, and nothing without a credit item', async () => {
    const noStyle = await withCredit(credit(), null)
    expect(noStyle.text()).toBeUndefined()
    expect(noStyle.container.dataset.creditState).toBe('none')
    noStyle.view.destroy()
    const noItem = await withCredit(undefined)
    expect(noItem.text()).toBeUndefined()
    expect(noItem.container.dataset.credit).toBe('')
    noItem.view.destroy()
  })

  it('is discreet: map-credit-discreet 18/400 times s, with a halo and no band, in the map-label colours', async () => {
    const { view, text } = await withCredit(credit('bottom-left', 'discreet'))
    expect(text()!.props).toMatchObject({
      getSize: 9, // 18 × s (0.5)
      fontWeight: 400,
      lineHeight: 1.2,
      sizeUnits: 'pixels',
      background: false,
      getColor: [0x18, 0x22, 0x2d, 255], // parchment map-label
      outlineColor: [0xf7, 0xf3, 0xea, 255], // parchment map-label-halo
      fontSettings: { sdf: true },
    })
    expect(text()!.props.outlineWidth).toBeGreaterThan(0)
    view.destroy()
  })

  it('is legible: map-credit-legible 24/500 times s on a halo band, no outline', async () => {
    const { view, text } = await withCredit(credit('bottom-left', 'legible'))
    expect(text()!.props).toMatchObject({ getSize: 12, fontWeight: 500, background: true, outlineWidth: 0 })
    const [r, g, b, a] = text()!.props.getBackgroundColor as number[]
    expect([r, g, b]).toEqual([0xf7, 0xf3, 0xea])
    expect(a).toBeGreaterThan(200)
    expect(text()!.props.backgroundPadding).toEqual([6, 3]) // [12, 6] reference px × s
    view.destroy()
  })

  const corners: [CreditCorner, number[], number[], string, string][] = [
    ['bottom-left', [20, 560], [12, -12], 'start', 'bottom'],
    ['bottom-right', [980, 560], [-12, -12], 'end', 'bottom'],
    ['top-left', [20, 20], [12, 12], 'start', 'top'],
    ['top-right', [980, 20], [-12, 12], 'end', 'top'],
  ]
  it.each(corners)('anchors %s to that corner of the frame, with the 24 reference px margin times s', async (corner, anchor, offset, textAnchor, alignment) => {
    const { view, text, container } = await withCredit(credit(corner))
    const props = text()!.props
    // The stand-in unproject gives the screen point relative to the area centre (camera at 0, 0).
    expect((props.data as { position: number[] }[])[0].position).toEqual([anchor[0] - 500, 300 - anchor[1]])
    expect(props.getPixelOffset).toEqual(offset)
    expect(props.getTextAnchor).toBe(textAnchor)
    expect(props.getAlignmentBaseline).toBe(alignment)
    expect(JSON.parse(container.dataset.creditLayout!)).toMatchObject({ corner, anchor, offset })
    view.destroy()
  })

  it('is clipped to the output frame, so the world copies of the Map never show it again outside', async () => {
    const { view, text } = await withCredit(credit('bottom-left'))
    // The frame of `create()` in drawing-buffer px (device pixel ratio 1, area 1000 × 600, origin bottom-left).
    expect(text()!.props.parameters).toEqual({ scissorTest: true, scissor: [20, 40, 960, 540] })
    view.setLayout({ area: { width: 1000, height: 600 }, frame: { x: 100, y: 50, width: 480, height: 270 } })
    expect(text()!.props.parameters).toEqual({ scissorTest: true, scissor: [100, 280, 480, 270] })
    view.destroy()
  })

  it('keeps the legible band edge at the margin: the text sits the band padding further in', async () => {
    const { view, container } = await withCredit(credit('top-right', 'legible'))
    expect(JSON.parse(container.dataset.creditLayout!).offset).toEqual([-(12 + 6), 12 + 3])
    view.destroy()
  })

  it('follows the frame: a new layout moves the anchor and rescales the size', async () => {
    const { view, text } = await withCredit(credit('bottom-right'))
    view.setLayout({ area: { width: 1000, height: 600 }, frame: { x: 100, y: 50, width: 480, height: 270 } }) // s = 0.25
    expect(text()!.props.getSize).toBe(4.5)
    expect((text()!.props.data as { position: number[] }[])[0].position).toEqual([80, -20])
    expect(text()!.props.getPixelOffset).toEqual([-6, -6])
    view.destroy()
  })

  it('wraps to the frame width on at most two lines and never clips', async () => {
    const long = Array.from({ length: 40 }, (_, i) => `Source${i}`).join(' ')
    const { view, text, container } = await withCredit(credit('bottom-left', 'discreet', long))
    const { lines } = JSON.parse(container.dataset.creditLayout!) as { lines: string[] }
    expect(lines.length).toBeGreaterThan(1)
    expect(lines.length).toBeLessThanOrEqual(2)
    expect(lines.join(' ')).toBe(long)
    expect((text()!.props.data as { text: string }[])[0].text).toBe(lines.join('\n'))
    view.destroy()
  })

  it('follows the Scene: a new scene without the credit removes the layer, one with it brings it back', async () => {
    const { view, layers, container } = await withCredit(credit())
    view.setScene(scene([territory('k:a', 0)]))
    expect(layers().map((l) => l.id)).toEqual(['territories'])
    expect(container.dataset.creditState).toBe('none')
    view.setScene(scene([territory('k:a', 0), credit('top-left', 'legible')]))
    expect(layers().map((l) => l.id)).toEqual(['territories', 'credit-text'])
    view.destroy()
  })

  it('moves with the camera: it is re-anchored when the map moves, and the layer position changes', async () => {
    const { view, text } = await withCredit(credit('bottom-left'))
    const before = layersAnchor(text())
    view.setCamera({ center: [5, 5], zoom: 2, bearing: 0, pitch: 0 })
    const after = layersAnchor(text())
    expect(after).toEqual([before[0] + 5, before[1] + 5])
    expect((text()!.props.updateTriggers as { getPosition: number[] }).getPosition).toEqual(after)
    view.destroy()
  })

  it('keeps one stable data row, and rewrites the layout description only when it changes', async () => {
    const { view, text, container } = await withCredit(credit('bottom-left'))
    const data = text()!.props.data
    const writes: string[] = []
    let described = container.dataset.creditLayout
    Object.defineProperty(container.dataset, 'creditLayout', { get: () => described, set: (value: string) => void writes.push((described = value)), configurable: true })
    view.setCamera({ center: [9, 9], zoom: 2, bearing: 0, pitch: 0 })
    expect(text()!.props.data).toBe(data)
    expect(writes).toEqual([]) // the camera moved, the layout did not
    view.setLayout({ area: { width: 1000, height: 600 }, frame: { x: 100, y: 50, width: 480, height: 270 } })
    expect(writes).toHaveLength(1)
    view.destroy()
  })

  it('pushes again on a map move only when the anchor moved on the map', async () => {
    const { view } = await withCredit(credit('bottom-left'))
    const count = mocks.overlays.length
    for (const handler of mocks.handlers.move ?? []) handler({ programmatic: true })
    expect(mocks.overlays.length).toBe(count) // same camera: same anchor, no push
    view.setCamera({ center: [3, 3], zoom: 2, bearing: 0, pitch: 0 })
    const afterJump = mocks.overlays.length
    expect(afterJump).toBeGreaterThan(count)
    for (const handler of mocks.handlers.move ?? []) handler({ programmatic: true })
    expect(mocks.overlays.length).toBe(afterJump)
    view.destroy()
  })

  it('draws nothing in a degenerate frame', async () => {
    const { view, text, container } = await withCredit(credit('bottom-left'))
    view.setLayout({ area: { width: 1000, height: 600 }, frame: { x: 20, y: 20, width: 0, height: 540 } })
    expect(text()).toBeUndefined()
    expect(container.dataset.creditState).toBe('none')
    view.destroy()
  })
})

const layersAnchor = (layer: { props: Record<string, unknown> } | undefined) => ((layer as { props: Record<string, unknown> }).props.data as { position: number[] }[])[0].position

describe('the credit font', () => {
  it('is not drawn before its font is ready, then appears once it is, with no other change', async () => {
    let resolve: () => void = () => undefined
    const load = vi.fn<(font: string, text: string) => Promise<void>>(() => new Promise<void>((done) => (resolve = done)))
    globals.document = { fonts: { load } }
    try {
      const { view, text, container, layers } = await withCredit(credit())
      expect(text()).toBeUndefined()
      expect(container.dataset.creditState).toBe('pending')
      expect(layers().map((l) => l.id)).toEqual(['territories'])
      expect(load).toHaveBeenCalledTimes(1)
      expect(load.mock.calls[0][0]).toBe("400 100px 'Source Sans 3 Variable', sans-serif")
      expect(load.mock.calls[0][1]).toBe(TEXT)
      resolve()
      await Promise.resolve()
      await Promise.resolve()
      expect(text()).toBeDefined()
      expect(container.dataset.creditState).toBe('drawn')
      view.destroy()
    } finally {
      delete globals.document
    }
  })

  it('keys the font by the characters of the text: another set of characters loads again, the same set does not', async () => {
    const load = vi.fn<(font: string, text: string) => Promise<void>>(() => Promise.resolve())
    globals.document = { fonts: { load } }
    try {
      const { view } = await withCredit(credit('bottom-left', 'discreet', 'Credit abc.'))
      await Promise.resolve()
      await Promise.resolve()
      expect(load).toHaveBeenCalledTimes(1)
      view.setScene(scene([territory('k:a', 0), credit('bottom-left', 'discreet', 'cba tidre.C')])) // the same characters
      expect(load).toHaveBeenCalledTimes(1)
      view.setScene(scene([territory('k:a', 0), credit('bottom-left', 'discreet', 'Crédit abc.')])) // é: another subset
      expect(load).toHaveBeenCalledTimes(2)
      expect(load.mock.calls[1][1]).toBe('Crédit abc.')
      view.destroy()
    } finally {
      delete globals.document
    }
  })

  it('draws with the fallback face when the font cannot load', async () => {
    globals.document = { fonts: { load: () => Promise.reject(new Error('blocked')) } }
    try {
      const { view, text } = await withCredit(credit())
      await Promise.resolve()
      await Promise.resolve()
      expect(text()).toBeDefined()
      view.destroy()
    } finally {
      delete globals.document
    }
  })
})

describe('the credit scissor at a device pixel ratio of 2', () => {
  const win = () => globals.window as { devicePixelRatio?: number }
  afterEach(() => {
    delete win().devicePixelRatio
    mocks.canvasSize.width = 0
    mocks.canvasSize.height = 0
  })

  it('is the frame in drawing-buffer px, flipped from the bottom of the area times 2', async () => {
    win().devicePixelRatio = 2
    const { view, text } = await withCredit(credit('bottom-left'))
    // Frame 20, 20, 960 × 540 in a 1000 × 600 area: buffer 2000 × 1200.
    expect(text()!.props.parameters).toEqual({ scissorTest: true, scissor: [40, 80, 1920, 1080] })
    expect(text()!.props.getSize).toBe(9) // sizes stay in CSS px: deck.gl applies the ratio itself
    view.destroy()
  })

  it('is clamped to a canvas that is smaller than the area times the ratio', async () => {
    win().devicePixelRatio = 2
    mocks.canvasSize.width = 1500
    mocks.canvasSize.height = 1100
    const { view, text } = await withCredit(credit('bottom-left'))
    // The canvas height (1100) differs from 600 × 2: the top of the frame cannot pass the buffer.
    expect(text()!.props.parameters).toEqual({ scissorTest: true, scissor: [40, 80, 1460, 1020] })
    view.destroy()
  })

  it('draws nothing when the frame is outside the canvas', async () => {
    win().devicePixelRatio = 2
    mocks.canvasSize.width = 30
    const { view, text } = await withCredit(credit('bottom-left'))
    expect(text()).toBeUndefined()
    view.destroy()
  })
})

describe('the credit colours follow the Basemap palette', () => {
  const hex = (value: string) => [1, 3, 5].map((i) => Number.parseInt(value.slice(i, i + 2), 16))
  it.each(Object.keys(mapColors) as (keyof typeof mapColors)[])('%s: map-label ink and map-label-halo halo', async (basemap) => {
    const { createMapView } = await import('./map-view')
    const container = { dataset: {} as Record<string, string> } as unknown as HTMLElement
    const target = { addEventListener() {}, removeEventListener() {} } as unknown as HTMLElement
    const base = scene([territory('k:a', 0), credit('bottom-left', 'discreet')])
    const view = createMapView({
      container,
      keyTarget: target,
      scene: { ...base, basemap: { ...base.basemap, id: basemap } },
      layout: { area: { width: 1000, height: 600 }, frame: { x: 20, y: 20, width: 960, height: 540 } },
      onEditCamera: () => undefined,
    })
    view.setCreditStyle(STYLE)
    const layer = currentLayers().find((l) => l.id === 'credit-text')!
    expect(layer.props.getColor).toEqual([...hex(mapColors[basemap]['map-label']), 255])
    expect(layer.props.outlineColor).toEqual([...hex(mapColors[basemap]['map-label-halo']), 255])
    view.destroy()
  })
})
