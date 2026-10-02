---
title: 'Story 1.8: Basemap data pipeline (Natural Earth)'
type: 'feature'
created: '2026-10-02'
status: 'in-progress'
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
- [ ] `pipeline/sources.json` + `pipeline/sources.ts` (+ test) -- pinned manifest with metadata and checksums; licence gate (allow / refuse rules, NC/ODbL/SA never)
- [ ] `pipeline/download.ts` (+ test) -- cached, checksum-verified download; cleanup on failure
- [ ] `pipeline/vector.ts` (+ test) -- land, ocean, coastline, rivers, lakes, populated places (name, rank, scale fields) to MVT layers per the decisions
- [ ] `pipeline/relief.ts` (+ test) -- relief tiles per the decisions
- [ ] `pipeline/pmtiles-writer.ts` (+ test) -- round-trip read with `pmtiles`
- [ ] `pipeline/styles.ts` (+ test) -- four styles from tokens; validated with `@maplibre/maplibre-gl-style-spec`; Relief shade 35 %
- [ ] `pipeline/glyphs.ts` (+ test) -- SDF glyph ranges for both fonts
- [ ] `pipeline/build-basemap.ts` -- orchestrates, writes `datasets.json`, prints sizes; `npm run pipeline:basemap`
- [ ] `pipeline/dev-server.ts` + `vite.config.ts` -- dev middleware for the versioned paths (+ test on a fixture tileset)
- [ ] `pipeline/README.md` (French), `.gitignore`, `package.json`, `tsconfig.node.json`, `vitest.config.ts`

**Acceptance Criteria:**
- Given `npm run check`, when it runs, then all guardrails and tests pass using fixtures only (no network).
- Given a full run on a PC with internet, when it ends, then `pipeline/out/` holds the tilesets, four valid styles, glyphs and `datasets.json`, and the README states the measured disk size.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Design Notes

Decisions taken in planning: glyphs are produced although the styles have no text layers today (AD-6 puts labels in deck.gl), so the data origin offers them as the spine lists; populated places go in the vector tileset (AC) for later label and search stories; the Dark and Light styles use the `sombre` and `clair` token sets; outputs are not committed, so `npm run dev` shows no tiles until the pipeline has run once; the raster source's SHA-256 cannot be fetched from this sandbox, so the manifest leaves it empty and `npm run pipeline:basemap -- --pin` records it on the owner's first run (a run with an empty checksum warns, never fails).

## Verification

**Commands:**
- `npm run check` -- expected: all green
- `npm run pipeline:basemap -- --vector-only` (sandbox, GitHub raw sources) -- expected: vector tileset, styles, glyphs built; sizes printed
