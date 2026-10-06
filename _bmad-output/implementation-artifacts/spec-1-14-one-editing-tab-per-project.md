---
title: 'Story 1.14: One editing tab per Project'
type: 'feature'
created: '2026-10-06'
status: 'draft'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-OPENMAP-2026-09-29/DESIGN.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Two tabs can open the same Project as full editors today: each autosaves, the older one only learns of it through a refused save (`stale_epoch`), and Home can rename, duplicate or delete a Project that an Editor tab is changing.

**Approach:** One edit lock per Project (Web Locks `openmap:project:<id>`) taken before the document is read; every other tab opens read-only with a banner and « Reprendre ici »; a BroadcastChannel carries the takeover handshake and `saved(revision)`; Home marks and refuses locked Projects. The epoch layer of AD-8 and the dispatcher `read_only` mode already exist and are wired here. Epics.md Story 1.14 ACs (AD-15, AD-8, AD-3; UX-DR139) are binding.

## Boundaries & Constraints

**Always:**
- Lock module `src/persistence/project-lock.ts` (exported by `src/persistence/index.ts`): `acquire(projectId)` requests the exclusive lock `openmap:project:<id>` with `ifAvailable` and returns `held` (with `release()`) or `busy`; `watch(projectId)` queues a shared request that resolves when the holder is gone (closed, crashed or released) and is released at once so it never blocks an exclusive request; both survive the gate (`navigator.locks` is a required capability). The lock is released when the Editor unmounts, the route changes to another Project or Home, and when the tab closes (platform behaviour).
- Epoch: `lockEpoch` increments only when a lock is acquired (open as editor, takeover), never for a read-only open; the increment and the document read are one transaction after the grant. A holder that lost the lock can never write again (`stale_epoch` stays as the safety net).
- Editor states: `loading → editable | readOnly(reason)`, reason ∈ `other_tab`, `taken_over`, `holder_closed`; `too_new` keeps its own banner and takes no lock. First paint never shows an editable flash: the lock is requested before the document is read. A read-only tab: dispatcher `setReadOnly(true)` so every Command (including undo/redo, replay, batch) returns `read_only`, autosave is inert, `model.readOnly` is true so tools, panel fields, name, date, settings, credit and search-pick selection that mutate are disabled; viewing, scrubbing, camera, the place search, Settings (UI preferences) and everything that does not change the Project stay available.
- Banner (`Banner`, tone info, non-dismissable, announced on open, under the top bar, one action): `other_tab` « Ce Projet est ouvert dans un autre onglet. Vous le consultez en lecture seule. » / « Reprendre ici »; `taken_over` « Ce Projet est maintenant modifié dans un autre onglet. » / « Reprendre ici »; `holder_closed` « L'autre onglet a été fermé. Vous consultez toujours ce Projet en lecture seule. » / « Reprendre ici »; English equivalents ("This project is open in another tab. You are viewing it read-only.", "This project is now being edited in another tab.", "The other tab was closed. You are still viewing this project read-only.", "Take over here"). All strings are i18n keys fr and en. Taking over is never automatic.
- Takeover (BroadcastChannel `openmap:project:<id>`): B posts `takeover`; A flushes its own autosave, and only if the flush succeeded posts `ready`, calls `dispatcher.clear()`, `setReadOnly(true)`, releases the lock and shows `taken_over`; B, once granted the exclusive lock, increments the epoch, reloads the document from IndexedDB, `dispatcher.reset(project)` (empty undo stack) and becomes editable. If A's flush fails, A keeps the lock and replies `refused`: B stays read-only and shows « Impossible de reprendre : l'autre onglet n'a pas pu enregistrer. » (EN equivalent) as an error toast and the banner keeps its action. If nobody answers within 5 s while the lock is held, B stays read-only with « L'autre onglet ne répond pas. » and the action stays. If no tab holds the lock (`holder_closed`), « Reprendre ici » acquires it directly without a handshake.
- `saved(revision)`: after every successful save the holder posts `saved` with the saved `updatedAt` as revision (never when the save failed or was refused); read-only tabs reload the stored document and `dispatcher.reset` it when the revision is newer than the one shown, keeping camera, selection and preview; an older or equal revision is ignored. The page-hide snapshot path is folded in at takeover and holder-close by the existing `applyPendingSaves`.
- Home: a Project held by another tab shows « Ouvert dans un autre onglet » (EN "Open in another tab") instead of its modified-date meta line, its menu entries rename, duplicate and delete are disabled with the same reason, and `project-actions.ts` and the tombstone path refuse them at call time (re-checked, not only by the UI); the state follows the lock live (query on mount and on visibility, plus a global channel `openmap:locks` with `acquired(id)`/`released(id)` posted by lock holders); opening a locked card opens it read-only. Renaming from inside the Editor stays a Command and follows the lock.
- A Project deleted while a read-only tab shows it: the next reload or « Reprendre ici » reports the existing `not_found` state; no crash.
- Definition of Done of Story 1.7: « Reprendre ici » is a keyboard-operable button, focus is not moved on state changes, state changes are announced (« Ce Projet est maintenant modifié dans un autre onglet. », « Vous modifiez ce Projet. »), axe passes in light and dark, FR and EN, on the banner and on a locked card; no new shortcut unless added to the registry and `docs/keyboard.md`.
- Two existing e2e tests assume a second tab edits freely and must be rewritten for the lock: `editor.spec.ts` « a failed save… » (l.346) and `home.spec.ts` « a newer epoch makes an older tab… » (l.362); they write a newer epoch straight into IndexedDB (`putRow`) so `stale_epoch` stays covered.

**Never:** No merging or conflict resolution between tabs, no automatic takeover, no server or network use, no sync of camera, selection or undo history between tabs, no change to the Project schema or the Dexie version (the epoch field exists), no weakening of `stale_epoch`, no new dependency.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Second tab | A holds the lock, B opens the Project | B read-only, banner `other_tab`, tools and fields disabled, no editable flash | Command in B → `read_only` |
| Command rejected | any Command in B (dispatch, undo, replay) | `read_only`, document unchanged | N/A |
| Takeover | B clicks « Reprendre ici » | A flushes, clears undo, releases, shows `taken_over`; B reloads, empty undo, editable, epoch +1 | N/A |
| A cannot save | A flush fails during takeover | A keeps the lock; B stays read-only with the error message | no data lost |
| A unresponsive | lock held, no answer in 5 s | B stays read-only, « L'autre onglet ne répond pas. » | action stays |
| A saves | A autosaves | B refreshes to the new revision, camera kept | older revision ignored |
| A closes or crashes | tab closed | B banner `holder_closed`, action stays, no auto takeover | N/A |
| Late write | A (old epoch) writes after takeover | refused `stale_epoch`, A already read-only | N/A |
| Editor → Home | same tab navigates away | lock released, Home card normal | N/A |
| Home, locked card | Project held elsewhere | meta « Ouvert dans un autre onglet », rename/duplicate/delete disabled and refused | refusal even if forced |
| Lock released | holder closes | card returns to normal live | N/A |
| Open locked card | click | opens read-only | N/A |
| Newer document | schema v4 | `too_new` banner only, no lock | N/A |
| Deleted meanwhile | read-only tab, Project deleted | `not_found` on next reload/takeover | no crash |
| Third tab | A holds, B and C read-only | both can take over, one wins, the other becomes `taken_over`-like read-only | N/A |

</frozen-after-approval>

## Code Map

- `src/ui/editor/EditorShell.tsx:52-79` (open effect: `openStoredProject` → dispatcher → autosave), state union l.26-33, banners ~l.249-253, `model.readOnly` l.136-148, undo guards l.192-200; `src/ui/components/Banner.tsx` (`tone`, `action`, optional `onDismiss`, role status).
- `src/core/history/dispatcher.ts` (`readOnly` option l.39/56, `setReadOnly` l.130, `read_only` at l.84/97, `clear`, `reset`); `src/core/result.ts` `read_only`.
- `src/persistence/projects.ts` (`openStoredProject` l.113-121 increments the epoch on every open, to be moved behind the lock; `saveProject` l.148-168 `stale_epoch`; `applyPendingSaves`; tombstone, restore, purge l.222-250), `autosave.ts` (inert when `readOnly`, `flush()`), `index.ts` (`createAutosave`, `flushPendingSaves` is global: use the per-autosave `flush()`), `db.ts` (version 3, `ProjectRow.lockEpoch`).
- `src/ui/home/HomeScreen.tsx` (delete flow ~l.111-138), `ProjectCard.tsx` (meta l.55/99-101, menu `items` l.57), `project-actions.ts` (`renameStored`, `duplicateStored`).
- `src/ui/gate/capabilities.ts` (`webLocks` required: the Editor may assume `navigator.locks`).
- Tests: Playwright second page in one context shares IndexedDB, locks and channels; precedent `editor.spec.ts` l.346-366, `home.spec.ts` l.362-374; crash simulated with `page.close({runBeforeUnload:false})`; unit tests need a fake `navigator.locks` and `BroadcastChannel` (new test helper). `deferred-work.md` l.31-39 lists the rename/duplicate clobber and the unused `setReadOnly`: this story closes both.

## Tasks & Acceptance

**Execution:**
- [ ] `src/persistence/project-lock.ts` + fake-locks test helper (+ tests: acquire, busy, watch, release, takeover handshake, refusal, timeout, saved)
- [ ] epoch moved behind the lock in `projects.ts`; `loadForEdit`/`loadForView` (+ tests)
- [ ] `EditorShell` states, banner, dispatcher read-only, takeover, saved refresh, unmount release (+ tests)
- [ ] Home: locked card, disabled and refused actions, live updates (+ tests)
- [ ] i18n fr/en, announcements, axe e2e, rewrite the two existing e2e, new `tests/e2e/edit-lock.spec.ts` (two pages: every matrix row)
- [ ] remove the two closed items from `deferred-work.md` only by recording them as done in the spec Implementation Notes

**Acceptance Criteria:**
- Given `npm run check`, when it runs, then everything passes without network.
- Given two tabs on one Project, when B opens it, then B is read-only, a Command dispatched in B is rejected, « Reprendre ici » moves editing to B without losing A's last save, and Home refuses rename, duplicate and delete while a tab holds the lock.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Design Notes

Decisions taken in planning (owner may override): a failed flush blocks the takeover (no silent data loss) rather than forcing it; a 5 s handshake timeout leaves B read-only instead of stealing the lock; the revision exposed by `saved` is the saved `updatedAt` (no new field); the shared `watch` request is released as soon as it is granted so it never blocks a later exclusive request; closed and crashed holders share one wording (Web Locks cannot tell them apart); copy for `holder_closed`, the refusal and the timeout is new (EXPERIENCE.md has none) and written in the same register as the existing banner; third tabs follow the same rules.

## Verification

**Commands:**
- `npm run check` -- expected: all green, e2e stable over two runs
