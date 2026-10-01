// Hash routing by hand (no router library): `#/` is Home, `#/p/<id>` the Editor of one Project,
// so a reload reopens the same Project.

import { useSyncExternalStore } from 'react'

export type Route = { readonly kind: 'home' } | { readonly kind: 'editor'; readonly projectId: string }

const EDITOR_PATTERN = /^#\/p\/([A-Za-z0-9_-]+)$/

export function parseRoute(hash: string): Route {
  const match = EDITOR_PATTERN.exec(hash)
  return match ? { kind: 'editor', projectId: match[1] } : { kind: 'home' }
}

export const homeHref = '#/'
export const editorHref = (projectId: string) => `#/p/${projectId}`

export function navigate(href: string): void {
  window.location.hash = href
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

const getHash = () => window.location.hash

/** The current route, updated on every `hashchange`. */
export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getHash)
  return parseRoute(hash)
}
