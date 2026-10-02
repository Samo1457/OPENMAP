// The Editor's undo, redo and save shortcuts (FR-55, UX-DR114, AD-8), registered while the Editor
// is open. In a text field Ctrl+Z and Ctrl+Y undo the typing, not the Project; Ctrl+S saves from
// anywhere and always keeps the browser's Save page away. Cmd works like Ctrl.

import type { KeyCombo, ShortcutDef } from './registry'
import { SAVE_COMBO } from './registry'

export const UNDO_COMBO: KeyCombo = { key: 'z', ctrl: true }
export const REDO_COMBO: KeyCombo = { key: 'z', ctrl: true, shift: true }
const REDO_ALT_COMBO: KeyCombo = { key: 'y', ctrl: true }

export function editorShortcuts(handlers: { undo: () => void; redo: () => void; save: () => void }): ShortcutDef[] {
  return [
    { id: 'editor.undo', group: 'editing', nameKey: 'keyboard.shortcuts.undo', keys: [UNDO_COMBO], repeat: true, run: handlers.undo },
    { id: 'editor.redo', group: 'editing', nameKey: 'keyboard.shortcuts.redo', keys: [REDO_COMBO, REDO_ALT_COMBO], repeat: true, run: handlers.redo },
    { id: 'editor.save', group: 'editing', nameKey: 'keyboard.shortcuts.save', keys: [SAVE_COMBO], inTextField: true, run: handlers.save },
  ]
}
