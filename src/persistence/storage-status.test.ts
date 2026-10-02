import { describe, expect, it, vi } from 'vitest'
import { readStorageStatus } from './storage-status'

describe('readStorageStatus', () => {
  it('reports space used and protection when the browser knows them', async () => {
    const storage = { estimate: async () => ({ usage: 12_000_000, quota: 2_000_000_000 }), persisted: async () => true }
    await expect(readStorageStatus(storage)).resolves.toEqual({ space: { usage: 12_000_000, quota: 2_000_000_000 }, protection: 'protected' })
  })

  it('reports an unprotected storage', async () => {
    const storage = { estimate: async () => ({ usage: 0, quota: 10 }), persisted: async () => false }
    await expect(readStorageStatus(storage)).resolves.toEqual({ space: { usage: 0, quota: 10 }, protection: 'unprotected' })
  })

  it('is unavailable without navigator.storage', async () => {
    await expect(readStorageStatus(undefined)).resolves.toEqual({ space: 'unavailable', protection: 'unavailable' })
  })

  it('is unavailable for each fact the browser lacks, keeping the other', async () => {
    await expect(readStorageStatus({ persisted: async () => false })).resolves.toEqual({ space: 'unavailable', protection: 'unprotected' })
    await expect(readStorageStatus({ estimate: async () => ({ usage: 1, quota: 2 }) })).resolves.toEqual({ space: { usage: 1, quota: 2 }, protection: 'unavailable' })
  })

  it('never rejects: failures and missing numbers read as unavailable', async () => {
    const failing = {
      estimate: () => Promise.reject(new Error('blocked')),
      persisted: () => Promise.reject(new Error('blocked')),
    }
    await expect(readStorageStatus(failing)).resolves.toEqual({ space: 'unavailable', protection: 'unavailable' })
    await expect(readStorageStatus({ estimate: async () => ({}) })).resolves.toMatchObject({ space: 'unavailable' })
    await expect(readStorageStatus({ estimate: async () => ({ usage: 5, quota: 0 }) })).resolves.toMatchObject({ space: 'unavailable' })
  })

  it('reads a probe that never settles as unavailable after the timeout, keeping the other', async () => {
    vi.useFakeTimers()
    try {
      const storage = { estimate: () => new Promise<StorageEstimate>(() => undefined), persisted: async () => true }
      const status = readStorageStatus(storage)
      await vi.advanceTimersByTimeAsync(3000)
      await expect(status).resolves.toEqual({ space: 'unavailable', protection: 'protected' })
      const hung = { estimate: () => new Promise<StorageEstimate>(() => undefined), persisted: () => new Promise<boolean>(() => undefined) }
      const both = readStorageStatus(hung, 50)
      await vi.advanceTimersByTimeAsync(50)
      await expect(both).resolves.toEqual({ space: 'unavailable', protection: 'unavailable' })
    } finally {
      vi.useRealTimers()
    }
  })
})
