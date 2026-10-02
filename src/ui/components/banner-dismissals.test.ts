import { describe, expect, it, vi } from 'vitest'
import { createDismissals, DISMISSALS_STORAGE_KEY } from './banner-dismissals'

function memoryStorage() {
  const values = new Map<string, string>()
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => void values.set(key, value) }
}

describe('createDismissals (UX-DR66)', () => {
  it('remembers a dismissed banner and notifies once', () => {
    const dismissals = createDismissals()
    const listener = vi.fn<() => void>()
    const unsubscribe = dismissals.subscribe(listener)
    expect(dismissals.isDismissed('firefox')).toBe(false)
    dismissals.dismiss('firefox')
    dismissals.dismiss('firefox')
    expect(dismissals.isDismissed('firefox')).toBe(true)
    expect(dismissals.isDismissed('smallWindow')).toBe(false)
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
    dismissals.dismiss('smallWindow')
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('survives a reload of the tab through sessionStorage', () => {
    const storage = memoryStorage()
    createDismissals(() => storage).dismiss('firefox')
    expect(storage.getItem(DISMISSALS_STORAGE_KEY)).toBe('["firefox"]')
    expect(createDismissals(() => storage).isDismissed('firefox')).toBe(true)
    // A new session (new storage) starts empty.
    expect(createDismissals(() => memoryStorage()).isDismissed('firefox')).toBe(false)
  })

  it('works for the page when storage is blocked or holds garbage', () => {
    const blocked = () => {
      throw new Error('SecurityError')
    }
    const dismissals = createDismissals(blocked)
    dismissals.dismiss('firefox')
    expect(dismissals.isDismissed('firefox')).toBe(true)
    const garbage = memoryStorage()
    garbage.setItem(DISMISSALS_STORAGE_KEY, '{not json')
    expect(createDismissals(() => garbage).isDismissed('firefox')).toBe(false)
    garbage.setItem(DISMISSALS_STORAGE_KEY, '[1,"firefox"]')
    expect(createDismissals(() => garbage).isDismissed('firefox')).toBe(true)
  })
})
