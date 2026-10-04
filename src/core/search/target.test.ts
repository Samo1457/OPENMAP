import { describe, expect, it } from 'vitest'
import { fitBounds, minEditZoom } from '../evaluate/camera'
import { cameraForPlace, CITY_ZOOM, FIT_MARGIN, MAX_FIT_ZOOM } from './target'

const FRAME = { width: 1920, height: 1080 }

describe('cameraForPlace', () => {
  it('centres a city at the reference zoom 6, north up', () => {
    expect(cameraForPlace({ center: [-0.119, 51.502] }, FRAME)).toEqual({ center: [-0.119, 51.502], zoom: CITY_ZOOM, bearing: 0, pitch: 0 })
    expect(CITY_ZOOM).toBe(6)
  })

  it('shows 21 degrees of longitude across the frame at zoom 6', () => {
    expect((FRAME.width / (512 * 2 ** CITY_ZOOM)) * 360).toBeCloseTo(21.09, 1)
  })

  it('fits the extent of a country inside the frame with a margin', () => {
    const bounds = [5.9, 47.3, 15, 55.1] as const
    const camera = cameraForPlace({ center: [9.68, 50.96], bounds }, FRAME)
    const inner = { width: FRAME.width * (1 - 2 * FIT_MARGIN), height: FRAME.height * (1 - 2 * FIT_MARGIN) }
    expect(camera.zoom).toBeCloseTo(fitBounds(bounds, inner).zoom, 10)
    // A margin is left: the camera is further out than the exact fit of the whole frame.
    expect(camera.zoom).toBeLessThan(fitBounds(bounds, FRAME).zoom)
    expect(camera.center[0]).toBeCloseTo((5.9 + 15) / 2, 6)
    expect(camera.bearing).toBe(0)
  })

  it('never goes below the lowest zoom: a continent-sized extent gives the default view', () => {
    const camera = cameraForPlace({ center: [0, 0], bounds: [-180, -60, 180, 80] }, FRAME)
    expect(camera.zoom).toBe(minEditZoom(FRAME))
  })

  it('a city is never below the lowest zoom of a frame that needs more', () => {
    const tall = { width: 1080, height: 1920 }
    expect(cameraForPlace({ center: [0, 0] }, tall).zoom).toBeGreaterThanOrEqual(minEditZoom(tall))
  })

  it('caps the zoom for a tiny or degenerate extent', () => {
    expect(cameraForPlace({ center: [12.45, 41.9], bounds: [12.445, 41.9, 12.457, 41.907] }, FRAME).zoom).toBe(MAX_FIT_ZOOM)
    expect(cameraForPlace({ center: [10, 10], bounds: [10, 10, 10, 10] }, FRAME).zoom).toBe(MAX_FIT_ZOOM)
  })

  it('fits Antarctica (south to latitude -90) inside the world: a finite zoom and centre', () => {
    const camera = cameraForPlace({ center: [35.9, -79.8], bounds: [-180, -90, 180, -63] }, FRAME)
    expect(Number.isFinite(camera.zoom)).toBe(true)
    expect(Number.isFinite(camera.center[0]) && Number.isFinite(camera.center[1])).toBe(true)
    expect(camera.zoom).toBeGreaterThanOrEqual(minEditZoom(FRAME))
    expect(camera.center[1]).toBeLessThan(-60)
    expect(camera.center[1]).toBeGreaterThan(-90)
    expect(Number.isFinite(cameraForPlace({ center: [0, 90], bounds: [-10, 80, 10, 90] }, FRAME).zoom)).toBe(true)
  })

  it('is deterministic', () => {
    const place = { center: [2, 46] as const, bounds: [-4.8, 42.3, 8.2, 51.1] as const }
    expect(cameraForPlace(place, FRAME)).toEqual(cameraForPlace(place, FRAME))
  })
})
