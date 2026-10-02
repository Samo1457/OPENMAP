---
title: 'Story 1.6: Settings dialog and browser gate'
type: 'feature'
created: '2026-10-02'
status: 'draft'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-OPENMAP-2026-09-29/DESIGN.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Settings live in a temporary popover, nothing tells a user that storage is unprotected, and a phone or an incapable browser gets a broken app instead of a clear message.

**Approach:** Build shared `Dialog`, `Tabs` and `Banner` components, a tabbed Settings dialog (Appearance, Language, Storage) opened from the top-bar menu on Home and in the Editor, and a capability gate that runs before the app renders: a "designed for a computer" page for phones/tablets and an unsupported-browser page for missing WebGL2, IndexedDB or Web Locks. Epics.md Story 1.6 ACs (UX-DR66, 67, 134, 135, 148; AD-8, AD-19; NFR-4) are binding.

## Boundaries & Constraints

**Always:** Settings changes apply immediately and are not undoable; the dialog traps focus, closes on Escape and returns focus to its trigger; scrim `--om-dialog-scrim`; all strings are i18n keys in `fr` and `en`; storage facts only through `src/persistence/index.ts`; per-session banner dismissal never uses localStorage (AD-8); the existing read-only banner moves onto the shared `Banner`; the Settings dialog can open directly on a tab (`storage`) for Story 1.15.

**Never:** No Privacy or Personal Kits tabs (later stories); no Project File export (Story 7.1); no shortcut registry or full Escape chain (Story 1.7); no Web Locks usage (Story 1.14); no storage-pressure banner (Story 1.15).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Open Settings | « ⋯ » → Réglages on Home or Editor | dialog with Apparence, Langue, Stockage tabs; focus inside | N/A |
| Close | Escape, close button, scrim click | dialog closes, focus back on the menu button | N/A |
| Storage known | `estimate()` and `persisted()` available | space used and protection status shown | N/A |
| Storage unknown | `navigator.storage` missing | "unavailable" wording, rest of the dialog works | N/A |
| Phone/tablet | coarse pointer and width < 1024 px | designed-for-computer page instead of the app | "Copy link" failure → no crash |
| Coarse pointer, wide screen | coarse pointer, width ≥ 1024 px | app opens normally | N/A |
| Missing capability | no WebGL2, IndexedDB or Web Locks | unsupported-browser page instead of the app | N/A |
| Firefox | Firefox user agent, all capabilities present | app opens with a dismissable warning banner on Home | N/A |
| Small window | window narrower than 1366 px | dismissable warning banner | N/A |

</frozen-after-approval>

## Open Questions

Each has a recommended default; answer "OK" to accept all or override by number.

1. Storage tab: « 12 Mo utilisés sur 2 Go » (« Espace utilisé »); protected: « Protégé : le navigateur ne supprimera pas vos Projets. »; not protected: « Non protégé : le navigateur peut supprimer vos Projets si l'espace manque. »; unknown: « Information indisponible dans ce navigateur. »; reminder: « Exportez régulièrement vos Projets en Fichier projet pour ne rien perdre. » with a disabled « Exporter le Fichier projet » button (« Bientôt disponible ») until Story 7.1. English equivalents.
2. Unsupported-browser page: « Ce navigateur ne peut pas faire fonctionner OPENMAP. Ouvrez ce lien avec Chrome ou Edge à jour sur votre ordinateur. » + « Copier le lien »; a missing `navigator.storage` does not block (Storage shows "unknown").
3. The Firefox banner and the 1366 px small-window banner ship in this story (copy from EXPERIENCE.md), both dismissable for the session.
4. Settings dialog 560 px wide, horizontal tabs, close button (×) in the header.
5. Home gets the « ⋯ » top-bar menu like the Editor, with « Réglages »; the temporary Settings button goes away.
6. The phone/tablet page blocks: no "continue anyway".

## Code Map

- `src/ui/settings/SettingsPopover.tsx` -- temporary `SettingsPopover`/`SettingsPanel`, to delete; `AppearanceControl.tsx`, `LanguageControl.tsx` reused as is.
- `src/ui/components/TopBar.tsx:4,11` -- end slot defaults to `SettingsPopover`; `src/ui/home/HomeScreen.tsx:156`.
- `src/ui/editor/EditorTopBar.tsx:162-209` -- « ⋯ » `EditorMenu` opening `SettingsPanel`.
- `src/ui/editor/EditorShell.tsx:167-172` -- inline read-only info banner, to move onto `Banner`.
- `src/persistence/projects.ts:303-312` -- `requestPersistOnce`; add `getStorageStatus()` (estimate + persisted, "unavailable").
- `src/main.tsx:50-61` `start()` -- run the gate after `initI18n`, before `render(App)`; skip lifecycle flush and purge when gated.
- Tokens: `--om-dialog-scrim`, `--shadow-long`, `export-dialog-width 560px`, `control-height-sm`.
- No Dialog/Tabs/Banner exists; no Radix installed. Deferred item: shadcn focus rings must not override UX-DR27.
- E2e using the popover: `tests/e2e/theme-language.spec.ts:26-244`, `smoke.spec.ts:26-27`, `editor.spec.ts:129,412,441-453`.

## Tasks & Acceptance

**Execution:**
- [ ] `src/ui/components/Dialog.tsx`, `Tabs.tsx`, `Banner.tsx` -- focus trap, Escape, return focus, scrim; roving tabs; banner `info`/`warning`, one action, optional session dismissal
- [ ] `src/ui/settings/SettingsDialog.tsx` (+ `StorageTab.tsx`) and a `openSettings(tab?)` entry; delete `SettingsPopover.tsx`
- [ ] Home and Editor top bars -- « ⋯ » menu with Réglages
- [ ] `src/persistence` -- `getStorageStatus()` with unit tests
- [ ] `src/ui/gate/` -- capability checks (pure, injectable), the two gate pages, Firefox and small-window banners; wired in `src/main.tsx`
- [ ] `EditorShell` read-only banner on `Banner`
- [ ] `src/i18n/locales/{fr,en}.json` -- all new strings
- [ ] tests -- unit (capability rules, storage status, dialog focus) and e2e (open/close from Home and Editor, tabs by keyboard, Storage states, mobile emulation gated, coarse+wide not gated, missing IndexedDB/Web Locks/WebGL2 gated, Firefox banner, small-window banner, existing settings tests migrated)

**Acceptance Criteria:**
- Given `npm run check`, when it runs, then all guardrails and tests pass with no request leaving the app origin.
- Given the dialog and gate pages in both themes, when used with the keyboard only, then every control is reachable with a visible focus ring.

## Verification

**Commands:**
- `npm run check` -- expected: all green; e2e stable over several runs

## Implementation Notes

## Spec Change Log

## Review Triage Log
