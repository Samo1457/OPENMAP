---
title: 'Story 1.6: Settings dialog and browser gate'
type: 'feature'
created: '2026-10-02'
status: 'done'
baseline_commit: 'cfad96dceba5f1e6f69e3f3c7c35b3f139b0ebe0'
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

**Decisions (owner accepted all recommended defaults):**
- Storage tab: « 12 Mo utilisés sur 2 Go » (« Espace utilisé »); protected: « Protégé : le navigateur ne supprimera pas vos Projets. »; not protected: « Non protégé : le navigateur peut supprimer vos Projets si l'espace manque. »; unknown: « Information indisponible dans ce navigateur. »; reminder: « Exportez régulièrement vos Projets en Fichier projet pour ne rien perdre. » with a disabled « Exporter le Fichier projet » button (« Bientôt disponible ») until Story 7.1. English equivalents.
- Unsupported-browser page: « Ce navigateur ne peut pas faire fonctionner OPENMAP. Ouvrez ce lien avec Chrome ou Edge à jour sur votre ordinateur. » + « Copier le lien »; a missing `navigator.storage` does not block (Storage shows "unknown").
- The Firefox banner and the 1366 px small-window banner ship in this story (copy from EXPERIENCE.md), both dismissable for the session.
- Settings dialog 560 px wide, horizontal tabs, close button (×) in the header.
- Home gets the « ⋯ » top-bar menu like the Editor, with « Réglages »; the temporary Settings button goes away.
- The phone/tablet page blocks: no "continue anyway".
- Full spec kept (~1,700 tokens).

</frozen-after-approval>

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
- [x] `src/ui/components/Dialog.tsx`, `Tabs.tsx`, `Banner.tsx` -- focus trap, Escape, return focus, scrim; roving tabs; banner `info`/`warning`, one action, optional session dismissal
- [x] `src/ui/settings/SettingsDialog.tsx` (+ `StorageTab.tsx`) and a `openSettings(tab?)` entry; delete `SettingsPopover.tsx`
- [x] Home and Editor top bars -- « ⋯ » menu with Réglages
- [x] `src/persistence` -- `getStorageStatus()` with unit tests
- [x] `src/ui/gate/` -- capability checks (pure, injectable), the two gate pages, Firefox and small-window banners; wired in `src/main.tsx`
- [x] `EditorShell` read-only banner on `Banner`
- [x] `src/i18n/locales/{fr,en}.json` -- all new strings
- [x] tests -- unit (capability rules, storage status, dialog focus) and e2e (open/close from Home and Editor, tabs by keyboard, Storage states, mobile emulation gated, coarse+wide not gated, missing IndexedDB/Web Locks/WebGL2 gated, Firefox banner, small-window banner, existing settings tests migrated)

**Acceptance Criteria:**
- Given `npm run check`, when it runs, then all guardrails and tests pass with no request leaving the app origin.
- Given the dialog and gate pages in both themes, when used with the keyboard only, then every control is reachable with a visible focus ring.

## Verification

**Commands:**
- `npm run check` -- expected: all green; e2e stable over several runs

## Implementation Notes

- `getStorageStatus()` lives in `src/persistence/storage-status.ts` (pure `readStorageStatus(storage)`), exported through `src/persistence/index.ts`; each fact is `unavailable` on its own.
- One `SettingsDialog` is mounted by `App`; `openSettings(tab?)` / `closeSettings()` in `src/ui/settings/settings-store.ts` (module store, `useSyncExternalStore`, no Zustand installed yet). `openSettings` records the focused element to refocus on close.
- `Dialog` makes every other `<body>` child `inert`, wraps Tab with `nextFocusIndex` (unit-tested), stops key propagation so window shortcuts (Ctrl+Z) never act behind it, and closes on Escape, × and scrim click.
- The « ⋯ » `AppMenu` is `TopBar`'s default end slot (Home and Editor); `editor.menu` became `appMenu.label`.
- Gate: `src/ui/gate/capabilities.ts` (pure rules + `readEnvironment`), `GatePage` (title + warning `Banner` with « Copier le lien »; a failed copy shows the link), run in `main.tsx` before rendering; the page-lifecycle flush, schema-upgrade reload and tombstone purge are installed only when the app renders. A phone that also lacks a capability gets the designed-for-computer page.
- Banners: `FirefoxBanner` (Home only) and `SmallWindowBanner` (Home and Editor, live on resize; width < 1366 px or viewport height < 648 px, DESIGN.md's measured viewport of a 1366 × 768 screen); session dismissal is kept in sessionStorage (`banner-dismissals.ts`, guarded, never localStorage), so it survives Home↔Editor and reloads of the tab.
- Playwright's default viewport is now 1366×768 (the minimum layout), so the small-window banner appears only in tests that ask for it; the 1279 px Editor layout test dismisses it first. The Home load-failure test now breaks `IDBFactory.open` instead of removing IndexedDB (which is gated).

## Spec Change Log

- Review row 4: the small-window banner uses the DESIGN.md minimum viewport (1366 × 648, i.e. a 1366 × 768 screen with browser chrome and taskbar) rather than a 768 px viewport height, so real 1366 × 768 laptops do not see it; threshold is `LAYOUT_MIN_VIEWPORT_HEIGHT`.

## Review Triage Log

| # | Source | Finding | Verdict | Evidence / route |
|---|--------|---------|---------|------------------|
| 1 | edge | Ctrl+S inside the Settings dialog opens the browser Save dialog | medium | Dialog stops propagation before the editor handler can preventDefault. patch |
| 2 | edge | Back/Forward while Settings is open leaves it over the new screen, focus lost | medium | Store is route-independent. patch |
| 3 | blind, edge | Toasts raised while Settings is open are inert; later body portals are not | medium | Toasts live in #root, inert set once on mount. patch |
| 4 | blind, edge | Small-window banner ignores height (copy says 1366 × 768) | medium | Width-only check. patch |
| 5 | blind, edge | `readEnvironment` can throw; fallback reinstalls lifecycle hooks | medium | Reads outside try; `rendered` set after render. patch |
| 6 | gap | Tabs ArrowLeft and its wrap untested | medium | Pre-verified. patch |
| 7 | gap | Firefox "Home only" asserted after dismissal | medium | Pre-verified. patch |
| 8 | edge | Storage probes that never settle leave a skeleton forever | low | Direct timeout. patch |
| 9 | blind | Page scrolls behind the dialog | low | Direct scroll lock. patch |
| 10 | blind | AD-19 `navigator.storage` not probed (non-blocking) | low | Direct field + test. patch |
| 11 | blind | Designed-for-computer page focus ring and Storage tab keyboard untested | low | Direct tests. patch |
| 12 | blind | Bytes divided by 1024 but labelled MB/GB | low | Direct fix (1000). patch |
| 13 | blind | Capability names hard-coded; Settings reuses `editor.comingSoon` | low | Direct i18n fix. patch |
| 14 | blind | Banner dismissal lost on reload though "for the session" | low | Direct fix (sessionStorage). patch |
| 15 | blind | Copy-link feedback stale; not tied to the button | low | Direct fix. patch |
| 16 | blind | Return focus relies on Menu call order | low | Direct fallback. patch |
| 17 | blind | `isFirefox` regex flags inconsistent, untested | low | Direct fix + test. patch |
| 18 | blind | App fallback start (preferences unreadable) no longer asserted | low | Direct assertion. patch |
| 19 | gap | Schema-upgrade reload wiring in `main.tsx` untested | medium | No e2e before this story either. defer |
| 20 | blind | Settings borrows the Export dialog width token, fixed `h-90` | low | Same size by design; rejected |
| 21 | blind | Frozen block edited / status mismatch / 1.5 flipped | false | Decisions recorded on approval; sprint sync at present step |
