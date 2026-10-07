import { lockedProjectIds, watchLockAnnouncements, watchProjectLock, type LockWatch } from '@/persistence'

const sameIds = (a: ReadonlySet<string>, b: ReadonlySet<string>) => a.size === b.size && [...a].every((id) => b.has(id))

/** What the store needs of the page: `document` in the app, a stand-in in tests. */
export interface VisibilitySource {
  readonly visibilityState: string
  addEventListener(type: 'visibilitychange', listener: () => void): void
  removeEventListener(type: 'visibilitychange', listener: () => void): void
}

export interface LockedProjectsStore {
  /** The first subscriber starts it (queries, watches, broadcasts), the last one stops it. */
  subscribe(listener: () => void): () => void
  get(): ReadonlySet<string>
}

/**
 * The ids of the Projects another tab is editing (AD-15), live: queried when Home starts and when the
 * tab becomes visible again, and again on every `acquired(id)` / `released(id)` the lock holders
 * broadcast. Each broadcast re-reads the lock manager rather than trusting the message, and only the
 * latest read is applied. A holder that crashes broadcasts nothing, so each locked Project is also
 * watched (a shared request granted when its holder is gone), and the watch is armed again after
 * every grant: the lock may have passed straight to another tab, whose own end must show too. A
 * failed query keeps what is shown.
 */
export function createLockedProjects(page: VisibilitySource): LockedProjectsStore {
  let current: ReadonlySet<string> = new Set()
  const listeners = new Set<() => void>()
  let stop: (() => void) | undefined

  function start(): () => void {
    let stopped = false
    let latest = 0
    const watches = new Map<string, LockWatch>()

    const syncWatches = (ids: ReadonlySet<string>) => {
      for (const [id, watching] of watches) {
        if (ids.has(id)) continue
        watching.cancel()
        watches.delete(id)
      }
      for (const id of ids) {
        if (watches.has(id)) continue
        const watching = watchProjectLock(id)
        watches.set(id, watching)
        void watching.gone.then((gone) => {
          if (!gone || stopped || watches.get(id) !== watching) return
          // Its holder is gone, and another tab may already hold it: read again, which re-arms the watch.
          watches.delete(id)
          query()
        })
      }
    }

    const query = () => {
      const mine = (latest += 1)
      lockedProjectIds().then(
        (ids) => {
          if (stopped || mine !== latest) return
          syncWatches(ids)
          if (sameIds(current, ids)) return
          current = ids
          for (const listener of Array.from(listeners)) listener()
        },
        () => undefined,
      )
    }

    query()
    const stopAnnouncements = watchLockAnnouncements(query)
    const onVisibility = () => {
      if (page.visibilityState === 'visible') query()
    }
    page.addEventListener('visibilitychange', onVisibility)
    return () => {
      stopped = true
      stopAnnouncements()
      page.removeEventListener('visibilitychange', onVisibility)
      for (const watching of watches.values()) watching.cancel()
      watches.clear()
    }
  }

  return {
    get: () => current,
    subscribe(listener) {
      listeners.add(listener)
      stop ??= start()
      return () => {
        listeners.delete(listener)
        if (listeners.size === 0) {
          stop?.()
          stop = undefined
        }
      }
    },
  }
}
