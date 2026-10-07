import { useMemo, useSyncExternalStore } from 'react'
import { createLockedProjects } from './locked-projects'

/** The ids of the Projects another tab is editing, live (see `createLockedProjects`). */
export function useLockedProjects(): ReadonlySet<string> {
  const store = useMemo(() => createLockedProjects(document), [])
  return useSyncExternalStore(store.subscribe, store.get)
}
