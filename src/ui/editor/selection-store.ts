// The selected GeoEntity (Story 1.12, AD-3): UI state, never in the Project. Search puts a GeoEntity
// result here; the render adapter outlines it in ink on a halo, and Escape or a Reference Date that
// removes the entity clears it. Epic 2 builds the properties panel on this selection.

import { useSyncExternalStore } from 'react'
import { type EscapeStep, SELECTION_ESCAPE_PRIORITY } from '@/ui/keyboard/registry'

export interface EntitySelection {
  /** Canonical GeoEntity key `dataset@version:entityId` (AD-22): the key of its Scene Territory. */
  readonly key: string
  /** The name shown and announced. */
  readonly name: string
}

let selection: EntitySelection | undefined
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

export function getSelection(): EntitySelection | undefined {
  return selection
}

export function selectEntity(key: string, name: string): void {
  if (selection?.key === key && selection.name === name) return
  selection = { key, name }
  emit()
}

/** Clears the selection; true when there was one. */
export function clearSelection(): boolean {
  if (selection === undefined) return false
  selection = undefined
  emit()
  return true
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useSelection(): EntitySelection | undefined {
  return useSyncExternalStore(subscribe, getSelection)
}

/**
 * The Escape step that clears the selection: after the menu, dialog, drawing and drawer steps, before
 * « return to Select ». True only when it cleared something; `onCleared` announces it.
 */
export function selectionEscapeStep(onCleared: (name: string) => void): EscapeStep {
  return {
    id: 'selection.clear',
    priority: SELECTION_ESCAPE_PRIORITY,
    run: () => {
      const cleared = selection
      if (!clearSelection() || !cleared) return false
      onCleared(cleared.name)
      return true
    },
  }
}
