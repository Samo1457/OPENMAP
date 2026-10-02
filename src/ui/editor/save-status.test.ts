import { describe, expect, it, vi } from 'vitest'
import type { SaveStatus } from '@/persistence'
import { createSaveIndicator, nextSaveIndicator, saveIndicatorLabel } from './save-status'

function fakeAutosave(initial: SaveStatus = 'saved') {
  let status = initial
  const listeners = new Set<(status: SaveStatus) => void>()
  return {
    getStatus: () => status,
    subscribe(listener: (status: SaveStatus) => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    set(next: SaveStatus) {
      status = next
      for (const listener of listeners) listener(next)
    },
    listenerCount: () => listeners.size,
  }
}

describe('save status mapping (UX-DR137)', () => {
  it('maps each status to its top-bar label', () => {
    expect(saveIndicatorLabel).toEqual({ saving: 'editor.save.saving', saved: 'editor.save.saved', error: 'editor.save.error' })
  })

  it('follows the autosave, except that a retry after a failure stays in error until a save succeeds', () => {
    expect(nextSaveIndicator('saved', 'saving')).toBe('saving')
    expect(nextSaveIndicator('saving', 'saved')).toBe('saved')
    expect(nextSaveIndicator('saving', 'error')).toBe('error')
    expect(nextSaveIndicator('error', 'saving')).toBe('error')
    expect(nextSaveIndicator('error', 'saved')).toBe('saved')
  })

  it('reports a failure once per failure, not on every failed retry', () => {
    const autosave = fakeAutosave()
    const onFailure = vi.fn<() => void>()
    const indicator = createSaveIndicator(autosave, onFailure)
    const listener = vi.fn<() => void>()
    indicator.subscribe(listener)

    autosave.set('saving')
    expect(indicator.get()).toBe('saving')
    autosave.set('error')
    autosave.set('saving')
    autosave.set('error')
    expect(indicator.get()).toBe('error')
    expect(onFailure).toHaveBeenCalledTimes(1)
    autosave.set('saved')
    expect(indicator.get()).toBe('saved')
    autosave.set('saving')
    autosave.set('error')
    expect(onFailure).toHaveBeenCalledTimes(2)
    expect(listener).toHaveBeenCalledTimes(5)

    indicator.dispose()
    expect(autosave.listenerCount()).toBe(0)
  })
})
