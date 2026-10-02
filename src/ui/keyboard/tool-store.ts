// The active tool (UX-DR110, UX-DR156). UI state, never in the Project (AD-3). Only Select exists for now;
// later stories add tools and their keys (T, C, F…) and register them like V below.

import { useSyncExternalStore } from 'react'
import type { ShortcutDef } from './registry'

export type ToolId = 'select'

export const DEFAULT_TOOL: ToolId = 'select'

let tool: ToolId = DEFAULT_TOOL
const listeners = new Set<() => void>()

export function getTool(): ToolId {
  return tool
}

export function setTool(next: ToolId): void {
  if (next === tool) return
  tool = next
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useTool(): ToolId {
  return useSyncExternalStore(subscribe, getTool)
}

/**
 * The last step of the Escape chain: back to Select. True only when it changed the tool, so a press
 * with Select already active falls through to nothing.
 */
export function returnToSelect(): boolean {
  if (tool === DEFAULT_TOOL) return false
  setTool(DEFAULT_TOOL)
  return true
}

/** The V shortcut. `announce` is called with the tool's i18n announcement key. */
export function selectToolShortcut(announce: () => void, enabled?: () => boolean): ShortcutDef {
  return {
    id: 'tool.select',
    group: 'tools',
    nameKey: 'keyboard.shortcuts.selectTool',
    keys: [{ key: 'v' }],
    enabled,
    run: () => {
      setTool('select')
      announce()
    },
  }
}
