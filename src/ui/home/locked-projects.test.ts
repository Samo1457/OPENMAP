import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type FakeBrowser, installFakeBrowser } from '@/testing/fake-web-locks'

type Module = typeof import('./locked-projects')
let locked: Module
let browser: FakeBrowser
const ID = 'projectAAAAAAAAAAAAA'
const NAME = `openmap:project:${ID}`

beforeEach(async () => {
  browser = installFakeBrowser()
  vi.resetModules()
  locked = await import('./locked-projects')
})

afterEach(() => browser.uninstall())

function fakePage() {
  const target = new EventTarget()
  return Object.assign(target, { visibilityState: 'hidden' as string }) as unknown as import('./locked-projects').VisibilitySource & { visibilityState: string; dispatchEvent(event: Event): boolean }
}

/** A lock held by another tab that broadcasts nothing (as a crashing or older tab). */
function foreignHold() {
  void navigator.locks.request(NAME, () => new Promise(() => undefined))
}

describe('the locked Projects of Home (AD-15)', () => {
  it('reads the locks on start, follows a holder that crashes with no broadcast, and stops cleanly', async () => {
    foreignHold()
    const store = locked.createLockedProjects(fakePage())
    const unsubscribe = store.subscribe(() => undefined)
    await vi.waitFor(() => expect(store.get()).toEqual(new Set([ID])))
    browser.crash(NAME)
    await vi.waitFor(() => expect(store.get()).toEqual(new Set()))
    unsubscribe()
    expect(browser.waiting(NAME, 'shared')).toBe(0)
  })

  it('watches again after every grant: when the lock passes straight to another tab, that tab\'s end shows too', async () => {
    foreignHold()
    // The next holder is already queued behind the first.
    void navigator.locks.request(NAME, () => new Promise(() => undefined))
    const store = locked.createLockedProjects(fakePage())
    const unsubscribe = store.subscribe(() => undefined)
    await vi.waitFor(() => expect(store.get()).toEqual(new Set([ID])))
    browser.crash(NAME)
    // Handed over: still locked, by the second holder.
    await vi.waitFor(() => expect(browser.waiting(NAME, 'shared')).toBe(1))
    expect(store.get()).toEqual(new Set([ID]))
    browser.crash(NAME)
    await vi.waitFor(() => expect(store.get()).toEqual(new Set()))
    unsubscribe()
  })

  it('catches a lock it was never told about when the tab becomes visible again', async () => {
    const page = fakePage()
    const store = locked.createLockedProjects(page)
    const unsubscribe = store.subscribe(() => undefined)
    await vi.waitFor(() => expect(browser.waiting(NAME, 'shared')).toBe(0))
    foreignHold()
    // Hidden: nothing is read.
    page.dispatchEvent(new Event('visibilitychange'))
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(store.get()).toEqual(new Set())
    page.visibilityState = 'visible'
    page.dispatchEvent(new Event('visibilitychange'))
    await vi.waitFor(() => expect(store.get()).toEqual(new Set([ID])))
    unsubscribe()
  })

  it('applies a broadcast by re-reading the locks', async () => {
    const store = locked.createLockedProjects(fakePage())
    const unsubscribe = store.subscribe(() => undefined)
    foreignHold()
    new BroadcastChannel('openmap:locks').postMessage({ type: 'acquired', id: ID })
    await vi.waitFor(() => expect(store.get()).toEqual(new Set([ID])))
    unsubscribe()
  })
})
