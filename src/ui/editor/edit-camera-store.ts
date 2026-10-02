// The edit camera (AD-1, UX-DR58): how the creator looks at the Map while composing. UI state, never
// in the Project, and it never changes the Scene camera. `undefined` means « follow the Scene camera »
// (the world fitted in the output frame); a camera is in reference zoom, so it survives a resize of the
// frame or a change of Output Format.

import { useSyncExternalStore } from 'react'
import type { SceneCamera } from '@/core'

let camera: SceneCamera | undefined
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

export function getEditCamera(): SceneCamera | undefined {
  return camera
}

export function setEditCamera(next: SceneCamera): void {
  camera = next
  emit()
}

/** Back to the Scene camera (Shift+1, the recentre button, opening a Project). */
export function resetEditCamera(): void {
  if (camera === undefined) return
  camera = undefined
  emit()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useEditCamera(): SceneCamera | undefined {
  return useSyncExternalStore(subscribe, getEditCamera)
}
