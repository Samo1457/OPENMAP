# Epic 1 Context: Open OPENMAP and lay down a historical map

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

A creator opens OPENMAP on a desktop PC, creates a blank Project with no account, and sees a stylized Basemap (parchment, dark, light, relief) with the historical GeoEntities valid at a chosen reference date. They can search for a place, see data sources and the required map credit. The Project saves itself continuously, supports multi-level undo/redo, stays safe when opened in two tabs, and the UI works in light/dark and French/English. The epic also lays the technical foundation every later epic builds on: the scaffold, CI guardrails, the pure core engine (Project model, Commands, evaluator skeleton), local persistence, and the offline data pipelines. Everything runs locally. The VPS data origin arrives in Epic 7.

## Stories

- Story 1.1: Project scaffold and quality guardrails
- Story 1.2: Visual identity, themes and languages
- Story 1.3: Core Project model, Commands and undo engine
- Story 1.4: Home: create and manage my Projects locally
- Story 1.5: Editor shell with undo/redo
- Story 1.6: Settings dialog and browser gate
- Story 1.7: Keyboard and accessibility foundation
- Story 1.8: Basemap data pipeline (Natural Earth)
- Story 1.9: Historical borders pipeline (Cliopatria)
- Story 1.10: Display the stylized Basemap and the output frame
- Story 1.11: Reference date and historical GeoEntities
- Story 1.12: Search for a place
- Story 1.13: Sources, licences and map credit
- Story 1.14: One editing tab per Project
- Story 1.15: Warn when local storage is at risk

## Requirements & Constraints

- Create a blank Project with no sign-up. It opens in the Editor and appears in the Projects list, sorted by most recently modified. Rename, duplicate and delete are available. Delete is undoable through a toast, not a confirm dialog.
- Autosave persists every change locally within 5 s: debounce 1 s after the last change. Reopening after a tab close or crash restores the last saved state with no recovery dialog.
- Undo/redo works over multiple levels. History is not persisted across reloads. One gesture is one undo entry, and a continuous gesture (slider, typing a name) commits one entry.
- Privacy: no Project content, media, names or ids leave the machine. There are no external fonts, CDNs, geocoding APIs or error-tracking services. Place search runs only on a client-side index that the pipeline builds from Library data.
- Licences: code dependencies must use an allowlisted licence. Data must be public domain, CC0 or CC BY (Natural Earth, Cliopatria). ODbL, share-alike and non-commercial sources are refused, so there are no OSM tiles. Every dataset carries `{source, licence, attribution, creditRequired}`. A required credit can never be hidden.
- Historical borders are approximate. When no data exists at the reference date, the app shows the real date of the data it uses (nearest-data chip).
- Browsers: current desktop Chrome and Edge are supported, Firefox is best effort. Phones, tablets and browsers without WebGL2, IndexedDB or Web Locks get a gate page. The minimum layout is 1366×768, with no hidden essential panel and no horizontal scroll.
- Progressive disclosure: panels show only essential settings by default. Advanced settings sit behind "plus d'options".
- WCAG 2.2 AA applies to all chrome in both themes. Focus is always visible, and no information is conveyed by colour alone.

## Technical Decisions

- **Layers (enforced by dependency-cruiser):** `src/core` is pure and may import only immer, zod, `@turf/*` modules and nanoid. It may not import React, MapLibre, deck.gl, the DOM, i18n or adapters. Adapters (`render`, `export`, `persistence`, `library`, `telemetry`) import each other only through `index.ts`. `src/ui` holds React and the Zustand UI stores.
- **Banned APIs (enforced by oxlint):** in `src/core`, `Math.random`, `Date.now`, `performance.now`, `new Date()` and `crypto.getRandomValues` are banned. Use `rng(seed)`, with element seed = `hash(project.seed, element.id, salt)`. MapLibre `flyTo`/`easeTo`/`panTo` are banned everywhere. Lint messages cite AD-1/AD-2.
- **Evaluator:** `evaluate(project, t, ctx) → Scene` returns plain serializable data. `ctx = {geodata, frame}`. Renderers only consume Scenes, and all animation lives in the evaluator. MapLibre uses `fadeDuration: 0`. The edit camera is UI state and never enters the Project.
- **Commands:** the document is immutable (Immer). A Command is `{type: SCREAMING_SNAKE, payload}`, and `apply(project, cmd) → {project, inverse}` is pure with no I/O. `revision` increases on every apply, undo and redo. The undo stack lives in memory with `clear()`. A dispatcher in read-only mode rejects Commands with a `DomainError`. Epic 1 adds Project-level Commands: rename, Output Format, mapLocale, Basemap, reference date. UI-only state (selection, tool, edit camera) goes in Zustand, never in the Project.
- **Blank Project defaults:** nanoid `id`, `schemaVersion` 1, a generated `project.seed`, `revision` 0, `referenceDate` year 1900, parchment Basemap, `outputFormat` 16:9, `mapLocale` equal to the current UI language, one hidden Step 0, one default Layer per element kind (Territories, Arrows, Tokens, Texts, Images), and empty Factions and members. Duplicating a Project keeps the seed and gets a new id.
- **Schema:** each `schemaVersion` has a Zod schema plus a committed JSON Schema snapshot in `schemas/`. CI fails on a schema change without a new version and migration. Every load path runs `migrate`, then validates. A newer-than-app document opens read-only. A Dexie `versionchange` event makes tabs flush and reload.
- **Persistence:** one Dexie database, accessed only via `src/persistence`, holds Projects, media by SHA-256, the Library cache and preferences, including the theme. No localStorage. Saves are whole-document snapshots. `flush()` runs on Ctrl+S, `pagehide`/`visibilitychange: hidden` and before a lock handover. Writes carry `lockEpoch` and are refused if a newer epoch has written. Delete creates a tombstone, and unreferenced media are garbage-collected. A `saving | saved | error` observable feeds the top bar. `navigator.storage.persist()` is requested on the first Project creation.
- **Multi-tab:** Web Locks lock `openmap:project:<id>`. Other tabs are read-only and queue a shared request to detect when the holder dies. Takeover goes over `BroadcastChannel`: the holder flushes, clears undo and turns read-only; the new holder reloads from IndexedDB with an empty undo stack. The holder broadcasts `saved(revision)`. Home refuses rename, duplicate and delete on a Project locked elsewhere.
- **Rendering:** MapLibre GL JS (≥ 6.9.1) draws only the Basemap and camera. Every Project element and label, including place labels and credits, is a deck.gl layer via `@deck.gl/maplibre` `MapLibreOverlay`. Story 1.10 runs a spike to choose between interleaved mode (the target) and overlaid mode, and records the result. Map colours come from the Scene, never from CSS variables. Every drawn item has a `z` in fixed bands: Basemap < personal background < Project Layers < place labels < screen overlays < credit.
- **Output frame:** 16:9 = 1920×1080, 9:16 = 1080×1920, 1:1 = 1080×1080. The reference px is the 1080 short side. Map sizes scale by `s = shortSide / 1080`, while chrome never scales.
- **Ids, geo and dates:** ids are branded nanoid strings. The GeoEntity key is `dataset@version:entityId`. Projects pin their dataset and tileset versions. GeoEntity geometry is whole polygons at a fixed simplification level per dataset version, never zoom-dependent tiles. Coordinates are `[lon, lat]`. `HistoricalDate = {year (astronomical: 1 BCE = 0), month?, day?}` lives in `src/core/dates`, never as a JS `Date`. Map text is formatted by `src/core/format` with `project.mapLocale`, never by i18n.
- **Library and data:** `src/library` is the only data client and caches used GeoEntity data in Dexie on first fetch. Paths are versioned and immutable: `/<name>-v<n>/{z}/{x}/{y}.mvt` for tiles and `/library/v<n>/…` for Library data. In dev, the pipeline output is served locally at the same paths, so no code changes when Epic 7 moves it to the VPS. The pipeline produces `natural-earth-v1.pmtiles`, four MapLibre styles built from the `map-*` tokens, and self-generated glyphs from the OFL fonts. The GeoEntity file format and the search index are open choices that Stories 1.9 and 1.12 must make and document.
- **Errors and i18n:** expected failures return `Result<T, DomainError{code, params}>`, and the UI maps each `code` to an i18n key. All UI strings are i18next keys in both `fr` and `en`, and a CI check fails on a missing key. A failed dynamic import triggers a flush, then one reload.
- **Stack:** Node 24 LTS (pinned), TypeScript 6.0, Vite 8.3 (`react-ts`), React 19.3, Tailwind 4.3 + shadcn/ui 4.21, MapLibre 6.11, deck.gl/luma.gl 9.4, Dexie 4.4, Zustand 5.0, Immer 11.1, Zod 4.6, nanoid 6.0, i18next 26.4 / react-i18next 17.0, lucide-react, oxlint, dependency-cruiser, license-checker-rseidelsohn, Vitest 5.0, Playwright 1.63.

## UX & Interaction Patterns

- **Look:** an archival-atlas look. Chrome tokens are CSS custom properties with light and dark values. Mono tokens (`scrim`, `canvas-*`, all `map-*`) never change with the theme. shadcn is fully re-themed with no defaults left. Libre Baskerville and Source Sans 3 are self-hosted. The accent colour appears only in chrome and never on the Map. The Map is pixel-identical across UI themes. The theme follows the system on first launch, and the user can choose System/Light/Dark.
- **Editor layout:** a 48 px top bar (breadcrumb, save status, Output Format, undo/redo, search `/`, Presentation and Export disabled for now), a 76 px labelled tool rail, a 36 px options bar above the Map (never over it), and a 300 px properties panel. When nothing is selected, the panel shows Project settings. The Timeline area is collapsed. While a Project opens, the Editor shows skeletons and "Ouverture…".
- **Map:** the output frame is shown by dimming the outside at 55 % (`canvas-mask`), with no border. Chrome never covers the frame. Tiles load over the active Basemap's plain land colour, and editing is never blocked. The basemap picker changes the Basemap instantly and undoably. Brightness, saturation and tint sliders come with a reset. The edit camera supports wheel zoom, Space-drag or middle-button pan, and Shift+1 to recentre.
- **Feedback:** routine autosave shows no toast. Ctrl+S shows "Projet sauvegardé". A save failure shows "not saved" in danger, plus an error toast that stays until closed. Invalid dates show an inline error and keep the previous value. Storage, offline, read-only tab and unavailable-data states use banners with the exact French/English copy from the UX copy table. French typography applies: « », non-breaking spaces before : ; ? !, and "52 av. J.-C.".
- **Keyboard:** a central shortcut registry. Letter keys follow the typed character (AZERTY and QWERTY). Escape follows a fixed priority order. Alt+1..6 jump between the six named ARIA regions. `?` opens the shortcut help. Tooltips show the name and shortcut. `prefers-reduced-motion` affects chrome only.

## Cross-Story Dependencies

- Story 1.1 comes first. After it lands, refresh the AGENTS.md "Running and verifying" block. Story 1.3 (core model and Commands) must precede every UI story that edits the Project. Story 1.4 (persistence) must precede Stories 1.5 and 1.14.
- From Story 1.5 on, every story follows the Epic 1 rules: Commands with inverses, no animation outside the evaluator, no forbidden globals, i18n-only strings. From Story 1.7 on, every new tool, panel or dialog registers its shortcuts, is keyboard-operable, announces its state changes and passes an axe check in Playwright.
- Story 1.8 feeds Stories 1.10 and 1.12 (Natural Earth tiles, styles, glyphs, place names). Story 1.9 feeds Stories 1.11 and 1.12 (GeoEntities). Story 1.10 (Scene, `z` bands, frame scaling) must precede Stories 1.11 and 1.13.
- Some pieces are placeholders that later epics complete. The wizard replaces the direct "Nouveau Projet" in Epic 6. The storage banner action links to Settings → Storage until Project File export exists (Epic 7). The Timeline and Steps arrive in Epic 3. The credit is locked into exports in Epic 4. The data moves to the VPS origin in Epic 7. Historical place-name aliases for search come in Epic 10. Epic 2 builds Territories on the neutral GeoEntities and the sparse Step 0 model defined here.
