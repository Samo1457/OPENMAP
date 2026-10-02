import { describe, expect, it } from 'vitest'
import { scaleBytes } from './format-bytes'

describe('scaleBytes', () => {
  it('uses decimal multiples, matching the MB and GB labels', () => {
    expect(scaleBytes(0)).toEqual({ value: 0, unit: 'b' })
    expect(scaleBytes(512)).toEqual({ value: 512, unit: 'b' })
    expect(scaleBytes(12_000_000)).toEqual({ value: 12, unit: 'mb' })
    expect(scaleBytes(2_000_000_000)).toEqual({ value: 2, unit: 'gb' })
  })

  it('keeps one decimal under 10 and none from 10 on', () => {
    expect(scaleBytes(1_250_000)).toEqual({ value: 1.3, unit: 'mb' })
    expect(scaleBytes(3_700)).toEqual({ value: 3.7, unit: 'kb' })
    expect(scaleBytes(12_400)).toEqual({ value: 12, unit: 'kb' })
  })

  it('moves to the next unit when rounding reaches 1000', () => {
    expect(scaleBytes(999_999)).toEqual({ value: 1, unit: 'mb' })
    expect(scaleBytes(999)).toEqual({ value: 999, unit: 'b' })
  })
})
