---
title: 'Story 1.8: Basemap data pipeline (Natural Earth)'
type: 'feature'
created: '2026-10-02'
status: 'done'
baseline_commit: '120cc3c553dd2db21b35fd710959a2250d9e0a73'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The app has no Basemap data: nothing turns Natural Earth into tiles, styles and glyphs, so Story 1.10 cannot show a Map, and nothing proves every dataset is licence-clean.

**Approach:** A re-runnable `pipeline/` that downloads pinned Natural Earth sources, refuses any source whose declared licence is off the allowlist, and writes versioned outputs (vector tileset, relief shading, four MapLibre styles from the `map-*` tokens, SDF glyphs from the two OFL fonts), each with `{source, licence, attribution, creditRequired}`; a Vite dev middleware serves them at the future data-origin paths. Epics.md Story 1.8 ACs (AD-17, AD-18, UX-DR3, UX-DR4) are binding.

## Boundaries & Constraints

**Always:** Natural Earth only (public domain); source URLs pinned to a version (vector: `nvkelso/natural-earth-vector` tag `v5.1.2` raw files; raster: Natural Earth CDN, same release); a source manifest declares each source's licence and the run fails before any download when it is not Public-Domain, CC0-1.0 or CC-BY-4.0, and refuses NC, ODbL and share-alike outright; no road, rail or other modern infrastructure layer; style colours read from `src/ui/theme/tokens.ts` (`mapColors`, `mapExtraColors`), never retyped; Relief style applies `map-shade-relief` at 35 % over land (UX-DR4); every output file is deterministic for the same inputs; served paths: `/natural-earth-v1/{z}/{x}/{y}.mvt` + TileJSON `/natural-earth-v1.json`, `/library/v1/styles/<basemap>.json`, `/library/v1/glyphs/{fontstack}/{range}.pbf`, `/library/v1/datasets.json` (metadata); in dev the data origin is the app origin; new dependencies are devDependencies that pass `npm run licences`; README in plain French with commands and the disk size produced.

**Never:** No app rendering of the Map (Story 1.10), no Library GeoEntities (Story 1.9), no search index (Story 1.12), no VPS publishing (Epic 7); no third-party tile URL; no pipeline output committed (gitignored); no MapLibre text layer in the styles (labels are deck.gl, AD-6) — styles still declare the `glyphs` URL.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First run | empty cache | downloads, builds, prints sizes; outputs under `pipeline/out/` | N/A |
| Re-run | cache present | no re-download; byte-identical outputs | N/A |
| Bad licence | a manifest source declared `CC-BY-NC-4.0` or `ODbL-1.0` | run stops, names the source | exit code ≠ 0, nothing written |
| Download fails | network error / wrong checksum | run stops, names the URL | partial files removed |
| Dev tiles | `npm run dev` after a build | tile, TileJSON, styles, glyphs served with the right content types | missing output → 404 and a one-line console hint |
| No build yet | `npm run dev`, no `pipeline/out/` | app starts normally | N/A |

**Decisions (owner, 2026-10-02):**
- Tooling: Node-only npm devDependencies — `shapefile`, `geojson-vt` + `vt-pbf`, `geotiff` + `@jsquash/webp`, `@napi-rs/canvas` + `@mapbox/tiny-sdf`, an in-repo PMTiles v3 writer, `pmtiles` to read in dev; one `npm run pipeline:basemap`.
- Relief: a second raster tileset `natural-earth-relief-v1.pmtiles` (WebP) from Natural Earth's shaded-relief raster, served as `/natural-earth-relief-v1/{z}/{x}/{y}.webp` + TileJSON `/natural-earth-relief-v1.json`; the vector `natural-earth-v1.pmtiles` holds coastlines, land, rivers, lakes and populated places.
- Max zoom: z0–6 for both tilesets (MapLibre over-zooms beyond).
- Full spec kept (~2,100 tokens).

</frozen-after-approval>

## Code Map

- `pipeline/README.md` -- one-line stub; becomes the French guide.
- `src/ui/theme/tokens.ts:110-157` -- `mapColors` (`parchment`, `sombre`, `clair`, `relief`) and `mapExtraColors` (`map-shade-relief`, `map-tint`): style colour source.
- Fonts: `node_modules/@fontsource-variable/libre-baskerville`, `@fontsource-variable/source-sans-3` (woff2, OFL) — glyph source; fontstacks named after `SERIF_STACK`/`SANS_STACK` first family.
- `vite.config.ts` -- add the dev-only data middleware (plugin in `pipeline/` or `scripts/`).
- `scripts/check-licences.mjs` -- `ALLOWED_LICENCES`/`REFUSED`: reuse the same rules for data licences where they apply.
- `tsconfig.node.json:24` -- includes `scripts`, `tests`; add `pipeline`. `vitest.config.ts:11` -- add `pipeline/**/*.test.ts`.
- `.gitignore` -- add `pipeline/out/` and `pipeline/cache/`.
- Sandbox note: the Natural Earth CDN is blocked here, GitHub raw is reachable; tests use small committed fixtures (a clipped shapefile, a tiny GeoTIFF), and the full run happens on the owner's PC.

## Tasks & Acceptance

**Execution:**
- [x] `pipeline/sources.json` + `pipeline/sources.ts` (+ test) -- pinned manifest with metadata and checksums; licence gate (allow / refuse rules, NC/ODbL/SA never)
- [x] `pipeline/download.ts` (+ test) -- cached, checksum-verified download; cleanup on failure
- [x] `pipeline/vector.ts` (+ test) -- land, ocean, coastline, rivers, lakes, populated places (name, rank, scale fields) to MVT layers per the decisions
- [x] `pipeline/relief.ts` (+ test) -- relief tiles per the decisions
- [x] `pipeline/pmtiles-writer.ts` (+ test) -- round-trip read with `pmtiles`
- [x] `pipeline/styles.ts` (+ test) -- four styles from tokens; validated with `@maplibre/maplibre-gl-style-spec`; Relief shade 35 %
- [x] `pipeline/glyphs.ts` (+ test) -- SDF glyph ranges for both fonts
- [x] `pipeline/build-basemap.ts` -- orchestrates, writes `datasets.json`, prints sizes; `npm run pipeline:basemap`
- [x] `pipeline/dev-server.ts` + `vite.config.ts` -- dev middleware for the versioned paths (+ test on a fixture tileset)
- [x] `pipeline/README.md` (French), `.gitignore`, `package.json`, `tsconfig.node.json`, `vitest.config.ts`

**Acceptance Criteria:**
- Given `npm run check`, when it runs, then all guardrails and tests pass using fixtures only (no network).
- Given a full run on a PC with internet, when it ends, then `pipeline/out/` holds the tilesets, four valid styles, glyphs and `datasets.json`, and the README states the measured disk size.

## Implementation Notes

- Modules under `pipeline/` as tasked, plus `modules.d.ts` (types for untyped deps) and `test-helpers.ts`; fixtures in `pipeline/fixtures/` (regenerated by `generate.mjs`); violating manifests in `tests/guardrails/fixtures/pipeline/` asserted in `guardrails.test.ts`, including CLI exit code and no output.
- CLI flags: `--vector-only`, `--pin`, `--out`, `--cache`, `--manifest`.
- Relief tiles are shade masks: `map-shade-relief` baked into RGB, alpha = 255 − luminance, drawn at `raster-opacity` 0.35, sea and lakes repainted on top.
- Places thinned by zoom (scale rank ≤ 1, 2, 3, 4, 5, 7, 10 for z0–z6); glyphs cover Latin and Latin Extended.
- Licence overrides: `pako` (MIT AND Zlib), `xml-utils` (CC0), geotiff transitives.
- Sandbox vector-only run: about 6 s, 3.4 MiB output (tileset 2.6 MiB, glyphs 0.7 MiB), 21 MiB cache; re-run hash identical. Glyph bytes are platform-dependent (Skia).

## Spec Change Log

## Review Triage Log

| # | Source | Finding | Verdict | Evidence / route |
|---|--------|---------|---------|------------------|
| 1 | edge | `--out` mistyped deletes an arbitrary directory (recursive rm) | high | `rmSync(outDir)` with no guard; flag values unchecked. patch |
| 2 | edge | `URL.pathname` for fonts and fixtures breaks on Windows and paths with spaces | high | Owner runs on Windows. patch |
| 3 | orchestrator | Vectors use 1:50m and relief the 50m ocean-bottom raster on a legacy host, though z0–6 was chosen for 1:10m | medium | `sources.json` ids `ne-50m-*`, S3 URL. patch |
| 4 | edge | Rm-then-rename loses the previous output on a failed rename | medium | `build-basemap.ts:194-195`. patch |
| 5 | edge | Body read error escapes without the URL; no fetch timeout | medium | `download.ts:53`. patch |
| 6 | edge | Corrupt unpinned cached archive trusted forever | medium | Cache reused when sha256 empty. patch |
| 7 | edge, verification-gap | ZIP member pick (`__MACOSX`, dirs), ZIP64 misread | medium | Suffix match, 32-bit sizes. patch |
| 8 | verification-gap | Vite plugin wiring untested | medium | Pre-verified. patch |
| 9 | verification-gap | `parseArgs` untested; missing values swallow flags | medium | Pre-verified. patch |
| 10 | edge | Tileset metadata uses first vector source's credit only | low | `datasetMeta(naturalEarth)`. patch |
| 11 | edge | Out-of-range tile z/x/y answers 500 | low | pmtiles throws. patch |
| 12 | edge | Relief style built on `--vector-only` | low | Dev hint covers the 404; style needed later. reject |
| 13 | edge | Manifest id/file name path traversal | low | Manifest is committed, reviewed input. reject |
| 14 | edge | 16-bit / nodata / palette rasters | low | `SR_HR` is 8-bit single band. reject |
| 15 | edge, blind | WebP SIMD variant and Skia glyphs differ across machines | low | Determinism holds per machine, documented. reject |
| 16 | edge, blind | Dev server stat race, https/proxy origin, misleading hint, `vite preview` | low | Dev-only; rare; spec scopes dev. reject |
| 17 | edge | cmap glyph-0 mapping | low | Unverified, cosmetic. reject |
| 18 | edge | Raster URL unversioned, checksum empty | false | Spec Design Notes: pinned by `--pin` on first run. reject |
| 19 | edge | README lacks full-run disk size | low | Relief cannot be fetched here; README states it is filled after the first full run. reject (reported to owner) |
| 20 | edge | Notes overstate licence overrides | false | `npm run licences` green with the two entries. reject |
| 21 | blind | `port` substring over-matches infrastructure | low | Natural Earth layer names only. reject |
| 22 | blind | CC-BY credit not surfaced in UI/export | false | Story 1.13 scope. reject |
| 23 | blind | `wasm-feature-detect` unused; HEAD returns a body | false | Used in `relief.ts:10`; Node drops HEAD bodies. reject |
| 24 | blind | Spec structure, statuses, French README | false | Decisions recorded on approval; AC requires French. reject |
| 25 | blind | Pin rewrites manifest before build ends; no fetch retry; pipeline imports `src/` tokens | low | Pinned hash is correct regardless; tokens import is the spec's single source. reject |

## Design Notes

Decisions taken in planning: glyphs are produced although the styles have no text layers today (AD-6 puts labels in deck.gl), so the data origin offers them as the spine lists; populated places go in the vector tileset (AC) for later label and search stories; the Dark and Light styles use the `sombre` and `clair` token sets; outputs are not committed, so `npm run dev` shows no tiles until the pipeline has run once; the raster source's SHA-256 cannot be fetched from this sandbox, so the manifest leaves it empty and `npm run pipeline:basemap -- --pin` records it on the owner's first run (a run with an empty checksum warns, never fails).

## Verification

**Commands:**
- `npm run check` -- expected: all green
- `npm run pipeline:basemap -- --vector-only` (sandbox, GitHub raw sources) -- expected: vector tileset, styles, glyphs built; sizes printed
