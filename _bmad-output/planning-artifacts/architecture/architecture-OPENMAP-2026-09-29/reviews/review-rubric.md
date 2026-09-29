---
reviewer: rubric walker (good-spine checklist)
target: ARCHITECTURE-SPINE.md (OPENMAP v1, altitude initiative, status draft)
inputs: ARCHITECTURE-SPINE.md, .memlog.md, prd-OPENMAP-2026-09-25/prd.md, EXPERIENCE.md (handoff table)
date: 2026-09-29
verdict: REVISE — sound core, not yet ready for epic breakdown
---

# Rubric review — OPENMAP v1 architecture spine

## Verdict

**Revise before handoff.** The paradigm (pure `evaluate(project, t) → Scene`, Command-sourced document, local-first) is the right one. It covers the hardest divergence points: animation drift, randomness, mutation, sparse Step state, derived geometry, renderer split, schema versioning and licences. Mermaid is valid and the stack is npm-verified. Four gaps are still high severity for a build that coding agents will run epic by epic:

1. Territory identity, and where Territory-level properties are stored, is undefined.
2. The Scene camera is not defined relative to the output frame, so Presentation and export can frame differently.
3. The deferred GeoEntity packaging can break AD-5 and NFR-1.
4. The enforcement mechanisms that several Rules rely on (lint, import boundaries, schema-change detection, licence check) have no named tool.

The operational envelope is mostly present (environments, hosting, a short operations paragraph). It is still thin on backups off the VPS, secrets, monitoring, publish mechanics, version skew and a cost ceiling.

## Mechanical checks

| Check | Result |
| --- | --- |
| `lint_spine.py` | 4 findings, all false positives (`{tileset}/{z}/{x}/{y}` URL template on line 157). |
| Mermaid validity | All 3 blocks parse with mermaid 11 (layer flowchart, deployment flowchart, erDiagram). |
| Leftover template comments / placeholders | None (`<!--`, `{{`, TODO, TBD: none found). |
| Decisions vs rationale | Mostly decisions. Rationale stays in `.memlog.md`. Minor: AD-1 alone carries an `[ADOPTED]` tag, so status markers are inconsistent across ADs. |
| Frontmatter | Complete. `binds: FR-1..FR-58, NFR-1..NFR-9`, `status: draft`. |
| Verified-current tech | All Stack rows match `npm view` lines in the memlog (2026-09-29). Exceptions are listed under M-6. |

## Findings

Severity: critical / high / medium / low. Each finding gives a concrete fix.

### H-1 — Territory has no identity; Territory-level properties have no home (missed divergence point)

AD-4 and AD-5 make the Territory a *derived* union of owned GeoEntities and DrawnZones. Several FRs, however, attach properties or references to a Territory:

- Pocket flag (FR-24)
- fill pattern and hatching (FR-25; UJ-3 hatches Albania only)
- flag fill (FR-17)
- auto Faction label (FR-9)
- Counter anchored to a Territory (FR-36)
- Token Series attached to a Territory contour (FR-31)
- propagation origin point (FR-39)

Nothing says where these values live or how a derived Territory is referenced across Steps. Each epic will invent its own answer: per member, per Faction, per connected component, or a stored "Territory" record that contradicts AD-5. The erDiagram adds to the confusion: it has `TERRITORY_MEMBER` but no Territory, and AD-5 lists "Pocket shapes" as derived.

**Fix:** add an AD, "Territory identity and styling":
- A Territory is `(factionId, stepId)`. A Territory's connected components are addressed by a stable member key (e.g. the lowest member ref).
- Style overrides (pattern, flag fill, opacity) are tracks on the member (GeoEntity ref / DrawnZone) with a Faction-level default.
- Pocket is a boolean track on a DrawnZone.
- Anchors (Counter, Token Series) reference a `{factionId}` or a member ref and resolve through `src/core/derive`.

### H-2 — Scene camera is not defined relative to the output frame (NFR-1, FR-47, FR-50)

AD-1 defines `camera {center, zoom, bearing, pitch}` and AD-7 exports at 1080p in its own map instance. MapLibre zoom is canvas-size dependent: the same `{center, zoom}` shows a different extent in a 900 px Presentation viewport and a 1920 px export canvas, and devicePixelRatio adds another variable. FR-50 also requires manual framings to "contain the same elements" after an Output Format change, which a stored `center/zoom` cannot guarantee. The golden test in Conventions will fail, or each renderer will add its own correction.

**Fix:** extend AD-1 or AD-14:
- Scene camera zoom is expressed at the reference output frame (short side 1080 px).
- Renderers apply `zoom + log2(actualShortSide / 1080)` and render at `pixelRatio` 1 for export.
- Presentation letterboxes to the Output Format aspect.
- Manual framing (FR-47) is stored as geographic bounds + bearing, and converted to center/zoom per Output Format in `src/core/evaluate`.

### H-3 — Deferred "GeoEntity data packaging" can make units diverge

The deferral includes "vector tiles" and "simplification levels", and is left to "the first Territory epic". Two problems:

- If GeoEntities arrive as tiles, geometries are clipped at tile edges. AD-5's unions and Front Lines (shared-border derivation) then depend on which tiles are loaded.
- If simplification is picked by current zoom, the edit view, Presentation and export (different zoom and canvas size) derive different Front Lines, Pockets and Token Series layouts. That breaks NFR-1 and AD-1's Scene determinism.

The choice also constrains AD-6 (deck.gl `MVTLayer` vs `GeoJsonLayer`) and FR-8 search. This is not a single-epic decision.

**Fix:** move the invariant into the spine and defer only the file format:
- Core derivation always receives whole (unclipped) polygons per GeoEntity.
- The simplification level is fixed per dataset version (pinned by AD-12) and never chosen by camera zoom.
- GeoEntities are never consumed as vector tiles by `src/core`.

### H-4 — Enforcement tools behind several Rules are unnamed; import boundaries are unenforced

Several Rules rely on tooling that does not appear in the Stack and has no stated mechanism:

- AD-2 says "a lint rule enforces the ban", but no linter is in the Stack (ESLint / typescript-eslint / Biome / oxlint).
- AD-1's forbidden APIs (`flyTo`, `easeTo`, deck.gl `transitions`, CSS transitions on map content) have no enforcement at all.
- The layer table's "May import" column has no boundary checker.
- AD-9 says "a shape change without version bump fails CI", but no mechanism exists for it.
- AD-17's "licence check" tool is unnamed.
- AD-18's "build fails if non-OPENMAP tile URL" has no mechanism.

With AI coding agents, an unenforced Rule is a suggestion. There is also a verification point: TypeScript 7.0 is the native (Go) compiler, so confirm that the chosen linter's type-aware rules run against it, or pin the linter's TS dependency.

**Fix:** add to Stack and Conventions, with npm-verified versions:
- the linter and `no-restricted-syntax` / `no-restricted-properties` rules for AD-1 and AD-2
- a boundary tool for the layer table (`eslint-plugin-boundaries` or `dependency-cruiser`)
- AD-9: commit a JSON Schema snapshot generated from Zod (`z.toJSONSchema`) per `schemaVersion`; CI fails if the snapshot changes without a version bump
- a named licence checker (e.g. `license-checker-rseidelsohn`) with the allowlist
- a CI grep or assertion on `VITE_` tile URLs in prod builds

### H-5 — Telemetry transport, identity and metric computation are undecided (FR-58, SM-2..SM-7, AD-16)

AD-16 fixes *what* may be sent but leaves several things open:

- **Transport is open.** The Umami tracker script auto-sends pageviews with URL path, referrer, screen and language. If routes contain Project ids, that violates AD-16. The direct `/api/send` API does not auto-send.
- **Endpoint hostname is unset.** The deployment diagram draws `APP → UMAMI` directly, not through the Cloudflare proxy, which would expose the VPS IP.
- **Measurement model is missing.** SM-2 (time to first export), SM-4 (returning within 30 days) and SM-5 (Kit reuse across Projects) need either a persistent anonymous install id or client-computed properties. Each telemetry story will otherwise pick its own approach.

**Fix:** extend AD-16:
- No Umami tracker script. `src/telemetry` POSTs to Umami `/api/send` with auto-pageviews off and a constant URL.
- Endpoint is `https://data.<domain>/t/…` (or `t.<domain>`) behind the Cloudflare proxy.
- A random install id is created at consent, stored in Dexie, and deleted on revoke.
- SM metrics are computed from enumerated props (e.g. `minutes_since_first_open_bucket`, `kit_reused: boolean`).

### M-1 — Library binary assets (Emblems, Event Icons, Template media): copy or reference? (AD-8, AD-10, AD-11)

AD-11 deep-copies Kits and AD-10 embeds "media". It is not stated whether a Library Emblem or Event Icon applied to a Project is copied into the media store (by sha256) or referenced by versioned data-origin URL. The two choices lead to different Project File contents, offline behaviour and FR-54 "identical" guarantees.

**Fix:** a rule that applying any Library asset copies its bytes into the media store keyed by SHA-256, so the Project references only hashes, like imported media.

### M-2 — Basemap tiles, styles, glyphs and sprites: versioning, hosting and caching unspecified (AD-12, AD-16, AD-18)

- **Basemap versioning.** AD-12 pins *Library data* versions, but basemap tilesets are not stated as versioned. A re-rendered parchment tileset would silently change old Projects' exports, and `immutable` caching is unsafe without versioned names.
- **Self-hosting of style assets.** MapLibre needs style JSON, glyph PBFs and sprites. AD-16 forbids third parties, but the spine never says these are self-hosted on the data origin.
- **Tile URL contract.** go-pmtiles `serve` exposes `/{name}/{z}/{x}/{y}.{ext}` plus TileJSON `/{name}.json`. The spine's extension-less path is inaccurate.
- **CDN caching.** Cloudflare's free plan does not cache `.mvt`/`.pbf` by default; that needs a Cache Rule.

**Fix:**
- Tilesets are named `{basemap}-v{n}`, pinned in the Project like Library data, and never overwritten.
- Style, glyphs and sprites live under `data.<domain>/styles/v{n}/`.
- The app consumes TileJSON URLs rather than hand-built paths.
- A Cloudflare Cache Rule ("eligible for cache", edge TTL 1 year) is set on the tile and Library paths.

### M-3 — Version skew between app builds and stored data

AD-9 covers forward migration only. Nothing says what an older tab or older cached build does when it meets a `schemaVersion` newer than its own. Such a tab could write a downgraded document after "Take over here". Dexie DB version upgrades with other tabs open (`versionchange` / `blocked`) are unaddressed. Cloudflare Pages deploys can also remove old hashed chunks, so a long-open tab crashes on its next lazy import.

**Fix:** an AD rule:
- The app refuses to open any record with `schemaVersion > current` and shows "reload to update".
- On Dexie `versionchange` the tab closes its DB and prompts a reload.
- A lazy-chunk load failure triggers a reload prompt.
- Read-only tabs reload the Project when the lock holder broadcasts `saved {revision}` over the AD-15 BroadcastChannel (today they show stale data and could export it).

### M-4 — Operations envelope thin for a single-VPS, solo operator

The VPS is a single point of failure for tiles, Library data and telemetry. Gaps:

- **Backups stay on the VPS.** AD-12 promises published data versions "stay online forever", but the only protection is Hostinger snapshots (same provider) and a weekly Umami backup with no stated destination. There is no canonical off-VPS copy of the published data and tiles.
- **No publish mechanism.** Nothing says how `pipeline/` output reaches the VPS: script, CI or rsync.
- **Server-side secrets are undecided.** Umami DB/admin credentials, the Cloudflare deploy token and the SSH key have no stated home or practice.
- **Hardening and monitoring are missing:** SSH keys only, firewall to Cloudflare IP ranges only, Cloudflare SSL mode "Full (strict)", uptime monitoring or alerting.
- **Preview CORS gap.** CORS "allowing the app origin" blocks `*.pages.dev` preview deployments and `localhost`, which the Environments paragraph says use the production data origin.

**Fix:** expand Operations:
- a canonical copy of every published data/tile version in object storage off the VPS (e.g. Cloudflare R2, researched in the memlog), Umami dump to the same place
- `ops/publish.sh` as the only publish path (upload new version folder, never overwrite)
- secrets in GitHub Actions secrets and a VPS `.env` that is never committed
- a hardening checklist
- a free external uptime check
- a CORS allowlist of the prod origin, `*.<project>.pages.dev` and `http://localhost:*`

### M-5 — Cost ceiling and scale trigger not recorded (PRD §8)

PRD §8 requires "no recurring cost without a decided ceiling" and asks architecture to price tile serving. AD-18 states the gate ("explicit decision recorded here"), but the spine never records the current recurring costs (VPS plan, domain) or a ceiling. There is also no trigger for what happens when traffic or disk exceeds the KVM 2 budget (8 TB/month, 70 GB). The memlog has the numbers (R2 pricing, Hostinger specs) but the spine does not decide.

**Fix:** add an Operations line:
- the recurring cost today (VPS + domain) and the ceiling, e.g. ≤ X €/month
- a scale trigger, e.g. >70 % disk or >5 TB/month origin egress → move tiles to R2 behind the same `data.` origin, which AD-18 already allows

### M-6 — Unnamed / unverified tech for whole units

- **`pipeline/` has no stack.** Nothing names the language, vector tiling tool (tippecanoe or planetiler), raster to PMTiles tool (GDAL / rio-pmtiles / `pmtiles convert`) or simplification tool (mapshaper / turf). Pipeline stories will diverge.
- **The reverse proxy is deferred.** That is acceptable, since the constraint is stated.
- **Memlog contradiction.** One line lists "umami 2.10 MIT" while another verifies Umami 3.3.1 (the Stack says 3.3). Reconcile the memlog.
- **Cloudflare Pages vs Workers.** Cloudflare now steers new static sites to Workers static assets. The Pages choice is fine but should be verified current. It only affects the host, since the origin is fixed.

**Fix:** add pipeline rows to the Stack with verified versions and licences, and fix the memlog Umami line.

### M-7 — FR-9 geographic labels: basemap symbol layers or deck.gl text? (AD-6 vs AD-20)

FR-9 requires toggling cities, rivers and place names and *renaming any label per Project*. AD-6 gives the Basemap to MapLibre, and AD-20 says Map labels are Project/Library data. If place names ship inside the basemap tiles (MapLibre symbols), per-Project renaming needs feature-id expressions. If they are Library data, they are deck.gl `TextLayer`s. Either way, the owner is undecided.

**Fix:** state in AD-6 or AD-20 that renamable place labels are Library point data rendered by deck.gl from the Scene, and basemap tiles carry no text labels.

### M-8 — P0 satellite basemap depends on an open question with no fallback decision

FR-5 satellite is P0 (§10.1). EOX 2016 acquisition is listed as an open question that "blocks the satellite pipeline story, not the spine". There is no decided fallback if harvesting is not permitted.

**Fix:** record the fallback in Deferred:
- P0 ships with FR-5's documented fallback (dark basemap + notice) if the question is unresolved by the P0 cut.
- Alternatively, a Sentinel-2 raw mosaic is limited to the P0 demo Regions.

### L-1 — Export readiness beyond tiles (AD-7)

AD-7 waits for MapLibre tiles only. deck.gl layers load asynchronously too: Emblem textures, icon atlases, and `TextLayer` font atlases, which need `document.fonts.ready`. Frame capture must also read the canvas in the same render tick.

**Fix:** the export frame loop waits for `map.areTilesLoaded()` && `deck.isLoaded` && fonts ready, then captures the canvas in the same render tick (`preserveDrawingBuffer` or a synchronous `VideoFrame` capture after `render`).

### L-2 — ER diagram: `ACT }o--o{ STEP` is many-to-many

FR-43 groups Steps into Acts, and a Step can reasonably belong to at most one Act. A many-to-many edge invites divergent models.

**Fix:** change the edge to `ACT |o--o{ STEP`, or state "each Step in at most one Act; Acts are contiguous ranges".

### L-3 — Time units mixed

`t` is in seconds (float) while document durations are integer milliseconds. Boundary comparisons at 60 fps (`i/60`) invite off-by-epsilon differences between call sites.

**Fix:** make `t` integer milliseconds, or define one conversion helper and require comparisons in ms.

### L-4 — FR-8 search source unstated

City and place search needs a self-hosted index, since AD-16 bans geocoders. Its source and format are unstated.

**Fix:** add a Deferred line: "place-search index = Library data file per dataset version; format decided in the FR-8 story".

### L-5 — PRD §5 wording vs AD-17

PRD §5 says copyleft (ODbL) data is excluded until Q1. AD-17 allows ODbL basemap tiles as a Produced Work.

**Fix:** record this as an explicit PRD reconciliation note, or amend PRD §5, so reviewers do not read it as a contradiction.

## Checklist summary

| Criterion | Status |
| --- | --- |
| Fixes the real divergence points, misses none | Partial: missing Territory identity (H-1), camera frame (H-2), Library asset copying (M-1), label ownership (M-7), telemetry model (H-5) |
| Every AD Rule enforceable and prevents its divergence | Partial: enforcement tools unnamed (H-4); AD-1 camera does not guarantee Presentation = export (H-2) |
| Nothing under Deferred lets units diverge | Fails for GeoEntity packaging (H-3); other deferrals OK |
| Named tech verified-current | Yes for the app stack; pipeline stack unnamed; memlog Umami line inconsistent (M-6) |
| Covers the spec's capabilities (FR-1..58) | All FR ranges mapped; gaps inside FR-9, 17, 24, 25, 31, 36 (via H-1, M-7), FR-8 (L-4), SM metrics (H-5) |
| Operational envelope decided / deferred / open | Deployment & environments: decided. Infra/provider: decided. Operations: thin (M-4, M-5, M-3) |
| Mermaid valid | Yes (3/3 parse) |
| Decisions not rationale; no template leftovers | Yes |
