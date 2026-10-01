---
title: 'Story 1.4: Home: create and manage my Projects locally'
type: 'feature'
created: '2026-10-01'
status: 'in-progress'
baseline_commit: 'bca4af1d6f57f39194db52c1b2d8a7ded70f8aa5'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-OPENMAP-2026-09-29/DESIGN.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A creator cannot yet create, find, reopen, rename, duplicate or delete a Project, and nothing is saved, so any work would be lost.

**Approach:** Replace the Story 1.2 placeholder with the Home screen (header, "Nouveau Projet", card grid, empty state, skeletons, card menu, undoable delete toast) and a minimal Editor placeholder, backed by a Dexie v2 `projects` store with autosave (1 s debounce, ≤ 5 s), flush on `pagehide`/`visibilitychange`, tombstones, media GC, `storage.persist()` once, migrate-then-validate on load, read-only open for newer documents, and `versionchange` handling. Epics.md Story 1.4 ACs (UX-DR118–120, 136; AD-2, 3, 8, 9; FR-1, 52, 53; NFR-5) are binding.

## Boundaries & Constraints

**Always:** Project changes go through the Story 1.3 dispatcher and Commands (AD-3); persistence only through `src/persistence/index.ts`; timestamps live in the persistence row, never in core; every string is an i18n key in `fr` and `en` following EXPERIENCE.md copy rules; components use the Story 1.2 tokens; keyboard-operable (card Enter, menu via button, right-click and Shift+F10).

**Never:** No Editor shell, save-status UI, Ctrl+S or undo buttons (1.5); no Settings dialog (1.6); no Web Locks or takeover (1.14, but store `lockEpoch` and refuse stale-epoch writes now); no storage banners (1.15); no wizard (Epic 6); no Project File import/export (7.1); no confirm dialog for delete.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First visit | no Project | empty state with "Nouveau Projet" | N/A |
| Create | click "Nouveau Projet" | blank Project saved, Editor placeholder opens, `persist()` requested once | persist refusal ignored |
| Reopen | 3 Projects | cards sorted by last modified, skeletons while loading | load failure → message + retry |
| Autosave | change at t, more changes | saved 1 s after the last change and never later than 5 s after the first unsaved one | write failure → status `error`, retried on next change |
| Close tab | pending change | flushed on `pagehide`/`visibilitychange:hidden`; reopen shows it, no dialog | N/A |
| Duplicate | Project P | new id, same seed, name per decision, listed first | N/A |
| Delete | Project P | hidden at once, toast "Projet supprimé · Annuler"; Undo restores; toast expiry purges and runs media GC | tab closed before expiry → purge at next start |
| Newer document | stored `schemaVersion` 2 | opens read-only with message; never written | N/A |
| Unreadable document | invalid stored doc | card marked unreadable, only Delete offered | N/A |
| Stale epoch | write with older `lockEpoch` | refused, nothing overwritten | status `error` |
| Schema upgrade elsewhere | Dexie `versionchange` | flush, close, reload once | N/A |

**Decisions (owner accepted all recommended defaults):**
- Empty-state sentence: « Créez votre premier Projet pour commencer une carte animée. » / "Create your first Project to start an animated map."
- Duplicate name: « {nom} (copie) » / "{name} (copy)", shortened to fit 120 characters.
- Card date: « Modifié à l'instant » (< 1 min), « il y a 5 min », « il y a 2 h », « hier », then « le 3 oct. 2026 »; English "just now", "5 min ago", "2 h ago", "yesterday", "Oct 3, 2026"; followed by « · 16:9 ».
- Thumbnail until the map renders (Story 1.10): plain block in the parchment land colour.
- "Importer un Fichier projet" and the drop zone: hidden until Story 7.1.
- Newer document banner: « Ce Projet vient d'une version plus récente d'OPENMAP. Mettez l'application à jour pour le modifier. » / "This Project was made with a newer version of OPENMAP. Update the app to edit it." Unreadable card meta: « Projet illisible » / "Unreadable Project".
- Editor placeholder: top bar with a « Projets » link back to Home and the Project name; the address is `#/p/<id>` so a reload reopens the Project.
- Appearance and Language: a temporary « Réglages » / "Settings" popover button in the top bar of Home and Editor, replaced by the Settings dialog in Story 1.6.
- Toasts: bottom-right; delete toast lasts 8 s.
- Rename in place: Enter or leaving the field saves, Escape cancels, an empty name restores the previous one.
- No « Projet sauvegardé » toast yet (arrives with Ctrl+S in Story 1.5).
- Home load failure: « Impossible de charger vos Projets. » + « Réessayer » / "Your Projects could not be loaded." + "Retry".
- Full spec kept (~2,100 tokens).

</frozen-after-approval>

## Code Map

- `src/core/index.ts` -- `createBlankProject`, `generateBlankProjectIds`, `duplicateProject` (new id, same seed, revision 0), `loadProject` (`schema_too_new` / `invalid_document`), `createDispatcher` (`subscribe`, `getState`, `setReadOnly`, `reset`); `SET_PROJECT_NAME` for rename.
- `src/ui/ids.ts` -- `newId()` (nanoid) for ids and seed.
- `src/persistence/db.ts` -- Dexie `openmap` v1 `preferences`; add v2 stores here (`projects`, `media`); `index.ts` -- `flushPendingSaves()` no-op to implement (already wired to chunk reload in `src/main.tsx`).
- `src/ui/App.tsx` -- Story 1.2 placeholder; `src/ui/settings/*` controls to move into the popover; `tests/e2e/theme-language.spec.ts` selectors to update.
- Not installed but in the Stack: Zustand 5, lucide-react, shadcn primitives, Sonner (DESIGN.md:444). Add only what is used; no router library (hash routing by hand).

## Tasks & Acceptance

**Execution:**
- [ ] `src/persistence/` -- Dexie v2: `projects` (`&id, updatedAt`; `{id, document, name, outputFormat, updatedAt, deletedAt?, lockEpoch}`), `media` (`&sha256`); `listProjects`, `loadStoredProject` (migrate + validate), `saveProject` (epoch check), `tombstone`/`restore`/`purge`, `gcMedia` (reference set empty until media exist), `requestPersistOnce`, `versionchange` handler, startup purge of old tombstones
- [ ] `src/persistence/autosave.ts` -- dispatcher subscription, 1 s debounce / 5 s max wait (injected clock), `flush()`, `saving | saved | error` observable, `pagehide`/`visibilitychange` flush; `flushPendingSaves()` delegates to it
- [ ] `src/ui/home/` -- Home screen, card, card menu (button, right-click, Shift+F10), rename in place, duplicate, delete toast with Undo, empty state, skeletons, load error
- [ ] `src/ui/editor/EditorPlaceholder.tsx` + hash routing in `App.tsx` -- open by id, back to Home, read-only banner for newer documents
- [ ] `src/ui/settings/SettingsPopover.tsx` -- temporary home of Appearance and Language
- [ ] `src/i18n/locales/{fr,en}.json` -- all new strings
- [ ] tests -- unit (persistence with fake-indexeddb, autosave timings with fake timers, tombstone/purge/GC, epoch refusal, migrate path) and e2e (create → reload keeps it, order by modification, rename, duplicate, delete + Undo, delete + expiry, reload restores without dialog, newer document read-only, settings popover)

**Acceptance Criteria:**
- Given `npm run check`, when it runs, then all guardrails and new tests pass and no request leaves the app origin.
- Given the Home and Editor placeholder in both themes, when checked with the keyboard only, then every action is reachable and the focus ring shows.

## Verification

**Commands:**
- `npm run check` -- expected: all green

## Implementation Notes

## Spec Change Log

## Review Triage Log
