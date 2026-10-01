import { describe, expect, it, vi } from 'vitest'
import { CHUNK_RELOAD_FLAG, RELOAD_COOLDOWN_MS, installChunkReload } from './chunk-reload'

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

const T0 = 1_000_000
const now = () => T0

describe('installChunkReload (AD-19)', () => {
  it('flushes pending saves, then reloads once', async () => {
    const target = new EventTarget()
    const storage = memoryStorage()
    const order: string[] = []
    const flush = vi.fn<() => Promise<void>>(async () => void order.push('flush'))
    const reload = vi.fn<() => void>(() => void order.push('reload'))
    installChunkReload({ target, storage: () => storage, now, flush, reload })

    const event = preloadError()
    target.dispatchEvent(event)
    await settle()

    expect(event.defaultPrevented).toBe(true)
    expect(order).toEqual(['flush', 'reload'])
    expect(storage.getItem(CHUNK_RELOAD_FLAG)).not.toBeNull()
  })

  /** Simulates a failure on a freshly reloaded page of the same tab session, `elapsed` ms after the first reload. */
  async function failAgainAfter(elapsed: number) {
    const storage = memoryStorage()
    const flush = vi.fn<() => Promise<void>>(async () => {})
    const reload = vi.fn<() => void>()
    const target = new EventTarget()
    installChunkReload({ target, storage: () => storage, now, flush, reload })
    target.dispatchEvent(preloadError())
    await settle()

    // Reloaded page, same tab session (sessionStorage survives the reload).
    const reloadedTarget = new EventTarget()
    installChunkReload({ target: reloadedTarget, storage: () => storage, now: () => T0 + elapsed, flush, reload })
    const second = preloadError()
    reloadedTarget.dispatchEvent(second)
    await settle()
    return { reload, flush, second, storage }
  }

  it('does not reload again when a second failure comes within the cooldown', async () => {
    const { reload, flush, second } = await failAgainAfter(RELOAD_COOLDOWN_MS - 1)
    expect(reload).toHaveBeenCalledTimes(1)
    expect(flush).toHaveBeenCalledTimes(1)
    expect(second.defaultPrevented).toBe(false)
  })

  it('reloads again once the cooldown has passed (a later redeploy in a long-lived tab)', async () => {
    const { reload, flush, second, storage } = await failAgainAfter(RELOAD_COOLDOWN_MS)
    expect(reload).toHaveBeenCalledTimes(2)
    expect(flush).toHaveBeenCalledTimes(2)
    expect(second.defaultPrevented).toBe(true)
    expect(storage.getItem(CHUNK_RELOAD_FLAG)).toBe(String(T0 + RELOAD_COOLDOWN_MS))
  })

  it.each(['not-a-timestamp', '1', '-5', '', 'Infinity', String(T0 + 60_000)])(
    'treats stored value %j as no recent reload',
    async (stored) => {
      const target = new EventTarget()
      const storage = memoryStorage()
      storage.setItem(CHUNK_RELOAD_FLAG, stored)
      const reload = vi.fn<() => void>()
      installChunkReload({ target, storage: () => storage, now, flush: async () => {}, reload })
      target.dispatchEvent(preloadError())
      await settle()
      expect(reload).toHaveBeenCalledTimes(1)
      expect(storage.getItem(CHUNK_RELOAD_FLAG)).toBe(String(T0))
    },
  )

  it('does not reload when storage is unavailable', async () => {
    const target = new EventTarget()
    const reload = vi.fn<() => void>()
    installChunkReload({
      target,
      storage: () => {
        throw new Error('SecurityError')
      },
      now,
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
      now,
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
      now,
      flush: async () => {},
      reload,
    })
    uninstall()
    target.dispatchEvent(preloadError())
    await settle()

    expect(reload).not.toHaveBeenCalled()
  })
})
