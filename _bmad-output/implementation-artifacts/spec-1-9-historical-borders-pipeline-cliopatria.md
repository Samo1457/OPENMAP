---
title: 'Story 1.9: Historical borders pipeline (Cliopatria)'
type: 'feature'
created: '2026-10-02'
status: 'done'
baseline_commit: '488938f28b988561fec346a4e54054b9694ba2da'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Map has no historical borders: nothing turns Cliopatria into GeoEntities with stable ids and validity ranges, so Story 1.11 cannot show the countries and empires of a date, and nothing proves the data is licence-clean.

**Approach:** A re-runnable `pipeline/` command (`npm run pipeline:geo`) that downloads the pinned Cliopatria release, passes the licence gate, and writes versioned GeoJSON files under `/library/v1/geo/` (one file per entity state, whole polygons, fixed simplification) plus a lightweight index; the Vite dev middleware serves them at the same paths as the future data origin. Epics.md Story 1.9 ACs (AD-12, AD-17, AD-18) are binding.

## Boundaries & Constraints

**Always:** Source = Cliopatria release tag `v0.2.0` (`cliopatria.geojson.zip`, member `cliopatria_polities_only.geojson`, raw GitHub URL pinned to the tag, SHA-256 `d01ae3a20d358cc5d54f69d9d725d390767d9c8759ac89ad6f90c58d106f3370`), declared `CC-BY-4.0`, `creditRequired: true`, attribution naming Cliopatria and the Seshat Global History Databank; the run fails before any download if a licence is off the allowlist (reuse the Story 1.8 gate); entity = all rows sharing a Cliopatria `Name`; `entityId` = ASCII slug of the Name (parentheses stripped, aggregate marked by suffix `.group`; any residual slug collision, e.g. « Han » / « Hán », gets `-` + first 6 hex of the SHA-256 of the exact Name on every colliding Name; an unresolved collision fails the run); canonical key `cliopatria@0.2.0:<entityId>` (AD-12); states of one entity must not overlap in time (checked, run fails otherwise); geometry kept whole (never clipped), Douglas–Peucker at 0.005° then coordinates rounded to 4 decimals, rings below 4 points dropped, a state left with no polygon fails the run naming it; RFC 7946 winding; output deterministic; paths: `/library/v1/geo/index.json` and `/library/v1/geo/<entityId>/<fromYear>.json` (years as integers, BCE negative); each state file is one compact GeoJSON Feature with `id` = canonical key and `properties {fromYear, toYear, area}`; `index.json` lists dataset metadata `{id, version, source, licence, attribution, creditRequired, simplification, generated counts}` and per entity `{id, name, kind ("polity" | "group" | "relation"), components (relations only), wikidata, wikipedia, seshatId, memberOf (entityIds), states [[fromYear, toYear], …] sorted}`; output goes to its own root `pipeline/out-geo/` (gitignored) so the Story 1.8 build never deletes it; the same replace-safely rules as Story 1.8; new dependency only as MIT/BSD/ISC devDependency passing `npm run licences`; README section in plain French (version, simplification level, measured disk size).

**Never:** No rendering or date selection (Story 1.11), no search index (Story 1.12), no credit display (Story 1.13), no Natural Earth change, no VPS publishing (Epic 7), no pipeline output committed.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First run | empty cache | downloads, builds, prints counts and sizes | N/A |
| Re-run | cache present | no download, byte-identical files | N/A |
| Bad licence | manifest source `ODbL-1.0` / `CC-BY-NC-4.0` | stops before any download, names the source | exit ≠ 0, nothing written |
| Download problem | network error or wrong SHA-256 | stops, names the URL | partial files removed |
| Aggregates, members | name in parentheses; row with `MemberOf` | kept; `kind: "group"`; `memberOf` lists entityIds | N/A |
| Relations | `Type: RELATION` | kept, `kind: "relation"`, `memberOf` empty, parties kept in `components` (entityIds) | N/A |
| Id collision | « Han » / « Hán » | both get the hash suffix, stable across runs | unresolved → fail naming them |
| Overlapping states | two rows of one Name overlap in years | run stops naming the entity | exit ≠ 0 |
| Dev serving | `npm run dev` after a build | index and state files with JSON type | unknown id/year → 404; `..` refused |
| No build | `npm run dev`, no `pipeline/out-geo/` | app starts; paths answer 404 with a console hint | N/A |

**Decisions (owner, 2026-10-02):**
- Rows kept: every Cliopatria row (option B): plain polities (`kind: "polity"`), groups in parentheses (`"group"`, with `memberOf`) and the 385 relations (`"relation"`, with `components`); Story 1.11 filters what it displays.
- Full spec kept (~2,300 tokens); Sonnet subagents for implementation and review.

</frozen-after-approval>

## Code Map

- `pipeline/sources.ts` -- `assertLicences`, `validateManifest`, `loadManifest` (today tied to `naturalEarthRelease` and kinds `vector|raster`): generalise or add a geo manifest, same gate and host allowlist (add `raw.githubusercontent.com` Cliopatria path).
- `pipeline/download.ts` -- `fetchCached` (SHA-256, timeout, cache), `extractZipMember` (stored/deflated, no ZIP64; the Cliopatria zip also holds `__MACOSX/...`, which it already skips).
- `pipeline/build-basemap.ts` -- `assertReplaceable`, `parseArgs`, staged swap with restore, `directorySize`: reuse, do not duplicate.
- `pipeline/dev-server.ts` -- `createDataMiddleware`, `basemapDataPlugin`: add the `/library/v1/geo/` routes with a second output dir option; keep SAFE_SEGMENT checks.
- `pipeline/test-helpers.ts`, `pipeline/download.test.ts` -- zip-building helpers for fixtures.
- `tests/guardrails/guardrails.test.ts`, `tests/guardrails/fixtures/pipeline/` -- violating manifests pattern.
- `package.json` (`pipeline:basemap`), `.gitignore`, `pipeline/README.md`.
- Measured here (sandbox reaches raw GitHub): zip 44 MB, GeoJSON 165 MB, 13 765 rows, 1 633 names, 3.64 M points; median row 8 years and ~1.7 KB at 4 decimals; max 195 entities active (year 2020); all states together ~67 MB, ~19 MB gzipped; Douglas–Peucker at 0.01° removes only ~2.4 % of points (source already generalised).

## Tasks & Acceptance

**Execution:**
- [x] `pipeline/sources-geo.json` + gate wiring in `pipeline/sources.ts` (+ test) -- pinned Cliopatria source, licence gate
- [x] `pipeline/geo.ts` (+ test) -- rows to entities and states, ids, kinds, simplification, rounding, winding, invariants
- [x] `pipeline/build-geo.ts` (+ test) -- orchestration, safe output swap, index, sizes; `npm run pipeline:geo`
- [x] `pipeline/dev-server.ts` (+ test) -- geo routes
- [x] `tests/guardrails` -- violating geo manifest fixtures asserted (licence, CLI exit)
- [x] `pipeline/README.md` (French), `.gitignore`, `package.json`

**Acceptance Criteria:**
- Given `npm run check`, when it runs, then all guardrails and tests pass with fixtures only (no network).
- Given `npm run pipeline:geo` with internet, when it ends, then `pipeline/out-geo/` serves under `npm run dev` and the README states the measured size.

## Implementation Notes

- `sources.ts` gains `kind: 'geo'`, `validateGeoManifest`/`loadGeoManifest` (one source, pinned checksum, version equals `cliopatriaRelease`); the licence gate is the same `assertLicences`. `build-geo.ts` reuses `assertReplaceable` (optional marker file and label), `swapIn` and `formatBytes` from `build-basemap.ts`.
- `.group` only on parenthesised POLITY rows; relations get no suffix. Wikidata, Wikipedia and SeshatID vary across rows of one entity: the index keeps the first non-empty value in chronological order; `memberOf` and `components` are the sorted union across rows; relations always have `memberOf: []`.
- Index shape: `{schemaVersion: 1, dataset: {id, version, source, licence, attribution, creditRequired, simplification, counts}, entities: [...]}`. Zero-area rings are dropped after rounding.
- Real run (sandbox): 1,633 entities (1,540 polities, 43 groups, 50 relations), 13,765 states, byte-identical second run, about 13 s. `index.json` 437 KiB, state files 64.3 MiB (22.7 MiB gzipped), about 105 MiB on disk by `du` (block overhead on 13,765 small files), 43 MiB cached zip.
- Known: the geo CLI shares `parseArgs` and ignores `--vector-only`/`--pin`; the 3.6 M-point JSON is parsed in memory (peak measured at about 1.3 GB RSS).

## Spec Change Log

## Review Triage Log

| # | Source | Finding | Verdict | Evidence / route |
|---|--------|---------|---------|------------------|
| 1 | edge | Ring can end unclosed after rounding/dedupe; open source ring passes through | low | Real build: 0 unclosed of 116,071 rings; code path real. patch |
| 2 | edge | Null feature, non-numeric Area, non-finite coordinate not rejected | low | Real data clean; would corrupt silently. patch |
| 3 | edge | Manifest URL tag not tied to the release label | low | Mislabel risk only on manifest edit. patch |
| 4 | blind, edge | Licence gate runs after the directory check, contrary to its comment | low | `build-geo.ts` order. patch |
| 5 | blind | Dropped rings/polygons are not counted | low | No count in report. patch |
| 6 | blind | Geo CLI accepts and ignores `--vector-only`, `--pin` | low | Shared `parseArgs`. patch |
| 7 | edge | `/library/v1/geo` without slash falls through to the app | low | Prefix check needs trailing slash. patch |
| 8 | blind, edge | Weak assertions; network-error test ignores the cache dir; README top commands lack `pipeline:geo` | low | Direct fixes. patch |
| 9 | blind | Memory peak unmeasured | low | Measured 1.1 GB peak; documented via patch 8. patch |
| 10 | blind | Antimeridian handling undocumented | low | Measured: max |lon| 180, 0 rings with a lon jump over 180; documented via patch 8. patch |
| 11 | blind, edge | Topological validity after simplification unchecked | low | Not verifiable cheaply; documented as unchecked. reject |
| 12 | blind | Empty slug for non-Latin names aborts a future release; hash suffix renames ids across releases | low | Loud failure on a pinned release; versions pin ids. reject |
| 13 | blind | Year pattern accepts `-0`/`012`; dead `..` check; no Cache-Control in dev | low | Harmless aliases, dev only. reject |
| 14 | blind | Feature `id` identical across an entity's states | false | Spec: id is the canonical entity key. reject |
| 15 | blind | `Source.kind` widened, `as string` cast | low | Runtime validation guards it; refactor adds surface. reject |
| 16 | blind | Concurrent runs share staging | low | Single-user local tool. reject |
| 17 | edge | Touching states (end year = next start) abort the run | false | Inclusive years: overlap is correct to refuse; real run passes. reject |
| 18 | gap | No test for a failure inside `swapIn` | low | Swap logic shared and tested with the basemap pipeline. reject |
| 19 | blind | Spec status, empty triage log, `.old` ignore | false | Log filled by this step. reject |

## Design Notes

Decisions taken in planning: the data is already generalised, so the 0.005° tolerance is a fixed, documented level and the size lever is coordinate rounding, not simplification; per-state files (median ~2 KB) keep a date's download near 1 MB and cache per state in Dexie (Story 1.11); the index alone answers « which states are valid at year t » and the nearest state (gaps exist), so Story 1.11 needs no geometry to pick; `/library/v1/` is the layout version and `0.2.0` the dataset version pinned by Projects, so changing the output for the same release means `/library/v2/`; FlatGeobuf and per-Region splits rejected (extra dependency and no Region field in the data); Story 1.8's `datasets.json` stays untouched, Story 1.13 reads both it and `geo/index.json` for credits.

## Verification

**Commands:**
- `npm run check` -- expected: all green
- `npm run pipeline:geo` (sandbox) -- expected: full real build, counts and sizes printed, second run identical
