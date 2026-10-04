import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearSelection, getSelection, selectEntity, selectionEscapeStep } from './selection-store'

afterEach(() => void clearSelection())

describe('selection store', () => {
  it('holds at most one selected GeoEntity, by canonical key', () => {
    expect(getSelection()).toBeUndefined()
    selectEntity('cliopatria@0.2.0:ottoman-empire', 'Ottoman Empire')
    expect(getSelection()).toEqual({ key: 'cliopatria@0.2.0:ottoman-empire', name: 'Ottoman Empire' })
    selectEntity('cliopatria@0.2.0:prussia', 'Prussia')
    expect(getSelection()).toEqual({ key: 'cliopatria@0.2.0:prussia', name: 'Prussia' })
  })

  it('clears, and says whether there was something to clear', () => {
    expect(clearSelection()).toBe(false)
    selectEntity('k', 'K')
    expect(clearSelection()).toBe(true)
    expect(getSelection()).toBeUndefined()
    expect(clearSelection()).toBe(false)
  })

  it('selecting the same entity again is not a change', () => {
    const before = (selectEntity('k', 'K'), getSelection())
    selectEntity('k', 'K')
    expect(getSelection()).toBe(before)
  })

  it('has an Escape step that clears and announces, and does nothing without a selection', () => {
    const announced = vi.fn<(name: string) => void>()
    const step = selectionEscapeStep(announced)
    expect(step.id).toBe('selection.clear')
    expect(step.priority).toBe(10)
    expect(step.run()).toBe(false)
    expect(announced).not.toHaveBeenCalled()
    selectEntity('k', 'Kingdom')
    expect(step.run()).toBe(true)
    expect(announced).toHaveBeenCalledWith('Kingdom')
    expect(getSelection()).toBeUndefined()
  })
})
