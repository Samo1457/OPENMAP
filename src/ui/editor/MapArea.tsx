import { Crosshair, Minus, Plus } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FRAME_MASK_OPACITY, frameRect, mapColors, type OutputFormat, type Scene, type SceneCamera, type Size } from '@/core'
import { loadMapView, type MapView } from '@/render'
import { buttonClass, iconProps } from '@/ui/components/button'
import { Tooltip } from '@/ui/components/Tooltip'
import { announce } from '@/ui/keyboard/announcer'
import { KEYBOARD_ZOOM_STEP, mapShortcuts, RECENTRE_COMBO, ZOOM_IN_COMBOS, ZOOM_OUT_COMBOS } from '@/ui/keyboard/map-shortcuts'
import { regionProps } from '@/ui/keyboard/regions'
import { registerShortcuts } from '@/ui/keyboard/registry'
import { cn } from '@/ui/lib/utils'
import { monoColors } from '@/ui/theme/tokens'
import { resetEditCamera, setEditCamera, useEditCamera } from './edit-camera-store'

/** `#RRGGBB` and an opacity as `rgb(r g b / a)`. */
function withOpacity(hex: string, opacity: number): string {
  const value = Number.parseInt(hex.slice(1), 16)
  return `rgb(${(value >> 16) & 255} ${(value >> 8) & 255} ${value & 255} / ${opacity})`
}

/** Dims everything outside the output frame: a shadow around the frame box, clipped by the Map area. */
const MASK = withOpacity(monoColors['canvas-mask'], FRAME_MASK_OPACITY)

/** The land colour shown until the Map is up, when there is no Project yet: parchment's `map-land-neutral`. */
const LOADING_LAND = mapColors.parchment['map-land-neutral']

/**
 * The Map area (UX-DR101, UX-DR103): MapLibre draws the Basemap of the Scene, the output frame is
 * shown by dimming the outside with `canvas-mask` at 55 % (no border), and the zoom buttons sit
 * bottom-left, in the margin under the frame. The edit camera (wheel, pinch, Space + drag, middle
 * button, Shift + wheel, `+` `-` Ctrl+arrows, Shift+1) is UI state: it never touches the Project or
 * the Scene camera. The Map code is a lazy chunk. Colours come from the Scene, never from the UI
 * theme, so the Map is pixel-identical in light and dark. Without data the land colour of the active
 * Basemap shows, and editing is never blocked.
 */
export function MapArea({ scene, outputFormat }: { scene?: Scene; outputFormat?: OutputFormat }) {
  const { t } = useTranslation()
  const region = useRef<HTMLElement>(null)
  const host = useRef<HTMLDivElement>(null)
  const [area, setArea] = useState<Size | undefined>()
  const [view, setView] = useState<MapView | undefined>()
  const editCamera = useEditCamera()

  // A Project opens at the Scene camera; the edit camera never outlives the Map.
  useLayoutEffect(() => {
    resetEditCamera()
    return resetEditCamera
  }, [])

  useLayoutEffect(() => {
    const element = region.current
    if (!element) return
    const measure = () => setArea({ width: element.clientWidth, height: element.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const frame = useMemo(() => (area && outputFormat ? frameRect(area, outputFormat) : undefined), [area, outputFormat])
  const layout = useMemo(() => (area && frame ? { area, frame } : undefined), [area, frame])

  // Latest values for the creation effect and the callbacks, which must not re-run with them.
  const latest = useRef({ scene, layout })
  useEffect(() => {
    latest.current = { scene, layout }
  })

  /** The camera the view last reported: not applied back to it (it would stop MapLibre's own easing). */
  const reported = useRef<SceneCamera | undefined>(undefined)

  const ready = scene !== undefined && layout !== undefined
  useEffect(() => {
    if (!ready || !host.current || !region.current) return
    let cancelled = false
    let created: MapView | undefined
    const container = host.current
    const keyTarget = region.current
    void loadMapView()
      .then((createMapView) => {
      const { scene: first, layout: firstLayout } = latest.current
      if (cancelled || !first || !firstLayout) return
      created = createMapView({
        container,
        keyTarget,
        scene: first,
        layout: firstLayout,
        onEditCamera: (camera) => {
          reported.current = camera
          setEditCamera(camera)
        },
      })
      setView(created)
      })
      .catch(() => undefined) // a failed chunk is reloaded once by the app (AD-19)
    return () => {
      cancelled = true
      created?.destroy()
      setView(undefined)
    }
    // The view is created once per mount of the area; scene and layout reach it through the effects below.
  }, [ready])

  useEffect(() => {
    if (view && scene) view.setScene(scene)
  }, [view, scene])

  useEffect(() => {
    if (view && layout) view.setLayout(layout)
  }, [view, layout])

  // The camera shown: the edit camera, else the Scene camera. Keyed by value so an edit elsewhere in
  // the Project (a new Scene object) does not jump the view.
  const sceneCameraKey = scene ? JSON.stringify(scene.camera) : ''
  useEffect(() => {
    if (!view) return
    const camera = editCamera ?? latest.current.scene?.camera
    if (camera && camera !== reported.current) view.setCamera(camera)
  }, [view, editCamera, sceneCameraKey])

  const zoom = useCallback(
    (delta: number) => {
      view?.zoomBy(delta)
      announce(t(delta > 0 ? 'editor.camera.zoomedIn' : 'editor.camera.zoomedOut'))
    },
    [view, t],
  )
  const pan = useCallback(
    (dx: number, dy: number) => {
      view?.panPixels(dx, dy)
      announce(t('editor.camera.panned'))
    },
    [view, t],
  )
  const recentre = useCallback(() => {
    resetEditCamera()
    reported.current = undefined
    // Already at the Scene camera: the store did not change, so apply it directly.
    const sceneCamera = latest.current.scene?.camera
    if (sceneCamera) view?.setCamera(sceneCamera)
    announce(t('editor.camera.recentred'))
  }, [view, t])

  useEffect(() => registerShortcuts(mapShortcuts({ zoom, pan, recentre })), [zoom, pan, recentre])

  const disabled = view === undefined
  const land = scene?.basemap.colours.land ?? LOADING_LAND
  const controlClass = cn(buttonClass.ghostIcon, 'border border-om-border bg-om-surface-raised', disabled && 'control-disabled')

  return (
    <section
      ref={region}
      aria-label={t('editor.map')}
      {...regionProps('map')}
      data-map-content
      data-scene-camera={sceneCameraKey}
      onPointerDownCapture={(event) => {
        // MapLibre keeps the pointer for itself: the region takes the focus so the keys reach it.
        if (!(event.target as HTMLElement).closest('button')) region.current?.focus({ preventScroll: true })
      }}
      className="relative min-h-0 flex-1 overflow-hidden"
      style={{ backgroundColor: land }}
    >
      {/* MapLibre's stylesheet makes its container `position: relative`: it gets a wrapper to fill the area. */}
      <div aria-hidden className="absolute inset-0 isolate">
        <div ref={host} data-testid="map-canvas" className="h-full w-full" />
      </div>
      {frame && (
        <div
          data-testid="output-frame"
          aria-hidden
          className="pointer-events-none absolute"
          style={{ left: frame.x, top: frame.y, width: frame.width, height: frame.height, boxShadow: `0 0 0 100vmax ${MASK}` }}
        />
      )}
      <div className="om-map-focus-ring pointer-events-none absolute inset-0" aria-hidden />
      <div role="group" aria-label={t('editor.camera.group')} className="absolute bottom-2 left-2 flex gap-1">
        <Tooltip label={t('editor.camera.zoomIn')} shortcut={ZOOM_IN_COMBOS[0]}>
          {(tip) => (
            <button {...tip} type="button" aria-label={t('editor.camera.zoomIn')} aria-disabled={disabled || undefined} aria-keyshortcuts="+" className={controlClass} onClick={() => !disabled && zoom(KEYBOARD_ZOOM_STEP)}>
              <Plus {...iconProps} />
            </button>
          )}
        </Tooltip>
        <Tooltip label={t('editor.camera.zoomOut')} shortcut={ZOOM_OUT_COMBOS[0]}>
          {(tip) => (
            <button {...tip} type="button" aria-label={t('editor.camera.zoomOut')} aria-disabled={disabled || undefined} aria-keyshortcuts="-" className={controlClass} onClick={() => !disabled && zoom(-KEYBOARD_ZOOM_STEP)}>
              <Minus {...iconProps} />
            </button>
          )}
        </Tooltip>
        <Tooltip label={t('editor.camera.recentre')} shortcut={RECENTRE_COMBO}>
          {(tip) => (
            <button {...tip} type="button" aria-label={t('editor.camera.recentre')} aria-disabled={disabled || undefined} aria-keyshortcuts="Shift+1" className={controlClass} onClick={() => !disabled && recentre()}>
              <Crosshair {...iconProps} />
            </button>
          )}
        </Tooltip>
      </div>
    </section>
  )
}

