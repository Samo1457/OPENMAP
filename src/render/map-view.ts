// The MapLibre adapter (AD-1, AD-6): draws the Basemap of a Scene with MapLibre GL JS and hosts the
// deck.gl overlay that draws every Project element (the neutral Territories, from Story 1.11). It animates nothing by itself: the Scene
// camera is applied with `jumpTo`, and only the user's own wheel, drag or pinch motion moves the
// edit camera (UI state, never in the Project). Loaded lazily by the Editor (`loadMapView`).

import { GeoJsonLayer } from '@deck.gl/layers'
import { MapLibreOverlay } from '@deck.gl/maplibre'
import { LngLat, Map as MapLibreMap, Point, setWorkerUrl, type PaddingOptions } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
// MapLibre 6 runs its worker from a separate module that imports a shared chunk: Vite bundles both into one worker file served by the app origin.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { clampCenterLat, frameScale, minEditZoom, zoomOffset, type Rect, type Scene, type SceneCamera, type SceneTerritory, type Size } from '@/core'
import { OVERLAY_MODE } from './overlay-mode'
import { fallbackStyle, loadBasemapStyle, paintTargets, type BasemapStyle } from './style'

export interface MapLayout {
  /** The Map area in screen px. */
  readonly area: Size
  /** The output frame inside it, in screen px. */
  readonly frame: Rect
}

export interface MapViewOptions {
  /** Element MapLibre draws into. */
  readonly container: HTMLElement
  /** The focusable Map region: Space + drag, Shift + wheel and the keys are read here. */
  readonly keyTarget: HTMLElement
  readonly scene: Scene
  readonly layout: MapLayout
  /** The user moved the edit camera (reference zoom). */
  readonly onEditCamera: (camera: SceneCamera) => void
}

export interface MapView {
  setScene(scene: Scene): void
  setLayout(layout: MapLayout): void
  /** Applies a camera given in reference zoom with `jumpTo`. */
  setCamera(camera: SceneCamera): void
  /** The camera currently shown, in reference zoom. */
  getCamera(): SceneCamera
  /** Zoom steps around the frame centre (keyboard and buttons). */
  zoomBy(delta: number): void
  /** Moves the view by screen px. */
  panPixels(dx: number, dy: number): void
  /** Pans continuously at `x`, `y` screen px/s until set to zero (held arrow or Z/Q/S/D keys). */
  setPanVelocity(x: number, y: number): void
  /** Size factor of the frame for deck.gl sizes (`s`, AD-23). */
  getScale(): number
  destroy(): void
}

setWorkerUrl(workerUrl)

const MIN_ZOOM = -2
const MAX_ZOOM = 22
/** Degrees of rotation per wheel delta unit with Shift. */
const ROTATE_PER_WHEEL = 0.1

function hexToRgba(hex: string): [number, number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255, 255]
}

const sameCamera = (a: SceneCamera, b: SceneCamera) =>
  Math.abs(a.center[0] - b.center[0]) < 1e-9 && Math.abs(a.center[1] - b.center[1]) < 1e-9 && Math.abs(a.zoom - b.zoom) < 1e-9 && Math.abs(a.bearing - b.bearing) < 1e-9

function padding(layout: MapLayout): PaddingOptions {
  const { area, frame } = layout
  return {
    top: Math.max(0, frame.y),
    left: Math.max(0, frame.x),
    right: Math.max(0, area.width - frame.x - frame.width),
    bottom: Math.max(0, area.height - frame.y - frame.height),
  }
}

export function createMapView(options: MapViewOptions): MapView {
  const { container, keyTarget, onEditCamera } = options
  let scene = options.scene
  let layout = options.layout
  /** The camera shown, in reference zoom: the source of truth between gestures. */
  let camera: SceneCamera = scene.camera
  let destroyed = false

  // Style state: which Basemap is loaded, whether MapLibre holds its style yet, whether the tiles
  // have arrived (until then the background is the plain land colour).
  let styleBasemap: string | undefined
  let styleReady = false
  let styled = false
  /** The loaded style is the relief one (it has the shade raster): the others share one structure. */
  let styledRelief = false
  let tilesArrived = false
  const failedSources = new Set<string>()
  let loadToken = 0
  const aborter = new AbortController()

  /** `transformConstrain` runs during construction, before `map` exists. */
  let constructed = false
  const map = new MapLibreMap({
    container,
    style: fallbackStyle(scene.basemap) as never,
    center: [camera.center[0], camera.center[1]],
    zoom: camera.zoom + zoomOffset(layout.frame),
    bearing: camera.bearing,
    pitch: 0,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    maxPitch: 0,
    fadeDuration: 0,
    attributionControl: false,
    dragPan: false,
    dragRotate: false,
    boxZoom: false,
    doubleClickZoom: false,
    keyboard: false,
    touchPitch: false,
    scrollZoom: true,
    touchZoomRotate: true,
    // MapLibre's default keeps the world covering the viewport of the whole Map area; the output frame
    // is what matters here: no zoom below the default view, and the frame never leaves the world
    // vertically. Longitude is free: the world copies stay on so a map can cross the antimeridian.
    transformConstrain: (center, zoom) => {
      const offset = zoomOffset(layout.frame)
      const clamped = Math.min(MAX_ZOOM, Math.max(minEditZoom(scene.frame) + offset, zoom))
      const lat = clampCenterLat(center.lat, clamped - offset, constructed ? map.getBearing() : camera.bearing, scene.frame)
      return { center: new LngLat(center.lng, lat), zoom: clamped }
    },
  })
  constructed = true
  styleBasemap = scene.basemap.id
  // The canvas is decoration for assistive tech: the Map region is the named, focusable element.
  const canvas = map.getCanvas()
  const hideCanvas = () => {
    if (canvas.getAttribute('tabindex') !== '-1') canvas.setAttribute('tabindex', '-1')
    if (canvas.hasAttribute('aria-label')) canvas.removeAttribute('aria-label')
    if (canvas.getAttribute('role') !== 'presentation') canvas.setAttribute('role', 'presentation')
  }
  hideCanvas()
  // MapLibre sets these attributes again as it starts: keep the canvas out of the tab order.
  const canvasObserver = new MutationObserver(hideCanvas)
  canvasObserver.observe(canvas, { attributes: true, attributeFilter: ['tabindex', 'aria-label', 'role'] })

  const overlay = new MapLibreOverlay({ interleaved: OVERLAY_MODE === 'interleaved', layers: [] })
  map.addControl(overlay as never)

  // --- Territories: one GeoJsonLayer, outline only (AD-6). The Scene gives sizes in reference px; they
  // are scaled by `s` here, so a new Output Format or window size redraws them at the right width.
  let territories: { readonly items: readonly SceneTerritory[]; readonly features: GeoJSON.Feature[] } = { items: [], features: [] }

  function territoryItems(source: Scene): SceneTerritory[] {
    return source.items.filter((item): item is SceneTerritory => item.kind === 'territory').sort((a, b) => a.z - b.z)
  }

  function drawTerritories() {
    const items = territoryItems(scene)
    const unchanged = items.length === territories.items.length && items.every((item, i) => item.geometry === territories.items[i].geometry && item.key === territories.items[i].key)
    // The same geometry objects keep the same `data`, so deck.gl does not tessellate them again.
    if (!unchanged) {
      territories = {
        items,
        features: items.map((item) => ({ type: 'Feature', properties: { key: item.key }, geometry: item.geometry as unknown as GeoJSON.Geometry })),
      }
    }
    const style = items[0]?.outline
    const colour: [number, number, number, number] = style ? hexToRgba(style.colour) : [0, 0, 0, 255]
    const width = (style?.width ?? 0) * frameScale(layout.frame)
    overlay.setProps({
      layers:
        items.length === 0
          ? []
          : [
              new GeoJsonLayer({
                id: 'territories',
                data: territories.features,
                stroked: true,
                filled: false,
                getLineColor: colour,
                getLineWidth: width,
                lineWidthUnits: 'pixels',
                lineJointRounded: true,
                pickable: false,
                updateTriggers: { getLineColor: [colour.join()], getLineWidth: [width] },
              }),
            ],
    })
    container.dataset.territories = String(items.length)
    container.dataset.territoryKeys = items.map((item) => item.key).join(' ')
    container.dataset.outlineWidth = width.toFixed(3)
    busy()
  }

  function publish() {
    container.dataset.camera = JSON.stringify({
      center: camera.center.map((value) => Math.round(value * 1e4) / 1e4),
      zoom: Math.round(camera.zoom * 1e4) / 1e4,
      bearing: Math.round(camera.bearing * 100) / 100,
    })
  }

  function readCamera(): SceneCamera {
    const center = map.getCenter()
    return { center: [center.lng, center.lat], zoom: map.getZoom() - zoomOffset(layout.frame), bearing: map.getBearing(), pitch: 0 }
  }

  /** `data-idle` tells tests (and nothing else) that the Map has drawn everything it was asked to. */
  function busy() {
    container.dataset.idle = 'false'
    map.triggerRepaint()
  }

  function apply() {
    busy()
    // `resize` fires move events of its own: flagged like our `jumpTo`, so they are not taken for the user's.
    map.resize({ programmatic: true })
    map.jumpTo(
      {
        center: [camera.center[0], camera.center[1]],
        zoom: camera.zoom + zoomOffset(layout.frame),
        bearing: camera.bearing,
        pitch: 0,
        padding: padding(layout),
      },
      { programmatic: true },
    )
    // The limits may have moved the view (a higher lowest zoom after a change of Output Format).
    const actual = readCamera()
    if (!sameCamera(actual, camera)) {
      camera = actual
      onEditCamera(actual)
    }
    publish()
  }

  /** The user's own motion: remember it and report it as the edit camera. */
  function userMoved() {
    const next = readCamera()
    if (sameCamera(next, camera)) return
    camera = next
    publish()
    onEditCamera(camera)
  }

  /** `setPaintProperty` is typed per layer type; the targets are checked by id and tests. */
  const setPaint = map.setPaintProperty.bind(map) as (layer: string, property: string, value: string) => void

  function paint() {
    if (!styleReady) return
    busy()
    const keepLand = !styled || !tilesArrived
    container.dataset.land = scene.basemap.colours.land
    container.dataset.sea = scene.basemap.colours.sea
    container.dataset.showing = keepLand ? 'land' : 'sea'
    for (const target of paintTargets(scene.basemap, { tilesArrived: !keepLand })) {
      if (map.getLayer(target.layer)) setPaint(target.layer, target.property, target.colour)
    }
  }

  function sourcesLoaded(): boolean {
    const sources = Object.keys(map.getStyle()?.sources ?? {})
    return sources.length > 0 && sources.every((id) => map.isSourceLoaded(id))
  }

  function checkTiles() {
    if (tilesArrived || !styled || !styleReady || failedSources.size > 0) return
    if (sourcesLoaded()) {
      tilesArrived = true
      paint()
    }
  }

  async function loadStyle(basemapId: string) {
    const token = ++loadToken
    busy()
    styled = false
    const loaded: BasemapStyle | undefined = await loadBasemapStyle(scene.basemap, { origin: window.location.origin, signal: aborter.signal })
    if (destroyed || token !== loadToken || basemapId !== styleBasemap) return
    styleReady = false
    tilesArrived = false
    failedSources.clear()
    styled = loaded !== undefined
    styledRelief = scene.basemap.shade !== undefined
    container.dataset.style = styled ? 'styled' : 'fallback'
    map.setStyle((loaded ?? fallbackStyle(scene.basemap)) as never, { diff: false })
  }

  map.on('style.load', () => {
    styleReady = true
    paint()
    checkTiles()
  })
  map.on('sourcedata', checkTiles)
  map.on('idle', () => {
    checkTiles()
    container.dataset.idle = 'true'
  })
  // A source that cannot load (404, parse error) keeps the land colour; nothing reaches the console.
  map.on('error', (event) => {
    const sourceId = (event as { sourceId?: string }).sourceId
    if (sourceId) failedSources.add(sourceId)
  })
  map.on('move', (event) => {
    // Every camera change we make is a `jumpTo` flagged `programmatic`; any other motion is
    // MapLibre's own wheel or pinch handler, i.e. the user's.
    if (!(event as { programmatic?: boolean }).programmatic) userMoved()
  })
  map.once('load', () => {
    container.dataset.ready = 'true'
  })

  container.dataset.style = 'loading'
  container.dataset.basemap = scene.basemap.id
  drawTerritories()
  void loadStyle(scene.basemap.id)
  apply()

  // --- The user's pan: Space + left button, or the middle button. Left alone is for later tools.
  let spaceDown = false
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === ' ' && event.target === keyTarget && !event.repeat) {
      spaceDown = true
      event.preventDefault()
    }
  }
  const onKeyUp = (event: KeyboardEvent) => {
    if (event.key === ' ') spaceDown = false
  }
  const resetSpace = () => {
    spaceDown = false
  }
  keyTarget.addEventListener('keydown', onKeyDown)
  keyTarget.addEventListener('keyup', onKeyUp)
  keyTarget.addEventListener('blur', resetSpace)
  window.addEventListener('blur', resetSpace)

  let drag: { id: number; lastX: number; lastY: number } | undefined
  const surface = map.getCanvasContainer()
  const onPointerDown = (event: PointerEvent) => {
    const middle = event.button === 1
    if (!(middle || (event.button === 0 && spaceDown))) return
    event.preventDefault() // no browser autoscroll on the middle button
    surface.setPointerCapture(event.pointerId)
    drag = { id: event.pointerId, lastX: event.clientX, lastY: event.clientY }
    surface.style.cursor = 'grabbing'
  }
  const onPointerMove = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.id) return
    // The content follows the pointer 1:1: each move pans by the pointer's step since the last event
    // (the centre moves the other way), measured against the map as it is now.
    const dx = event.clientX - drag.lastX
    const dy = event.clientY - drag.lastY
    drag.lastX = event.clientX
    drag.lastY = event.clientY
    panBy(-dx, -dy)
  }
  const onPointerEnd = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.id) return
    drag = undefined
    surface.style.cursor = ''
  }
  surface.addEventListener('pointerdown', onPointerDown)
  surface.addEventListener('pointermove', onPointerMove)
  surface.addEventListener('pointerup', onPointerEnd)
  surface.addEventListener('pointercancel', onPointerEnd)
  surface.addEventListener('mousedown', (event) => {
    if (event.button === 1) event.preventDefault()
  })

  // --- Shift + wheel rotates around the frame centre; the plain wheel is MapLibre's zoom.
  const onWheel = (event: WheelEvent) => {
    if (!event.shiftKey) return
    event.preventDefault()
    event.stopPropagation()
    const delta = event.deltaY || event.deltaX
    map.jumpTo({ bearing: map.getBearing() + delta * ROTATE_PER_WHEEL }, { programmatic: true })
    userMoved()
  }
  keyTarget.addEventListener('wheel', onWheel, { capture: true, passive: false })

  // --- Held keys pan continuously at a constant screen speed, one jumpTo per frame (no easing).
  let velocity = { x: 0, y: 0 }
  let frameId: number | undefined
  let lastTime = 0
  function panFrame(time: number) {
    frameId = undefined
    if (destroyed || (velocity.x === 0 && velocity.y === 0)) return
    const seconds = Math.min(0.05, (time - lastTime) / 1000)
    lastTime = time
    if (seconds > 0) panBy(velocity.x * seconds, velocity.y * seconds)
    frameId = requestAnimationFrame(panFrame)
  }
  function panBy(dx: number, dy: number) {
    const target = map.project(map.getCenter()).add(new Point(dx, dy))
    map.jumpTo({ center: map.unproject(target) }, { programmatic: true })
    userMoved()
  }

  return {
    setScene(next) {
      const previous = scene
      scene = next
      container.dataset.basemap = next.basemap.id
      if (next.basemap.id !== previous.basemap.id || next.basemap.styleUrl !== previous.basemap.styleUrl) {
        styleBasemap = next.basemap.id
        // The three flat Basemaps share one style structure: repainting is enough, with no reload.
        const sameStructure = styled && styledRelief === (next.basemap.shade !== undefined)
        if (!sameStructure) void loadStyle(next.basemap.id)
      }
      paint()
      drawTerritories()
    },
    setLayout(next) {
      layout = next
      apply()
      drawTerritories()
    },
    setCamera(next) {
      camera = next
      apply()
    },
    getCamera: () => camera,
    zoomBy(delta) {
      map.jumpTo({ zoom: map.getZoom() + delta }, { programmatic: true })
      userMoved()
    },
    panPixels: panBy,
    setPanVelocity(x, y) {
      if (destroyed) return
      const wasMoving = velocity.x !== 0 || velocity.y !== 0
      const moving = x !== 0 || y !== 0
      velocity = { x, y }
      // A pending frame may be older than this press: restart the clock so the first step is not a jump.
      if (moving && !wasMoving) lastTime = performance.now()
      if (frameId === undefined && moving) frameId = requestAnimationFrame(panFrame)
    },
    getScale: () => frameScale(layout.frame),
    destroy() {
      destroyed = true
      if (frameId !== undefined) cancelAnimationFrame(frameId)
      aborter.abort()
      canvasObserver.disconnect()
      keyTarget.removeEventListener('keydown', onKeyDown)
      keyTarget.removeEventListener('keyup', onKeyUp)
      keyTarget.removeEventListener('blur', resetSpace)
      keyTarget.removeEventListener('wheel', onWheel, { capture: true })
      window.removeEventListener('blur', resetSpace)
      map.remove()
    },
  }
}
