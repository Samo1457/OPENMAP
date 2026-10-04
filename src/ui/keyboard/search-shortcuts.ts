// The place search key (Story 1.12, UX-DR62, UX-DR154): `/` focuses the search field from anywhere in
// the Editor except a text field or a dialog (the registry's context rules), and is listed in the `?` help.
// It follows the typed character, so AZERTY (Shift+:) and QWERTY behave alike.

import type { KeyCombo, ShortcutDef } from './registry'

export const SEARCH_COMBO: KeyCombo = { key: '/' }

export function searchShortcuts(handlers: { focus: () => void; enabled?: () => boolean }): ShortcutDef[] {
  return [{ id: 'search.focus', group: 'navigation', nameKey: 'keyboard.shortcuts.search.focus', keys: [SEARCH_COMBO], enabled: handlers.enabled, run: handlers.focus }]
}
