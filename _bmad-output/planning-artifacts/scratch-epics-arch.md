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
