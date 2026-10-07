---
title: 'Story 1.15: Warn when local storage is at risk'
type: 'feature'
created: '2026-10-07'
status: 'draft'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-OPENMAP-2026-09-29/DESIGN.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Nothing tells a creator that the browser may delete their Projects (persistent storage refused, space nearly full), that OPENMAP is offline, or that the Library data a Project references cannot be loaded; the facts exist (`readStorageStatus`, `geoLoad.status`, the save-error toast) but no banner shows them.

**Approach:** Three durable warning banners on Home and Editor driven by small pure evaluators: storage risk, offline, referenced data unavailable; each session-dismissable and self-clearing when its condition ends; the storage banner opens Settings → Storage. The Storage tab and the save-failure status and toast already exist (Stories 1.4, 1.5, 1.6): this story verifies them and closes the no-data-lost guarantee with tests. Epics.md Story 1.15 ACs (FR-53; AD-8, AD-27; UX-DR134, 137, 138, 141, 152) are binding.

## Boundaries & Constraints

**Always:**
- Storage risk: pure `assessStorageRisk(status, projectCount)` in `src/persistence/storage-risk.ts` (exported by `src/persistence/index.ts`): `nearly_full` when `space` is known and `usage / quota >= 0.8` (constant `NEARLY_FULL_RATIO`); `unprotected` when `protection === 'unprotected'` and at least one non-deleted Project exists; `none` otherwise (never for `unavailable` readings, never on an empty Home); `nearly_full` wins over `unprotected`. Evaluated on every Home and Editor open and re-evaluated after `requestPersistOnce`; reading never throws or blocks the UI (the existing 3 s probe timeouts apply). `requestPersistOnce` is also called when a Project is duplicated, and its result is kept for the evaluator.
- Storage banner (`Banner` tone warning, `live`, dismiss cross, one action): `nearly_full` « Stockage presque plein. Exportez un Fichier projet pour ne rien perdre. » / "Storage almost full. Export a project file to keep your work safe."; `unprotected` « Votre navigateur peut supprimer vos Projets si l'espace manque. Exportez un Fichier projet pour ne rien perdre. » / "Your browser may delete your Projects if space runs out. Export a project file to keep your work safe." Action label « Voir le stockage » / "View storage" opens Settings on the Storage tab (until Epic 7 turns it into the export action). Dismissal is per session (existing `sessionDismissals`, key `storage`, never `localStorage`, AD-8) and the banner is back in every new session while the condition lasts. Shown on Home and on the Editor in every state including read-only and `too_new`.
- Settings must open on a given tab (`openSettings('storage')`): extend the settings dialog opener minimally, the menu entry still opens the default tab; the Storage tab (space used, persistence status, reminder to export) is unchanged and keeps its disabled export placeholder.
- Offline banner: driven by `navigator.onLine` and the `online`/`offline` events; text « Hors ligne. Vos modifications sont enregistrées sur cet appareil ; les fonds de carte et la Bibliothèque non encore chargés ne s'afficheront pas. » / "Offline. Your changes are saved on this device; basemaps and Library items not yet loaded will not display."; no action; dismissable for the session (key `offline`), the dismissal is cleared when the browser comes back online so a later outage shows it again; the banner disappears on `online`; editing, autosave and the Map keep working. Global: Home and Editor.
- Referenced data unavailable: the Editor shows « Données référencées indisponibles. Ce Projet reste intact ; les territoires historiques ne s'afficheront pas tant que la Bibliothèque est injoignable. » / "Referenced data unavailable. This project is untouched; historical territories will not display until the Library can be reached." when the Project has a Territories Layer and the geo load is `unavailable` (index or states not loadable and not cached). It is not shown while loading, when the Layer is absent, or for basemap style or tile failures (the offline banner and the Map itself cover those), clears by itself when a later load succeeds (the load is retried on the next Editor open), is dismissable for the session (key `geoData:<projectId>`), and never blocks viewing or editing. The document is left untouched: no Command, migration or autosave may drop or rewrite entity references because `geodata` is empty (test: open with the geo data 404, change nothing, the stored row is byte-identical; edit a name, the Territories Layer and every pin survive the save).
- Save failure (AC 3, mostly existing): quota or any write error keeps « Non enregistré » in danger with its icon and the error toast without duration (closed only by the user, assertive); the write is retried; a rejected write never alters the previously stored row (the whole snapshot is one transaction): add unit and e2e tests that force a quota error and compare the stored row before and after; copy never says « Quota exceeded »; the optional UX-DR137 export banner is not built.
- Stacking, top to bottom, Editor: read-only lock banner, `too_new`, referenced data unavailable, offline, storage, then the existing Firefox and small-window banners; Home: offline, storage, then Firefox and small-window. Banners simply stack (no collapsing mechanism); with all banners shown at 1366×768 the Map area must stay usable: verify by screenshot and, if it does not, report it rather than hiding a banner.
- Definition of Done of Story 1.7: banners are announced once on appearance (`role=status`), the action and dismiss buttons are keyboard-operable, no focus theft, axe passes in light and dark, FR and EN, with each banner and with three stacked; all strings are i18n keys fr and en; no shortcut is added.

**Never:** No Project File export (Epic 7), no real quota management or cleanup, no new network request or origin, no `localStorage`, no change to the Project schema or the Dexie version, no automatic Command or save triggered by a banner, no toast for the offline or storage states, no new dependency.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Nearly full | usage/quota 85 % | `nearly_full` banner on Home and Editor, action opens Settings → Storage | N/A |
| Persistence refused | `persisted()` false, 1 Project | `unprotected` banner with its own text | N/A |
| Empty Home | refused, 0 Projects | no banner | N/A |
| Unknown reading | `estimate` or `persisted` unavailable | no banner | no error |
| Dismiss | click the cross | gone for the session on Home and Editor, back in a new session | N/A |
| Condition ends | usage drops below 80 % | banner gone on next open | N/A |
| Persist granted later | persist() resolves true | banner gone after re-evaluation | N/A |
| Offline | `context.setOffline(true)` | offline banner appears; editing and autosave continue | N/A |
| Back online | `online` event | banner disappears, dismissal cleared | N/A |
| Data unavailable | geo 404, Territories Layer present | banner; stored row unchanged | no toast, no console error |
| Data returns | next open, geo reachable | banner absent, Territories drawn | N/A |
| No Layer | geo 404, no Territories Layer | no banner | N/A |
| Save quota error | write rejects | « Non enregistré », toast stays until closed, previous row intact, retry | N/A |
| Stacked banners | offline + storage + data unavailable | order as specified, each announced once | N/A |
| Read-only Editor | lock or `too_new` | storage and offline banners still shown | N/A |

</frozen-after-approval>

## Code Map

- `src/persistence/storage-status.ts` (`readStorageStatus`: `{space, protection}`, no thresholds), `src/persistence/index.ts` (`getStorageStatus` ~l.236), `projects.ts:310-325` (`requestPersistOnce`, result ignored, called from `src/ui/home/project-actions.ts:22` on create only), `listProjects`.
- `src/ui/components/Banner.tsx` (`tone`, `action`, `onDismiss`, `live`, `useSessionDismissal`), `banner-dismissals.ts` (sessionStorage key `openmap:dismissedBanners`, in-memory fallback), `src/ui/gate/EnvironmentBanners.tsx` (Firefox, small window: pattern to follow).
- `src/ui/home/HomeScreen.tsx:165-169`, `src/ui/editor/EditorShell.tsx:269-279` (banner grid area; order today: `too_new`, read-only lock, small window), `use-geodata.ts` (`GeoStatus`, `geoLoad`, retried on open), `src/library/geo.ts` (`geo_unavailable`).
- `src/ui/settings/SettingsDialog.tsx`, `AppMenu.tsx`, `StorageTab.tsx` (complete, disabled export), i18n `settings.storage.*`.
- Save path: `src/persistence/autosave.ts`, `save-status.ts`, `SaveStatus.tsx`, `EditorShell.tsx:53-77` (`onSaveFailure` → error toast), `toast.tsx` (error toasts have no duration).
- Test techniques: storage stubbed with `page.addInitScript` and `Object.defineProperty(StorageManager.prototype, 'estimate'|'persisted', …)` (settings-gate.spec.ts:209-244); `navigator.storage` removed via `Object.defineProperty(Navigator.prototype,'storage',{get:()=>undefined})`; offline with `context.setOffline(true)`; library failures with `route.abort()` or 404 on `**/library/v1/geo/**` (accessibility.spec.ts:99-161); save errors as in home.spec.ts ~371 and edit-lock.spec.ts ~217; autosave quota unit test at autosave.test.ts:144.

## Tasks & Acceptance

**Execution:**
- [ ] `src/persistence/storage-risk.ts` + `requestPersistOnce` on duplicate + tests (thresholds, empty Home, unknown readings, precedence)
- [ ] `src/ui/status/` banners (storage, offline, data unavailable) with session dismissal, `openSettings(tab)`, wiring in Home and Editor with the stacking order (+ unit tests)
- [ ] i18n fr/en, announcements, e2e for every matrix row, axe (single and stacked), layout check at 1366×768
- [ ] untouched-document and quota-error tests (stored row byte-identical before and after)
- [ ] `docs/keyboard.md` only if a shortcut changes (none expected)

**Acceptance Criteria:**
- Given `npm run check`, when it runs, then everything passes without network.
- Given persistence refused with one Project, near-full space, an offline browser or an unreachable geo dataset, when Home or the Editor opens, then the matching banner appears with the specified text, dismisses for the session, clears when the condition ends, and no stored Project is ever changed by it.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Design Notes

Decisions taken in planning (owner may override): « presque plein » means 80 % of the quota; the refused case gets its own sentence because « presque plein » would be false there; no banner for an empty Home (nothing to lose, and Chromium may grant persistence later); the action label is « Voir le stockage » until Epic 7 makes it the real export; the offline banner is dismissable (EXPERIENCE.md) and re-arms on the next outage; « données référencées indisponibles » is limited to the geo dataset a Project pins (the only Library asset a Project references today; basemap style and tile failures are the offline banner's job); UX-DR137's extra export banner on a failed save is left to Epic 7 with the export; copy for the refused and data-unavailable cases is new (EXPERIENCE.md has no text for them) and written in the register of the existing banners.

## Verification

**Commands:**
- `npm run check` -- expected: all green, e2e stable over two runs
