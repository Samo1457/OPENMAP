import { describe, expect, it, vi } from 'vitest'
import { CHUNK_RELOAD_FLAG, installChunkReload } from './chunk-reload'

function memoryStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  }
}

function preloadError() {
  return new Event('vite:preloadError', { cancelable: true })
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('installChunkReload (AD-19)', () => {
  it('flushes pending saves, then reloads once', async () => {
    const target = new EventTarget()
    const storage = memoryStorage()
    const order: string[] = []
    const flush = vi.fn<() => Promise<void>>(async () => void order.push('flush'))
    const reload = vi.fn<() => void>(() => void order.push('reload'))
    installChunkReload({ target, storage: () => storage, flush, reload })

    const event = preloadError()
    target.dispatchEvent(event)
    await settle()

    expect(event.defaultPrevented).toBe(true)
    expect(order).toEqual(['flush', 'reload'])
    expect(storage.getItem(CHUNK_RELOAD_FLAG)).not.toBeNull()
  })

  it('does not reload again after a second failure in the same session', async () => {
    const target = new EventTarget()
    const storage = memoryStorage()
    const flush = vi.fn<() => Promise<void>>(async () => {})
    const reload = vi.fn<() => void>()
    // First page load: the flag gets set, then the page reloads.
    installChunkReload({ target, storage: () => storage, flush, reload })
    target.dispatchEvent(preloadError())
    await settle()

    // Reloaded page, same tab session (sessionStorage survives the reload).
    const reloadedTarget = new EventTarget()
    installChunkReload({ target: reloadedTarget, storage: () => storage, flush, reload })
    const second = preloadError()
    reloadedTarget.dispatchEvent(second)
    await settle()

    expect(reload).toHaveBeenCalledTimes(1)
    expect(flush).toHaveBeenCalledTimes(1)
    expect(second.defaultPrevented).toBe(false)
  })

  it('does not reload when storage is unavailable', async () => {
    const target = new EventTarget()
    const reload = vi.fn<() => void>()
    installChunkReload({
      target,
      storage: () => {
        throw new Error('SecurityError')
      },
      flush: async () => {},
      reload,
    })
    const event = preloadError()
    target.dispatchEvent(event)
    await settle()

    expect(reload).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
  })

  it('keeps the tab and clears the flag when the flush fails', async () => {
    const target = new EventTarget()
    const storage = memoryStorage()
    const reload = vi.fn<() => void>()
    installChunkReload({
      target,
      storage: () => storage,
      flush: () => Promise.reject(new Error('quota')),
      reload,
    })
    target.dispatchEvent(preloadError())
    await settle()

    expect(reload).not.toHaveBeenCalled()
    expect(storage.getItem(CHUNK_RELOAD_FLAG)).toBeNull()
  })

  it('stops listening once uninstalled', async () => {
    const target = new EventTarget()
    const reload = vi.fn<() => void>()
    const uninstall = installChunkReload({
      target,
      storage: () => memoryStorage(),
      flush: async () => {},
      reload,
    })
    uninstall()
    target.dispatchEvent(preloadError())
    await settle()

    expect(reload).not.toHaveBeenCalled()
  })
})
