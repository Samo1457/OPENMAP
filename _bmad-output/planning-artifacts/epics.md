---
stepsCompleted: [step-01-validate-prerequisites, step-02-design-epics, step-03-create-stories, step-04-final-validation]
inputDocuments:
  - prds/prd-OPENMAP-2026-09-25/prd.md
  - prds/prd-OPENMAP-2026-09-25/addendum.md
  - architecture/architecture-OPENMAP-2026-09-29/ARCHITECTURE-SPINE.md
  - ux-designs/ux-OPENMAP-2026-09-29/DESIGN.md
  - ux-designs/ux-OPENMAP-2026-09-29/EXPERIENCE.md
  - briefs/brief-OPENMAP-2026-09-24/addendum.md
language: en
---

# OPENMAP - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for OPENMAP, decomposing the requirements from the PRD, the UX design contract (DESIGN.md + EXPERIENCE.md) and the architecture spine into implementable stories. **Reference machine (NFR-2, NFR-3, NFR-7):** the owner's Lenovo LOQ 15IRH8 (Intel Core i5, 16 GB RAM) with Chrome forced onto the **integrated Intel GPU** (Windows Settings → Graphics → Chrome → "Power saving"), approximating the PRD's integrated-GPU class; measurements are also noted on the RTX 4060 for comparison, and at least one validation creator's machine is measured in Story 7.6.

Precedence: PRD for scope, architecture spine for technique (AD ids), UX for behaviour and look. Vocabulary follows the spine's English glossary (Étape = Step, Carte = Map…).

## Requirements Inventory

### Functional Requirements

**Step state model (§4.0)**

- FR-0 [P0]: Step state model rules common to all animated features `[HYP: default model, to confirm in UX]`: (a) Forward inheritance — a new Step starts from the previous Step's state; each element property (Territory ownership, DrawnZone points, UnitToken position, Counter value, ...) takes the value set at the most recent Step that defines one, at or before the current Step; (b) Edit scope — changing a property at Step N fixes its value at N, later Steps without their own value inherit it, earlier Steps are unchanged; user may alternatively apply a change "to all Steps"; (c) Existence — an element exists from the Step where it is created and persists afterwards unless limited to a Step range (FR-45); (d) Ownership — a GeoEntity belongs to exactly one Territory per Step; a DrawnZone laid over a GeoEntity wins where they overlap.

**4.1 Onboarding and Templates**

- FR-1 [P0]: User can create a Project from a Template or a blank Map, with no account; the Project is created and opened in the editor without sign-up/login, and appears in the Project list (FR-52).
- FR-2 [P0]: User can follow a start wizard: Template -> reference date -> Region -> Factions to feature. Max 5 screens; each screen skippable (Template values kept). On exit the Map has >= 2 Steps with >= 1 Territory change, Kits applied and the Legend visible, so playing the Timeline yields an animation with no further action. Each chosen Faction gets a copy of its Library Kit if one exists, otherwise a default Kit whose color is distinct from the Project's other Factions.
- FR-3 [P0]: User can filter Templates by Era, by type (one-off battle, campaign, long-term expansion, current geopolitics) and by text search; each Template shows a thumbnail (or animated preview), its Region and its reference date.
- FR-4 [P0]: Every Template-sourced element can be edited, moved or deleted; no element of a Template-based Project is read-only, including suggested Arrows and pre-filled Steps.

**4.2 Basemaps and geography**

- FR-5 [P0 stylized / P1 satellite]: User can choose a stylized Basemap (parchment default, dark, light, relief) or satellite, and switch at any time. Switching modifies/deletes no Project element. Basemap brightness, saturation and a tint are adjustable (so semi-transparent Territories stay readable on satellite). Satellite = EOX Sentinel-2 cloudless mosaic, 2016 vintage (CC BY 4.0), hosted by OPENMAP; imagery predates later events (e.g. 2022 destruction). If satellite cannot be served, tool falls back to the dark Basemap and tells the user. Stylized Basemaps built from Natural Earth (public domain): coasts, rivers, lakes, relief, no modern roads.
- FR-6 [P0]: User sets the Project reference date (in wizard or later); the Map shows GeoEntities valid at that date. Accepts BCE dates, year precision. If data has no exact state at that date, the nearest valid state is used and the actual data date is displayed. Changing the reference date mid-Project requires confirmation; Territories built on GeoEntities that no longer exist at the new date are converted to DrawnZones.
- FR-7 [P1]: User can select subdivisions (provinces) where data contains them `[HYP: in v1 mostly Contemporary Era; elsewhere conquest via political entities, free paint FR-21 or split FR-11]`. When no subdivision exists for the Region + reference date, the tool says so and offers free paint or splitting.
- FR-8 [P0]: User can search a country, city or GeoEntity by name; the edit camera centers on it.
- FR-9 [P1]: User can show/hide cities, rivers and place names, and rename any label within the Project. A Territory can auto-display its Faction name, placed inside its area and re-centered when the area changes. Map labels display in the source-data language (mostly English), renamable per Project, and do not change with UI language. Generated map texts (DateDisplay dates, Counter numbers, automatic Legend entries) follow the Project's "map language" setting (French or English; defaults to UI language at creation). Place-name translation: post-v1.
- FR-10 [P0]: Tool shows the source and license of data used by the Project and includes the credit in exports where the license requires it. Every displayed Basemap, border dataset and Library item (Emblem, EventIcon, Template) has a viewable attribution. License-required credits (e.g. satellite: "Sentinel-2 cloudless by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2016)") are locked in the export: user only picks corner and prominence (Discreet / Readable), with a short explanation. Optional credits can be hidden.
- FR-11 [P1]: User can redraw, split or merge a GeoEntity within the Project. The correction applies only to the Project, never to the Library; a corrected GeoEntity is flagged as such in the editor.

**4.3 FactionKits**

- FR-12 [P0]: User can create/edit a FactionKit: name, Era, colors (fill, outline, selection), Emblem and its reduced variant, font, border style (thickness, wobble intensity), Arrow style (thickness, head shape), UnitToken shape, Organic Signature settings (FR-42). Every field change applies immediately to all of the Faction's elements on all Steps of the Project.
- FR-13 [P0]: User can assign a Faction to a Territory, Arrow or UnitToken in one click; the element takes the Kit's style. Applying a Library Kit or a Personal Kit creates a copy in the Project. A later Library update never modifies any existing Project.
- FR-14 [P0]: User can create a SubFaction whose Kit inherits from a parent Kit of the Project. Non-overridden fields follow the parent when it changes; overridden fields keep their value. Editor shows which fields are inherited vs overridden and allows reverting to the inherited value. By default a SubFaction and its parent are allied (FR-22).
- FR-15 [P0]: User can search official Kits by name, Era or world region and apply them. Library Kits are never modified by the user; only the Project copy is edited.
- FR-16 [P1]: User can save a Project Kit to Personal Kits, apply Personal Kits in other Projects, and export/import them as a file. Editing a Personal Kit does not change Projects where it was already applied; pushing the update into a Project is an explicit action from that Project.
- FR-17 [P1]: User can fill a Territory with its Faction's Emblem (flag fill) with adjustable opacity. A conquered GeoEntity takes its new Faction's fill, flag included, during the transition.

**4.4 Territories, Relations and FrontLines**

- FR-18 [P0]: User can form a Territory by selecting one or more GeoEntities.
- FR-19 [P0]: User can draw a DrawnZone freehand or point by point, and edit its points at any Step. Between two Steps where its points differ, the DrawnZone morphs continuously during the transition.
- FR-20 [P0]: At a Step, user can designate an attacking Faction then brush-paint the GeoEntities it takes. Painted GeoEntities change Faction at that Step; the transition animates per FR-39. The number of selected GeoEntities is shown before validation.
- FR-21 [P0]: In conquest mode, user can free-paint an area independent of GeoEntities; it is added to the attacking Faction's Territory as a DrawnZone.
- FR-22 [P0]: User can set the Relation between two Factions: in conflict, allied, or unrelated. Defaults: two non-neutral Factions with no parent/child link are in conflict; a SubFaction and its parent are allied; a neutral Territory is never in conflict. A Template can set other Relations (e.g. "Alliances": no Factions in conflict).
- FR-23 [P0]: Tool displays a FrontLine between Territories of two Factions in conflict, with adjustable style. Recomputed automatically on every Territory change, with no manual drawing. User can hide it for the whole Project or for a Faction pair.
- FR-24 [P1]: User can mark a Territory as a Pocket (distinct style). Its area evolves between Steps per FR-19; the Pocket disappears when the user deletes it at a Step (it shrinks away during the transition) or when its area becomes zero.
- FR-25 [P0]: User can fill a Territory solid, semi-transparent, hatched, or with the Emblem (FR-17). A neutral Territory has a default style distinct from any Faction.
- FR-26 [P2]: User can draw an AnnotationZone (free color, no Faction) and give it a Legend entry.
- FR-27 [P2]: User can keep a past Step's FrontLine visible in later Steps as a FrontTrace labeled with its date.

**4.5 Arrows, UnitTokens and EventIcons**

- FR-28 [P0]: User can draw a curved Arrow by points; it draws itself along its path during the Step transition. By default the Arrow takes its Faction's style; thickness is adjustable, including very wide for breakthroughs.
- FR-29 [P2]: User can create ArrowCategories (name, color, style) independent of Factions and assign them to Arrows; each used ArrowCategory appears in the Legend.
- FR-30 [P0]: User can place UnitTokens with an optional label, and move and rotate them between Steps. Shapes: simplified NATO-type symbol, two-tone square, round flag badge, mini-flag. A Token moved/rotated between two Steps slides and pivots during the transition. Label can be boxed (e.g. "7 C.", "Gal Bradley").
- FR-31 [P1]: User can create a TokenSeries attached to a FrontLine or a Territory outline, on a chosen side, with adjustable spacing and number of rows. When the FrontLine/outline changes at a Step, the series redistributes along the new path during the transition. [P2 sub-item] Row count can be linked to a Counter (more strength, more rows).
- FR-32 [P1]: User can place Library EventIcons (explosion, plane, parachute, smoke, battle, siege) or an imported image (e.g. commander portrait). Each icon has appear/disappear animations (default: appear with slight overshoot, disappear with fade). A plane can follow a path during a transition.
- FR-33 [P2]: User can circle a group of elements with a highlight ellipse or outline, and place numbered step markers.

**4.6 Texts, Legend, Counters and DateDisplay**

- FR-34 [P0]: User can add titles, labels and annotations with free font, size, outline, frame and position. By default a text appears with a kinetic typography animation (per character or per word) timed to its Step transition. [P2 sub-item] Curved text along a path (rivers, regions).
- FR-35 [P1] (with P0 minimal part): P0 = a minimal non-editable Legend (Factions present and their colors), required by FR-2. P1 = tool auto-generates a Legend from Factions, fill patterns, ArrowCategories, AnnotationZones and UnitToken types present; user can hide it, move it, rename entries and add lines. Adding a Faction to the Project adds it to the Legend with no manual action.
- FR-36 [P1]: User can place a Counter with a per-Step value, free orientation and a Faction; the value animates between Steps. A Counter can be anchored to a Territory, staying at the center of its area as it changes.
- FR-37 [P0 simple / P1 scrolling]: P0 = the DateDisplay shows the current Step's step date (no scrolling) in the chosen format. P1 = user can show a DateDisplay that scrolls continuously between two step dates at the chosen granularity (day, month or year). Formats: YYYY-MM-DD, DD month YYYY, year only, or a free per-Step label (e.g. "Summer 1944") which replaces scrolling. BCE dates render in the chosen format (e.g. "52 BC" / "52 av. J.-C.").
- FR-38 [P2]: User can display a graphic scale bar (km/miles) and a compass rose.

**4.7 Timeline and animation**

- FR-39 [P0]: User can choose, per Step, the Territory transition: propagation, fade or sweep; default propagation. Propagation starts from the adjacent FrontLine; with no adjacent FrontLine (landing, island, new zone) it starts from a user-placeable point, else from the area's center.
- FR-40 [P0]: User can add, duplicate, reorder and delete Steps; each Step has a step date, a transition duration and a hold duration. A new Step starts from the previous Step's state (FR-0). Deleting a Step does not wipe values inherited by later Steps: they take the value from the preceding Step.
- FR-41 [P0]: User can play, pause, seek to any instant and set playback speed. Seeking to an instant shows exactly the frame that will be exported at that instant (NFR-1).
- FR-42 [P0]: Organic Signature applies by default to all animations, with three levels (off, light, strong) set at Project level and overridable per FactionKit `[HYP on bounds, calibrate in UX]`. Overshoot: at "light", motions and appearances overshoot final position by 5-15% of amplitude before settling; no animation is linear. Wobble: Territory borders deviate from their path by at most 0.3% of image width (~6 px at 1080p). Pulse: a Territory changing Faction pulses for 250-400 ms before switching. Determinism: the same Project produces exactly the same animation on every playback and on export. At "off": no overshoot, wobble or pulse.
- FR-43 [P1]: User can group Steps into named Acts; Templates propose "before / during / after" by default.
- FR-44 [P2]: User can enable RTS-style AmbientEffects: fog of war covering the Map and progressively lifting over revealed areas from Step to Step; conquest progress bar showing the share of territory controlled by each Faction.
- FR-45 [P0]: User can limit an element to a Step range; by default it persists to the end of the Timeline.

**4.8 Camera**

- FR-46 [P0]: User can choose a CameraPreset per Step; default auto-framing. Presets: Top-down (fixed camera, frame unchanged); Fly-to (continuous pan+zoom from previous frame to new frame); Orbit (slow rotation around frame center); Sweep (lateral sweep along the Region); Bounce (zoom out then zoom in to new frame, like a jump); Auto-framing (frame contains elements changing at this Step — Territories, Arrows, Tokens — with 10% margin; if nothing changes, keep previous frame). Camera move spans the Step's transition duration. [P2 sub-item] Optional motion blur on fast transitions.
- FR-47 [P0]: User can manually set camera position, zoom and rotation for a Step, replacing the Preset.

**4.9 Visual import**

- FR-48 [P0]: User can import images (PNG, JPG, SVG) via file picker or drag-and-drop, as positionable elements, as an Emblem, or as an EventIcon.
- FR-49 [P1]: User can import a map image and align it manually (position, scale, rotation, opacity), over or instead of the Basemap `[HYP: manual alignment only in v1, no automatic georeferencing]`.

**4.10 Export**

- FR-50 [P0]: User can export the Timeline, or a Step range, as MP4 in the Project's OutputFormat, 1080p at 30 or 60 fps `[HYP: 1080p max in v1, 4K later; no audio track]`. Export shows progress and is cancellable. No watermark `[HYP]`. OutputFormat is changed at Project level (16:9, 9:16, 1:1): texts, Legend and DateDisplay stay anchored to the same frame edge, and camera framings are recomputed to contain the same elements.
- FR-51 [P1]: User can export PNG or JPG of the Map state at any Timeline instant, with a transparent-background option for PNG.

**4.11 Projects, organization and telemetry**

- FR-52 [P0]: User finds their Projects on opening OPENMAP and can rename, duplicate or delete them.
- FR-53 [P0]: Project is saved locally continuously with no user action, within the NFR-5 delay. After tab close or crash, reopening restores the Project in its last saved state. Tool requests persistent browser storage; if refused, or if available space nears its limit, it warns and invites exporting a Project File.
- FR-54 [P0]: User can export a Project as a Project File (Kits and imported media included) and import it on another machine; a reimported Project File restores an identical Project, animation included.
- FR-55 [P0]: User can undo and redo actions over multiple levels.
- FR-56 [P1]: User can hide, lock and reorder Layers.
- FR-57 [P0]: User can toggle between Edit mode (free camera) and Presentation mode (Timeline camera, rendering identical to export).
- FR-58 [P0]: On first launch the user accepts or refuses anonymous usage statistics and can change their mind at any time. Without consent, no usage data is sent and no stats request is emitted. With consent, only usage events are sent (Project creation, export, feature usage) — never Project content or imported media. Stats go to a server operated by OPENMAP (self-hosted Umami), never a third-party service. Withdrawing consent erases the anonymous identifier from the browser.

### NonFunctional Requirements

- NFR-1 Fidelity: Export reproduces Presentation mode exactly — same elements, positions, durations, same Organic Signature (FR-42 determinism).
- NFR-2 Smoothness: Preview runs at >= 30 fps on the reference machine for a typical project (200 Territories and 50 UnitTokens visible). Reference machine: 4-core CPU, 16 GB RAM, 2022 integrated GPU (Intel Iris Xe class). `[HYP]`
- NFR-3 Export time: A 60 s 1080p/30 video exports in <= 3 minutes on the reference machine. `[HYP]`
- NFR-4 Browsers: Recent desktop Chrome and Edge supported; Firefox best-effort. On mobile/tablet, a message explains the tool is designed for desktop. `[HYP, tied to browser video-encoding APIs]`
- NFR-5 Persistence: Any change is persisted locally within <= 5 seconds. `[HYP]`
- NFR-6 Privacy: No Project content or imported media leaves the user's machine. Downloads only: map tiles and Library data, from OPENMAP servers only. Uploads only: anonymous usage stats if consented (FR-58). No third-party service (fonts, maps, error tracking) is contacted during use.
- NFR-7 Time to first animation: Via the wizard, the FR-2 Map is obtained in < 2 minutes `[HYP]`. Nested time targets: 2 min first animation (NFR-7), 15 min first export (SM-2), 20 min finished Short (UJ-1).
- NFR-8 Screen: From 1366x768 upward, no essential panel is hidden and no horizontal scrolling is required. `[HYP]`
- NFR-9 Progressive disclosure: By default each panel shows only essential settings; advanced settings sit behind a "more options" action (addresses R1, SM-C1).
- NFR-C1 Licensing (§5): Code is closed-source for now (Q1). Only permissively licensed data (public domain, CC0, CC BY, MIT, Copernicus terms) enters the Library and Basemaps. NC and copyleft (GPL, ODbL, CC BY-SA) data are excluded from v1: no OpenStreetMap tiles, no CC BY-SA Copernicus mosaics. Retained sources: Cliopatria (CC BY 4.0) for historical borders, Natural Earth (public domain) for stylized Basemaps and current borders, EOX Sentinel-2 cloudless 2016 (CC BY 4.0) for satellite. Only permissive building blocks, to keep both open/closed paths possible.
- NFR-C2 Attribution: Every Library item carries its source and license (FR-10); license-required credits are locked into exports.
- NFR-C3 Emblem licensing: No Emblem (flag/coat of arms) enters the Library without a verified license; the three brainstorm-identified flag sites are unverified and unusable as-is.
- NFR-C4 No false precision: Historical borders are approximate; the tool displays the actual data date (FR-6) and lets the user correct data per Project (FR-11).
- NFR-C5 Neutrality: For disputed territories (current events included), the Library follows its source without taking sides; users remain free to depict the situation as they wish in their Project.
- NFR-C6 Content production: Official Templates and Kits are produced with the OPENMAP editor itself. Launch minimum: 2 Templates per Era plus the Kits of their Factions; target ~5 Templates and 10 Kits per Era `[HYP]`. Likely the largest v1 workload for a solo developer — estimate before fixing a launch date (Q5).
- NFR-C7 No watermark / free v1 (§8): v1 is free and watermark-free `[HYP]`; no monetization in v1.
- NFR-C8 Monetization constraint & cost cap (§8): Build nothing (data, licenses, providers) that would forbid future commercial use; no uncapped recurring cost. Hosting cap: 20 EUR/month beyond the server already paid by the project owner (current extra cost: 0 EUR); raisable only by explicit decision on success (topology: architecture AD-18).
- NFR-C9 No backend accounts (§4.11, §9): No accounts, cloud save, collaboration or online sharing in v1; everything lives in the browser, the Project File is the backup/transfer mechanism.
- NFR-C10 Platform & i18n (§7): Desktop web app only (no mobile/desktop app). UI in French and English from v1. Default aesthetic: Organic Signature + parchment Basemap; UI chrome stays sober in v1 (RTS UI skin is v2).
- NFR-C11 Validation plan (§12): Once the P0 slice is ready, have 3-5 geopolitical content creators use it on a real topic of their choice, observing blockers and customizations. Go criterion: >= 2 state they would use it for a real video instead of their current method; otherwise revisit differentiation (R2) before starting P1 `[HYP on threshold]`.
- NFR-C12 Success metrics (§11) — SM-1 measured by manual monitoring; SM-2..SM-8 measured by anonymous telemetry (FR-58) over consenting users only; "user" = a browser `[HYP on all numeric targets]`. Telemetry events must therefore support computing:
  - SM-1 Spontaneous adoption: >= 10 distinct creators publishing OPENMAP-made content and mentioning it unsolicited within 6 months of public launch (manual).
  - SM-2 Time to first export: median first-open -> first-export < 15 min (validates FR-2, FR-50).
  - SM-3 Completion rate: >= 40% of created Projects reach at least one export.
  - SM-4 Return: >= 25% of users export at least twice on different days within 30 days.
  - SM-5 Kit reuse: >= 20% of exported Projects use a Personal Kit already used in another Project (validates FR-16).
  - SM-6 Template customization: >= 60% of Template-based exports where the user modified >= 1 Kit or added >= 1 Step (validates R1).
  - SM-7 Organic Signature kept: >= 70% of exports with Organic Signature active (validates FR-42).
  - SM-8 Data signal: share of Projects using data correction (FR-11); tracked, no target.
  - Counter-metrics (do not optimize): SM-C1 settings exposed by default (contain, NFR-9); SM-C2 raw visits/Projects created (vanity); SM-C3 average session length.
- NFR-C13 Satellite fallback (R4): If retrieval/hosting of the EOX 2016 mosaic is not confirmed, the P0 slice ships without satellite, using the dark Basemap.

### Additional Requirements

From the architecture spine (`architecture/architecture-OPENMAP-2026-09-29/ARCHITECTURE-SPINE.md`). Stories cite the AD ids.

**Starter / project setup (Epic 1, Story 1)**
- ARCH-1: Scaffold with the official Vite `react-ts` template, then add shadcn/ui (Tailwind 4) and the layer directories `src/core`, `src/render`, `src/export`, `src/persistence`, `src/library`, `src/telemetry`, `src/ui`, `src/i18n`, plus `pipeline/`, `ops/`, `schemas/`, `tests/e2e/`. Versions per the spine Stack table (TypeScript 6.0, Vite 8.3, React 19.3, MapLibre 6.11 (≥ 6.9.1), deck.gl 9.4 with `@deck.gl/maplibre`, etc.).
- ARCH-2: CI on GitHub Actions: typecheck, oxlint with the AD-1/AD-2 bans, dependency-cruiser layer rules, licence check (AD-17 allowlist + `licence-overrides.json`), JSON Schema snapshot check (AD-9), Vitest, Playwright, and the production tile-URL check (AD-18). Cloudflare Pages deploys `main` only after CI passes; branch previews enabled.

**Core model and engine**
- ARCH-3 (AD-1, AD-21): pure `evaluate(project, t, ctx) → Scene` and `locate(project, t)`. A Step owns its incoming transition, then its hold. Nothing animates outside the evaluator; MapLibre `fadeDuration: 0`; camera applied with `jumpTo`.
- ARCH-4 (AD-2): seeded PRNG; element seed = hash(project.seed, element.id, salt); ambient randomness and clocks banned in `src/core`.
- ARCH-5 (AD-3): all edits through pure Commands with inverses; one gesture = one undo entry; monotonic `revision`; in-memory undo stack; UI state kept in Zustand, outside the document.
- ARCH-6 (AD-4): sparse `{default, track}` properties with forward inheritance; existence ranges; `repairRanges` on Step delete/reorder.
- ARCH-7 (AD-5, AD-22): derived data (coverage partition, Territories, Front Lines, Legend, anchors, auto-framing) computed in `src/core/derive`, memoized by input identity, never stored. Territory = (factionId, stepId); members map with owner tracks; DrawnZone beats GeoEntity; `z` orders DrawnZones.
- ARCH-8 (AD-11): FactionKit copies with provenance; SubFaction `overrides` resolved at evaluation; Relation overrides keyed by the sorted Faction pair.
- ARCH-9 (AD-12, AD-13, AD-14, AD-25): nanoid ids; GeoEntity key `dataset@version:entityId`; pinned Library/tileset versions; `HistoricalDate` (astronomical years); WGS84 lon/lat; frame-anchored overlays; `project.mapLocale` for generated Map text.

**Rendering and export**
- ARCH-10 (AD-6, AD-24): MapLibre draws the Basemap only; deck.gl `MapLibreOverlay` draws every Project element and label; Layers and `z` bands live in the document; the edit-affordance overlay is excluded from capture. P0 spike: interleaved vs overlaid mode.
- ARCH-11 (AD-23): fixed output frames 1920×1080 / 1080×1920 / 1080×1080; reference px = 1080 short side; framing stored as bounds + bearing + pitch; Presentation mode letterboxes the exact frame.
- ARCH-12 (AD-26): `render.ready(scene)` barrier covering tiles, glyphs, fonts, media and geodata; used by export, thumbnails and Presentation start; failures reported per Step.
- ARCH-13 (AD-7, AD-19): export via Mediabunny `CanvasSource` (avc) to MP4; `VideoEncoder.isConfigSupported` pre-check; 20 s pause; Blob kept for "Download again"; startup feature tests; desktop-only gate.

**Persistence and files**
- ARCH-14 (AD-8, AD-15): a single Dexie database (Projects, media by SHA-256 with licence records, Library cache, preferences, consent). Debounced save (1 s, ≤ 5 s); flush on Ctrl+S and `pagehide`; `lockEpoch` fencing; tombstone delete; save-status observable; `storage.persist()`. Web Locks single writer with BroadcastChannel takeover, reload and undo reset.
- ARCH-15 (AD-9, AD-10, AD-28): Zod schemas with `schemaVersion` and forward-only migrations with fixtures; newer schema opens read-only. `.openmap` ZIP Project File (manifest, project.json, media). Templates = Project File + `template.json`; instantiation remaps ids and generates a new seed.

**Data, hosting and operations**
- ARCH-16 (AD-18, AD-27): data origin `data.<domain>` on the Hostinger VPS behind the Cloudflare proxy. `pmtiles serve` with versioned tilesets `/<name>-v<n>/{z}/{x}/{y}.<mvt|webp>` + TileJSON; `/library/v<n>/` immutable; Cache Rule; CORS allowlist. `src/library` is the only client and caches used resources in Dexie.
- ARCH-17 (AD-17): data pipeline (`pipeline/`) building stylized Basemaps from Natural Earth, GeoEntities from Cliopatria (whole polygons, pinned simplification), satellite from EOX 2016 (acquisition method to confirm; fallback: no satellite in P0). Licence metadata on every asset; the credit line is built from the sources drawn and locked when required.
- ARCH-18 (AD-16): Umami 3.4 self-hosted (PostgreSQL, Docker), replay/heatmaps/web vitals off. App posts typed events to `/api/send` through the data origin, only after consent; `installId` created at consent and deleted on revoke. The event catalogue must cover SM-2..SM-8 flags.
- ARCH-19 (Structural Seed → Operations): `ops/publish.sh` as the only publish path; VPS hardening (SSH keys, firewall, automatic updates); Hostinger snapshot before each publish plus a weekly off-VPS backup; free uptime check; secrets only in VPS env files.
- ARCH-20 (AD-29, AD-16): Library assets copied into the media store; SVG sanitization; Content-Security-Policy; no runtime third parties (self-hosted fonts and glyphs).
- ARCH-21 (AD-18): app origin `app.<domain>` fixed before public launch (domain and trademark check pending); hosting spend capped at 20 EUR/month beyond the VPS.

#### Brief addendum notes (secondary; PRD prevails)

- FactionKit colors include a hover/selection state; Kit metadata distinguishes official (Library) vs personal, with search tags for name / period / region (supports FR-12, FR-15, FR-16).
- SubFaction inheritance example for AC: parent "Allies" defines base style; children "France"/"UK"/"USA" override color/Emblem; changing the parent propagates except explicitly customized fields (FR-14).
- Default element animations: Territory pulses "heartbeat-like" before switching color (never a hard pop/disappear); Arrow draws live like a pen stroke; UnitTokens appear with slight overshoot; captions use kinetic typography timed to the narrative (FR-28, FR-30, FR-34, FR-42).
- DateDisplay time granularity (day/month/year) is set manually by the user — no automatic detection, whether from a Template or from scratch (FR-37).
- Templates carry a predefined starting scale/zoom, pre-positioned key dates, a pre-filled 3-act structure ("mad-lib" style), blank Territories ready to assign to a Kit, suggested Arrows and placeholder labels — all editable, never locked (FR-2, FR-4, FR-43).
- Template library categorization = Era + content type (one-off battle / military campaign / long-term expansion / current geopolitics) + search tags (FR-3).
- Nothing in a Template is locked: adding/removing Territories, changing Basemap, or fully replacing it with an imported personal map are all allowed (FR-4, FR-5, FR-49).
- Edit mode is a free canvas with Figma-like zoom/pan; Presentation mode is driven by the automatic camera (FR-57).
- Layers organize Territories / Arrows / texts / icons separately (FR-56).
- Export supports a selectable Timeline range for video and a frozen image at any Timeline point; SVG export and multi-resolution (4K) listed in the brief are out of v1 per PRD (FR-50, FR-51).

### UX Design Requirements

#### A. Design tokens — colour

UX-DR1: Implement the chrome colour token set as CSS custom properties with light values (base keys) and dark values (`-dark` keys) for: background, surface, surface-raised, border, border-input, text-primary, text-secondary, text-muted, accent, accent-hover, on-accent, selection, focus-ring, success, warning, danger, text-disabled, progress-track, progress-fill, track-arrows, track-tokens, track-text, track-ink, playhead, act-rule — exact hex values from DESIGN.md frontmatter. AC: switching theme swaps every token to its `-dark` value; a component key suffixed `-dark` (e.g. `tool-rail-item-active.foreground-dark`) overrides the generic resolution rule.

UX-DR2: Implement mono-mode tokens that never change with theme: `scrim` (#11161C), `canvas-ink` (#18222D), `canvas-halo` (#F7F3EA), `canvas-mask` (#11161C), and all `map-*` tokens. AC: automated test toggles light/dark and asserts these computed values are identical.

UX-DR3: Implement Basemap-resolved `map-*` tokens: base set = Parchment Basemap (map-sea, map-land-neutral, map-coast, map-label, map-label-halo, map-sea-label, map-front, map-arrow), plus `-sombre` (Dark), `-clair` (Light), `-relief` (Relief) variants and `map-shade-relief`, `map-tint`. Resolution is driven by the ACTIVE BASEMAP, never by UI theme. Satellite uses the `-sombre` label/halo/front/arrow values over imagery. AC: for each of the 5 Basemaps, the renderer resolves the correct palette; UI theme change has zero effect. [ASSUMPTION: Dark/Light/Relief palettes, relief shading and satellite `-sombre` values must be validated on a Basemap board before the FR-5 story.]

UX-DR4: Relief Basemap applies `map-shade-relief` (#5B5446) in multiply blend at 35 % over land. AC: visual test on relief tiles.

UX-DR5: Map shadcn theme variables to OPENMAP tokens: primary<-accent, primary-foreground<-on-accent, background<-background, card<-surface, popover<-surface-raised, foreground<-text-primary, muted-foreground<-text-muted, border<-border, input<-border-input, ring<-focus-ring, destructive<-danger, shadcn `accent` (hover bg)<-selection. AC: no shadcn default colour, radius, Geist font or shadow remains in any rendered component (lint/visual audit).

UX-DR6: Border rule: `border` is decorative only and never carries information alone; all input boundaries (text inputs, selects, checkboxes, sliders, segmented controls, colour fields, faction-picker chips) use `border-input` (>= 3:1 on all backgrounds, both modes); secondary buttons keep `border`. AC: contrast check of every input boundary >= 3:1.

UX-DR7: Forbidden pair: `text-muted` on `selection` background. On hovered/selected rows, captions/summaries switch to `text-secondary`. AC: hover/selected row tests assert text-secondary.

UX-DR8: Disabled state token/pattern `control-disabled`: opacity 0.55, text equivalent `text-disabled`, cursor not-allowed, control keeps its layout slot. Disabled is never used to signal an imposed setting (use locked pattern instead). AC: visual + DOM test.

UX-DR9: Progress tokens `progress-track`/`progress-fill` (light #D8D1C1/#1D4163, dark #324050/#8EB6D8), fill >= 3:1 against track. Used by the progress-bar component.

UX-DR10: Scrim: `dialog-scrim` = `scrim` at 62 % opacity, identical in both modes, behind modal dialogs (Export, confirmations, consent); Wizard (full-frame) has no scrim.

UX-DR11: Status colours `success`/`warning`/`danger` are always accompanied by an icon and a text label; colour is never the sole signal. AC: every status instance has icon + text.

UX-DR12: Accent usage restricted to chrome: Export button, play button, active tool, current Step, playhead, action links, selected clip, selected segment indicator. Accent never used as a Faction colour, never appears on the Map.

UX-DR13: Timeline track colours: track-arrows / track-tokens / track-text clip backgrounds with `track-ink` text, left edge in track-ink at 45 %; playhead and act-rule tokens per mode.

UX-DR14: Faction colours are user content (FactionKit / Library), not tokens: they never change with theme and are never reused in chrome except in `faction-swatch` (always with neutral ring + name).

UX-DR15: FactionKit colour guardrail: compute CIEDE2000 between each Kit colour (fill/stroke) and both `accent` and `accent-dark`; if < 10 against either, show a non-blocking warning under the colour field (caption, warning triangle icon, warning colour, copy from Voice & Tone), recomputed on every change, never as a toast; 10–20 triggers nothing. [ASSUMPTION: threshold < 10.]

#### B. Design tokens — typography, spacing, shape, elevation

UX-DR16: Self-host OFL fonts Libre Baskerville (400, 600) and Source Sans 3 (400, 500, 600) bundled with the app (no Google Fonts / system dependency); fallbacks: serif -> Baskerville, Baskerville Old Face, Georgia, Times New Roman; sans -> Segoe UI, Frutiger, Helvetica Neue, Arial. AC: network panel shows fonts served from app origin; rendering identical across PCs. [ASSUMPTION: Source Sans 3 provisional.]

UX-DR17: Implement UI type scale tokens: title-xl 28/600 serif, title-lg 20/600 serif, title-md 16/600 serif, date-display 22/600 serif, date-compact 15/600 serif, body 14/400, body-strong 14/600, label 13/500, caption 12/400, label-caps 11/600 uppercase +0.04em, label-caps-tight 11/600 uppercase 0em, timecode 12/500, timecode-strong 13/600 (line-heights/letter-spacing per frontmatter). Only one bold weight (600) per voice.

UX-DR18: Tabular figures: `font-variant-numeric: tabular-nums lining-nums` on timecode, timecode-strong and map-counter (and hex values). Decimal comma in FR (`00:08,4`, `1,5 s`).

UX-DR19: Small caps rule: `label-caps` via text-transform uppercase + 0.04em for tool rail labels, panel section titles and Acts. Rail labels have 72 px; if a label overflows with 0.04em it switches to `label-caps-tight` (same size), never truncates or wraps (FR "BIBLIOTHÈQUE" is the only FR case); a translation that still overflows must be shortened. AC: automated width check per locale. [ASSUMPTION: panel section titles in sans label-caps.]

UX-DR20: Serif never in buttons, inputs, tooltips or toasts; serif only for titles, dates and Map labels.

UX-DR21: Map typography tokens in export px for a 1080 px short side: map-label-faction 56/600 +0.16em, map-label-place 40, map-label-city 34, map-label-sea 40 +0.08em, map-cartouche-year 62/600, map-cartouche-kicker 18 +0.3em, map-text 44/600, map-token-label 22/600, map-counter 44/600 sans, map-legend-title 26/600, map-legend-entry 22, map-credit-discreet 18/400 sans, map-credit-legible 24/500 sans. On screen, everything drawn on the Map scales by (on-screen frame short side / 1080); chrome never scales. AC: 562x316 frame -> factor ~0.29 -> 56 px label shows at ~16 px.

UX-DR22: Spacing scale tokens (4 px base: 4, 8, 12, 16, 20, 24, 32) and all named layout tokens from frontmatter (top-bar-height 48, rail-width 76, rail-item-height 56, panel-width 300 / compact 260, panel-row-min-height 34, drawer-width 320, tool-options-bar-height 36, timeline heights 200/180/44, header 40, ruler 20, act row 24, thumbnail 72, lane 26, clip 20, peek 18, scrollbar 6, progress 6, hit-area-min 24, icon sizes 20/16, stroke 1.5, control heights 32/28, panel-padding-x 18, focus ring 2/2, swatch 24, basemap tile 56, wizard header 56 / step 64 / aside 400, export dialog 560 / label 148, dialog-sm 440, home max 1200, project card min 240, presentation bar 640x48, map credit margin 24, token size 56, legend padding 24).

UX-DR23: Radius tokens: none 0 (Step thumbnails, project cards, faction swatches, clips, Basemap tiles, skeletons, Map), sm 2 px (buttons, inputs, rail items, play button, segments, faction chips, tooltips), md 4 px (toasts, popovers, dialogs, drawer right side only, presentation bar) [ASSUMPTION], full only for slider thumbs, status dots, brush ring — never pills on buttons/badges/inputs.

UX-DR24: Elevation: flat surfaces, hierarchy by tone background < surface < surface-raised + border rules. Short shadow (0 6px 16px -10px rgba(0,0,0,.45)) only on toasts; long shadow (0 12px 28px -18px rgba(0,0,0,.35)) only on library drawer, popovers/menus/selects/context menu, dialogs. Tooltip has no shadow (inverted bg). No shadows on cards/buttons/thumbnails, no glow, no gradients, no glassmorphism/blur.

UX-DR25: Iconography: Lucide restyled to 1.5 px stroke, 20 px in rail, 16 px in controls, plus custom-drawn icons for Territory, Conquest and UnitToken tools. No emojis anywhere. [ASSUMPTION]

UX-DR26: Hit areas: every interactive target has >= 24x24 px active area regardless of visual size (clip 20 px grabbable over its 26 px lane; 12 px playhead handle -> 24x24; checkbox clickable across whole row incl. label; canvas-handle 24 px). Clip and transition edges keep an 8 px grab band full row height (WCAG 2.5.8 equivalent exception, since durations are editable in panel).

UX-DR27: Focus ring token: box-shadow `0 0 0 2px surface, 0 0 0 4px focus-ring` shown only on `:focus-visible`; on the Map the focused element uses `canvas-selection` outline, never accent.

#### C. Theming

UX-DR28: Light and dark themes; on first launch follow system preference; user may choose System / Light / Dark in Settings; change applies instantly. Theme affects chrome only. [ASSUMPTION: system default.]

#### D. Chrome components (Editor)

UX-DR29: Buttons: `button-primary` (accent bg, on-accent fg, accent-hover, radius sm, 32 px, body-strong), `button-secondary` (surface-raised, text-primary, 1px border), `button-ghost` (transparent, text-secondary, selection hover) for icon actions and "Collapse". Exactly one button-primary per screen. Buttons carry a verb (+ object).

UX-DR30: Top bar (`top-bar`, 48 px, surface, bottom border): logotype, breadcrumb "Projects / {Project name}" (name in title-md), save status (caption + success icon), Output Format menu (16:9 · 9:16 · 1:1), undo/redo, place search, "Presentation" (secondary), "Export" (primary), overflow menu (Project File, Settings). On Home: same bar without Project breadcrumb. [ASSUMPTION: 48 px height.]

UX-DR31: Tool rail (`tool-rail` 76 px, `tool-rail-item` 72x56): items Select · Territory · Conquest · Arrow · Token · Text · Import, then Library · Layers toggles. Icon above small-caps label; hover selection bg; active = selection bg, accent label (light) / text-primary-dark (dark), 3 px accent bar left edge. Exactly one active tool; Library and Layers are drawer toggles (active while drawer open), not tools. Tooltip shows full name + shortcut ("Unit token · J"). Buttons expose `aria-pressed` and `aria-keyshortcuts`.

UX-DR32: Tool options bar (`tool-options-bar`, 36 px, background colour, no rule): left = current Step reminder "Step 1463 · Conquest of Bosnia" (date in title-md), then active-tool options (compact faction picker, segments, slider); hosts contextual links ("Apply to all Steps", "Validate conquest"); right = read-only Output Format label (caption, text-muted). Never placed over the Map.

UX-DR33: Properties panel (`properties-panel`, 300 px, 260 px under 1280 px width, surface, left border, padding-x 18, rows >= 34 px): title title-lg with Emblem/icon, caption overline (e.g. "Project copy"), label-caps section headings separated by rules; always visible; live application with no "Apply" button; content by selection type (UX-DR35–UX-DR48). Read-only mode: values stay text-primary but lose input border and caret.

UX-DR34: "More options" row (`more-options-row`): at bottom of each section/panel, body-strong label + summary of hidden content (e.g. "Border, Arrow, Token") + chevron, top border; expands in place as accordion; expanded state remembered per panel type for the session [ASSUMPTION]; every new setting defaults behind it (SM-C1).

UX-DR35: Panel — nothing selected = Project settings: Name, Output Format, Reference Date (+ nearest-data chip), Region, Basemap (basemap-picker), Factions & Relations. More options: Front Line (style, global hide), Project Organic Signature, Legend (P1), Layers & labels (P1), Sources & licences. Changing Reference Date requires a confirmation dialog: "Territories built on Entities that no longer exist in {date} will become Drawn Zones." (FR-6)

UX-DR36: Panel — Geographic Entity (one or many): Name, Faction (faction-picker), Fill pattern. More options: "Correct shape" (redraw, split, merge; P1, FR-11) then "Corrected in this Project" mention; rename label (P1, FR-9). Multiple selection titled e.g. "5 Entities".

UX-DR37: Panel — Territory (double-click on surface): Faction (reassigns whole Territory), Pattern (Solid · Semi-transparent · Hatching · Emblem (P1)), count of Entities and Zones. More options: opacity, displayed name (P1), propagation origin point at this Step (FR-39).

UX-DR38: Panel — Drawn Zone: Faction, Pattern, "Pocket" (P1, FR-24). More options: opacity.

UX-DR39: Panel — Front Line: Style (Dash-dot · Solid · Dashed), thickness, "Hide for {A} · {B}". More options: colour (default map-front), "Keep trace" (P2, reserved slot).

UX-DR40: Panel — Arrow: Faction, thickness, "Visible from … to …". More options: head shape, stroke (Solid · Dashed), draw duration, Arrow category (P2, reserved).

UX-DR41: Panel — UnitToken: Faction, shape, label and label frame, rotation, "Visible from … to …". More options: size, appearance animation.

UX-DR42: Panel — Token Series (P1): Faction, shape, followed path, side, spacing, rows (1–3). More options: link to Counter (P2, reserved).

UX-DR43: Panel — Text: text, font, size, colour (color-field), frame (None · Rule · Band), animation (Character · Word · Fade · None), "Visible from … to …". More options: halo, alignment, letter-spacing, anchor edge.

UX-DR44: Panel — Counter (P1): value at this Step, Faction, prefix/suffix ("12 000 men"), "Visible from … to …". More options: anchor to Territory, orientation, number format.

UX-DR45: Panel — DateDisplay (P1): granularity (Day · Month · Year), format Select (YYYY-MM-DD, DD month YYYY, year only, free label), free label for this Step. More options: style (cartouche or text), anchor corner.

UX-DR46: Panel — Legend (P1): entries (rename, hide, reorder), "Add a line". More options: title, anchor corner.

UX-DR47: Panel — Image: Use as (Element · Emblem · Event Icon), opacity, scale, rotation, "Visible from … to …". More options: "Use as background" (P1, FR-49) with manual corner/rotation handle calibration and segmented "Above Basemap · Instead of Basemap".

UX-DR48: Panel — Step (thumbnail selected): Step Date, transition (Propagation · Fade · Sweep) and origin point, transition and hold durations, Camera section (UX-DR56), Act (P1). More options: ambient effects (P2, reserved). Multi-selection panel: "5 elements" with only common fields; differing values display "Multiple".

UX-DR49: Inherited / overridden field pattern (`field-inherited`, `field-overridden`): inherited value in text-secondary with caption "Inherited from {parent/Step}"; overridden value in text-primary with 2 px text-primary left bar + "Reset" link (accent). Editing an inherited field overrides it; "Reset" removes own value. Used for Sub-factions (parent Kit) and Step inheritance ("Defined at this Step" / "Inherited from 1459"). Sub-faction panel header shows "1 field overridden" + link to parent. No keyframe diamond vocabulary. [ASSUMPTION]

UX-DR50: Sub-faction row (`subfaction-row`): 16 px faction swatch, name (body), summary caption (text-muted; text-secondary when hovered/selected, e.g. "Inherits · colour overridden"), 16 px chevron; opens the Sub-faction panel.

UX-DR51: FactionKit editor (panel when a Faction is selected): header with Emblem, name, origin ("Project copy · from the Library"), "Applies to the whole Timeline". Sections: Colours (fill, stroke, selection; color-field + guardrail), Emblem & font, Organic Signature (segmented Off · Light · Strong · Project default), Sub-factions (rows + "Add a Sub-faction"). More options: Border, Arrow, Token, flag fill (P1). Kit menu: "Save to Personal Kits", "Update from Personal Kits" (P1, FR-16). Every change applies immediately everywhere (FR-12), not subject to Steps.

UX-DR52: Input field, checkbox, slider base components: input-field (surface-raised, border-input, radius sm, 32 px, body, placeholder text-muted); checkbox 16 px border-input, checked accent/on-accent; slider (2 px border-input track, text-secondary range, 12 px round text-primary thumb) always paired with a 56 px numeric input with unit (timecode). Slider keyboard: ←/→ one step, Shift ten steps, Home/End bounds; double-click thumb = default; one drag = one undo step; step 1 export px or 1 %.

UX-DR53: Segmented control (`segmented-control`) for every exclusive choice of 2–4 options (never round radio buttons; > 4 options -> Select): surface-raised, border-input outer, border dividers, radius sm, 32 px, label type, text-secondary; selected = selection bg, text-primary 600, inset 2 px accent bottom rule. ARIA `radiogroup`, single tab stop, ←/→ move selection. [ASSUMPTION: bottom rule for 3:1.]

UX-DR54: Colour field (`color-field`): 24 px square swatch (radius 0) + hex in timecode within input-field; hex entry with optional `#`, 3 or 6 digits; invalid -> keep previous value + message "Enter a colour in #RRGGBB format."; swatch click opens popover with saturation/value area, hue slider, eyedropper (hidden if browser lacks EyeDropper API) and "Project colours" swatch list (label-caps heading); live application; one drag = one undo step. Used in Kit, Text, Basemap Tint.

UX-DR55: Faction picker (`faction-picker`): wrapping row of 28 px chips (surface-raised, border-input, radius sm, 14 px faction-swatch + label), one per Project Faction, plus "Neutral" (hatched map-land-neutral swatch) and "+ Faction" (opens Library drawer on Kits). Click applies immediately to the whole selection. Selected = selection bg + accent bottom rule. Mixed selection: no chip selected, caption "Multiple Factions". ARIA radiogroup, one tab stop, arrows then Space. Compact variant in options bar: active Faction + menu.

UX-DR56: Step Camera (FR-46, FR-47) in Step panel: Select Preset (Auto framing (default) · Top view · Fly-to · Orbit · Sweep · Bounce); "Use current view" copies edit camera (centre, zoom, rotation) into Step frame and Preset shows "Manual framing"; Zoom (%) and Rotation (−180° to 180°) fields; "View framing" moves edit camera to frame; "Back to Preset" clears manual framing. [ASSUMPTION]

UX-DR57: Relations (Project settings → Factions & Relations): one row per Faction pair ("Russia · Ukraine") with segmented "At war · Allied · Unrelated" and checkbox "Show Front Line" (FR-22, FR-23). Beyond 6 pairs only pairs differing from defaults visible; others behind "All pairs (n)". [ASSUMPTION]

UX-DR58: Basemap picker (`basemap-picker`): 3-column grid of 56 px preview tiles (Parchment, Dark, Light, Relief, Satellite), radius 0, caption name below; selected = inset 2 px accent outline; click switches Basemap immediately without touching elements, undoable. Below: Brightness (−50 %..+50 %, default 0; satellite −10 %), Saturation (−100 %..+50 %, default 0; satellite −35 %), Tint (colour default map-tint + intensity 0–60 %, default 0) sliders, plus "Reset Basemap settings" (resets to active Basemap defaults; changing Basemap keeps modified settings). Settings affect Basemap only, never Territories/elements. Satellite unavailable: tile in control-disabled with caption "Unavailable" + "Retry" link. [ASSUMPTION: ranges/defaults/retention.]

UX-DR59: Nearest-data chip (`nearest-data-chip`): surface-raised, border, info icon 16 px text-secondary, caption text "Nearest available data: 1454"; shown in options bar and Project settings when Reference Date is not exact (FR-6).

UX-DR60: Library drawer (`library-drawer`, 320 px, surface, right border, radius 0 4 4 0, long shadow): opens against the rail, full height below top bar, overlaying the left of the scene AND the left of the Timeline without reframing the Map or shifting the Timeline (mockup state c). Active tool stays active. Tabs: Templates · Kits · Emblems · Event Icons; search + Select filters (Era, world region, type); grid of square sharp-corner thumbnails; Kits tab segmented "Library · Personal Kits" (P1); clicking a Kit offers "Apply to {selected Faction}" or "Add as new Faction" (creates a Project copy, FR-13); Emblems/Event Icons: drag onto Map or click to place at frame centre; Templates: "New Project from this Template" opens prefilled Wizard. Close via Escape, rail button or close icon. Opened via rail or `B`.

UX-DR61: Layers panel (P1, FR-56): in the drawer slot, opened via rail or `L`; list by nature (Territories, Arrows, Tokens, texts, media) with eye (hide), lock (lock) and drag to reorder. Locked layer elements are unselectable (not-allowed cursor); first click per session toasts "The Arrows layer is locked. · Unlock".

UX-DR62: Place search (top bar, `/`): input with suggestions (country, city, Geographic Entity); Enter centres edit camera on place without changing Presets (FR-8); Entity suggestion also offers "Select". No-results copy (UX-DR146).

UX-DR63: Output Format menu (top bar + Project settings): 16:9 · 9:16 · 1:1; change recomputes framings (FR-50) with toast "Framings recalculated for 9:16 · Undo". Resolution 1080p for short side.

UX-DR64: Tooltip (text-primary bg, background fg, radius sm, caption, no shadow) and popover (surface-raised, border, radius md, long shadow) restyled; used by DropdownMenu, Select, ContextMenu.

UX-DR65: Toast component (`toast`, Sonner restyled): surface-raised, border, radius md, short shadow; circled status icon, body-strong title, caption sub-line, optional action ("Undo"). Behaviour rules in UX-DR115.

UX-DR66: Banners (`banner-warning`, `banner-info`): full width under top bar (Home and Editor), surface-raised, 3 px left border (warning / accent), icon (warning colour / info text-secondary), body text, max one action (compact button-secondary 28 px), dismiss cross (dismissable per session, except read-only banner). Warning: storage, offline, browser, window-size; info: read-only.

UX-DR67: Dialog (`dialog`): surface-raised, border, radius md, title-lg, long shadow, dialog-scrim; actions right-aligned with primary rightmost. Only one modal level; sole exception = a confirmation above Settings or Export.

UX-DR68: Skeleton (`skeleton`): solid blocks in `border` colour, radius 0, matching exact shape of expected content (thumbnail, project card, row); opacity pulse 100 → 60 % over 1.2 s; static under reduced motion.

UX-DR69: Progress bar (`progress-bar`): 6 px, radius 0, progress-track/progress-fill, percent in timecode-strong; ARIA `progressbar`.

UX-DR70: Context menu on Map/selection (right-click, Menu key, Shift+F10): includes "Assign to" → Factions + "Neutral"; on thumbnails: Duplicate, Insert after, Delete.

#### E. Timeline

UX-DR71: Timeline container (`timeline`): between rail and panel, surface, top border; default height 200 px (mockup state d), min 180 px, collapsed 44 px (header only), resize handle centred on top edge up to 50 % of window height; height and collapsed state persisted locally [ASSUMPTION]. Fixed zone (header 40 + ruler 20 + Acts 24 + Steps 72 = 156 px); tracks scroll beneath with a 6 px scrollbar running only under the Steps row; default budget shows Arrows lane 26 + 18 px peek of Tokens lane = 200 px. With no Act, Act row disappears and its 24 px go to tracks.

UX-DR72: Timeline header: "Timeline" (title-md), play/pause (`timeline-play-button`, accent), previous/next Step, timecode "00:08,4 / 00:20,5" (timecode-strong / timecode), speed (0.5× · 1× · 2×), horizontal zoom, "Collapse" (ghost). Collapsed state keeps play, timecode, prev/next and an expand button.

UX-DR73: Timeline ruler (`timeline-ruler`, 20 px): graduated in seconds, border ticks, timecode labels in text-muted; click or drag places playhead.

UX-DR74: Playhead (`playhead`): 1.5 px line + 12 px pentagon handle in playhead colour, 24x24 hit area; ARIA `slider` with aria-valuetext "00:08,4, Step 1463, Conquest of Bosnia". Scrub shows exact export frame (FR-41).

UX-DR75: Act row (P1, `act-bracket`): named blocks above thumbnails with 1 px act-rule bracket, label-caps text-secondary labels; rename by double-click; select thumbnails then "Group into Act"; row hidden when no Act.

UX-DR76: Step thumbnails (`etape-thumbnail`): 72 px, radius 0, inset 1 px border, Map preview + surface-raised chip with date and title (caption, may ellipsize); width proportional to hold duration; current Step = inset 2 px accent outline. Date fallback order: date-display ("1463") → date-compact ("16 March", "6 June 1944") → date-compact without year when same as previous Step ("12 June") [ASSUMPTION]; dates never ellipsize; full date in tooltip, accessible name and Step panel. Click = playhead to start of hold + Step panel; double-click title = rename; drag = reorder (FR-40); context menu Duplicate / Insert after / Delete. Thumbnails recolour live when Kits change. Accessible list item "Step 3 of 5, 1463, Conquest of Bosnia, transition 2 s, hold 2.5 s".

UX-DR77: Per-Step own-value markers: when an element is selected, Steps where it has an own value show a small ink tick under their thumbnail. [ASSUMPTION]

UX-DR78: Transition blocks (`transition-hatch`): 135° hatch (border/surface), width proportional to duration, label "1,5 s" in timecode; dragging edge sets duration (same as panel field). [ASSUMPTION]

UX-DR79: Tracks (`track-lane` 26 px, clips 20 px): lanes Arrows / Tokens / Text with label column (label, text-secondary); one clip per element, coloured per track; Event Icons and images on Tokens track [ASSUMPTION]; selected clip = inset 1.5 px accent outline; clip click selects on Map and vice versa; dragging clip end limits visibility range (FR-45); clip spans from creation Step to Timeline end. Territories and Legend have no clip. Token Series = single clip "Series · 14 Tokens".

UX-DR80: Automatic overlap sub-rows: when two clips on one track overlap, the track gains an automatic 26 px sub-row within the scrolling zone (never affecting the 156 px fixed zone), removed when the overlap ends; users never create or reorder lanes.

UX-DR81: "+ Step" at end of thumbnails and Ctrl+D duplicate: new Step starts from previous Step state and becomes current; proposed date = previous + same interval [ASSUMPTION]. Delete Step: no dialog, toast "Step 1463 deleted · Undo"; following Steps inherit from previous (FR-40).

UX-DR82: Thumbnail list keyboard: ←/→ move between thumbnails and make that Step current; Ctrl+Shift+←/→ reorders. [ASSUMPTION]

#### F. Step model in UI

UX-DR83: Current Step: every Map edit applies to the Step bearing `etape-thumbnail-current`; options bar always shows it.

UX-DR84: Editing mid-transition: Map shows interpolated read-only frame; on first edit gesture, playhead snaps to start of arrival Step hold with toast "Placed on Step 1463 to edit". [ASSUMPTION] [NOTE FOR UX]

UX-DR85: Default scope = this Step and following. After a change, link "Apply to all Steps" appears under the modified field while element stays selected (and in the options bar for on-Map edits like moving a Token or redrawing a Zone). Action sets value on the element's first-existing Step and clears own values of later Steps; single Ctrl+Z undo; toast "Applied to 5 Steps · Undo". [ASSUMPTION] [NOTE FOR UX: discoverability — link vs scope selector, test with 3–5 creators.]

UX-DR86: Existence: element visibility editable via clip end or "Visible from … to …" field.

UX-DR87: Membership: assigning an Entity to a Faction (Territory tool, faction-picker, Conquest) removes it from its previous Territory at current Step; a Drawn Zone wins over Entities it covers.

UX-DR88: Reference Date vs Step Date labels always distinct; Reference Date in Project settings (confirm on change), Step Date in Step panel and thumbnail.

#### G. Map tools

UX-DR89: Select tool (`V`): click priority elements (Arrow, Token, Text, image…) before surfaces, else Entity/Drawn Zone under cursor; double-click surface = whole Territory of its Faction; click empty = Project settings; Shift+click add/remove; rectangle in empty area = marquee; Ctrl+A = all elements of active Layer [ASSUMPTION]; right-click = context menu; arrows move selection 1 export px (Shift 10) when Map focused.

UX-DR90: Territory tool (`T`, FR-18/19): options = compact active Faction (last used), segmented Entities · Drawn Zone; in Zone mode "Freehand · Points". Entities mode: hover canvas-hover; click assigns Entity to active Faction immediately (no validation); Alt+click makes neutral. Drawn Zone mode: Trace gesture; closed Zone joins active Faction Territory. Zone editing via Select tool: drag points, double-click contour adds point, Delete removes chosen point. No clip.

UX-DR91: Conquest tool (`C`, FR-20/21): options = attacking Faction (last used, else first non-neutral), segmented Entities · Free paint, brush size ([ and ]). Drag paints pending selection (`canvas-pending` hatch) with live count "12 Entities selected"; Alt+drag removes; "Validate conquest" (Enter) applies to current Step; Escape abandons; nothing auto-plays after validation. Free paint adds a Drawn Zone. When Region has no subdivisions (P1, FR-7), options bar shows "No subdivisions for this Region at this date. Paint freely or split an Entity." and proposes Free paint. Live-region announces count and validation.

UX-DR92: Arrow tool (`F`, FR-28): options = Faction (default active; none -> map-arrow), thickness slider ([ ]). Point trace; smoothed curve through points; double-click or Enter finishes (>= 2 points); Backspace removes last point; Escape cancels; tool stays active. Arrow draws origin→head during entry transition of its Step (first Step: during first second of hold [ASSUMPTION]); points editable per Step; clip on Arrows track.

UX-DR93: Token tool (`J`, FR-30): options = Faction, shape segmented icons (Simplified NATO · Two-tone square · Round flag badge · Mini-flag; default Kit shape), segmented Token · Series (Series P1). Click places Token centred; focus moves to panel Label field (Enter validates, Escape leaves empty); tool stays active; drag moves; rotation handle above token (Shift = 15° steps) or Rotation field; during transition token glides/rotates; clip on Tokens track.

UX-DR94: Token Series mode (P1, FR-31): options Faction, shape, "Flip side"; hovering Front Line or Territory contour shows canvas-hover on path; click attaches series on clicked side; Escape cancels; series redistributes during transitions when path changes.

UX-DR95: Text tool (`X`, FR-34): options = segmented Text · Counter · DateDisplay (last two P1), font, size, frame. Click places text and opens on-Map input; drag = fixed-width box; Escape or click elsewhere ends; empty text is deleted; double-click (Select tool) re-edits. Default animation "Character by character" synced to Step entry transition; anchored to nearest frame edge, stays in place on Output Format change (FR-50). Clip on Text track.

UX-DR96: Counter mode (P1, FR-36): click places Counter, focus to panel Value field; value per Step rolls during transition; anchored to a Territory follows its surface centre. DateDisplay mode (P1, FR-37): click places DateDisplay; only one per Project — if exists, tool selects it [ASSUMPTION]; date-cartouche style; rolls from previous Step Date to next at chosen granularity during transition, fixed during hold; a free Step label replaces rolling.

UX-DR97: Legend (P1, FR-35): no tool; toggled via Project settings "Show Legend"; drag to move, snaps and anchors to frame corners; double-click entry renames in place; visible over whole Timeline, no clip; new Factions/patterns/token types auto-added. P0: minimal non-editable Faction Legend shown at Wizard exit [ASSUMPTION — flagged to PM: FR-2 P0 vs FR-35 P1].

UX-DR98: Import tool (`I`, FR-48): click opens file picker (PNG, JPG, SVG, multiple); drag-and-drop onto Map works with any tool; image placed at drop point or frame centre at max 40 % of frame short side; tool returns to Select with image selected [ASSUMPTION]; clip on Tokens track. Unsupported format toast "Unsupported format. Use PNG, JPG or SVG."

UX-DR99: Assign Entity to Faction outside Conquest — three equivalent paths (FR-13/18) [ASSUMPTION]: (1) Select + panel faction-picker (Shift+click/marquee for many; "Neutral" removes from any Territory); (2) context menu "Assign to"; (3) Territory tool Entities mode. Keyboard path: `/` search → "Select" → Alt+5 panel → faction-picker. Single Ctrl+Z; toast + polite announcement "5 Entities assigned to NATO · Undo".

UX-DR100: Canvas overlays (identical on all Basemaps, never accent): `canvas-selection` (4.5 px halo + 1.6 px dashed ink), `canvas-hover` (3 px halo + 1 px ink), `canvas-pending` (45° ink hatch + 3 px halo), `canvas-handle` (ink fill, 1.5 px halo stroke, 24 px hit), `canvas-brush-cursor` (4.5 px halo + 1.6 px dashed ink ring). In-progress trace: solid canvas-selection stroke + canvas-handle points. Also used for drawn Zone points and propagation origin point.

#### H. Map rendering rules

UX-DR101: Map never follows UI theme: Map, Basemaps, Factions and labels pixel-identical in light and dark UI. AC: screenshot diff of Map canvas across themes = 0.

UX-DR102: UI accent never on Map (selection, hover, handles, brush, pending, frame, presentation bar) — only ink + halo.

UX-DR103: Export frame: centred on Map at Output Format ratio with >= 24 px margin; outside the frame the Map is dimmed by `canvas-mask` at 55 % (`export-frame-mask`); no border, rule, graduated edge, engraved frame or ornament; format label lives only in options bar. Edit camera is free and Map continues beyond frame. [ASSUMPTION: mask tint/opacity.]

UX-DR104: WYSIWYG: inside the frame, at any Timeline instant, the Map shows exactly the exported image (FR-41, NFR-1); editing overlays disappear in Presentation Mode and export.

UX-DR105: Chrome never covers the frame: toasts bottom-right of scene, options bar above Map, zoom bottom-left; only Library drawer and fading presentation controls may overlay the Map.

UX-DR106: Tile loading: tiles arrive progressively over a solid `map-land-neutral` of the ACTIVE Basemap (`-sombre` for satellite); editing never blocked; playback continues with available tiles.

UX-DR107: Map element styles: Arrow (`map-arrow-style`: Kit colour else map-arrow, default 14 px, 4–120 px, 3 px map-label-halo, head per Kit); UnitToken (`unit-token`: 56 px, 4 shapes per Kit, map-token-label below, bare with halo or 2 px framed on halo); Text (`map-text` with halo, frames none / rule / halo band); Counter (`map-counter` tabular, 6 px Faction-colour left bar, label in map-legend-entry); DateDisplay `date-cartouche` (halo fill, double 1.4 px ink rule, spaced-caps kicker, year) [ASSUMPTION default]; Legend (`map-legend`: halo box, 1.4 px ink rule, title "Legend", 28 px swatches, 24 px padding/margin); Front Line default dash-dot map-front with halo; sea labels without halo in map-sea-label; neutral Territory = map-land-neutral. [ASSUMPTION: default sizes.]

UX-DR108: Map credit (`map-credit`): in a frame corner at 24 px margin; "Discreet" = map-credit-discreet with halo; "Legible" = map-credit-legible on halo band. [ASSUMPTION: sizes/band.]

UX-DR109: Edit camera: wheel zoom around cursor, trackpad pinch, Space-hold+drag or middle button pan, Shift+wheel rotate, Shift+1 recentre on export frame (Ctrl+0 left to browser); edit camera never modifies Presets or manual framing.

#### I. Interaction rules

UX-DR110: Keyboard shortcuts (single-letter keys follow typed character, AZERTY and QWERTY) [ASSUMPTION list]: V Select, T Territory, C Conquest, F Arrow, J Token, X Text, I Import, B Library, L Layers, Space (short) play/pause, ←/→ prev/next Step (context 4), Shift+←/→ one frame, Home/End Timeline start/end, Ctrl+D duplicate (element or Step), Delete remove selection, Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y undo/redo, Ctrl+S confirm save (toast), Ctrl+E Export, P Presentation, / place search, [ / ] brush size or thickness, ? shortcut help, Alt+1..Alt+6 zone jump, Escape per order. Implement a "?" shortcuts help overlay.

UX-DR111: Keyboard context priority (most specific wins) [ASSUMPTION]: (1) focused text field receives all keys, single-letter shortcuts/Space/arrows inactive, Escape leaves field; (2) focused composite control (menu, Select, segmented, faction-picker, slider, thumbnail list, Layers list) follows its ARIA pattern; (3) Map focused with selection: arrows nudge 1 export px (Shift 10); (4) elsewhere: ←/→ Step, Shift+←/→ frame, Home/End. Space: short press = play/pause, hold during Map drag = pan without toggling playback; on focused button = native activate.

UX-DR112: Escape order — one action per press: close open menu/popover → close dialog (never during export render) → cancel in-progress trace or pending selection → close drawer → clear selection → return to Select tool. In Presentation Mode, Escape returns to Editor at reached instant.

UX-DR113: Zone jump Alt+1..Alt+6 (digit row, no Shift, AZERTY and QWERTY): top bar, rail, options bar, Map, panel, Timeline; each zone a named ARIA region; F6 not used (browser address bar). [ASSUMPTION: verify collisions on Chrome/Edge Windows.]

UX-DR114: Undo/redo (FR-55): multi-level across Map, Timeline, Kits and Project settings; excludes export, Settings and Project File import; history not persisted across reload [ASSUMPTION]; every creation is one Ctrl+Z; one slider/colour drag = one step; "Apply to all Steps" = one step.

UX-DR115: Toast rules: bottom-right of scene, never above export frame; one visible at a time, others queued; info 4 s, with action ("Undo") 8 s, error until dismissed [ASSUMPTION]; no toast on autosave — "Project saved" only after Ctrl+S or first save of new Project [ASSUMPTION]; destructive actions (delete Step, delete Project) use undo toast instead of confirm dialog. Announced politely (info) / assertively (error).

UX-DR116: Prohibited patterns: exposed keyframes/Bézier curves, stacked modals, destructive action without Undo, hover as the only access to a function, auto-play on Project open, After Effects-style density.

UX-DR117: Drag gestures: move element at current Step, drop images on Map, drop Project File on Home, reorder Steps and Layers, drag clip and transition edges. Trace gesture shared by Drawn Zone and Arrow (click point, drag freehand, double-click/Enter finish, Backspace remove last, Escape cancel).

#### J. Screens

UX-DR118: Home (`home-layout`): background colour, centred column max 1200 px, 32 px side margins; common top bar (no breadcrumb); optional banner between top bar and header; header "Projects" (title-xl) with right-aligned "Import a Project File" (secondary) and "New Project" (primary, only primary); grid of project cards auto columns min 240 px, 24 px gap (4 columns at 1366). Drop a Project File anywhere to import (FR-52, FR-54).

UX-DR119: Project card (`project-card`): surface, border, radius 0, full-width 16:9 thumbnail of first Step, name body-strong single line ellipsis, meta caption text-muted "Modified 2 h ago · 9:16"; menu button (ghost) top-right of thumbnail visible on hover and focus; hover = surface-raised bg + border-input; no shadow; sorted most recent first; click or Enter opens Editor; menu (button, right-click, Shift+F10): Rename (in place), Duplicate, Export Project File, Delete (toast "Project deleted · Undo", permanent deletion when toast closes); open-elsewhere meta "Open in another tab". [ASSUMPTION]

UX-DR120: Home empty state (`home-empty`): centred in grid, title-lg "No Projects yet.", body text-secondary, "New Project" (primary) + "Import a Project File" (secondary); whole area is a drop target with dashed border-input outline during drag; no illustration.

UX-DR121: Telemetry consent dialog (`consent-dialog`, FR-58) on first launch: 440 px, on scrim, no close cross, no Escape; title "Anonymous usage statistics", body copy from Voice & Tone; two button-secondary of identical width and style, "Decline" left, "Accept" right, nothing preselected, initial focus on title; caption link "What is sent". Nothing sent before answer; changeable in Settings → Privacy.

UX-DR122: Wizard (`assistant`) shell: full-frame dialog without scrim from Home "New Project"; 56 px header, numbered step indicator 64 px (current in accent with bottom rule), "1 / 4", Back, Skip, Next, "Create Map" on last; "Skip" keeps Template values (FR-2); 400 px aside "In this Project" in surface; title-xl screen titles. Reference render: `mockups/assistant.html`.

UX-DR123: Wizard screen 1/4 — Template: "Blank Map" first, then filterable Template grid with animated thumbnail on hover (static under reduced motion); no-result state with "Clear filters"; "Blank Map" still goes through screens 2–4, all skippable. [ASSUMPTION]

UX-DR124: Wizard screen 2/4 — Reference Date: year input, "BC" toggle, nearest-data chip "Nearest available data: …" when not exact; invalid date messages (UX-DR147).

UX-DR125: Wizard screen 3/4 — Region: Region search with preview framing it; no-result copy.

UX-DR126: Wizard screen 4/4 — Factions: suggested Factions with their Kit auto-applied; Faction without official Kit gets a distinct default colour; "In this Project" column; "Create Map" → "Creating Map…" with progress bar and step ("Loading Entities for 1450"), screen frozen; Editor opens when Map ready (NFR-7); failure "Unable to create the Map." + "Retry", choices kept. Render: `mockups/assistant.html`.

UX-DR127: Editor layout: 3x3 grid (top bar / rail + scene + panel / Timeline between rail and panel); scene = options bar + Map. At 1366x768 (viewport 1366x648): scene 990x400, visible Map 990x364, 16:9 export frame 562x316. Reference: `mockups/editeur.html` states a (dark), b (light), c (drawer), d (retained 200 px Timeline). Note states a–c and Export-backdrop use rejected 280 px Timeline.

UX-DR128: Editor opening state: Editor shows immediately with skeletons in panel and thumbnails, Map in solid active-Basemap background, "Opening…" in top bar; tools enable once Project data loads; media and tiles follow non-blocking. Reopen after close/crash opens last saved state, no recovery dialog (FR-53, NFR-5).

UX-DR129: Presentation Mode (`P` / "Presentation", FR-57): fullscreen (Fullscreen API), playback from playhead with Timeline camera, render identical to export. Controls (`presentation-controls`): floating bar 640x48 centred 24 px from bottom, scrim at 72 %, canvas-halo icons/timecode, no accent, radius md; play/pause, timecode-strong, thin progress (canvas-halo fill on halo 30 %), "Exit presentation"; focus ring focus-ring-dark. Controls fade 2 s after last mouse move, return on move or Tab; never in export. Space play/pause; Escape back to Editor at reached instant. End: stop on last frame, controls shown, "Replay" (no loop) [ASSUMPTION]. Startup: black screen + progress-bar "Loading Map…" until first seconds of tiles ready (max 10 s); fullscreen refused → presentation in window + toast "Fullscreen refused by the browser. The presentation stays in the window." [ASSUMPTION]

UX-DR130: Export modal (`export-dialog`, 560 px, label column 148 px, label text-secondary) — settings: tabs Video / Image (Image P1). Video: range (Whole Timeline · Steps from … to …), 30 or 60 fps, reminder of Output Format and 1080p resolution (changed outside modal). Image (P1): instant (current playhead default), PNG or JPG, "Transparent background" (PNG only). Opened via top bar "Export" or Ctrl+E; checks video encoder on open. Render: `mockups/export.html`.

UX-DR131: Locked credit control (`export-credit-locked`): when a source licence requires it (e.g. satellite), a locked row (background bg, border, radius sm, 32 px) with credit text and 16 px padlock, NO checkbox, caption explanation "Required: the satellite basemap licence asks for this credit. You choose its position and how discreet it is."; below: Select "Position" (four corners, default bottom-left) and segmented "Discreet / Legible" (default Discreet). Exposes "Required credit, locked" to AT. Without a licence requirement: optional credit checkbox unchecked by default with same settings. [ASSUMPTION]

UX-DR132: Export rendering state: "Export" starts render inside modal; settings become control-disabled; footer shows "Rendering…", percent, progress-bar, remaining time + current Step caption ("About 25 s remaining · Step 7 of 10"), "Cancel" (secondary). Editor blocked; Escape/close disabled — only Cancel interrupts; closing tab triggers native beforeunload alert. Each frame waits for its tiles ("Loading tiles…").

UX-DR133: Export done state (`export-done`): inside modal, never just a toast; box with 3 px success left border + icon, title "Export complete", filename `{project}-{format}-{date}.mp4` (e.g. `siege-de-marioupol-9x16-2026-09-29.mp4`), details caption (duration, resolution, fps, size, range, credit reminder); browser auto-saves to downloads; actions "Export again" (secondary, back to kept settings) and "Download again" (primary, right; re-downloads kept file without re-render) [ASSUMPTION: file kept in memory until modal closes]. Focus moves to "Download again"; polite announcement. Never "Open folder"/"Show download".

UX-DR134: Settings dialog (tabbed, from top bar menu on Home and Editor) [ASSUMPTION: dialog not page]: Appearance (segmented System · Light · Dark), Language (Français · English, no reload), Privacy (telemetry toggle + what is/isn't sent, FR-58), Personal Kits (P1: list, rename, delete, import/export file), Storage (space used, persistent storage status, reminder to export Project Files). Changes immediate; not covered by undo.

UX-DR135: "Designed for computer" page on mobile/tablet (coarse pointer and width < 1024 px): no editor; "OPENMAP is designed for a computer. Open this link on your PC with Chrome or Edge." + "Copy link" [ASSUMPTION: blocking].

#### K. State patterns

UX-DR136: Loading states: Home project list skeleton cards while reading local storage; Library/Wizard data skeleton thumbnails; failure "Unable to load the Library." + "Retry".

UX-DR137: Save status in top bar: "Saving…" → "Saved"; write failure → "Not saved" in danger with icon + banner "Export a Project File so you lose nothing."

UX-DR138: Storage banners: persistent storage denied / almost full → banner-warning "Storage almost full. Export a project file to keep your work safe." + action "Export Project File" on Home and Editor; reappears each session while condition persists (FR-53).

UX-DR139: Read-only tab (edit lock per Project) [ASSUMPTION — architecture must implement lock, e.g. Web Locks/BroadcastChannel]: second tab opening same Project shows it read-only with non-dismissable banner-info "This project is open in another tab. You are viewing it read-only." + "Take over here", announced on open; editing tools, panel fields, edit menus disabled; playback, scrub, Presentation and export remain available. "Take over here" takes lock after the other tab's last save; other tab switches to read-only with "This project is now being edited in another tab." + "Take over here". If holder tab closes, banner says so and keeps "Take over here" (no auto takeover). Home card shows "Open in another tab".

UX-DR140: Satellite unavailable: automatic fallback to Dark Basemap, warning toast "Satellite basemap unavailable. Using the dark basemap.", satellite tile "Unavailable" + "Retry"; no Project element touched (FR-5).

UX-DR141: Offline: global banner "Offline. Your changes are saved on this device; basemaps and Library items not yet loaded will not display." Editing continues. [ASSUMPTION]

UX-DR142: Export unavailable (no video encoder): banner-warning at top of Export modal "This browser cannot encode video. Open OPENMAP in Chrome or Edge.", "Export" control-disabled, settings viewable; Image tab usable if shipped (P1).

UX-DR143: Tiles missing at export: after 20 s without a new tile [ASSUMPTION], render pauses with warning "Some map tiles could not be loaded (steps 3 to 5). If you continue, these areas will keep the Basemap's plain background." + "Continue" / "Cancel" (back to settings, nothing saved); offline → same warning at launch.

UX-DR144: Export cancelled: back to settings with "Export cancelled. Nothing was saved." Export failed: danger message "The export failed." + readable cause (memory, browser encoder) + "Retry" + advice "Try 30 fps or a shorter range". [ASSUMPTION]

UX-DR145: Import errors: Project File import toast with progress "Importing siege-de-marioupol… 45 %" + "Cancel", Project then appears first in list; invalid file → dialog "This file is not a readable OPENMAP Project File." with no existing Project modified. Invalid Kit file (P1, Settings) → error toast "This file is not a readable OPENMAP Kit." with no Personal Kit modified. Unsupported image → toast (UX-DR98).

UX-DR146: Empty states: empty Timeline (blank Project) = single Step + "Add a Step to animate the Map." + "+ Step" in thumbnail row; no Faction (Project settings, Territory and Conquest tools) = "Add a Faction to colour Territories." + "Add a Faction" (opens Library on Kits); no results in place/Region search "No place found for "Marioupl". Check the spelling or try a current name."; Library/Templates "No results for these filters." + "Clear filters"; Wizard "Skip" remains possible.

UX-DR147: Invalid date (Wizard 2/4, Project settings, Step panel): message under field in danger with icon, previous value kept: "Year 0 does not exist. Enter 1 BC or 1." / "Enter a year, for example 1463 or 52 BC." Out-of-data date is not an error → nearest-data chip.

UX-DR148: Unsupported browser (Firefox): Home banner "OPENMAP is designed for Chrome and Edge. Video export may not work here." [ASSUMPTION]; small window (< 1366 px): banner "OPENMAP is designed for a screen of at least 1366 × 768." [ASSUMPTION]

UX-DR149: Corrected Entity (P1): "Corrected in this Project" mention in panel (FR-11).

#### L. Voice & tone / microcopy

UX-DR150: i18n FR/EN for all UI strings, language switch without reload; glossary terms verbatim and capitalised in both languages, never synonyms ("scene", "keyframe", "faction theme" forbidden); "Kits personnels"/"Personal Kits" never "My Kits". [ASSUMPTION: EN glossary equivalents to validate.]

UX-DR151: French rules: formal "vous", imperative for instructions, short complete sentences, French typography (« » quotes, non-breaking space before : ; ? !, decimal comma). English: same structure, direct tone, sentence case. BC dates "52 av. J.-C." / "52 BC".

UX-DR152: Status messages state where the user's data stands, never bare "Error"; no exclamation marks, no emoji, no encouragement; buttons = verb (+ object); never promise what the browser cannot do. Implement the FR/EN copy table (save, conquest, count, assignment, Kit, guardrail, storage, other tab, satellite, tiles, export cancelled/done, required credit, deletion, approximate data, telemetry) verbatim as string resources.

#### M. Accessibility

UX-DR153: WCAG 2.2 AA for all chrome; all body text >= 4.5:1 in both modes; focus-ring, playhead, act-rule, border-input >= 3:1; text-muted is floor, never lightened; text-disabled exempt. Automated contrast test over token pairs.

UX-DR154: Full keyboard access; tab order follows visual order top bar → rail → options bar → Map → panel → Timeline; each zone a named ARIA region reachable by Alt+1..6; focus visible via focus-ring on :focus-visible only.

UX-DR155: Pointer alternatives: every draw/paint result has a keyboard path (place search + faction-picker for assignment; arrow nudge for moves; panel fields for durations, ranges, values). [ASSUMPTION]

UX-DR156: Screen reader semantics: rail tools = buttons named by visible label with aria-pressed and aria-keyshortcuts; Map = named region "Map, Step 1463"; polite aria-live region announcing selection ("Territory Ottoman Empire selected, 12 Entities"), assignments, conquest count and validation; playhead slider with aria-valuetext; thumbnails as a list with full description; faction swatches always named; toasts announced polite (info) / assertive (error); export progress as progressbar; "Export complete" announced politely with focus to "Download again"; locked credit exposes "Required credit, locked"; read-only banner announced on open; faction-picker/segmented as radiogroups.

UX-DR157: Reduced motion (`prefers-reduced-motion`): chrome (drawer, toasts, accordions, skeletons, panel changes) → short fade or instant; Organic Signature never applied to UI; Map in Editor still shows Organic Signature as set (NFR-1) but never auto-starts; Template animated thumbnails static; Organic Signature panel shows note "The Map animation is your content; set it to Off to remove overshoot, jitter and pulsing."; export never affected by system preference.

UX-DR158: No information by colour alone: tracks labelled, states with icon + text, Factions with names.

#### N. Layout & platform

UX-DR159: 1366x768 budget (Chrome maximised, Windows taskbar, viewport 1366x648): full experience, no essential panel hidden, no horizontal scroll (NFR-8); Timeline default 200 px showing header, ruler, Acts, Steps row and one track; export frame 562x316 at 16:9 (79 % more frame area than rejected 280 px Timeline).

UX-DR160: Below 1366 px width: Map shrinks first; below 1280 px panel goes to 260 px and drawer overlaps more of scene; banner signals minimum size. Low height: Timeline collapses to 44 px header with expand button. [ASSUMPTION]

UX-DR161: Timeline resize and collapse: top-edge handle from 180 px to 50 % window height; "Collapse" to 44 px; state and height remembered locally. [ASSUMPTION]

UX-DR162: Fullscreen reserved to Presentation Mode; only one tab edits a given Project.

#### O. Brand guardrails (Do / Don't)

UX-DR163: Enforce Do/Don't as review checklist: single accent; flat surfaces; sharp corners (0–2 px, 4 px floating); 1.5 px icons; restyled shadcn; shadows only on toasts/popovers/drawer/dialogs; serif only for titles/dates/Map labels; Map identical across themes; canvas ink+halo only; export limit by dimming only; Faction colours as content with ΔE guardrail; states with icon+label; medium density with "More options"; segmented controls not radios; inputs with border-input; 24 px hit areas; locked required credit with padlock + explanation; consent with equal-weight buttons; embedded OFL fonts. Don'ts: gradients (esp. purple/indigo), glassmorphism, pills, emojis, default shadcn look, glow/neon, serif in buttons/inputs, re-tinting Map by theme, accent on Map, engraved/graduated frame, Faction colour in chrome, colour-only info, After Effects density, round radios, required credit as greyed checkbox, "Accept" as primary vs "Decline" as link, relying on installed fonts. RTS styling of chrome deferred to v2.

### FR Coverage Map

FR-0: Epic 3 - Step state model (forward inheritance, edit scope, existence, ownership)
FR-1: Epic 1 (blank Project) + Epic 6 (from a Template) - Create a Project without an account
FR-2: Epic 6 - Setup wizard
FR-3: Epic 6 - Browse Templates
FR-4: Epic 6 - Templates fully editable
FR-5: Epic 1 (stylized Basemaps) + Epic 8 (satellite, P1) - Choose the Basemap
FR-6: Epic 1 - Reference date
FR-7: Epic 10 - Subdivisions (P1)
FR-8: Epic 1 - Place search
FR-9: Epic 10 - Geographic layers and labels (P1)
FR-10: Epic 1 - Source attribution (credit locking completed in Epic 4)
FR-11: Epic 10 - Correct data in a Project (P1)
FR-12: Epic 2 - Create and edit a FactionKit
FR-13: Epic 2 - Apply a Kit
FR-14: Epic 2 - SubFactions
FR-15: Epic 2 - Library of Kits
FR-16: Epic 10 - Personal Kits (P1)
FR-17: Epic 10 - Flag fill (P1)
FR-18: Epic 2 - Select GeoEntities
FR-19: Epic 2 - Draw a DrawnZone (deformation over Steps in Epic 3)
FR-20: Epic 2 - Conquest brush
FR-21: Epic 2 - Free paint
FR-22: Epic 2 - Relations between Factions
FR-23: Epic 2 - FrontLine
FR-24: Epic 9 - Pockets (P1)
FR-25: Epic 2 - Fill patterns
FR-26: Epic 11 - AnnotationZones (P2)
FR-27: Epic 11 - FrontTraces (P2)
FR-28: Epic 5 - Movement Arrows
FR-29: Epic 11 - ArrowCategories (P2)
FR-30: Epic 5 - UnitTokens
FR-31: Epic 9 - TokenSeries (P1); Counter link in Epic 11 (P2)
FR-32: Epic 9 - EventIcons (P1)
FR-33: Epic 11 - Highlight (P2)
FR-34: Epic 5 - Texts; curved text in Epic 11 (P2)
FR-35: Epic 2 (minimal P0 Legend) + Epic 10 (full Legend, P1)
FR-36: Epic 9 - Counters (P1)
FR-37: Epic 3 (simple P0 DateDisplay) + Epic 9 (scrolling, P1)
FR-38: Epic 11 - Scale and compass (P2)
FR-39: Epic 3 - Territory transitions
FR-40: Epic 3 - Manage Steps
FR-41: Epic 3 - Playback and scrubbing
FR-42: Epic 3 - Organic Signature
FR-43: Epic 10 - Acts (P1)
FR-44: Epic 11 - AmbientEffects (P2)
FR-45: Epic 3 - Element persistence ranges
FR-46: Epic 3 - CameraPresets; motion blur in Epic 11 (P2)
FR-47: Epic 3 - Manual framing
FR-48: Epic 5 - Import images
FR-49: Epic 10 - Personal map background (P1)
FR-50: Epic 4 - Video export
FR-51: Epic 10 - Image export (P1)
FR-52: Epic 1 - Projects list
FR-53: Epic 1 - Autosave (storage banners completed in Epic 7)
FR-54: Epic 7 - Project File
FR-55: Epic 1 - Undo / redo (each later story adds its Commands)
FR-56: Epic 10 - Layers (P1)
FR-57: Epic 3 - Edit and Presentation modes
FR-58: Epic 7 - Anonymous telemetry

## Epic List

### Epic 1: Open OPENMAP and lay down a historical map [P0]
A creator opens OPENMAP on their PC, creates a blank Project, sees a stylized Basemap (parchment, dark, light, relief) with the GeoEntities valid at the chosen reference date, searches for a place and sees the data sources. The Project saves itself continuously, supports undo/redo, is safe across two tabs, and the UI works in light/dark and French/English. Includes the technical foundation (scaffold, CI, core engine skeleton, local data pipeline). Everything runs locally: no VPS yet.
**FRs covered:** FR-1 (blank), FR-5 (stylized), FR-6, FR-8, FR-10, FR-52, FR-53, FR-55

### Epic 2: Color the map with Factions [P0]
The creator adds Factions from the Library Kits, creates SubFactions, assigns GeoEntities, draws zones, conquers with the brush, paints freely, sets Relations, and sees FrontLines appear by themselves between Factions in conflict, with fill patterns and a minimal Legend.
**FRs covered:** FR-12, FR-13, FR-14, FR-15, FR-18, FR-19, FR-20, FR-21, FR-22, FR-23, FR-25, FR-35 (P0 part)

### Epic 3: Animate history over time [P0]
The creator builds Steps, watches conquests animate with the Organic Signature, plays and scrubs the Timeline, picks CameraPresets or manual framing, shows the step date on screen and switches to Presentation mode.
**FRs covered:** FR-0, FR-37 (P0 part), FR-39, FR-40, FR-41, FR-42, FR-45, FR-46, FR-47, FR-57

### Epic 4: Export the video [P0]
The creator exports an MP4 (16:9, 9:16 or 1:1, 1080p, 30 or 60 fps) identical to the preview, with progress, cancel and the locked credit. A preview-vs-export golden test is introduced and required by every later story.
**FRs covered:** FR-50

### Epic 5: Tell the story with Arrows, UnitTokens, Texts and images [P0]
The creator draws offensive Arrows that draw themselves, places and moves UnitTokens, writes animated titles and annotations, and imports their own images.
**FRs covered:** FR-28, FR-30, FR-34, FR-48

### Epic 6: Start in 2 minutes: wizard and Templates [P0]
The creator follows the wizard (Template, reference date, Region, Factions) and gets an already animated Map; browses and filters Templates. Includes the Template/Kit authoring and publishing workflow (first Templates are produced with the editor from the end of Epic 3).
**FRs covered:** FR-1 (from Template), FR-2, FR-3, FR-4

### Epic 7: Safe work, usage measurement and going online [P0]
The creator exports and re-imports a Project File on another machine and is warned when local storage is at risk; opts in or out of anonymous telemetry. Includes putting OPENMAP online: VPS data origin behind Cloudflare, Umami, hardening, backups, monitoring, fixed domain.
**FRs covered:** FR-54, FR-58

### Epic 8: Satellite Basemap [P1]
The creator switches to the EOX 2016 satellite Basemap, adjusts brightness/saturation/tint, with fallback to the dark Basemap when unavailable.
**FRs covered:** FR-5 (satellite)

### Epic 9: Current-events and campaign maps [P1]
Pockets that tighten, TokenSeries along the front, Counters, a DateDisplay that scrolls, EventIcons (planes, explosions, portraits).
**FRs covered:** FR-24, FR-31, FR-32, FR-36, FR-37 (scrolling)

### Epic 10: Educational maps and personal identity [P1]
Full editable Legend, labels and layers, Layers panel, flag fill, Personal Kits, subdivisions, data correction, Acts, personal map background, PNG/JPG image export, historical place-name aliases for search (e.g. Constantinople → Istanbul, Stalingrad → Volgograd; curated list, FR-8 enrichment).
**FRs covered:** FR-7, FR-9, FR-11, FR-16, FR-17, FR-35 (full), FR-43, FR-49, FR-51, FR-56

### Epic 11: Effects and polish [P2]
Fog of war, conquest bar, FrontTraces, ArrowCategories, highlight, curved text, scale and compass, motion blur.
**FRs covered:** FR-26, FR-27, FR-29, FR-31 (Counter link), FR-33, FR-34 (curved), FR-38, FR-44, FR-46 (motion blur)

**Sequencing notes:** P1/P2 epics stay coarse and are detailed after the P0 validation with 3–5 creators. Official Templates/Kits are produced with the editor as soon as Epic 3 is done.

---

## Epic 1: Open OPENMAP and lay down a historical map

A creator opens OPENMAP on their PC, creates a blank Project, sees a stylized Basemap with the GeoEntities valid at the chosen reference date, searches for a place and sees the data sources. The Project saves itself continuously, supports undo/redo and is safe across tabs; the UI works in light/dark and French/English. Everything runs locally (no VPS until Epic 7).

**Cross-cutting rules for every story from 1.5 on:** every Project change goes through a Command with an inverse (AD-3); no animation outside the evaluator (AD-1); no forbidden globals in `src/core` (AD-2); UI strings only through i18n keys (AD-20); keyboard and accessibility Definition of Done from Story 1.7.

### Story 1.1: Project scaffold and quality guardrails

As the builder of OPENMAP,
I want a scaffolded codebase whose rules are checked automatically on every push,
So that AI coding agents cannot silently break the architecture.

**Acceptance Criteria:**

**Given** an empty repository
**When** the project is scaffolded from the official Vite `react-ts` template with the Stack versions of the spine (TypeScript 6.0, Vite 8.3, React 19.3, Tailwind 4.3, shadcn/ui CLI 4.21)
**Then** `npm run dev` serves a blank page titled "OPENMAP" and `npm run build` succeeds
**And** the directories `src/core`, `src/render`, `src/export`, `src/persistence`, `src/library`, `src/telemetry`, `src/ui`, `src/i18n`, `pipeline/`, `ops/`, `schemas/`, `tests/e2e/` exist, each adapter exposing a public `index.ts` (ARCH-1)

**Given** the dependency rules of the spine (Design Paradigm table)
**When** dependency-cruiser runs
**Then** an import from `src/core` to React, MapLibre, deck.gl, the DOM, `src/i18n` or any adapter fails the check, and an import of another adapter's internals (not its `index.ts`) fails the check

**Given** the oxlint configuration
**When** code in `src/core` uses `Math.random`, `Date.now`, `performance.now`, `new Date()` or `crypto.getRandomValues`, or any code uses MapLibre `flyTo`/`easeTo`/`panTo`
**Then** lint fails with a message naming AD-1 or AD-2

**Given** the licence policy of AD-17
**When** the licence check runs on the dependency tree
**Then** a dependency outside the allowlist (MIT, BSD, ISC, Apache-2.0, 0BSD, Unlicense, BlueOak-1.0.0, OFL; MPL-2.0 only for listed unmodified packages) fails CI unless listed in `licence-overrides.json` with a reason

**Given** a push to any branch
**When** GitHub Actions runs
**Then** it executes typecheck, oxlint, dependency-cruiser, licence check, Vitest and Playwright (one smoke test that the page loads), and Cloudflare Pages deploys `main` only if CI passes; branch previews are enabled (ARCH-2)
**And** a `README` section explains in plain French how to run the app and the checks locally

**Given** the scaffold
**When** it is created
**Then** `npx shadcn init` is run explicitly with Tailwind 4, and Node.js 24 LTS is pinned (`.nvmrc` and `engines`) (ARCH-1)

**Given** a redeploy while a tab is open
**When** a lazily loaded chunk fails to load
**Then** the app flushes pending saves and reloads once (AD-19)

### Story 1.2: Visual identity, themes and languages

As a creator,
I want the interface to look like an archival atlas in light or dark mode and in French or English,
So that OPENMAP feels calm, trustworthy and readable in my language.

**Acceptance Criteria:**

**Given** DESIGN.md tokens
**When** the design-system layer is implemented
**Then** every chrome colour token exists as a CSS custom property with light and dark values (UX-DR1), mono-mode tokens never change with the theme (UX-DR2), shadcn theme variables map to OPENMAP tokens (UX-DR5), and the border, forbidden-pair, disabled, progress, scrim and status rules apply (UX-DR6–UX-DR11)
**And** the accent colour is used only in chrome, never in anything drawn on the Map (UX-DR12, UX-DR102)

**Given** the typography rules
**When** a page renders
**Then** Libre Baskerville (400, 600) and Source Sans 3 are self-hosted (no third-party font request, AD-16), the UI type scale, tabular figures and small-caps rules apply (UX-DR16–UX-DR20), and spacing, radius, elevation, icon (lucide) and 24 px minimum hit-area tokens exist (UX-DR22–UX-DR27)

**Given** a first launch
**When** the OS is in dark mode
**Then** OPENMAP opens in dark theme; the user can choose System · Light · Dark and the choice persists (UX-DR28); the choice is stored in the Dexie preferences table, not localStorage (AD-8)

**Given** the UI in French
**When** the user switches the language to English
**Then** every visible string changes immediately without reload, all strings come from `fr`/`en` i18next resources, and French typography rules (non-breaking spaces before « : ; ? ! », « » quotes) are respected (UX-DR150, UX-DR151, AD-20)
**And** an automated check fails if a key exists in one language and not the other

**Given** all chrome text and controls
**When** contrast is measured
**Then** WCAG 2.2 AA ratios hold in both themes (UX-DR153) and a visible focus ring appears on keyboard focus (UX-DR27)

### Story 1.3: Core Project model, Commands and undo engine

As the builder of OPENMAP,
I want the Project document and its Command system built and tested before any screen,
So that every later feature changes Projects the same safe, undoable way.

**Acceptance Criteria:**

**Given** the core model
**When** a blank Project is created
**Then** it is a document with a nanoid `id`, `schemaVersion` 1, a generated `project.seed`, `revision` 0, `referenceDate` defaulting to year 1900, the parchment Basemap, `outputFormat` 16:9, `mapLocale` equal to the current UI language, one initial Step (Step 0, hidden from the UI until the Timeline arrives in Epic 3), one default Layer per element kind (Territories, Arrows, Tokens, Texts, Images) in `project.layers` (AD-24) and empty Factions/members (AD-2, AD-4, AD-9, AD-12, AD-25)
**And** the Zod schema of v1 is committed as a JSON Schema snapshot in `schemas/`, and CI fails if the schema changes without a new version and migration (AD-9)

**Given** `src/core/commands`
**When** a Command `{type, payload}` is applied
**Then** `apply(project, command)` is pure, returns the new immutable document (Immer) and its inverse, and never performs I/O (AD-3)
**And** `project.revision` increases on every applied Command, undo and redo included, and never goes backwards (AD-3)

**Given** the undo engine
**When** Commands are applied, undone and redone over many levels
**Then** unit tests prove that apply → undo restores a deep-equal document (except `revision`), redo reapplies, a new Command clears the redo stack, and a compound Command is a single undo entry (AD-3, FR-55)
**And** the undo stack lives only in memory and exposes a `clear()` used later on lock loss (AD-3, AD-15)

**Given** a dispatcher
**When** a Command is dispatched without edit permission (read-only flag)
**Then** it is rejected with a `DomainError` and the document is unchanged (AD-3)

**Given** the first Commands
**When** this story is done
**Then** Project-level Commands exist for rename, Output Format, Map language, Basemap and reference date, each with an inverse and a unit test; later stories add their own Commands the same way

### Story 1.4: Home: create and manage my Projects locally

As a creator,
I want to create a blank Project and find all my Projects when I reopen OPENMAP,
So that my work is never lost and I need no account.

**Acceptance Criteria:**

**Given** the Home screen with no Project
**When** it opens
**Then** the empty state invites "Nouveau Projet" (UX-DR120); for now "Nouveau Projet" creates a blank Project directly (the wizard arrives in Epic 6) and opens the Editor (FR-1 blank, no sign-up)

**Given** existing Projects
**When** Home opens
**Then** Project cards are listed from most to least recently modified, with skeletons while local storage loads (UX-DR118, UX-DR119, UX-DR136); click or Enter opens a Project

**Given** a Project card menu (button, right-click or Shift+F10)
**When** the user renames, duplicates or deletes
**Then** rename happens in place; duplicate creates a copy with new id and the same `project.seed` (AD-2); delete shows the toast "Projet supprimé · Annuler" and the Project becomes a tombstone that is permanently removed only when the toast expires (AD-8, FR-52)

**Given** any change to a Project
**When** 1 s passes without another change
**Then** the Project is saved to the single Dexie database, and never later than 5 s after the change (NFR-5, FR-53)
**And** closing the tab or crashing then reopening restores the last saved state without any recovery dialog (FR-53); a flush runs on `pagehide` (AD-8)

**Given** the first Project creation
**When** it is saved
**Then** `navigator.storage.persist()` is requested once (AD-8)

**Given** Projects in IndexedDB
**When** one is loaded
**Then** `migrate` then validation run on this load path too; a document newer than the app opens read-only (AD-9)
**And** a Dexie `versionchange` event makes open tabs flush and reload (AD-9)

**Given** media no longer referenced by any Project or Personal Kit
**When** a Project is permanently deleted
**Then** those media blobs are garbage-collected (AD-8)

### Story 1.5: Editor shell with undo/redo

As a creator,
I want a clear editor with my Project settings and reliable undo,
So that I can work confidently and reverse any mistake.

**Acceptance Criteria:**

**Given** an opened Project
**When** the Editor renders at 1366×768
**Then** it shows the top bar (breadcrumb "Projets / {nom}", save status, Output Format menu, undo/redo, search slot, Presentation and Export slots disabled, menu), the labelled tool rail with the Select tool, the Map area and the properties panel, with no essential panel hidden and no horizontal scroll (UX-DR30, UX-DR31, UX-DR33, UX-DR127, UX-DR159, NFR-8); the Timeline area is present but collapsed and empty until Epic 3
**And** while the Project loads, the opening state shows skeletons and "Ouverture…" (UX-DR128)

**Given** nothing is selected
**When** the properties panel shows Project settings
**Then** the user can edit the Project name, Output Format (16:9 · 9:16 · 1:1 segmented control) and Map language (FR/EN), with advanced settings behind "plus d'options" (UX-DR35, UX-DR53, UX-DR34, NFR-9)

**Given** the Command system of Story 1.3
**When** the user changes any Project setting
**Then** the change is dispatched as a Command and autosaved (AD-3)
**And** Ctrl+Z / Ctrl+Shift+Z (and Ctrl+Y) and the top-bar buttons undo and redo over multiple levels, the history is not persisted across reloads, and a continuous gesture (e.g. typing the name) produces a single undo entry on commit (UX-DR114, FR-55, AD-3)

**Given** the save status observable
**When** a save is pending, done or failed
**Then** the top bar shows "Enregistrement…", "Enregistré" or an error state; no toast appears on routine autosave, and Ctrl+S flushes and shows "Projet sauvegardé" (UX-DR137, UX-DR115, AD-8)

**Given** the scene area
**When** the Editor renders
**Then** a 36 px tool options bar sits above the Map (never over it), showing the current Step reminder on the left, the active tool's options, contextual links, and the read-only Output Format label on the right (UX-DR32, UX-DR105)

### Story 1.6: Settings dialog and browser gate

As a creator,
I want app-wide settings and a clear message when my device or browser can't run OPENMAP,
So that I can set OPENMAP up my way and never hit a broken screen.

**Acceptance Criteria:**

**Given** the settings menu
**When** the user opens Settings
**Then** a tabbed dialog offers Appearance, Language and Storage (space used, persistence status, reminder to export Project Files) (UX-DR134, UX-DR67)

**Given** a phone or tablet (coarse pointer and narrow viewport) or a browser without WebGL2, IndexedDB or Web Locks
**When** OPENMAP opens
**Then** the "conçu pour ordinateur" page or an unsupported-browser message is shown instead of the app (UX-DR135, UX-DR148, AD-19, NFR-4)

**Given** Settings and the unsupported-browser gate
**When** they render
**Then** they reuse the dialog and banner components (UX-DR66, UX-DR67)

### Story 1.7: Keyboard and accessibility foundation

As a creator,
I want to drive the editor from the keyboard and use it with assistive technologies,
So that I work fast and nobody is left out.

**Acceptance Criteria:**

**Given** a central shortcut registry in `src/ui`
**When** shortcuts are defined
**Then** single-letter tool keys follow the typed character (AZERTY and QWERTY), context priority is "most specific wins", and inside a focused text field all single-letter keys, Space and arrows go to the field (UX-DR110, UX-DR111)
**And** `?` opens a shortcuts help overlay listing every active shortcut in the UI language

**Given** the Escape key
**When** pressed repeatedly
**Then** it does one thing per press in this order: close menu or popover → close dialog (never during an export render) → cancel the drawing or pending selection → close the drawer → clear the selection → return to the Select tool; in Presentation mode it returns to the Editor (UX-DR112)

**Given** Alt+1..Alt+6 (digit row, no Shift)
**When** pressed
**Then** focus jumps to top bar, tool rail, options bar, Map, properties panel and Timeline respectively, each a named ARIA region; F6 is not used; collisions with Chrome/Edge on Windows are checked and documented (UX-DR113)

**Given** every chrome control
**When** navigated with the keyboard
**Then** tab order follows visual order, focus is always visible, every action has a pointer alternative (no hover-only access), tooltips show name and shortcut (UX-DR154, UX-DR155, UX-DR64, UX-DR116)
**And** screen-reader semantics follow UX-DR156 (named regions, `aria-pressed` tools, live region for announcements), no information is conveyed by colour alone (UX-DR158), and `prefers-reduced-motion` disables non-essential chrome animation without affecting the Map or export (UX-DR157)

**Given** this story
**When** it is done
**Then** a Definition of Done rule applies to every later story that adds a tool, panel or dialog: it registers its shortcuts in the registry, is fully keyboard-operable, announces its state changes to screen readers, and passes an automated accessibility check (axe) in the Playwright suite

### Story 1.8: Basemap data pipeline (Natural Earth)

As the builder of OPENMAP,
I want a repeatable script that turns Natural Earth into versioned Basemap files with their licences,
So that the app can show stylized maps without any third-party service.

**Acceptance Criteria:**

**Given** Natural Earth (public domain) source files
**When** `pipeline/` builds the stylized Basemap data
**Then** it produces a versioned tileset `natural-earth-v1.pmtiles` (coastlines, land, rivers, lakes, relief shading, populated places for labels) with no modern roads, and four MapLibre styles (parchment, dark, light, relief) using the DESIGN.md `map-*` tokens, plus self-generated glyphs from the OFL fonts (AD-17, AD-18, UX-DR3, UX-DR4)

**Given** every produced dataset
**When** it is written
**Then** it carries `{source, licence, attribution, creditRequired}` metadata (AD-17)
**And** no NC, ODbL or share-alike source is used; the run fails if a source's declared licence is not in the allowlist

**Given** development mode
**When** the app starts with `npm run dev`
**Then** tiles and Library data are served locally from the pipeline output (e.g. through `pmtiles serve` or the Vite dev server) at the same versioned paths as the future data origin, so no code changes when Epic 7 moves them to the VPS (AD-18)
**And** the pipeline is re-runnable and documented in plain French (commands, disk size produced)

### Story 1.9: Historical borders pipeline (Cliopatria)

As the builder of OPENMAP,
I want a repeatable script that turns Cliopatria into versioned historical GeoEntities,
So that the Map can show the countries and empires of any date.

**Acceptance Criteria:**

**Given** Cliopatria (CC BY 4.0)
**When** the pipeline builds GeoEntities
**Then** it outputs `/library/v1/geo/...` files of whole polygons with the dataset's stable entity ids, validity ranges and a simplification level fixed for this version (AD-12), in a format chosen and documented by this story (Deferred item of the spine)

**Given** every produced dataset
**When** it is written
**Then** it carries `{source, licence, attribution, creditRequired}` metadata (AD-17)
**And** no NC, ODbL or share-alike source is used; the run fails if a source's declared licence is not in the allowlist

**Given** development mode
**When** the app starts
**Then** the GeoEntity files are served locally at `/library/v1/geo/…`, the same path as the future data origin (AD-18)
**And** the pipeline documents in plain French the dataset version, simplification level and disk size produced

### Story 1.10: Display the stylized Basemap and the output frame

As a creator,
I want to see and explore a beautiful historical-style map and switch its style,
So that I can start composing my story on it.

**Acceptance Criteria:**

**Given** a Project
**When** the Editor opens
**Then** `evaluate(project, t, ctx)` returns a Scene containing the Basemap state and camera, and `src/render` draws the Basemap with MapLibre GL JS (≥ 6.9.1, `fadeDuration: 0`) plus a `@deck.gl/maplibre` `MapLibreOverlay` ready for Project layers (AD-1, AD-6)
**And** a spike documented in the story's dev notes compares interleaved and overlaid modes with a test layer under Basemap labels and records the chosen mode (ARCH-10)

**Given** the Map
**When** the user drags, scrolls or uses the keyboard
**Then** the edit camera pans and zooms freely; this camera is UI state and never enters the Project (AD-1, UX-DR109)

**Given** Project settings → Basemap
**When** the user picks parchment, dark, light or relief in the basemap-picker
**Then** the Basemap changes at once through an undoable Command, no Project element is changed, and the Map looks identical whatever the UI theme (FR-5 stylized, UX-DR58, UX-DR101)
**And** brightness, saturation and tint sliders with "Rétablir les réglages du Fond" are present with the DESIGN.md ranges (FR-5)

**Given** the Output Format 16:9, 9:16 or 1:1
**When** the Map is shown
**Then** the output frame (1920×1080, 1080×1920 or 1080×1080 at reference scale) is visible by dimming the area outside it, with no decorative border, and no chrome covers the frame (AD-23, UX-DR103, UX-DR105)

**Given** tiles still loading
**When** the Map renders
**Then** the plain land colour of the active Basemap shows until tiles arrive, and editing is never blocked (UX-DR106)

**Given** the Scene
**When** it is rendered
**Then** every drawn item carries a `z` in the fixed bands of AD-24 (Basemap, personal map background, Project Layers in document order, place labels, screen overlays, credit), so later element types slot in without changing the renderer (AD-24)

**Given** Map text and symbol sizes
**When** anything is drawn on the Map
**Then** sizes use the map typography tokens in export pixels for a 1080 px short side and scale on screen by (frame short side / 1080), while chrome never scales; e.g. a 562×316 frame shows a 56 px label at about 16 px (UX-DR21, AD-23)

### Story 1.11: Reference date and historical GeoEntities

As a creator,
I want to set the date of my map and see the countries and empires of that time,
So that my map is historically grounded.

**Acceptance Criteria:**

**Given** `src/core/dates`
**When** a HistoricalDate is created
**Then** it uses astronomical years (1 BCE = 0, 52 BCE = -51), optional month and day, with compare and locale formatting ("52 av. J.-C." / "52 BC") based on `project.mapLocale`; unit tests cover BCE, year 0 and year-only precision (AD-13, AD-25)

**Given** Project settings
**When** the user enters a reference date (year precision, BCE allowed)
**Then** the Map shows the GeoEntities valid at that date as neutral Territories, using the Project's pinned dataset version (FR-6, AD-12)
**And** invalid input shows an inline error and keeps the previous date (UX-DR147)

**Given** no exact data state at that date
**When** the Map loads
**Then** the nearest valid state is used and the nearest-data chip shows the real date of the data (FR-6, UX-DR59)

**Given** the reference date is changed
**When** the change is confirmed
**Then** it is one undoable Command, and reference date and step date labels are always distinct in the UI (UX-DR88)

**Given** GeoEntity data used by the Project
**When** it is fetched the first time
**Then** `src/library` stores it in the Dexie Library cache and later reads come from there (AD-27)

### Story 1.12: Search for a place

As a creator,
I want to type a place name and jump to it,
So that I find my Region in seconds.

**Acceptance Criteria:**

**Given** the search field in the top bar (shortcut `/`)
**When** the user types at least 2 characters of a country, city or GeoEntity name
**Then** matching results from Library data (Natural Earth populated places and countries, and GeoEntities valid at the reference date) are listed, keyboard-navigable (UX-DR62, FR-8)
**And** matching is accent- and case-insensitive and covers both the English and the French names shipped by Natural Earth (e.g. "Londres" and "London", "Allemagne" and "Germany"); the search index is built by the pipeline from Library data only
**And** historical city names (e.g. "Constantinople", "Stalingrad") are not expected to match in P0; they arrive with the alias list of Epic 10
**And** no geocoding API or third-party service is called (AD-16)

**Given** a result
**When** the user picks it
**Then** the edit camera centres on it and a GeoEntity result is selected (UX-DR62)

**Given** no match
**When** the list is empty
**Then** a short helpful empty message is shown in the UI language (UX-DR146)

### Story 1.13: Sources, licences and map credit

As a creator,
I want to see where the map data comes from and have the right credit on my map,
So that I respect licences without having to research them.

**Acceptance Criteria:**

**Given** the Project uses a Basemap and datasets
**When** the user opens "Sources" (Project settings)
**Then** each source is listed with its licence and attribution, built from the metadata of AD-17 (FR-10)

**Given** a drawn source with `creditRequired`
**When** the Scene is evaluated
**Then** the evaluator emits the credit line built from every source actually drawn, rendered by deck.gl in the credit band at the chosen corner (default bottom-left) and prominence (Discreet / Legible) stored in `project.credit` (AD-17, AD-24, UX-DR108)
**And** a required credit cannot be hidden; an optional credit can (FR-10)

**Given** a French UI and an English `mapLocale`
**When** the credit is displayed
**Then** its text follows the source's required wording, independent of the UI language (AD-20)

**Given** Map text sizes
**When** this element is drawn
**Then** it uses the map typography tokens of UX-DR21 scaled per AD-23 (UX-DR21)

### Story 1.14: One editing tab per Project

As a creator,
I want OPENMAP to protect my Project when I open it in two tabs,
So that one tab never overwrites the other's work.

**Acceptance Criteria:**

**Given** a Project opened in tab A
**When** the same Project opens in tab B
**Then** tab A holds the Web Locks lock `openmap:project:<id>` and tab B opens read-only with the banner "Ce Projet est ouvert dans un autre onglet. Vous le consultez en lecture seule." and "Reprendre ici"; editing tools and panel fields are disabled, viewing stays possible (AD-15, UX-DR139)
**And** any Command dispatched in tab B is rejected by the dispatcher, not only hidden (AD-3)

**Given** tab B read-only
**When** the user clicks "Reprendre ici"
**Then** tab A flushes its save, clears its undo stack and becomes read-only with "Ce Projet est maintenant modifié dans un autre onglet."; tab B reloads the document from IndexedDB, starts with an empty undo stack and becomes the editor (AD-15)

**Given** the lock holder saves
**When** a save completes
**Then** read-only tabs refresh to the saved revision (AD-15)

**Given** the holder tab closes or crashes
**When** the read-only tab detects it
**Then** the banner says so and keeps "Reprendre ici" without taking over automatically (AD-15)

**Given** every save
**When** it is written
**Then** it carries the tab's `lockEpoch` and is refused if a newer epoch has written (AD-8)

**Given** Home in another tab
**When** a Project is locked elsewhere
**Then** its card shows "Ouvert dans un autre onglet" and delete, rename and duplicate are refused (AD-15)

### Story 1.15: Warn when local storage is at risk

As a creator,
I want to be warned if my browser might delete my Projects,
So that I can protect my work in time.

**Acceptance Criteria:**

**Given** persistent storage was refused or the quota is near its limit
**When** Home or the Editor opens
**Then** a `banner-warning` explains the risk in plain language ("Stockage presque plein. Exportez un Fichier projet pour ne rien perdre."), can be dismissed for the session, and reappears in every new session while the condition lasts (UX-DR138, FR-53)
**And** until Epic 7 delivers Project File export, the banner's action links to Settings → Storage

**Given** Settings → Storage
**When** it opens
**Then** it shows space used, persistence status and the reminder to export Project Files (UX-DR134)

**Given** a save fails (quota exceeded)
**When** the error occurs
**Then** the save status shows the error, an error toast stays until closed, and no data already saved is lost (UX-DR137, UX-DR152)

**Given** the browser goes offline
**When** OPENMAP is open
**Then** a global banner says "Hors ligne. Vos modifications sont enregistrées sur cet appareil ; les fonds de carte et la Bibliothèque non encore chargés ne s'afficheront pas." and editing continues (UX-DR141)

**Given** a Project whose referenced Library data is unavailable
**When** it opens
**Then** a "données référencées indisponibles" banner is shown and the document is left untouched (AD-27)

---

## Epic 2: Color the map with Factions

The creator adds Factions from the Library Kits, edits their style, creates SubFactions, assigns GeoEntities, draws zones, conquers with the brush, paints freely, sets Relations and sees FrontLines appear by themselves, with fill patterns and a minimal Legend. Until Epic 3, every edit applies to the Project's single Step (Step 0), using the sparse track model of AD-4 so nothing changes when Steps arrive.

### Story 2.1: Add Factions from the Library of Kits

As a creator,
I want to add Factions by picking official Kits from a Library,
So that my map gets correct colours and emblems without design work.

**Acceptance Criteria:**

**Given** the pipeline
**When** Library data v1 is built
**Then** it includes a starter set of official FactionKits (at least 6, covering several Eras) whose Emblems have a verified licence recorded in their metadata; no Emblem without a verified licence is published (PRD §5, AD-17)

**Given** the Editor
**When** the user opens the Library drawer (rail button or `B`) on the Kits tab
**Then** the drawer opens beside the rail at full height without reframing the Map, lists Kits with search and filters by Era and world region, and closes with Escape, the rail button or the cross (UX-DR60, FR-15)

**Given** a Kit in the drawer
**When** the user chooses "Ajouter comme nouvelle Faction"
**Then** a Faction is added with a deep copy of the Kit in the Project, its Emblem bytes are copied into the media store with their licence record, and only provenance `{kind, id, version}` is kept (AD-11, AD-29, FR-13)
**And** a later Library update never changes this Project (FR-13); Library Kits are never editable by the user (FR-15)

**Given** "Ajouter une Faction" without a Library Kit
**When** the user confirms
**Then** a default Kit is created with a colour distinct from the other Factions of the Project (FR-2 rule reused, UX-DR15)

**Given** Project settings → Factions & Relations
**When** Factions exist
**Then** they are listed with colour swatch and name, and can be renamed, reordered and deleted through undoable Commands (AD-3)

**Given** a Faction selected in the Editor
**When** the user clicks a Kit in the drawer
**Then** "Appliquer à {Faction}" replaces that Faction's Kit copy in one undoable Command (FR-13, FR-15)

**Given** Library Emblems and Kits
**When** shown in the drawer or used in the Project
**Then** their source and licence are visible and appear in the Sources list (FR-10)

**Given** the Library cannot be loaded (offline or data origin unreachable)
**When** the drawer opens
**Then** an error state explains it with "Réessayer"; already cached Kits stay usable (AD-27, UX-DR141)

### Story 2.2: Edit a FactionKit

As a creator,
I want to change a Faction's colours, emblem and styles in one place,
So that every element of that Faction updates everywhere at once.

**Acceptance Criteria:**

**Given** a selected Faction
**When** the FactionKit editor opens in the properties panel
**Then** it shows name, Era, colours (fill, border, selection), Emblem and its reduced variant, font, border style (width, jitter intensity), Arrow style (width, head shape), UnitToken shape and Organic Signature level, with essentials first and the rest behind "plus d'options" (FR-12, UX-DR51, UX-DR54, NFR-9)

**Given** a Kit field change
**When** it is committed
**Then** it applies immediately to every element of that Faction on every Step, as one undoable Command (FR-12, AD-3)
**And** a continuous colour drag previews live and commits a single Command on release (AD-3)

**Given** a Kit fill or stroke colour
**When** its CIEDE2000 distance to the UI `accent` or `accent-dark` is below 10
**Then** a non-blocking warning shows under the colour field (never a toast), recomputed on every change (UX-DR15)

**Given** an imported Emblem image (PNG, JPG, SVG)
**When** it is added to the Kit
**Then** SVGs are sanitized before storage and every image is stored by SHA-256 in the media store (AD-29)

### Story 2.3: SubFactions that inherit their parent's style

As a creator,
I want to create a SubFaction that follows its parent's style but overrides some fields,
So that vassals or armies stay visually related to their parent.

**Acceptance Criteria:**

**Given** a Faction
**When** the user creates a SubFaction
**Then** its Kit stores the parent's `kitId` and an empty sparse `overrides` object; effective fields are resolved in `src/core` at evaluation (AD-11, FR-14)

**Given** a non-overridden field
**When** the parent Kit changes
**Then** the SubFaction follows; an overridden field keeps its value (FR-14)

**Given** the SubFaction's Kit editor
**When** it is displayed
**Then** each field shows whether it is inherited or overridden and offers "revenir à la valeur héritée" (UX-DR49, UX-DR50, FR-14)

**Given** a SubFaction and its parent
**When** no Relation override exists
**Then** they are allied by default (FR-14, FR-22)

### Story 2.4: Territories from GeoEntities: assign, compute and draw

As a creator,
I want to click countries or empires and give them to a Faction,
So that I can build who controls what.

**Acceptance Criteria:**

**Given** the members model of AD-22
**When** a GeoEntity is assigned
**Then** `project.map.members` gets an entry keyed `dataset@version:entityId` with an `owner` property `{default, track}` set at the current Step (AD-4, AD-12, AD-22); neutral means `null`

**Given** the Select tool (`V`)
**When** the user clicks a GeoEntity (Shift+click or rectangle for several)
**Then** the panel "Entité géographique" (or "5 Entités") opens on the faction-picker; clicking a Faction swatch assigns all selected GeoEntities, "Neutre" removes them from any Territory (UX-DR36, UX-DR55, UX-DR89, UX-DR99)
**And** a toast "5 Entités assignées à OTAN · Annuler" appears and one Ctrl+Z undoes the whole assignment (UX-DR115, AD-3)

**Given** assigned GeoEntities
**When** the Map is evaluated
**Then** `derive.coverage()` produces the partition and deck.gl draws each Territory filled and outlined with its Faction's resolved Kit; neutral Territories use the neutral style (AD-5, AD-6, AD-22)
**And** selection highlights use ink + halo, never the UI accent (UX-DR100, UX-DR102)

**Given** a project with 200 Territories
**When** the user pans and zooms on the reference machine (see Overview)
**Then** the Map stays at 30 fps or more; the measurement is recorded in the story's dev notes (NFR-2)

**Given** a Project without Factions
**When** the user opens the Territory or Conquest tool or the faction-picker
**Then** the empty state "Ajoutez une Faction pour colorer des Territoires." offers "Ajouter une Faction", which opens the Library on the Kits tab (UX-DR146)

### Story 2.5: More ways to assign, and the Territory panel

As a creator,
I want to assign from a context menu or by chaining clicks, and to inspect a Territory,
So that colouring a large map stays fast.

**Acceptance Criteria:**

**Given** one or more selected GeoEntities
**When** the user uses the context menu (right-click, Menu key or Shift+F10) or the Territory tool (`T`) in Entities mode
**Then** the same assignment is available from the context menu "Assigner à" and from the Territory tool (`T`) in Entities mode for chained clicks (UX-DR70, UX-DR90, UX-DR99)

**Given** a double-click on a Territory surface
**When** it is selected
**Then** the panel "Territoire" shows its Faction and style fields, addressed as `(factionId, stepId)` (UX-DR37, AD-22)

### Story 2.6: Draw a zone

As a creator,
I want to draw a zone freehand or point by point,
So that I can show areas that don't follow country borders (landings, occupied zones).

**Acceptance Criteria:**

**Given** the Territory tool (`T`) in Zone mode
**When** the user clicks points, or drags for freehand, then double-clicks or presses Enter
**Then** a DrawnZone is created with `[lon, lat]` coordinates and an owner Faction; Backspace removes the last point and Escape cancels the drawing (FR-19, UX-DR90, UX-DR117, AD-14)

**Given** a selected DrawnZone
**When** the user drags its handles
**Then** its points change at the current Step through one Command per drag (FR-19, AD-3, AD-4)
**And** the panel "Zone dessinée" shows Faction, style and order (UX-DR38)

**Given** a DrawnZone over a GeoEntity or another DrawnZone
**When** coverage is derived
**Then** the DrawnZone wins over the GeoEntity, and between DrawnZones the higher stored `z` wins; "Mettre au premier plan / à l'arrière-plan" changes `z` (AD-22, PRD §4.0)

**Given** a Project with Territories built on GeoEntities
**When** the user changes the reference date
**Then** a confirmation explains the consequence, and GeoEntities that no longer exist at the new date are converted into DrawnZones with the same owner in the same undoable Command (FR-6)

### Story 2.7: Conquest brush and free paint

As a creator,
I want to pick an attacking Faction and paint what it conquers,
So that building a conquest is as fast as colouring.

**Acceptance Criteria:**

**Given** the Conquest tool (`C`)
**When** the user selects the attacking Faction in the options bar and paints over GeoEntities
**Then** touched GeoEntities are pre-selected and the count is shown before validation ("12 Entités"); validating assigns them to the attacker at the current Step in one Command (FR-20, UX-DR91)
**And** `[` / `]` change the brush size; Escape cancels the pending selection (UX-DR110, UX-DR112)

**Given** free paint mode inside the Conquest tool
**When** the user paints a surface independent of GeoEntities
**Then** it is added to the attacker's Territory as a DrawnZone (FR-21, AD-22)

**Given** a Region with no subdivisions available
**When** conquest starts
**Then** the tool suggests free paint (FR-7 message, P0 wording) (UX-DR91)

### Story 2.8: Relations and automatic FrontLines

As a creator,
I want FrontLines to appear by themselves between Factions at war,
So that I never trace a front by hand.

**Acceptance Criteria:**

**Given** Factions with no Relation override
**When** Relations are computed
**Then** two non-neutral Factions with no parent link are "en conflit", a SubFaction and its parent are "alliées", a neutral Territory is never in conflict (FR-22, AD-11)

**Given** Project settings → Factions & Relations
**When** the user sets a pair to conflict, allied or no link
**Then** an override keyed by the sorted Faction pair is stored through a Command (FR-22, UX-DR57, AD-11)

**Given** Territories of two Factions in conflict that touch
**When** coverage changes
**Then** the FrontLine is derived from the coverage partition (never stored) and drawn with its style; it is recomputed after every change, with no manual tracing (FR-23, AD-5, AD-22)

**Given** a FrontLine
**When** the user selects it
**Then** the panel "Ligne de front" offers style settings and hiding it for this pair; Project settings offer hiding all FrontLines (FR-23, UX-DR39)

### Story 2.9: Fill patterns and neutral style

As a creator,
I want to fill Territories solid, semi-transparent or hatched,
So that I can express status such as withdrawal, occupation or alliance tiers.

**Acceptance Criteria:**

**Given** a Territory or a Faction
**When** the user picks a fill pattern
**Then** solid, semi-transparent and hatched fills are available, stored in the Kit with optional per-member overrides (FR-25, AD-22)
**And** the flag fill option is visible but marked as coming later (P1, FR-17)

**Given** a neutral Territory
**When** it is drawn
**Then** it uses a default style distinct from every Faction (FR-25, UX-DR107)

**Given** any pattern
**When** it is rendered on each stylized Basemap
**Then** patterns and outlines stay legible and the Map is identical in light and dark UI themes (UX-DR101, UX-DR107)

### Story 2.10: Minimal Legend

As a creator,
I want a small Legend listing my Factions and their colours to appear automatically,
So that my map is readable as soon as it is coloured.

**Acceptance Criteria:**

**Given** at least one Faction present on the Map
**When** the Scene is evaluated
**Then** a Legend is emitted in the screen-overlay band listing the Factions present with their colour, in their Kit order, anchored to a frame corner in reference pixels (FR-35 P0 part, AD-14, AD-24)
**And** adding a Faction adds its entry without manual action; removing it removes the entry (FR-35)

**Given** the Legend in P0
**When** the user interacts with it
**Then** it cannot be edited (entries, position editing come in Epic 10); it can be shown or hidden in Project settings

**Given** a change of Output Format
**When** the frame changes
**Then** the Legend stays anchored to the same corner (FR-50, AD-14)

**Given** Map text sizes
**When** this element is drawn
**Then** it uses the map typography tokens of UX-DR21 scaled per AD-23 (UX-DR21)

---

## Epic 3: Animate history over time

The creator builds Steps, watches conquests animate with the Organic Signature, plays and scrubs the Timeline, chooses camera moves, shows the step date on screen and switches to Presentation mode. This epic makes Step 0 visible and turns the single-Step Project of Epics 1–2 into a Timeline without migrating data (AD-4).

**Rule introduced by this epic:** every time-dependent value is computed by `evaluate(project, t, ctx)` using `locate(project, t)` (AD-1, AD-21); stories never add their own timers or tweens.

### Story 3.1: Timeline and Step management

As a creator,
I want to add, duplicate, reorder and delete Steps on a Timeline,
So that I can tell my story state by state.

**Acceptance Criteria:**

**Given** the Editor
**When** the Timeline is shown
**Then** it sits at the bottom with a default height of 200 px, can be collapsed and expanded, and shows its header, ruler, playhead and one thumbnail per Step labelled with its step date (UX-DR71–UX-DR74, UX-DR76, UX-DR161, UX-DR159)
**And** the Project's existing Step 0 appears as the first Step with the data coloured in Epic 2 intact (AD-4)

**Given** "+ Étape" or Ctrl+D on a selected Step
**When** a Step is added or duplicated
**Then** the new Step starts from the previous Step's state (it has no own values), gets a step date after the previous one, a default transition and hold duration, and is inserted right after (FR-40, FR-0, AD-4, UX-DR81)

**Given** Steps
**When** the user reorders them by drag or keyboard, or deletes one
**Then** reorder and delete are single undoable Commands; deleting shows "Étape 1463 supprimée · Annuler" with no dialog; later Steps then inherit from the previous Step; existence ranges are repaired by `repairRanges` (FR-40, AD-4, UX-DR82, EXPERIENCE "Supprimer une Étape")

**Given** a selected Step thumbnail
**When** the Step panel shows
**Then** it edits the step date (HistoricalDate, BCE allowed), the transition duration and the hold duration, stored as integer milliseconds (UX-DR48, AD-13, AD-21)
**And** the reference date and the step date are labelled distinctly (UX-DR88)

**Given** transitions between Steps
**When** the Timeline renders
**Then** transition blocks are hatched and sized to their duration on the ruler (UX-DR78)

**Given** a Project with a single Step
**When** the Timeline shows
**Then** an empty state invites to add a Step with "+ Étape" (UX-DR146)

### Story 3.2: Per-Step editing, scope and element existence

As a creator,
I want a change made at a Step to carry forward until I change it again,
So that I only edit what actually changes.

**Acceptance Criteria:**

**Given** a current Step N
**When** the user changes any Step-varying property (owner of a GeoEntity, DrawnZone points, later: Token position, Counter value)
**Then** only `track[N]` is written; Steps after N without their own value inherit it; Steps before N are unchanged (FR-0, AD-4, UX-DR85)
**And** a per-Step own-value marker shows on the thumbnails where the selected element has its own value (UX-DR77)

**Given** a change just made while the element stays selected
**When** the user clicks the link "Appliquer à toutes les Étapes" shown under the modified field (or in the options bar for on-Map edits)
**Then** the value becomes the element's default and its track is cleared, in one Command undone by one Ctrl+Z; the toast says "Appliqué aux 5 Étapes · Annuler" (FR-0, AD-4, UX-DR85)

**Given** the playhead inside a transition
**When** the user edits
**Then** the edit applies to the Step being arrived at, as specified in UX-DR84 (current Step = `locate(t).stepId`, AD-21, UX-DR83)

**Given** an element
**When** the user limits it to a range of Steps
**Then** its existence `{fromStep, untilStep?}` is set by Step id; by default an element persists to the end (FR-45, UX-DR86)
**And** deleting or reordering Steps keeps ranges valid as defined by `repairRanges` (AD-4)

### Story 3.3: Playback and scrubbing

As a creator,
I want to play my Timeline and jump to any instant,
So that I can see my animation exactly as it will be exported.

**Acceptance Criteria:**

**Given** `locate(project, t)` in `src/core/timeline`
**When** unit tests run
**Then** they confirm the time model: Step k spans `[start_k, start_k + transition_k + hold_k)`, Step 0 starts at 0, a Step owns its incoming transition, `u` goes from 0 to 1 over the transition, and a Step-range covers `[start_a, end_b)` (AD-21)

**Given** the Timeline
**When** the user presses Space or the play button
**Then** playback runs from the playhead at the chosen speed (0.5×, 1×, 2×) and pauses on Space; the frame shown at any time is `evaluate(project, t, ctx)` (FR-41, AD-1)

**Given** the playhead
**When** the user drags it or clicks the ruler
**Then** the Map shows exactly the Scene at that `t`, the same one export will produce (FR-41, NFR-1)
**And** the playhead is a slider with `aria-valuetext` like "00:08,4, Étape 1463, Conquête de la Bosnie" (UX-DR156)

**Given** no Map animation is ever driven by MapLibre or CSS
**When** the lint and a unit test scan the code
**Then** no forbidden animation API is used (AD-1)

### Story 3.4: Fade and sweep transitions and zone morphing

As a creator,
I want changes of control to fade or sweep in and drawn zones to morph,
So that changes read like a story.

**Acceptance Criteria:**

**Given** a Step where GeoEntities or DrawnZones change owner
**When** its transition plays
**Then** the transition chosen in the Step panel applies: fade or sweep, and propagation once Story 3.5 is done (FR-39)

**Given** a DrawnZone whose points differ between two Steps
**When** the transition plays
**Then** its shape morphs continuously as a function of `u` (FR-19, AD-21)

**Given** the FrontLine
**When** Territories change during a transition
**Then** the FrontLine is derived from the coverage at each evaluated `t`, so it moves with the conquest (AD-5, AD-22)

**Given** the same Project and `t`
**When** it is evaluated twice
**Then** the Scene is deep-equal (AD-2)

### Story 3.5: Propagation from the front

As a creator,
I want conquered land to spread from the front line,
So that a conquest looks like an advance, not a colour swap.

**Acceptance Criteria:**

**Given** propagation
**When** the changed area touches the attacker's previous Territory
**Then** it spreads from the adjacent FrontLine; otherwise from a point the user can place, or from the centre of the area (FR-39)

**Given** a new Step
**When** it is created
**Then** propagation is its default Territory transition (FR-39)

**Given** the same Project and `t`
**When** a propagation frame is evaluated twice
**Then** the Scene is deep-equal (AD-2)

### Story 3.6: Organic Signature

As a creator,
I want animations to have a subtle hand-made feel by default,
So that my map looks personal without any effort.

**Acceptance Criteria:**

**Given** the Organic Signature level "légère" (default)
**When** movements and appearances animate
**Then** they overshoot their final position by 5 to 15 % of their amplitude before settling, and no animation is linear (FR-42) `[HYP: bounds to calibrate]`

**Given** Territory borders
**When** drawn with the signature on
**Then** they deviate from their path by at most 0.3 % of the frame width (≈ 6 px at 1080p), with jitter seeded by `hash(project.seed, element.id, "border-jitter")` (FR-42, AD-2)

**Given** a Territory changing Faction
**When** its transition starts
**Then** it pulses for 250–400 ms before switching (FR-42)

**Given** levels off / légère / marquée
**When** set on the Project and overridden per Kit
**Then** the Kit override wins; for an animation involving two Factions, the incoming owner's Kit applies; at "désactivée" there is no overshoot, jitter or pulse (FR-42, AD-11)

**Given** two plays of the same Project
**When** frames at identical `t` are compared
**Then** they are identical (determinism unit test on the Scene) (FR-42, AD-2)

### Story 3.7: Camera presets and automatic framing

As a creator,
I want to choose how the camera moves at each Step,
So that the camera tells the story as much as the map.

**Acceptance Criteria:**

**Given** a Step
**When** the user chooses a CameraPreset in the Step panel
**Then** top-down, fly-to, orbit, sweep, bounce and automatic framing (default) are available, and the movement lasts the Step's transition duration (FR-46, UX-DR56)

**Given** automatic framing
**When** a Step changes Territories (later also Arrows and Tokens)
**Then** the frame contains the changed elements with a 10 % margin; if nothing changes, the camera keeps the previous frame (FR-46, AD-5)

**Given** any preset
**When** it is stored
**Then** the framing intent is saved as geographic bounds plus bearing and pitch, never `{center, zoom}`, and resolved for `ctx.frame` by the evaluator (AD-23)
**And** changing the Output Format recomputes frames so they contain the same elements (FR-50, AD-23)

**Given** an Output Format change
**When** framings are recomputed
**Then** the toast "Cadrages recalculés pour 9:16 · Annuler" appears and one Ctrl+Z restores the previous format (UX-DR63)

### Story 3.8: Manual framing

As a creator,
I want to set the camera myself for a Step,
So that I control exactly what the viewer sees.

**Acceptance Criteria:**

**Given** a Step
**When** the user chooses "Cadrage manuel" and adjusts position, zoom and rotation on the Map, then confirms
**Then** the framing is stored as bounds + bearing (+ pitch) for that Step and replaces the preset (FR-47, AD-23, UX-DR56)

**Given** a manual framing
**When** the Output Format changes
**Then** the same geographic area stays inside the new frame (AD-23)

### Story 3.9: Simple DateDisplay

As a creator,
I want the date of the current Step shown large on my map,
So that viewers always know when the action happens.

**Acceptance Criteria:**

**Given** Project settings
**When** the user turns the DateDisplay on
**Then** the Scene shows the step date of the current Step in the screen-overlay band, anchored to a chosen frame edge (FR-37 P0 part, AD-14, AD-24)

**Given** formats YYYY-MM-DD, "JJ mois AAAA", year only, or a free label per Step (e.g. "Été 1944")
**When** a format is chosen
**Then** the date is formatted by `src/core/format` with `project.mapLocale`, BCE dates read "52 av. J.-C." or "52 BC", and a free label replaces the date for its Step (FR-37, AD-13, AD-25)
**And** switching the UI language does not change the displayed date (AD-20, AD-25)

**Given** a Step change during playback
**When** the transition plays
**Then** the date switches with the new Step (no day-by-day scrolling in P0; scrolling arrives in Epic 9)

**Given** Map text sizes
**When** this element is drawn
**Then** it uses the map typography tokens of UX-DR21 scaled per AD-23 (UX-DR21)

**Given** an Output Format change
**When** the frame changes
**Then** the DateDisplay stay anchored to the same frame edge (FR-50, AD-14)

### Story 3.10: Presentation mode

As a creator,
I want to watch my map full screen exactly as it will be exported,
So that I can judge the final result before exporting.

**Acceptance Criteria:**

**Given** the Editor
**When** the user presses `P` or "Présentation"
**Then** the Map plays full screen with the Timeline camera, rendering the exact output frame letterboxed in the window (FR-57, AD-23, UX-DR129, UX-DR162)

**Given** Presentation start
**When** resources are loading
**Then** a black screen with "Chargement de la Carte…" waits on `render.ready(scene)` for the first seconds, at most 10 s, then plays (AD-26, UX-DR129)
**And** `render.ready` covers tiles, glyphs, fonts, media and geodata and reports failures per Step; it is the barrier later reused by export and thumbnails (AD-26)

**Given** fullscreen refused by the browser
**When** Presentation starts
**Then** it runs in the window with the toast "Plein écran refusé par le navigateur. La présentation reste dans la fenêtre." (EXPERIENCE)

**Given** Presentation mode
**When** the user presses Escape
**Then** it returns to the Editor at the same playhead position (UX-DR112)

**Given** Step thumbnails
**When** a Step changes
**Then** its thumbnail is re-rendered at the start of its hold through the same pipeline, waiting on `render.ready` (AD-21, AD-26)

**Given** Presentation mode
**When** it plays
**Then** the floating controls bar (play/pause, timecode, progress, "Quitter la présentation") fades 2 s after the last mouse move, returns on move or Tab, never appears in export, and at the end playback stops on the last frame with "Rejouer" (UX-DR129)

---

## Epic 4: Export the video

The creator exports an MP4 identical to what they saw, with progress, cancel and the locked credit, and gets it ready for their editing software. This epic also installs the preview-vs-export golden test that every later story must keep green.

### Story 4.1: Export dialog and capability check

As a creator,
I want a simple export dialog that tells me upfront if my browser can export,
So that I never wait for a render that cannot work.

**Acceptance Criteria:**

**Given** the Editor
**When** the user clicks "Exporter"
**Then** the export dialog (560 px) opens on the Video tab with: range (whole Timeline or a range of Steps), frame rate (30 or 60 fps), the Project's Output Format shown (1920×1080, 1080×1920 or 1080×1080), and the credit settings (UX-DR130, FR-50, AD-23)
**And** the Image tab is visible but marked as coming later (P1, FR-51)

**Given** a required credit
**When** the dialog shows credit settings
**Then** the locked credit control lets the user choose only the corner and prominence (Discrète / Lisible), explains briefly why it is required, and exposes "Crédit obligatoire, verrouillé" to screen readers (UX-DR131, AD-17, FR-10)

**Given** the dialog opens
**When** `VideoEncoder.isConfigSupported` fails for the exact width, height, fps and bitrate (H.264)
**Then** a `banner-warning` reads "Ce navigateur ne peut pas encoder de vidéo. Ouvrez OPENMAP dans Chrome ou Edge.", "Exporter" is disabled and the settings remain viewable (UX-DR142, AD-7, AD-19, NFR-4)

**Given** the export settings
**When** the user changes them
**Then** they are not Project Commands and do not enter the undo history, except `project.credit` corner/prominence, which is a Command (AD-3, AD-17)

### Story 4.2: Frame-by-frame rendering and MP4 encoding

As a creator,
I want OPENMAP to render my Timeline frame by frame into an MP4,
So that I get a clean video for my editing software.

**Acceptance Criteria:**

**Given** "Exporter" is clicked
**When** rendering starts
**Then** a dedicated render instance is created at the exact output frame, frames `i = 0..n` are evaluated at `t = tStart + i / fps`, each frame awaits `render.ready(scene)` before capture, and frames are encoded through Mediabunny `CanvasSource` (codec `avc`) into MP4 (AD-7, AD-21, AD-23, AD-26)
**And** the edit-affordance overlay (selection, handles) never appears in the video (AD-6), and there is no watermark (FR-50)

**Given** rendering in progress
**When** the dialog shows it
**Then** settings are frozen, a progress bar shows percentage, time left and current Step ("Environ 25 s restantes · Étape 7 sur 10"), the Editor is blocked, and only "Annuler" interrupts it (UX-DR132, UX-DR69)
**And** closing the tab triggers the browser's native leave warning (EXPERIENCE)

**Given** "Annuler"
**When** it is clicked during rendering
**Then** rendering stops, nothing is saved, and the dialog returns to its settings (UX-DR144, FR-50)

**Given** the reference machine and a 60 s Timeline at 1080p/30
**When** it is exported
**Then** export completes in 3 minutes or less; the measured time is recorded in the dev notes (NFR-3) `[HYP]`

**Given** a Step range export
**When** it runs
**Then** it covers exactly `[start_a, end_b)` (AD-21)

**Given** an encoding or rendering error
**When** export fails
**Then** the dialog shows an error state in plain language with "Réessayer" and returns to the settings; nothing partial is downloaded (UX-DR132, UX-DR152)

### Story 4.3: Missing tiles and offline during export

As a creator,
I want export to wait for the map to load and tell me clearly if it can't,
So that I never get a video with holes by surprise.

**Acceptance Criteria:**

**Given** a frame whose tiles, fonts or media are still loading
**When** export waits
**Then** progress shows "Chargement des tuiles…" (AD-26, UX-DR143)

**Given** 20 s without any new resource arriving
**When** the timeout elapses
**Then** rendering pauses with the warning "Certaines tuiles de la Carte n'ont pas pu être chargées (Étapes 3 à 5). Si vous continuez, ces zones garderont le fond uni du Fond." and the choices "Continuer" / "Annuler" (AD-7, UX-DR143) `[ASSUMPTION: 20 s]`
**And** "Continuer" fills the missing tiles with the active Basemap's plain land colour; "Annuler" returns to the settings without saving anything

**Given** the browser is offline
**When** export starts
**Then** the same warning appears immediately (UX-DR141, UX-DR143)

### Story 4.4: Export done and download

As a creator,
I want to get my file easily when the render ends,
So that I can drop it straight into my editing software.

**Acceptance Criteria:**

**Given** rendering completes
**When** the dialog shows the done state
**Then** the MP4 is downloaded with a readable file name (Project name + format + date), the dialog shows "Export terminé", "Afficher le téléchargement" and "Télécharger de nouveau", and the finish is announced politely to screen readers with focus on "Télécharger de nouveau" (UX-DR133, UX-DR156)

**Given** the done state
**When** the user clicks "Télécharger de nouveau"
**Then** the same Blob kept in memory is downloaded again without re-rendering, until the dialog closes (AD-7)

**Given** the dialog
**When** export is finished or cancelled
**Then** Escape or the cross closes it; during rendering neither does (UX-DR112)

### Story 4.5: Preview-vs-export golden test

As the builder of OPENMAP,
I want an automated test proving the export matches the preview,
So that no later feature can silently break the core promise.

**Acceptance Criteria:**

**Given** a fixture Project (Factions, Territories, a conquest over 3 Steps, a camera preset, the DateDisplay and a required credit)
**When** the Playwright test runs in Chromium
**Then** it captures the Presentation-mode frame at several `t` values and the frames at the same `t` decoded from the exported MP4, and asserts they match within a documented tolerance for video compression (NFR-1, AD-1, AD-7)

**Given** CI
**When** any later story changes rendering, the evaluator or a new element type
**Then** the golden test runs and must pass; later stories extend the fixture with their element type (Definition of Done for Epics 5 and after)

**Given** the determinism rule
**When** the same Project is exported twice
**Then** the decoded frames are identical within the same tolerance (FR-42, AD-2)

---

## Epic 5: Tell the story with Arrows, UnitTokens, Texts and images

The creator draws offensive Arrows that draw themselves, places and moves UnitTokens, writes animated titles and annotations, and imports their own images. Every story in this epic extends the golden test fixture of Story 4.5 with its element type and keeps it green (Definition of Done).

### Story 5.1: Timeline element tracks

As a creator,
I want Timeline lanes where each Arrow, Token and Text appears as a clip,
So that I can see and adjust when each element exists.

**Acceptance Criteria:**

**Given** the Timeline
**When** element tracks are built
**Then** Arrows, Tokens and Text tracks exist as 26 px lanes with 20 px clips in their track colours; a clip spans an element's existence range, overlapping clips go to automatic sub-rows, and dragging a clip's edges changes the element's Step range through one Command (UX-DR79, UX-DR80, UX-DR13, FR-45, AD-3)

**Given** a track with no element
**When** the Timeline renders
**Then** the lane shows its label and stays empty; tracks are keyboard-operable and announced per the Story 1.7 rule

**Given** the track component
**When** it is tested
**Then** it is covered with a test element type in Vitest and Playwright, so Stories 5.2–5.4 only plug their element kind in

### Story 5.2: Movement Arrows

As a creator,
I want to draw curved offensive Arrows that draw themselves during a Step,
So that viewers see who attacks where.

**Acceptance Criteria:**

**Given** the Arrow tool (`F`)
**When** the user clicks points on the Map then double-clicks or presses Enter
**Then** a curved Arrow is created through those `[lon, lat]` points, in the style of the selected Faction (width, head shape from its Kit); Backspace removes the last point, Escape cancels (FR-28, UX-DR92, UX-DR117, AD-14)

**Given** an Arrow created at Step N
**When** Step N's transition plays
**Then** the Arrow draws itself along its path as a function of `u`, with the Organic Signature easing (FR-28, AD-21, FR-42)
**And** it persists on later Steps unless limited to a range (FR-45)

**Given** a selected Arrow
**When** the Arrow panel shows
**Then** Faction, width (including very wide for breakthroughs) and advanced style fields are editable, and point handles can be dragged, each change being one Command (UX-DR40, AD-3)

**Given** the Timeline
**When** Arrows exist
**Then** Arrows appear on the Arrows track of Story 5.1 (UX-DR79, UX-DR80, UX-DR13, FR-45)

**Given** automatic framing
**When** a Step creates or changes Arrows
**Then** they are included in the framed area (FR-46)

### Story 5.3: UnitTokens

As a creator,
I want to place unit markers and move them between Steps,
So that I can show forces and manoeuvres.

**Acceptance Criteria:**

**Given** the Token tool (`J`)
**When** the user clicks the Map
**Then** a UnitToken of the selected Faction is placed, with a shape among simplified NATO symbol, two-colour square, round flag badge and mini-flag, and an optional label that can be framed (e.g. "7 C.", "Gal Bradley") (FR-30, UX-DR93, UX-DR41)

**Given** a UnitToken moved or rotated at Step N
**When** the transition into Step N plays
**Then** it glides and pivots from its previous state to the new one, as a function of `u`, with the Organic Signature (FR-30, AD-4, AD-21)

**Given** the flag badge or mini-flag shapes
**When** drawn
**Then** they use the Faction's Emblem from the media store (reduced variant at small sizes) (AD-29, FR-12)

**Given** the Timeline
**When** UnitTokens exist
**Then** they appear on the Tokens track with clips and sub-rows like Arrows (UX-DR79, UX-DR80)

**Given** a project with 50 UnitTokens and 200 Territories
**When** the Timeline plays on the reference machine
**Then** preview stays at 30 fps or more; the measurement is recorded in the dev notes (NFR-2)

**Given** Map text sizes
**When** this element is drawn
**Then** it uses the map typography tokens of UX-DR21 scaled per AD-23 (UX-DR21)

**Given** automatic framing
**When** a Step creates or moves UnitTokens
**Then** they are included in the framed area (FR-46)

### Story 5.4: Texts

As a creator,
I want to add titles, labels and annotations that appear with a typing animation,
So that I can name places, people and events on my map.

**Acceptance Criteria:**

**Given** the Text tool (`X`)
**When** the user clicks the Map or the frame and types
**Then** a Text is created either anchored to a Map position (`[lon, lat]`) or to the frame (edge/corner + offset in reference pixels), with font, size, outline, frame and position editable in the Text panel (FR-34, UX-DR95, UX-DR43, AD-14)
**And** while the text field has focus, single-letter shortcuts, Space and arrows are inactive (EXPERIENCE text-field focus rule)

**Given** a Text created at Step N
**When** Step N's transition plays
**Then** it appears with a typing animation (by character or by word, chosen in the panel) timed on the transition (FR-34, AD-21)

**Given** a Text
**When** the UI language changes
**Then** its content never changes: Map text is Project data (AD-20)

**Given** the Timeline
**When** Texts exist
**Then** they appear on the Text track with clips and sub-rows (UX-DR79, UX-DR80)
**And** curved text along a path is not offered in P0 (P2, Epic 11)

**Given** Map text sizes
**When** this element is drawn
**Then** it uses the map typography tokens of UX-DR21 scaled per AD-23 (UX-DR21)

**Given** an Output Format change
**When** the frame changes
**Then** frame-anchored Texts stay anchored to the same frame edge (FR-50, AD-14)

### Story 5.5: Import images

As a creator,
I want to bring my own images onto the map,
So that I can add portraits, logos or my own symbols.

**Acceptance Criteria:**

**Given** the Import tool (`I`), the file picker, or a drag-and-drop onto the Map
**When** the user imports a PNG, JPG or SVG
**Then** the image is stored once in the media store by SHA-256 (SVGs sanitized first: scripts, external references and event handlers removed) and placed as a positionable Image element (FR-48, UX-DR98, AD-8, AD-29)
**And** an unsupported or unreadable file shows a clear error and nothing is added (UX-DR145)

**Given** an imported image
**When** the user chooses "Utiliser comme Emblème" on a Faction
**Then** the Kit references the image hash as its Emblem (FR-48, FR-12)

**Given** a selected Image element
**When** the Image panel shows
**Then** position, size, rotation and opacity are editable, and it belongs to a Layer and existence range like any element (UX-DR47, AD-24, FR-45)

**Given** privacy rules
**When** an image is imported
**Then** it never leaves the machine (NFR-6)

**Given** the EventIcon feature
**When** the user imports an image
**Then** "Utiliser comme Icône d'événement" is not offered in P0; it arrives with EventIcons in Epic 9 (FR-48, FR-32)

---

## Epic 6: Start in 2 minutes: wizard and Templates

The creator follows the wizard (Template, reference date, Region, Factions) and gets an already animated Map in under 2 minutes, or browses the Template gallery. The builder gets a workflow to author and publish official Templates with the OPENMAP editor itself, starting as soon as Epic 3 is done.

### Story 6.1: Project File container

As the builder of OPENMAP,
I want one reliable file format for Projects,
So that Templates, backups and transfers all share it.

**Acceptance Criteria:**

**Given** `src/persistence`
**When** a Project is serialized
**Then** it produces the `.openmap` ZIP container of AD-10 (`manifest.json` with `format`, `schemaVersion`, app version and pinned Library versions; `project.json`; `media/<sha256>.<ext>` with licence records), and parsing runs `migrate` then Zod validation (AD-9, AD-10)
**And** round-trip tests prove serialize → parse gives a deep-equal document (FR-54 foundation; the user-facing export/import UI arrives in Epic 7)

### Story 6.2: Template authoring and publishing workflow

As the builder of OPENMAP,
I want to turn a Project I made in the editor into an official Template and publish it to the Library,
So that official content is produced with the product itself.

**Acceptance Criteria:**

**Given** a hidden builder action (enabled only in development builds)
**When** the builder exports the current Project as a Template
**Then** a Template package is written: the Project File plus `template.json` (Era, type among battle / campaign / expansion over time / current geopolitics, Region, reference date, FR and EN titles, thumbnail and short animated preview rendered through the export pipeline) (AD-28, FR-3)

**Given** Template packages in `pipeline/content/templates/`
**When** the pipeline runs
**Then** they are published under `/library/v<n>/templates/` with an index for the gallery, and publishing fails if any Emblem or media inside lacks a verified licence record (AD-17, AD-18, PRD §5)

### Story 6.3: Browse the Template gallery

As a creator,
I want to browse Templates by Era, type and keyword,
So that I find a starting point that matches my topic.

**Acceptance Criteria:**

**Given** the Templates index
**When** the gallery shows (wizard screen 1 and the Library drawer Templates tab)
**Then** each Template shows its thumbnail (animated preview on hover or focus), title in the UI language, Region and reference date (FR-3, UX-DR123, UX-DR60)

**Given** filters
**When** the user filters by Era (Antiquité, Moyen Âge, Temps modernes, Ère contemporaine), by type, or types a search text
**Then** the list updates immediately; no match shows an empty state with a way to clear filters (FR-3, UX-DR146)

**Given** the offline state or an unreachable data origin
**When** the gallery cannot load
**Then** a clear message offers "Projet vierge" instead (UX-DR141)

**Given** Home
**When** the user chooses "Nouveau Projet"
**Then** the wizard shell opens: at most 5 screens with a progress indicator (Template, Reference date, Region, Factions), Back/Next, every screen skippable while keeping the Template's values, and "Projet vierge" on screen 1; screens 2–4 show "Passer" until Stories 6.5–6.6 fill them (FR-2, UX-DR122)
**And** a failure to load wizard data shows an error state with "Réessayer" and "Projet vierge" (UX-DR122)

### Story 6.4: Create a Project from a Template

As a creator,
I want to start a Project from a Template and change anything in it,
So that I get a head start without being locked in.

**Acceptance Criteria:**

**Given** a chosen Template
**When** the Project is created
**Then** the Template is migrated, every element, Step, Act, Faction and Kit id is remapped consistently, a new `project.seed` is generated, the Template's pinned data versions are kept, and provenance `{templateId, version}` is recorded (AD-28, AD-2, AD-12, FR-1)
**And** two Projects created from the same Template animate with different Organic Signature jitter (AD-2)

**Given** a Project from a Template
**When** the user edits it
**Then** every element (suggested Arrows, pre-filled Steps, Kits, Relations) can be modified, moved or deleted; nothing is read-only (FR-4)

**Given** the wizard shell of Story 6.3
**When** the user picks a Template and finishes
**Then** the Project is created from it and opens in the Editor; this replaces the direct blank creation of Story 1.4 (FR-1)

### Story 6.5: Wizard: reference date and Region

As a creator,
I want the wizard to ask me the date and the Region of my story,
So that the map is set up for my topic in a few clicks.

**Acceptance Criteria:**

**Given** screen 2 "Date de référence"
**When** the user types a date (year precision, BCE allowed)
**Then** the value is validated like in Project settings, the nearest-data chip shows the real data date, and invalid input shows an inline error (UX-DR124, UX-DR147, UX-DR59, FR-6)

**Given** screen 3 "Région"
**When** the user types a place or picks on a small map
**Then** the Region sets the initial framing of the Project using the search of Story 1.12 (UX-DR125, FR-8)

**Given** wizard choices
**When** they are applied
**Then** they become ordinary Commands on the instantiated Project, undoable afterwards in the Editor (AD-28, AD-3)

### Story 6.6: Wizard: Factions and the ready-to-play result

As a creator,
I want to pick the Factions to highlight and land on a map that already plays,
So that I see my first animation within 2 minutes.

**Acceptance Criteria:**

**Given** screen 4 "Factions"
**When** the user picks Factions
**Then** each chosen Faction receives a copy of its Library Kit if one exists, otherwise a default Kit with a colour distinct from the other Factions of the Project (FR-2, FR-13, UX-DR126)

**Given** the wizard ends
**When** the Editor opens
**Then** the Map has at least 2 Steps with at least one Territory change, Kits applied and the minimal Legend visible, and pressing play animates with no other action (FR-2, FR-35 P0)

**Given** a first-time creator on the reference machine
**When** they go from Home to the animated Map through the wizard
**Then** it takes under 2 minutes in a moderated test with the default Template choices (NFR-7) `[HYP]`

**Given** the "Projet vierge" path of the wizard
**When** the wizard ends
**Then** the Project gets the chosen reference date, Region framing and Factions, two Steps are created, and the Factions' Territories around the Region are pre-assigned at Step 1 with one Territory change at Step 2 suggested and editable, so that FR-2 still yields an animation (FR-2) `[ASSUMPTION]`

### Story 6.7: Official starter content

As a creator,
I want a first set of good Templates and Kits across Eras,
So that I can test OPENMAP on topics I care about.

**Acceptance Criteria:**

**Given** the P0 validation
**When** content is published
**Then** at least 2 Templates per Era (Antiquité, Moyen Âge, Temps modernes, Ère contemporaine) and the Kits of their Factions are available, each authored with the editor and published through Story 6.2 (PRD §5 threshold) `[HYP on volume]`
**And** the Ère contemporaine set includes a "siège de ville" Template usable for UJ-1 (Pocket as a morphing DrawnZone, DateDisplay on) and an "Expansion d'empire" Template for UJ-2

**Given** every Template and Kit
**When** it is reviewed
**Then** it animates correctly, exports through the golden-tested pipeline, respects neutrality on contested territories (follows its source), and carries complete source and licence records (PRD §5, AD-17)

---

## Epic 7: Safe work, usage measurement and going online

The creator can move a Project to another machine, is protected against storage loss, and chooses whether to share anonymous usage statistics. The builder puts OPENMAP online: data origin on the VPS behind Cloudflare, self-hosted telemetry, hardening, backups and a fixed domain. After this epic, the P0 validation slice can be handed to 3–5 creators.

### Story 7.1: Export and import a Project File

As a creator,
I want to save a Project as a file and open it on another computer,
So that my work is backed up and portable.

**Acceptance Criteria:**

**Given** a Project (Editor menu or Project card menu)
**When** the user chooses "Exporter le Fichier projet"
**Then** a `.openmap` file is downloaded containing the document, Kits and all imported and Library media, using the container of Story 6.1 (FR-54, AD-10)

**Given** Home
**When** the user chooses "Importer un Fichier projet" or drops a `.openmap` file anywhere on Home
**Then** a progress toast "Import de siege-de-marioupol… 45 %" with "Annuler" is shown, the Project is migrated and validated, gets a new local id, and appears at the top of the list; existing Projects are never modified (FR-54, AD-9, AD-10, EXPERIENCE)
**And** the reimported Project animates identically (same element ids and `project.seed`), verified by an automated test (FR-54, AD-2)

**Given** an invalid or corrupted file
**When** it is imported
**Then** the dialog "Ce fichier n'est pas un Fichier projet OPENMAP lisible." is shown and nothing is created (UX-DR145)

**Given** a file whose `schemaVersion` is newer than the app
**When** it is imported
**Then** it opens read-only with a message inviting to update the app, and is never written (AD-9)

**Given** the storage banner of Story 1.15
**When** it shows
**Then** its action is now "Exporter le Fichier projet" (FR-53, UX-DR138)

### Story 7.2: Data origin on the VPS behind Cloudflare

As the builder of OPENMAP,
I want tiles and Library data served from my VPS through Cloudflare,
So that every creator gets fast maps at no extra cost.

**Acceptance Criteria:**

**Given** the Hostinger VPS KVM 2
**When** `ops/` is applied
**Then** `pmtiles serve` serves the versioned tilesets as `/<name>-v<n>/{z}/{x}/{y}.mvt` (or `.webp`) with TileJSON, and a reverse proxy with TLS serves `/library/v<n>/…`, all under `data.<domain>` (AD-18, ARCH-16)

**Given** versioned paths
**When** they are requested
**Then** the origin sends `Cache-Control: public, max-age=31536000, immutable`, a Cloudflare Cache Rule caches them (including `.mvt` and `.json`), and a repeat request is a cache hit (AD-18)
**And** CORS allows the production app origin, the project's `*.pages.dev` previews and localhost dev ports only

**Given** a new data version
**When** the builder runs `ops/publish.sh`
**Then** it takes a Hostinger snapshot, uploads the new versioned folders without overwriting existing ones, and smoke-tests tile and TileJSON URLs through the proxy; it is the only publish path (ARCH-19, AD-12)
**And** tiles and data stay within the 70 GB disk budget; zoom caps per tileset are recorded (Deferred item of the spine)

**Given** production builds of the app
**When** they point to the data origin
**Then** no code change is needed compared to development paths (Story 1.8), and the production build fails if a non-OPENMAP tile URL is configured (AD-18)

### Story 7.3: Self-hosted Umami

As the builder of OPENMAP,
I want my own privacy-friendly statistics server,
So that usage data never goes to a third party.

**Acceptance Criteria:**

**Given** the VPS
**When** Umami 3.4 with PostgreSQL is deployed with Docker Compose from `ops/`
**Then** it is reachable only through the data origin at `/api/send` for event ingestion, with session replay, heatmaps and web vitals disabled (AD-16, ARCH-18)

**Given** the Umami database
**When** a week passes
**Then** an off-VPS backup copy of the Umami database and of the pipeline source data is made (e.g. to the owner's PC) and its restore procedure is documented in plain French (ARCH-19)

**Given** server secrets
**When** they are configured
**Then** they live only in env files on the VPS, never in the repository (ARCH-19)

### Story 7.4: Telemetry consent and event catalogue

As a creator,
I want to choose freely whether OPENMAP gets anonymous usage statistics,
So that my privacy is respected.

**Acceptance Criteria:**

**Given** the first launch
**When** Home opens
**Then** the consent dialog asks "Aider à améliorer OPENMAP en envoyant des statistiques d'usage anonymes ? Le contenu de vos Projets ne quitte jamais votre ordinateur." with equal Accept and Refuse choices and nothing pre-selected (FR-58, UX-DR121)

**Given** consent refused or not yet given
**When** the user uses OPENMAP
**Then** no request reaches the telemetry path (AD-16, FR-58)

**Given** consent given
**When** tracked actions happen
**Then** `src/telemetry` posts events directly to `/api/send` from a closed, typed catalogue (e.g. `project_created`, `export_completed`, `feature_used`) with only enumerated or bucketed properties and the boolean flags needed by SM-2..SM-8 (`from_template`, `template_modified`, `organic_signature_on`, `personal_kit_reused`, `data_corrected`), keyed by a random `installId` created at consent (AD-16, FR-58)
**And** no Umami tracker script is loaded, and no event ever contains free text, names, geometry, media, Project ids or URLs; an automated test enforces the catalogue

**Given** Settings → Confidentialité
**When** the user revokes consent
**Then** sending stops immediately and the `installId` is deleted; the tab explains what is and is not sent (FR-58, UX-DR134)

**Given** a Cloudflare Pages preview deployment
**When** it runs
**Then** telemetry is disabled regardless of consent (Structural Seed: preview environment)

### Story 7.5: Going live safely

As the builder of OPENMAP,
I want the public site on its final domain with basic security and monitoring,
So that creators can use it and I sleep well.

**Acceptance Criteria:**

**Given** the domain and trademark check is done
**When** the app is deployed
**Then** it is served on its final origin `app.<domain>` from Cloudflare Pages, and this origin is recorded as never to change (AD-18, ARCH-21)

**Given** the production app
**When** it is served
**Then** a Content-Security-Policy blocks inline scripts and allows connections only to the app origin and the data origin (AD-16, AD-29)

**Given** the VPS
**When** it is hardened
**Then** SSH is key-only, the firewall allows HTTP(S) only from Cloudflare ranges, and automatic security updates are on; a checklist in `ops/` records it (ARCH-19)

**Given** monitoring
**When** the data origin goes down
**Then** a free external uptime check alerts the owner (ARCH-19)
**And** the app keeps editing open Projects and shows the EXPERIENCE fallbacks for missing tiles (UX-DR106, UX-DR141)

**Given** the hosting budget
**When** any paid Cloudflare product would be enabled
**Then** a billing alert is set first, and total spend beyond the VPS stays within 20 EUR/month unless a new decision is recorded (AD-18, PRD §8)

### Story 7.6: P0 validation session with creators

As the owner of OPENMAP,
I want to watch 3–5 real creators use the P0 on a topic of their choice and decide what comes next,
So that P1 is built on evidence, not on guesses.

**Acceptance Criteria:**

**Given** the P0 is live (Stories 7.1–7.5 done)
**When** the validation is prepared
**Then** 3–5 geopolitical or history content creators are recruited, each chooses a real topic, and a short observation guide is written in plain French (tasks, what to observe, no leading help) (PRD §12)

**Given** each session
**When** the creator works on their topic
**Then** the owner notes where they get stuck, what they customize (Kits, Templates, Organic Signature), time to first animation and first export (NFR-7, SM-2), and whether they would use OPENMAP for a real video instead of their current method
**And** at least one session measures preview smoothness and export time on the creator's own machine (NFR-2, NFR-3)

**Given** all sessions are done
**When** results are reviewed
**Then** the go/no-go rule is applied: if at least 2 creators say they would use it for a real video, P1 planning starts (detail Epics 8–10); otherwise differentiation (R2) is revisited first, e.g. with `bmad-correct-course` (PRD §12, Q9) `[HYP on threshold]`
**And** findings are written to a short validation report stored in `_bmad-output/` and feed the detailing of the P1 epics
