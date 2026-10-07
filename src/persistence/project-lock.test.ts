import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type FakeBrowser, installFakeBrowser } from '@/testing/fake-web-locks'

type Lock = typeof import('./project-lock')
let lock: Lock
let browser: FakeBrowser
const ID = 'projectAAAAAAAAAAAAA'
const OTHER = 'projectBBBBBBBBBBBBB'
const NAME = `openmap:project:${ID}`
/** The `lockEpoch` of the holder in these tests. */
const EPOCH = 1

// The module keeps a lock announcer: each test gets a fresh module over a fresh fake browser.
beforeEach(async () => {
  browser = installFakeBrowser()
  vi.resetModules()
  lock = await import('./project-lock')
})

afterEach(() => {
  vi.useRealTimers()
  browser.uninstall()
})

const nextTask = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

async function held(id = ID) {
  const attempt = await lock.acquire(id)
  if (attempt.kind !== 'held') throw new Error('expected the lock')
  return attempt.lock
}

describe('acquire (AD-15)', () => {
  it('takes the exclusive lock openmap:project:<id> and reports busy while it is held', async () => {
    const first = await held()
    expect(browser.heldNames()).toEqual([NAME])
    expect(await lock.acquire(ID)).toEqual({ kind: 'busy' })
    // Another Project is independent.
    expect((await lock.acquire(OTHER)).kind).toBe('held')
    await first.release()
    expect(browser.heldNames()).toEqual([`openmap:project:${OTHER}`])
    expect((await lock.acquire(ID)).kind).toBe('held')
  })

  it('never waits for another tab: a taken lock answers busy at once, with nothing queued', async () => {
    await held()
    await lock.acquire(ID)
    expect(browser.waiting(NAME)).toBe(0)
  })

  it('frees the lock when the holder crashes', async () => {
    await held()
    browser.crash(NAME)
    expect((await lock.acquire(ID)).kind).toBe('held')
  })

  it('release writes first: the lock stays held until the pending work settles, and acquiring here meanwhile waits for it', async () => {
    const first = await held()
    let finishSave: () => void = () => undefined
    const saving = new Promise<void>((resolve) => (finishSave = resolve))
    const releasing = first.release(saving)
    expect(browser.heldNames()).toEqual([NAME])

    let reopened: Awaited<ReturnType<Lock['acquire']>> | undefined
    void lock.acquire(ID).then((attempt) => (reopened = attempt))
    await nextTask()
    expect(reopened).toBeUndefined()

    finishSave()
    await releasing
    await vi.waitFor(() => expect(reopened?.kind).toBe('held'))
  })

  it('release is idempotent and still releases when the pending work fails', async () => {
    const first = await held()
    const failing = Promise.reject(new Error('save failed'))
    const a = first.release(failing)
    expect(first.release()).toBe(a)
    await a
    expect(browser.heldNames()).toEqual([])
  })

  it('a hold that is not being released stays busy for a second request of this tab', async () => {
    await held()
    expect(await lock.acquire(ID)).toEqual({ kind: 'busy' })
  })

  it('a request made while the same tab is closing and reopening a Project (remount) is not told busy', async () => {
    const first = await held()
    // Both requests are issued together, as a remount does; the first is released right after its grant.
    const second = lock.acquire(ID)
    void first.release()
    expect((await second).kind).toBe('held')
  })
})

describe('a busy answer that is out of date (AD-15)', () => {
  it('is asked again when this tab released its own lock before the answer came back', async () => {
    const first = await held()
    browser.delayBusyAnswers(20)
    const second = lock.acquire(ID)
    // Released (and so free) by the time the « not available » answer arrives.
    await first.release()
    expect((await second).kind).toBe('held')
  })

  it('stays busy when another tab holds it, however late the answer comes', async () => {
    browser.delayBusyAnswers(20)
    // Held by something outside this module (another tab).
    void navigator.locks.request(NAME, () => new Promise(() => undefined))
    await nextTask()
    expect(await lock.acquire(ID)).toEqual({ kind: 'busy' })
  })
})

describe('watch (AD-15)', () => {
  it('is granted once the holder is gone and is released at once, so it never blocks an exclusive request', async () => {
    const holder = await held()
    const watching = lock.watch(ID)
    let gone: boolean | undefined
    void watching.gone.then((value) => (gone = value))
    await nextTask()
    expect(gone).toBeUndefined()

    await holder.release()
    await vi.waitFor(() => expect(gone).toBe(true))
    expect(browser.heldNames()).toEqual([])
    expect((await lock.acquire(ID)).kind).toBe('held')
  })

  it('detects a crashed holder', async () => {
    await held()
    const watching = lock.watch(ID)
    browser.crash(NAME)
    expect(await watching.gone).toBe(true)
  })

  it('cancel withdraws the request and resolves false', async () => {
    await held()
    const watching = lock.watch(ID)
    watching.cancel()
    expect(await watching.gone).toBe(false)
    expect(browser.waiting(NAME, 'shared')).toBe(0)
  })

  it('does not stop an acquire that is made after it was granted', async () => {
    const holder = await held()
    const watching = lock.watch(ID)
    await holder.release()
    await watching.gone
    expect((await lock.acquire(ID)).kind).toBe('held')
  })
})

describe('the Project channel', () => {
  it('delivers typed messages to the other channels and ignores malformed ones', async () => {
    const a = lock.openProjectChannel(ID)
    const b = lock.openProjectChannel(ID)
    const received: unknown[] = []
    b.subscribe((message) => received.push(message))
    a.post({ type: 'saved', revision: 12 })
    a.post({ type: 'took', epoch: 1 })
    new BroadcastChannel(NAME).postMessage({ type: 'saved', revision: 'x' })
    new BroadcastChannel(NAME).postMessage('nonsense')
    await vi.waitFor(() => expect(received).toEqual([{ type: 'saved', revision: 12 }, { type: 'took', epoch: 1 }]))
    a.close()
    b.close()
  })

  it('is per Project', async () => {
    const a = lock.openProjectChannel(ID)
    const other = lock.openProjectChannel(OTHER)
    const received: unknown[] = []
    other.subscribe((message) => received.push(message))
    a.post({ type: 'took', epoch: 1 })
    await nextTask()
    expect(received).toEqual([])
  })
})

describe('takeover handshake (AD-15)', () => {
  /** A holder that answers like the Editor: flushes, then releases its lock in `yield`. */
  function holderSide(holderLock: Awaited<ReturnType<typeof held>>, options: { flushOk?: boolean } = {}) {
    const events: string[] = []
    const channel = lock.openProjectChannel(ID)
    const stop = lock.serveTakeover(channel, EPOCH, {
      flush: async () => {
        events.push('flush')
        return options.flushOk ?? true
      },
      yield: () => {
        events.push('yield')
        void holderLock.release()
      },
    })
    return { events, channel, stop }
  }

  it('flushes the holder, which then releases, and the requester is granted the lock', async () => {
    const holderLock = await held()
    const holder = holderSide(holderLock)
    const requester = lock.requestTakeover(ID, lock.openProjectChannel(ID), EPOCH)
    const outcome = await requester.outcome
    expect(outcome.kind).toBe('held')
    expect(holder.events).toEqual(['flush', 'yield'])
    expect(browser.heldNames()).toEqual([NAME])
  })

  it('a failed flush answers refused: the holder keeps the lock and the queued request is withdrawn', async () => {
    const holderLock = await held()
    const holder = holderSide(holderLock, { flushOk: false })
    const requester = lock.requestTakeover(ID, lock.openProjectChannel(ID), EPOCH)
    expect(await requester.outcome).toEqual({ kind: 'refused' })
    expect(holder.events).toEqual(['flush'])
    expect(browser.heldNames()).toEqual([NAME])
    expect(browser.waiting(NAME)).toBe(0)

    // The refused request must not take the lock later, behind the holder's back.
    await holderLock.release()
    expect((await lock.acquire(ID)).kind).toBe('held')
  })

  it('times out when nobody answers, and withdraws the request', async () => {
    vi.useFakeTimers()
    await held()
    const requester = lock.requestTakeover(ID, lock.openProjectChannel(ID), EPOCH, 5000)
    await vi.advanceTimersByTimeAsync(4999)
    expect(browser.waiting(NAME)).toBe(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(await requester.outcome).toEqual({ kind: 'timeout' })
    expect(browser.waiting(NAME)).toBe(0)
  })

  it('stops the timeout once the holder says ready, however long the release takes', async () => {
    vi.useFakeTimers()
    const holderLock = await held()
    // Answers ready but is slow to release.
    const channel = lock.openProjectChannel(ID)
    lock.serveTakeover(channel, EPOCH, { flush: async () => true, yield: () => undefined })
    const requester = lock.requestTakeover(ID, lock.openProjectChannel(ID), EPOCH, 5000)
    await vi.advanceTimersByTimeAsync(20_000)
    let settled = false
    void requester.outcome.then(() => (settled = true))
    await vi.advanceTimersByTimeAsync(0)
    expect(settled).toBe(false)
    await holderLock.release()
    expect((await requester.outcome).kind).toBe('held')
  })

  it('is granted at once when the holder crashed meanwhile', async () => {
    await held()
    const requester = lock.requestTakeover(ID, lock.openProjectChannel(ID), EPOCH)
    browser.crash(NAME)
    expect((await requester.outcome).kind).toBe('held')
  })

  it('cancel withdraws the request', async () => {
    await held()
    const requester = lock.requestTakeover(ID, lock.openProjectChannel(ID), EPOCH)
    requester.cancel()
    expect(await requester.outcome).toEqual({ kind: 'cancelled' })
    expect(browser.waiting(NAME)).toBe(0)
    browser.crash(NAME)
    expect((await lock.acquire(ID)).kind).toBe('held')
  })

  it('answers every request that arrives while it flushes, with one yield', async () => {
    const holderLock = await held()
    const holder = holderSide(holderLock)
    const first = lock.requestTakeover(ID, lock.openProjectChannel(ID), EPOCH)
    const second = lock.requestTakeover(ID, lock.openProjectChannel(ID), EPOCH)
    // One wins the lock; the other keeps waiting behind it until it gives up.
    const winner = await Promise.race([first.outcome, second.outcome])
    expect(winner.kind).toBe('held')
    expect(holder.events).toEqual(['flush', 'yield'])
    first.cancel()
    second.cancel()
  })

  it('ignores a request addressed to another holder: a tab that gave way never answers for the one that took over', async () => {
    const holderLock = await held()
    const holder = holderSide(holderLock)
    vi.useFakeTimers()
    // Addressed to epoch 0, the previous holder: this holder (epoch 1) does not hear it.
    const requester = lock.requestTakeover(ID, lock.openProjectChannel(ID), 0, 100)
    await vi.advanceTimersByTimeAsync(100)
    expect(await requester.outcome).toEqual({ kind: 'timeout' })
    expect(holder.events).toEqual([])
    expect(browser.heldNames()).toEqual([NAME])
  })

  it('a holder that answers another requester is alive: the timeout starts again instead of saying nobody answered', async () => {
    vi.useFakeTimers()
    await held()
    const requester = lock.requestTakeover(ID, lock.openProjectChannel(ID), EPOCH, 100)
    await vi.advanceTimersByTimeAsync(60)
    lock.openProjectChannel(ID).post({ type: 'ready', requestId: 'someone-else' })
    await vi.advanceTimersByTimeAsync(60)
    expect(browser.waiting(NAME)).toBe(1)
    await vi.advanceTimersByTimeAsync(60)
    expect(await requester.outcome).toEqual({ kind: 'timeout' })
  })

  it('a stopped holder no longer answers', async () => {
    const holderLock = await held()
    const holder = holderSide(holderLock)
    holder.stop()
    vi.useFakeTimers()
    const requester = lock.requestTakeover(ID, lock.openProjectChannel(ID), EPOCH, 100)
    await vi.advanceTimersByTimeAsync(100)
    expect(await requester.outcome).toEqual({ kind: 'timeout' })
    expect(holder.events).toEqual([])
  })
})

describe('withdrawn requests (AD-15)', () => {
  it('a holder whose flush outlasts the requester\'s patience keeps the lock and never says ready', async () => {
    const holderLock = await held()
    const channel = lock.openProjectChannel(ID)
    let finishFlush: (ok: boolean) => void = () => undefined
    const events: string[] = []
    lock.serveTakeover(channel, EPOCH, {
      flush: () => new Promise<boolean>((resolve) => (finishFlush = resolve)),
      yield: () => events.push('yield'),
    })
    const requesterChannel = lock.openProjectChannel(ID)
    const messages: string[] = []
    requesterChannel.subscribe((message) => messages.push(message.type))
    const requester = lock.requestTakeover(ID, requesterChannel, EPOCH, 30)
    expect(await requester.outcome).toEqual({ kind: 'timeout' })
    await nextTask()
    finishFlush(true)
    await nextTask()
    await nextTask()
    expect(events).toEqual([])
    expect(messages).not.toContain('ready')
    expect(browser.heldNames()).toEqual([NAME])
    await holderLock.release()
  })

  it('a requester that is closed right after asking withdraws: the holder keeps the lock', async () => {
    const holderLock = await held()
    const events: string[] = []
    lock.serveTakeover(lock.openProjectChannel(ID), EPOCH, {
      flush: async () => {
        await nextTask()
        await nextTask()
        return true
      },
      yield: () => events.push('yield'),
    })
    const requester = lock.requestTakeover(ID, lock.openProjectChannel(ID), EPOCH)
    requester.cancel()
    expect(await requester.outcome).toEqual({ kind: 'cancelled' })
    await nextTask()
    await nextTask()
    await nextTask()
    await nextTask()
    expect(events).toEqual([])
    expect(browser.heldNames()).toEqual([NAME])
    await holderLock.release()
  })

  it('still yields for the requesters that did not withdraw', async () => {
    const holderLock = await held()
    const events: string[] = []
    lock.serveTakeover(lock.openProjectChannel(ID), EPOCH, {
      flush: async () => {
        await nextTask()
        await nextTask()
        return true
      },
      yield: () => {
        events.push('yield')
        void holderLock.release()
      },
    })
    const gone = lock.requestTakeover(ID, lock.openProjectChannel(ID), EPOCH)
    const staying = lock.requestTakeover(ID, lock.openProjectChannel(ID), EPOCH)
    gone.cancel()
    expect((await staying.outcome).kind).toBe('held')
    expect(events).toEqual(['yield'])
  })
})

describe('a failing lock manager (AD-15)', () => {
  it('answers error, not busy', async () => {
    browser.uninstall()
    vi.stubGlobal('navigator', {
      locks: { request: () => Promise.reject(new DOMException('denied', 'SecurityError')), query: () => Promise.resolve({ held: [], pending: [] }) },
    })
    vi.resetModules()
    const broken = await import('./project-lock')
    expect(await broken.acquire(ID)).toEqual({ kind: 'error' })
    await expect(broken.withProjectUnlocked(ID, async () => 'x')).rejects.toThrow('lock manager')
  })
})

describe('transient shared grants (AD-15)', () => {
  it.each([0, 20])('a Project freed while other tabs watch it can be acquired at once (busy answers delayed by %i ms)', async (delay) => {
    // Held by another tab, with two watchers (B and C read-only) queued behind it.
    void navigator.locks.request(NAME, () => new Promise(() => undefined))
    await nextTask()
    lock.watch(ID)
    lock.watch(ID)
    browser.delayBusyAnswers(delay)
    // The holder dies: the watchers are granted (shared) at the very moment D asks.
    browser.crash(NAME)
    const d = await lock.acquire(ID)
    expect(d.kind).toBe('held')
    if (d.kind === 'held') await d.lock.release()
    expect(await lock.withProjectUnlocked(ID, async () => 'done')).toBe('done')
  })
})

describe('queries and the global announcements (AD-15)', () => {
  it('lists the Projects held exclusively, any other lock ignored', async () => {
    await held()
    await held(OTHER)
    void navigator.locks.request('other', () => new Promise(() => undefined))
    await nextTask()
    expect(await lock.lockedProjectIds()).toEqual(new Set([ID, OTHER]))
    expect(await lock.isProjectLocked(ID)).toBe(true)
    expect(await lock.isProjectLocked('projectCCCCCCCCCCCCC')).toBe(false)
  })

  it('announces acquired and released only for a lock that was announced', async () => {
    const received: unknown[] = []
    const stop = lock.watchLockAnnouncements((announcement) => received.push(announcement))
    const quiet = await held(OTHER)
    const loud = await held()
    loud.announce()
    loud.announce()
    await loud.release()
    await quiet.release()
    await vi.waitFor(() =>
      expect(received).toEqual([
        { type: 'acquired', id: ID },
        { type: 'released', id: ID },
      ]),
    )
    stop()
  })

  it('a queued takeover request counts as claiming the lock even while a shared grant still hides it from `held`', async () => {
    // A watcher's shared grant is still in the way when the next holder is only queued.
    let releaseShared: () => void = () => undefined
    void navigator.locks.request(NAME, { mode: 'shared' }, () => new Promise<void>((resolve) => (releaseShared = resolve)))
    await nextTask()
    void navigator.locks.request(NAME, () => new Promise(() => undefined))
    await nextTask()
    expect(await lock.isProjectLocked(ID)).toBe(false)
    expect(await lock.isProjectClaimed(ID)).toBe(true)
    releaseShared()
    await nextTask()
    expect(await lock.isProjectLocked(ID)).toBe(true)
    expect(await lock.isProjectClaimed('projectCCCCCCCCCCCCC')).toBe(false)
  })

  it('withProjectUnlocked runs while holding the lock and refuses a locked Project at call time', async () => {
    const run = vi.fn<() => Promise<string>>(async () => {
      expect(browser.heldNames()).toEqual([NAME])
      return 'done'
    })
    expect(await lock.withProjectUnlocked(ID, run)).toBe('done')
    expect(browser.heldNames()).toEqual([])

    const editor = await held()
    run.mockClear()
    expect(await lock.withProjectUnlocked(ID, run)).toBe('locked')
    expect(run).not.toHaveBeenCalled()
    await editor.release()
  })

  it('withProjectUnlocked releases the lock when the change throws', async () => {
    await expect(lock.withProjectUnlocked(ID, () => Promise.reject(new Error('boom')))).rejects.toThrow('boom')
    expect(browser.heldNames()).toEqual([])
  })
})

describe('without Web Locks', () => {
  it('holds nothing and refuses nothing (the gate keeps such browsers out)', async () => {
    browser.uninstall()
    vi.stubGlobal('navigator', {})
    vi.resetModules()
    const bare = await import('./project-lock')
    expect((await bare.acquire(ID)).kind).toBe('held')
    expect((await bare.acquire(ID)).kind).toBe('held')
  })
})
