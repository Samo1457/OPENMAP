---
title: 'Story 1.4: Home: create and manage my Projects locally'
type: 'feature'
created: '2026-10-01'
status: 'done'
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
- [x] `src/persistence/` -- Dexie v2: `projects` (`&id, updatedAt`; `{id, document, name, outputFormat, updatedAt, deletedAt?, lockEpoch}`), `media` (`&sha256`); `listProjects`, `loadStoredProject` (migrate + validate), `saveProject` (epoch check), `tombstone`/`restore`/`purge`, `gcMedia` (reference set empty until media exist), `requestPersistOnce`, `versionchange` handler, startup purge of old tombstones
- [x] `src/persistence/autosave.ts` -- dispatcher subscription, 1 s debounce / 5 s max wait (injected clock), `flush()`, `saving | saved | error` observable, `pagehide`/`visibilitychange` flush; `flushPendingSaves()` delegates to it
- [x] `src/ui/home/` -- Home screen, card, card menu (button, right-click, Shift+F10), rename in place, duplicate, delete toast with Undo, empty state, skeletons, load error
- [x] `src/ui/editor/EditorPlaceholder.tsx` + hash routing in `App.tsx` -- open by id, back to Home, read-only banner for newer documents
- [x] `src/ui/settings/SettingsPopover.tsx` -- temporary home of Appearance and Language
- [x] `src/i18n/locales/{fr,en}.json` -- all new strings
- [x] tests -- unit (persistence with fake-indexeddb, autosave timings with fake timers, tombstone/purge/GC, epoch refusal, migrate path) and e2e (create → reload keeps it, order by modification, rename, duplicate, delete + Undo, delete + expiry, reload restores without dialog, newer document read-only, settings popover)

**Acceptance Criteria:**
- Given `npm run check`, when it runs, then all guardrails and new tests pass and no request leaves the app origin.
- Given the Home and Editor placeholder in both themes, when checked with the keyboard only, then every action is reachable and the focus ring shows.

## Verification

**Commands:**
- `npm run check` -- expected: all green

## Implementation Notes

- **Page-hide save journal (`pendingSaves` store in Dexie v2).** Measured in Chromium: on `pagehide` (reload, navigation) an IndexedDB write survives only if it is issued synchronously and committed at once (`transaction.commit()`); a read-then-write (needed for the `lockEpoch` check) never completes. So `pagehide` writes the latest unconfirmed snapshot blind into `pendingSaves` (key `<projectId>#<lockEpoch>`), and `applyPendingSaves` folds it into `projects` before every read with the same checks as a normal save (row exists, not newer than the app, epoch not stale, revision newer). A normal save drops the snapshots it supersedes. `visibilitychange: hidden`, chunk reload and `versionchange` use the normal checked flush.
- **Epochs before Web Locks.** `openStoredProject` (Editor) takes `row.lockEpoch + 1`; Home rename/duplicate use the current row epoch, so they do not invalidate an open Editor. Story 1.14 adds the lock and the "open in another tab" refusal.
- **No new UI dependencies beyond `lucide-react` (ISC).** Menu, popover and toasts are small hand-written components styled with the Story 1.2 tokens (no Zustand, Radix or Sonner yet).
- **Editor placeholder name is renamable in place** (same `RenameField`, `SET_PROJECT_NAME` through the dispatcher), which is what exercises autosave end to end until Story 1.5.
- **Media GC** is conservative: it collects nothing while any stored document (row or page-hide snapshot) cannot be read, since its references are unknown; v1 documents reference no media yet.
- **Startup purge** removes only tombstones older than 10 minutes, far beyond the 8 s toast (whose timer pauses on hover/focus), so another tab never purges a delete whose Undo is still on screen; a failed Undo shows an error toast.
- **Settings popover** is a disclosure (button with `aria-expanded`/`aria-controls`, panel `role="group"`), closed by Escape, a press outside or focus leaving it.
- **Save failures** in the Editor placeholder (storage, newer epoch, deleted Project) show a persistent error toast; a tombstoned row refuses saves (`not_found`); a read-only state drops the pending snapshot.

## Spec Change Log

- Implementation added a third Dexie v2 table `pendingSaves` (page-hide snapshots) because a read-then-write cannot complete during `pagehide` in Chromium; applied with the same epoch/revision checks before every read.

## Review Triage Log

| # | Source | Finding | Verdict | Evidence / route |
|---|--------|---------|---------|------------------|
| 1 | gap, own run | Sort-order e2e reads card names once before Home finishes loading (flaky ~1/10) | medium | Reproduced by reviewer and in my CI-mode run. patch |
| 2 | gap | Toast pause on hover/focus untested | medium | No test fails if pause breaks; Undo window at stake. patch |
| 3 | blind, edge, gap | Undo after another tab's start-up purge fails silently | medium | Purge uses 8 s from deletedAt while toast can stay longer; restore result ignored. patch (longer grace + error toast) |
| 4 | blind, edge | Autosave/rename failures invisible in the Editor; save on a tombstoned row reports ok | medium | No subscriber to `error`; `saveProject` returns ok for deleted rows. patch |
| 5 | edge | Pending snapshot still written after the dispatcher turns read-only | medium | `onState` returns early on same project. patch |
| 6 | edge | Second delete before re-render resurrects the first deleted card | medium | Stale closure over `projects`. patch |
| 7 | blind | Toasts not reliably announced (live region mounted with content) | medium | WCAG AA status messages. patch |
| 8 | blind | Focus falls to body after Undo or closing the toast | low | Direct fix: focus restored card. patch |
| 9 | blind, edge | RenameField `maxLength=120` counts UTF-16 units | low | Direct fix (code points, shared constant). patch |
| 10 | edge | `createBlank` throwing leaves the button disabled | low | Direct fix (`finally`). patch |
| 11 | edge | Empty name gives empty Editor breadcrumb | low | Direct fallback. patch |
| 12 | edge | Future `updatedAt` shows "just now" indefinitely | low | Direct fix. patch |
| 13 | blind | i18n: « Projet sans nom » vs « Projet sans titre », capitalisation | low | Direct fix. patch |
| 14 | blind | Settings popover declares role=dialog without dialog behaviour | low | Direct fix (disclosure semantics). patch |
| 15 | blind, gap | Outdated test titles; page-hide unit test overclaims; index.test order-dependent | low | Direct fixes. patch |
| 16 | blind, edge | Home rename in one tab lost to an open Editor's autosave (same epoch) | medium | Real; Story 1.14 lock refuses Home actions on Projects open elsewhere. defer |
| 17 | blind | Home validates every whole document on each load | low | Fine at current document size. defer |
| 18 | blind | Home rename validation errors blamed on storage | low | RenameField prevents invalid names; rejected |
| 19 | blind | Menu key may open the menu twice; unreadable card focus target hidden | low | Not reproduced; menu button shows on focus; rejected |
| 20 | blind | Tracking mismatch / pendingSaves only in notes / decisions in frozen block | false | Sprint sync at present step; pendingSaves recorded in Implementation Notes; decisions belong in frozen block |
