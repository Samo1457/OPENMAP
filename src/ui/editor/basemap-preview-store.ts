// The live preview of a Basemap slider drag (UX-DR21): the values shown on the Map while a gesture is
// in progress. UI state, never in the Project: the Command is dispatched once, on release, so a drag
// is one undo entry. The Editor evaluates the Scene with these adjustments laid over the Project's.

import { useSyncExternalStore } from 'react'
import type { BasemapAdjustments } from '@/core'

let preview: BasemapAdjustments | undefined
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

export function getBasemapPreview(): BasemapAdjustments | undefined {
  return preview
}

/** Shows `adjustments` (the whole set, previewed values included) instead of the Project's. */
export function setBasemapPreview(adjustments: BasemapAdjustments): void {
  preview = adjustments
  emit()
}

export function clearBasemapPreview(): void {
  if (preview === undefined) return
  preview = undefined
  emit()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useBasemapPreview(): BasemapAdjustments | undefined {
  return useSyncExternalStore(subscribe, getBasemapPreview)
}
