// What the browser says about local storage (AD-8): space used and whether it may evict the
// Projects. Read by Settings → Storage (Story 1.6) and the storage banner (Story 1.15).

/** Space used and available to the app's origin, in bytes. */
export interface StorageSpace {
  readonly usage: number
  readonly quota: number
}

export interface StorageStatus {
  /** `unavailable` when the browser does not report it (no `navigator.storage`, or it failed). */
  readonly space: StorageSpace | 'unavailable'
  /** `protected`: the browser will not evict the Projects (`navigator.storage.persisted()`). */
  readonly protection: 'protected' | 'unprotected' | 'unavailable'
}

export type StorageFacts = Partial<Pick<StorageManager, 'estimate' | 'persisted'>>

/** A browser probe that has not answered by then reads as `unavailable`. */
export const STORAGE_PROBE_TIMEOUT_MS = 3000

/** `promise`, or `fallback` if it has not settled within `ms` (the timer is cleared either way). */
function within<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const late = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms)
  })
  return Promise.race([promise, late]).finally(() => clearTimeout(timer))
}

const isBytes = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0

async function readSpace(storage: StorageFacts | undefined): Promise<StorageStatus['space']> {
  if (typeof storage?.estimate !== 'function') return 'unavailable'
  try {
    const { usage, quota } = await storage.estimate()
    return isBytes(usage) && isBytes(quota) && quota > 0 ? { usage, quota } : 'unavailable'
  } catch {
    return 'unavailable'
  }
}

async function readProtection(storage: StorageFacts | undefined): Promise<StorageStatus['protection']> {
  if (typeof storage?.persisted !== 'function') return 'unavailable'
  try {
    const persisted = await storage.persisted()
    return typeof persisted === 'boolean' ? (persisted ? 'protected' : 'unprotected') : 'unavailable'
  } catch {
    return 'unavailable'
  }
}

/**
 * Reads both facts; each one is `unavailable` on its own when the browser cannot tell, or has not
 * answered within `timeoutMs`. Never rejects.
 */
export async function readStorageStatus(storage: StorageFacts | undefined, timeoutMs = STORAGE_PROBE_TIMEOUT_MS): Promise<StorageStatus> {
  const [space, protection] = await Promise.all([
    within(readSpace(storage), timeoutMs, 'unavailable' as const),
    within(readProtection(storage), timeoutMs, 'unavailable' as const),
  ])
  return { space, protection }
}
