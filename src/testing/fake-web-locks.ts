// Test helper (Story 1.14): an in-memory `navigator.locks` and `BroadcastChannel`, shared by every
// "tab" of one test, so two sessions in one process behave like two tabs of one browser. The Web
// Locks queue follows the spec: a request is granted when nothing held conflicts and no earlier
// request for the same name waits; `ifAvailable` never waits; an aborted request leaves the queue.

import { vi } from 'vitest'

interface Held {
  readonly tab: string
  readonly name: string
  readonly mode: 'exclusive' | 'shared'
  /** What the platform does when a tab dies: frees the lock whatever its callback is doing. */
  readonly free: () => void
}

interface Pending {
  readonly tab: string
  readonly name: string
  readonly mode: 'exclusive' | 'shared'
  readonly grant: () => void
}

/** The `navigator.locks` of one simulated tab: the locks are shared, but each request remembers its tab. */
export interface FakeTab {
  readonly id: string
  readonly locks: unknown
}

export interface FakeBrowser {
  /** A new simulated tab: give its `locks` to the module under test (as `navigator.locks`) while that module loads. */
  newTab(): FakeTab
  /** The tab that is `navigator` by default. */
  readonly mainTab: FakeTab
  /** A tab closes or crashes: its locks are freed and its queued requests vanish with it (nobody is told). */
  closeTab(tab: FakeTab): void
  /** Restarts the pseudo-random delivery order of channel messages from `seed`. */
  reseed(seed: number): void
  /** Frees every lock of `name` as if the tab holding it crashed. */
  crash(name: string): void
  /** The names of the locks held now. */
  heldNames(): string[]
  /** Requests of `mode` (exclusive by default) still waiting for the lock `name`. */
  waiting(name: string, mode?: 'exclusive' | 'shared'): number
  /** Delays the « not available » answer of `ifAvailable` requests (the real answer comes from another process). */
  delayBusyAnswers(ms: number): void
  uninstall(): void
}

class FakeLockManager {
  held: Held[] = []
  queue: Pending[] = []
  busyDelayMs = 0

  private conflicts(name: string, mode: 'exclusive' | 'shared'): boolean {
    return this.held.some((lock) => lock.name === name && (mode === 'exclusive' || lock.mode === 'exclusive'))
  }

  /** Grants waiting requests in order, per name, stopping at the first that cannot be granted. */
  process(): void {
    const blocked = new Set<string>()
    for (const pending of this.queue) {
      if (blocked.has(pending.name)) continue
      if (this.conflicts(pending.name, pending.mode)) {
        blocked.add(pending.name)
        continue
      }
      this.queue = this.queue.filter((entry) => entry !== pending)
      pending.grant()
    }
  }

  request(name: string, optionsOrCallback: unknown, maybeCallback?: unknown, tab = 'main'): Promise<unknown> {
    const options = (typeof optionsOrCallback === 'function' ? {} : optionsOrCallback) as { mode?: 'exclusive' | 'shared'; ifAvailable?: boolean; signal?: AbortSignal }
    const callback = (typeof optionsOrCallback === 'function' ? optionsOrCallback : maybeCallback) as (lock: { name: string; mode: string } | null) => unknown
    const mode = options.mode ?? 'exclusive'
    if (options.signal?.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'))
    return new Promise((resolve, reject) => {
      const available = !this.conflicts(name, mode) && !this.queue.some((entry) => entry.name === name)
      if (options.ifAvailable && !available) {
        const answer = (run: () => void) => (this.busyDelayMs > 0 ? void setTimeout(run, this.busyDelayMs) : queueMicrotask(run))
        answer(() => {
          try {
            resolve(callback(null))
          } catch (error) {
            reject(error)
          }
        })
        return
      }
      const grant = () => {
        let freed = false
        let settle: () => void = () => undefined
        const entry: Held = {
          tab,
          name,
          mode,
          free: () => {
            if (freed) return
            freed = true
            this.held = this.held.filter((lock) => lock !== entry)
            settle()
            this.process()
          },
        }
        this.held.push(entry)
        queueMicrotask(() => {
          let result: unknown
          try {
            result = callback({ name, mode })
          } catch (error) {
            entry.free()
            reject(error)
            return
          }
          Promise.resolve(result).then(
            (value) => {
              settle = () => resolve(value)
              if (freed) resolve(value)
              else entry.free()
            },
            (error) => {
              settle = () => reject(error)
              if (freed) reject(error)
              else entry.free()
            },
          )
        })
      }
      const pending: Pending = { tab, name, mode, grant }
      this.queue.push(pending)
      options.signal?.addEventListener('abort', () => {
        if (!this.queue.includes(pending)) return
        this.queue = this.queue.filter((entry) => entry !== pending)
        reject(new DOMException('Aborted', 'AbortError'))
        this.process()
      })
      this.process()
    })
  }

  view(tab: string): { request: FakeLockManager['request']; query: FakeLockManager['query'] } {
    return {
      request: (name, a, b) => this.request(name, a, b, tab),
      query: () => this.query(),
    }
  }

  closeTab(tab: string): void {
    this.queue = this.queue.filter((entry) => entry.tab !== tab)
    for (const lock of this.held.filter((held) => held.tab === tab)) lock.free()
  }

  query(): Promise<{ held: { name: string; mode: string }[]; pending: { name: string; mode: string }[] }> {
    return Promise.resolve({
      held: this.held.map(({ name, mode }) => ({ name, mode })),
      pending: this.queue.map(({ name, mode }) => ({ name, mode })),
    })
  }
}

const channels = new Map<string, Set<FakeBroadcastChannel>>()
let seed = 1
/** A small seeded generator: delivery order varies with the seed, and a seed always gives the same run. */
function random(): number {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}

class FakeBroadcastChannel {
  onmessage: ((event: { data: unknown }) => void) | null = null
  private closed = false
  /** Messages reach a receiver in order, each after zero or one macrotask (so they interleave with lock grants). */
  private chain: Promise<void> = Promise.resolve()
  readonly name: string

  constructor(name: string) {
    this.name = name
    let group = channels.get(name)
    if (!group) channels.set(name, (group = new Set()))
    group.add(this)
  }

  postMessage(data: unknown): void {
    if (this.closed) throw new DOMException('Channel closed', 'InvalidStateError')
    const copy = structuredClone(data)
    for (const other of channels.get(this.name) ?? []) {
      if (other === this) continue
      const late = random() < 0.5
      other.chain = other.chain.then(() => (late ? new Promise<void>((resolve) => setTimeout(resolve, 0)) : undefined)).then(() => {
        if (!other.closed) other.onmessage?.({ data: copy })
      })
    }
  }

  close(): void {
    this.closed = true
    channels.get(this.name)?.delete(this)
  }
}

/** Replaces `navigator.locks` and `BroadcastChannel` for the current test; call `uninstall()` in `afterEach`. */
export function installFakeBrowser(options: { seed?: number } = {}): FakeBrowser {
  const manager = new FakeLockManager()
  channels.clear()
  seed = options.seed ?? 1
  let tabCount = 0
  const tabOf = (id: string): FakeTab => ({ id, locks: manager.view(id) })
  const mainTab = tabOf('main')
  vi.stubGlobal('navigator', { locks: mainTab.locks })
  vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel)
  return {
    mainTab,
    newTab: () => tabOf(`tab${(tabCount += 1)}`),
    closeTab: (tab) => manager.closeTab(tab.id),
    reseed(next) {
      seed = next
    },
    crash(name) {
      for (const lock of manager.held.filter((held) => held.name === name)) lock.free()
    },
    heldNames: () => manager.held.map((lock) => lock.name),
    delayBusyAnswers(ms) {
      manager.busyDelayMs = ms
    },
    waiting: (name, mode = 'exclusive') => manager.queue.filter((entry) => entry.name === name && entry.mode === mode).length,
    uninstall() {
      vi.unstubAllGlobals()
      channels.clear()
    },
  }
}
