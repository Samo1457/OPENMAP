import { describe, expect, it } from 'vitest'
import { mainLandmassBounds } from './landmass'

const box = (x0: number, y0: number, x1: number, y1: number) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]

describe('mainLandmassBounds', () => {
  it('is the bounds of a Polygon', () => {
    expect(mainLandmassBounds({ type: 'Polygon', coordinates: [box(1, 2, 5, 9)] })).toEqual([1, 2, 5, 9])
  })

  it('takes the polygon with the largest area of a MultiPolygon, not the last or the widest', () => {
    const big = box(0, 0, 10, 10)
    const wide = box(20, 0, 60, 1)
    expect(mainLandmassBounds({ type: 'MultiPolygon', coordinates: [[wide], [big], [box(70, 0, 71, 1)]] })).toEqual([0, 0, 10, 10])
  })

  it('subtracts holes from the area', () => {
    const holed = [box(0, 0, 10, 10), box(1, 1, 9, 9)]
    const solid = [box(20, 0, 26, 6)]
    expect(mainLandmassBounds({ type: 'MultiPolygon', coordinates: [holed, solid] })).toEqual([20, 0, 26, 6])
  })

  it('weighs the area by latitude: a polar degree box is smaller than an equatorial one', () => {
    const polar = box(0, 80, 20, 90)
    const equatorial = box(30, 0, 40, 10)
    expect(mainLandmassBounds({ type: 'MultiPolygon', coordinates: [[polar], [equatorial]] })).toEqual([30, 0, 40, 10])
  })

  it('keeps the first of equal polygons', () => {
    expect(mainLandmassBounds({ type: 'MultiPolygon', coordinates: [[box(0, 0, 1, 1)], [box(5, 5, 6, 6)]] })).toEqual([0, 0, 1, 1])
  })

  it('skips unusable polygons and gives up on geometries without one', () => {
    expect(mainLandmassBounds({ type: 'MultiPolygon', coordinates: [[[[0, 0], [1, 1]]], [box(2, 2, 3, 3)]] })).toEqual([2, 2, 3, 3])
    expect(mainLandmassBounds({ type: 'MultiPolygon', coordinates: [] })).toBeUndefined()
    expect(mainLandmassBounds({ type: 'Point', coordinates: [1, 2] })).toBeUndefined()
    expect(mainLandmassBounds({ type: 'Polygon', coordinates: [[[Number.NaN, 0], [1, 0], [1, 1], [Number.NaN, 0]]] })).toBeUndefined()
  })
})
