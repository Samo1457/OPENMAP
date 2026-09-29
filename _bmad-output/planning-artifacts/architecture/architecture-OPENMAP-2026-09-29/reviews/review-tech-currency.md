---
review: tech-currency
target: ARCHITECTURE-SPINE.md (OPENMAP v1, draft 2026-09-29)
lens: "Every committed decision web-researched or reality-checked: current versions, each named technology still exists and fits, live defaults of the starter it leans on"
reviewed: 2026-09-29
method: npm view (registry, live), scratch install of the runtime tree + licence walk, raw GitHub docs/changelogs (deck.gl, MapLibre, go-pmtiles, create-vite, shadcn, Mediabunny), web search. deck.gl.gl / developers.cloudflare.com / MDN / GitHub API were blocked by the egress proxy; equivalents were read from raw.githubusercontent.com or search results.
verdict: CHANGES REQUIRED (1 high, 5 medium, 6 low). Versions themselves are current and correct; the problems are fit/compatibility claims that were asserted, not checked.
---

# Tech-currency review — OPENMAP v1 architecture spine

## Verdict

**Changes required before build.** Every version number in the Stack table matches `npm view` today (2026-09-29), and the memlog shows versions and licences were checked. What was *not* checked is whether the chosen pieces fit together as described. One of them does not: AD-6/Stack name `@deck.gl/mapbox` `MapboxOverlay`, which is no longer the supported integration for MapLibre GL JS 6 in deck.gl 9.4. TypeScript 7 also breaks two defaults the build leans on (the typescript-eslint JS API, and `baseUrl` in the shadcn Vite setup). The CI licence gate in AD-17 would fail on the current dependency tree as written.

## Findings

### F1 — HIGH — AD-6 / Stack: wrong deck.gl integration package for MapLibre 6
- **Claim:** "deck.gl layer in `MapboxOverlay` interleaved mode"; Stack row `deck.gl (@deck.gl/core, @deck.gl/mapbox) 9.4`.
- **Reality:**
  - deck.gl 9.4 added a dedicated `@deck.gl/maplibre` module (changelog: "Add @deck.gl/maplibre for MapLibre GL JS v4/5/6 (#10566)"). The current deck.gl doc `using-with-maplibre.md` says: *"MapLibre GL JS v4.5.1, v5, and v6 applications should use `MapLibreOverlay` from `@deck.gl/maplibre`"*. Interleaving means `MapLibreOverlay({interleaved: true})`.
  - `npm view @deck.gl/maplibre@9.4.0 peerDependencies` → `maplibre-gl: ^4.5.1 || ^5.0.0 || ^6.0.0`. `@deck.gl/mapbox@9.4.0` declares no maplibre-gl peer at all. deck.gl RFC #10501 records that the mapbox integration read MapLibre's private `map.transform`, which v6 removed.
  - Open deck.gl issue #10700: with `MapLibreOverlay({interleaved: true})` on MapLibre 6.x, deck layers placed below basemap labels corrupt later MapLibre layers (labels shrink, grow or vanish). The root cause (MapLibre #8413) was fixed by MapLibre PR #8406 and shipped in **maplibre-gl 6.9.1** (CHANGELOG). 6.11.2 includes the fix, but the deck.gl issue is still open.
- **Fix:** Stack row → `deck.gl (@deck.gl/core, @deck.gl/layers, @deck.gl/maplibre) 9.4`. In AD-6, replace "`MapboxOverlay`" with "`MapLibreOverlay` (`@deck.gl/maplibre`, `interleaved: true`)". Add `maplibre-gl >= 6.9.1` as a floor. Add a P0 spike story: render a deck fill under basemap labels (`beforeId`) and check the labels in both edit and export. Fall back to overlaid mode (`interleaved: false`) if #10700 still reproduces. AD-6 does not strictly need label interleaving; it only needs a single z-order.

### F2 — MEDIUM — Stack: TypeScript 7.0 breaks the default lint path and starter defaults
- **Reality (verified):**
  - `typescript@7.0.2` is `latest` (released 2026-07-08, the Go-native compiler). Its `exports["."]` is `./lib/version.cjs` plus `./unstable/*`, so there is **no stable JS API**. The stable API is expected in 7.1.
  - `typescript-eslint@8.71.0` has peer `typescript: ">=4.8.4 <6.1.0"`, so it **cannot run on TS 7**.
  - The live `create-vite@9.2.1` `template-react-ts` pins `"typescript": "~6.0.2"` and lints with **oxlint** 1.85 (not ESLint). The spine's Vite starter therefore does not default to TS 7.
  - TS 7 **removed `baseUrl`** (error TS5102), but the current shadcn Vite install doc still tells users to add `"baseUrl": "."` + `paths` to `tsconfig.json` and `tsconfig.app.json`.
- **Impact:** AD-2 says "a lint rule enforces the ban" and CI runs lint, but no linter is named. If a coding agent picks ESLint + typescript-eslint, the install fails or needs a second TS 6 copy. If it follows the shadcn doc verbatim, typecheck fails.
- **Fix:** Add a Stack row `oxlint 1.86 (MIT)` and state AD-2's ban via `no-restricted-globals` (`Date` inside `src/core`, as permitted by AD-13) plus `no-restricted-properties` (`Math.random`, `Date.now`, `performance.now`, `crypto.getRandomValues`). Both rules are supported by oxlint. Add a convention: "tsconfig uses `paths` relative to the config file, no `baseUrl` (TS 7)". Alternative: pin `typescript ~6.0.3` for tooling and use TS 7 `tsc` only for typecheck. Whichever you choose, record it.

### F3 — MEDIUM — AD-17: the licence allowlist fails on today's dependency tree
- **Reality (scratch install of the runtime stack, 299 packages, licence walk):** outside MIT/BSD/ISC/Apache/MPL(Mediabunny) there are:
  - `jsts@2.7.1` and `@turf/jsts@2.7.2`: `(EDL-1.0 OR EPL-1.0)`, pulled in by `@turf/buffer` through `@turf/turf`. EDL-1.0 is BSD-3 style, so choosing EDL is permissive. EPL is weak copyleft.
  - `robust-predicates` 2.0.4/3.0.3: `Unlicense` (via turf point-in-polygon, convex, line-intersect).
  - `0BSD`; `arc@0.2.0` declares `BSD` (non-SPDX); `splaytree-ts@1.0.2` declares `BDS-3-Clause` (typo); `@maplibre/mlt` `(MIT OR Apache-2.0)` is fine.
- **Impact:** the "CI runs a licence check" rule will go red on day 1, or, worse, someone will widen it ad hoc.
- **Fix:** Extend the AD-17 allowlist to include `0BSD`, `Unlicense`, and `EDL-1.0` (elected from EDL/EPL dual). Add a reviewed override list for non-SPDX strings (`arc: BSD`, `splaytree-ts: BDS-3-Clause`). Better still, import individual `@turf/*` modules instead of `@turf/turf`, which drops jsts unless buffer is really needed. The Stack row should read `@turf/* 7.4 (per-module)`.

### F4 — MEDIUM — AD-16 / Stack: Umami v3 now ships session replay, heatmaps and auto-tracking; the spine does not fence them off
- **Reality:** Umami 3.1 (2026-04) added session replay. 3.2 (2026-06) added heatmaps. 3.3.1 added web vitals. **3.4.0 is out** (Sept 2026: MCP, API keys, `data-distinct-id` attribute). Replay/heatmaps are enabled per website in the dashboard and need a separate `/recorder.js`. The standard tracker also auto-sends pageviews (URL, referrer, screen, language) by default. The memlog notes "replay/heatmaps à désactiver", but that constraint never made it into the spine.
- **Fix:** Stack → `Umami 3.4 (MIT, Docker, PostgreSQL)` (or keep 3.3 and say why). In AD-16, add: "Load the Umami tracker only after consent, with `data-auto-track="false"`, or post directly to `/api/send` from `src/telemetry`. Never load `recorder.js`. Keep Replays and Heatmaps off for the site. Never set `data-distinct-id`." This matches "no event is sent before explicit consent" (fetching the script is itself a request to the telemetry origin).

### F5 — MEDIUM — AD-18: `pmtiles serve` URL shape and CDN caching are asserted, not checked
- **Reality (go-pmtiles README):** `pmtiles serve` exposes `/{TILESET}/{z}/{x}/{y}.mvt` (with an extension; rasters use their own extension). It needs `--public-url` for TileJSON and `--cors` for origins, and the README recommends a CDN/reverse proxy in front. On the Cloudflare free plan, `.mvt`, `.pbf`, `.json` and extensionless responses are **not cached by default**. Only the default extension list (png, webp, js, css, …) is cached. Without a Cache Rule, every vector tile and every Library JSON goes to the VPS, which defeats "tiles served in a way the CDN can cache".
- **Fix:** AD-18 → `/{tileset}/{z}/{x}/{y}.{mvt|webp}`. Add: "a Cloudflare Cache Rule marks `data.<domain>/*` as eligible for cache with Edge TTL respecting origin `Cache-Control`. The reverse proxy sets long-lived `Cache-Control` on tile responses and `immutable` on versioned Library paths." Also verify go-pmtiles 1.31.2 (memlog) against the releases page before the ops story. I could not reach it from this session.

### F6 — MEDIUM — Hosting: Cloudflare Pages is in maintenance mode; Workers static assets is the recommended target
- **Reality:** Cloudflare says Pages is *not deprecated*, but new investment goes to Workers. Since 2026, Workers static assets has feature parity for static sites (free static-asset serving, `preview_urls` per version/branch), and Cloudflare recommends Workers for new projects, with a Pages→Workers migration guide. The memlog's cost check covered this, but the choice still reads "Pages".
- **Fix:** Either switch to "Cloudflare Workers static assets (app), `preview_urls: true`" or keep Pages with a one-line rationale. Both satisfy AD-18 because the origin is fixed and the host is swappable. Low effort now, avoids a migration later.

### F7 — LOW — Node.js 24 LTS moves to maintenance in 3 weeks
- Node 24 enters Maintenance LTS on 2026-10-20 (EOL 2028-04-30). Node 26 becomes Active LTS on 2026-10-28. vitest 5 (`^22.12 || ^24 || >=26`), nanoid 6 (`^22 || ^24 || >=26`), and vite 8 all accept both.
- **Fix:** "Node.js 24 LTS (tooling); move to 26 LTS once Active (≥ 2026-10-28)". Pin in `.nvmrc` and in the Actions `setup-node` step.

### F8 — LOW — AD-7: encoding path described twice; the feature test is under-specified
- Mediabunny 1.61 (MPL-2.0, zero runtime deps, only `@types/dom-webcodecs`) is confirmed. Its README shows `Output` + `Mp4OutputFormat` + `CanvasSource(canvas, {codec: 'avc'})`, where Mediabunny drives `VideoEncoder` itself. `mp4-muxer` is deprecated in favour of it, as the memlog says. AD-7 says "captures into a `VideoFrame` and encodes with `VideoEncoder` … muxed by Mediabunny", which invites a hand-rolled encoder alongside Mediabunny's own.
- **Fix:** "Encode through Mediabunny (`CanvasSource`/`VideoSampleSource`, codec `avc`), which uses WebCodecs; feature-test with `VideoEncoder.isConfigSupported({codec:'avc1.640028', width:1920, height:1080})` (or Mediabunny `canEncode`)." Note that open-source Chromium builds (some Linux distros) may lack an H.264 encoder, so the feature test is required, not just belt-and-braces. For canvas capture, set MapLibre `canvasContextAttributes: {preserveDrawingBuffer: true}` on the export map, or capture synchronously after `render`. I did not verify this detail against the MapLibre 6 docs.

### F9 — LOW — Stack incomplete for peer requirements
- `@deck.gl/layers@9.4.0` peers: `@luma.gl/core ~9.4`, `@luma.gl/engine ~9.4`, `@loaders.gl/core ^4.4.3`. `@deck.gl/maplibre` peers `@luma.gl/core ~9.4`. The Vite React plugin (`@vitejs/plugin-react 6.1.1`, peer `vite ^8`) and `@tailwindcss/vite 4.3.3` (peer `vite ^5.2–^8`) are implied but not listed.
- **Fix:** list `@deck.gl/layers`, `@luma.gl/*` 9.4 and the two Vite plugins, or add a note that peers are installed explicitly at the same minor version. MapLibre 6 with Vite needs `setWorkerUrl(… maplibre-gl-worker.mjs?worker&url)` per the deck.gl example. Add that to the render adapter story.

### F10 — LOW — `navigator.storage.persist()` behaves differently than AD-8 implies
- Chromium grants or denies **silently** on engagement heuristics (bookmarked or installed site, notifications permission). Firefox prompts. On a fresh visit Chrome often returns `false`.
- **Fix:** AD-8 should treat `false` as the normal case: the storage banner plus "export Project File" is the real safety net. Consider a PWA manifest (installability raises the grant odds). No architecture change needed.

### F11 — LOW — Web Locks / BroadcastChannel (AD-15) not re-checked in memlog
- Both APIs have been Baseline across Chrome, Edge, Firefox and Safari since 2022 (Web Locks: Chrome 69, Firefox 96, Safari 15.4). Both require a secure context, which the HTTPS origin provides. I could not re-fetch MDN (blocked). This is low risk and fits the Chrome/Edge target. The only note: `localhost` counts as a secure context in dev.

### F12 — LOW — Umami version in memlog is inconsistent
- The memlog lists `umami 2.10 MIT` (the stale npm package; Umami is not distributed on npm) next to "v3 3.3.1 / 3.4.0". The spine uses 3.3. See F4. Source the version from the Docker image `ghcr.io/umami-software/umami`, not from npm.

## Verified OK (no action)

| Item | Spine | Live check (2026-09-29) | Licence | Notes |
| --- | --- | --- | --- | --- |
| React / react-dom | 19.3 | 19.3.0 | MIT | create-vite template uses ^19.3.0 |
| Vite | 8.3 | 8.3.1 (node ^20.19 \|\| >=22.12) | MIT | |
| TypeScript | 7.0 | 7.0.2 latest (GA 2026-07-08) | Apache-2.0 | see F2 |
| MapLibre GL JS | 6.11 | 6.11.2 | BSD-3 | ≥6.9.1 needed for custom-layer fix (F1) |
| deck.gl | 9.4 | 9.4.0 (core/layers/mapbox/maplibre) | MIT | package change, F1 |
| Mediabunny | 1.61 | 1.61.0, CanvasSource `avc` → MP4 | MPL-2.0 | AD-17 exception fits (unmodified use) |
| Tailwind CSS | 4.3 | 4.3.3 (+ @tailwindcss/vite 4.3.3, peer vite ≤8) | MIT | |
| shadcn CLI | 4.21 | 4.21.0; Vite doc uses Tailwind 4 `@import "tailwindcss"` + React 19 | MIT | runtime deps radix-ui 1.6.7 MIT, cva 0.7.1 Apache-2.0, clsx MIT, tailwind-merge 3.7 MIT, tw-animate-css MIT; `baseUrl` caveat F2 |
| Dexie | 4.4 | 4.4.6 | Apache-2.0 | |
| Zustand | 5.0 | 5.0.15 (peer immer >=9, react >=18) | MIT | |
| Immer | 11.1 | 11.1.18 | MIT | |
| Zod | 4.6 | 4.6.5 | MIT | |
| Turf | 7.4 | 7.4.0 | MIT | transitive licences F3 |
| fflate | 0.8 | 0.8.3 | MIT | |
| nanoid | 6.0 | 6.0.1 | MIT | |
| i18next / react-i18next | 26.4 / 17.0 | 26.4.2 / 17.0.15; react-i18next peer `i18next >= 26.2.0`, both accept TS ^7 | MIT | compatible |
| lucide-react | 1.48 | 1.48.0 (peer react ^19) | ISC | |
| Vitest | 5.0 | 5.0.2 (peer vite ^8; node ^24) | MIT | |
| Playwright | 1.63 | 1.63.0 | Apache-2.0 | |
| pmtiles JS | 4.5 | 4.5.0 (dep fflate) | BSD-3 | |
| go-pmtiles | 1.31 | README confirms `serve` ZXY; release tag not re-reachable | BSD-3 | F5 |
| Umami | 3.3 | 3.4.0 current | MIT | F4 |
| Node.js | 24 LTS | Active LTS → Maintenance 2026-10-20 | — | F7 |
| Fonts | Libre Baskerville, Source Sans 3 | @fontsource 5.3.0 both OFL-1.1 | OFL | self-host from fontsource or Google Fonts files |

## Sources
- npm registry (`npm view`), run 2026-09-29, and scratch install licence walk
- deck.gl `docs/developer-guide/base-maps/using-with-maplibre.md` and `CHANGELOG.md` (raw.githubusercontent.com, master)
- deck.gl issues [#10700](https://github.com/visgl/deck.gl/issues/10700), [#10501](https://github.com/visgl/deck.gl/issues/10501); MapLibre [#8413](https://github.com/maplibre/maplibre-gl-js/issues/8413), CHANGELOG 6.9.1 (#8406)
- create-vite `template-react-ts/package.json` + `tsconfig.app.json` (vitejs/vite main)
- shadcn `apps/v4/content/docs/installation/vite.mdx` (shadcn-ui/ui main)
- go-pmtiles README (`serve` section); Mediabunny README
- [InfoQ: TypeScript 7.0 released](https://www.infoq.com/news/2026/08/typescript-7-released/); [TS #62207 baseUrl removal](https://github.com/microsoft/TypeScript/issues/62207)
- [oxlint no-restricted-properties](https://oxc.rs/docs/guide/usage/linter/rules/eslint/no-restricted-properties), [no-restricted-globals](https://oxc.rs/docs/guide/usage/linter/rules/eslint/no-restricted-globals)
- [Umami v3.4](https://umami.is/blog/umami-v3.4), [Umami replays docs](https://docs.umami.is/docs/replays), [Umami 3.2 heatmaps (heise)](https://www.heise.de/en/news/Umami-3-2-0-Heatmaps-and-improved-web-analytics-11347552.html)
- [endoflife.date Node.js](https://endoflife.date/nodejs)
- [Cloudflare Pages→Workers migration guide](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/), [Pages vs Workers 2026](https://cogley.jp/articles/cloudflare-pages-to-workers-migration)
- [Cloudflare Cache Rules](https://developers.cloudflare.com/cache/how-to/cache-rules/), [what is cacheable](https://stackharbor.com/en/knowledge-base/cf-cache-rules-cacheability/)
- [web.dev Persistent storage](https://web.dev/articles/persistent-storage)
