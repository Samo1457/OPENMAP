---
title: 'Story 1.1: Project scaffold and quality guardrails'
type: 'chore'
created: '2026-09-30'
status: 'done'
baseline_commit: 'f0fd633b19f9069c13caac3953afe4c4014b5a39'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The repo has no app code, so nothing stops later agents from breaking the architecture's layer rules, determinism bans or licence policy.

**Approach:** Scaffold the Vite `react-ts` app on the pinned Stack, create the layer directories, and make every guardrail (typecheck, oxlint AD-1/AD-2 bans, dependency-cruiser layers, AD-17 licence check, Vitest, Playwright smoke) run locally and in GitHub Actions. Cloudflare Pages deploys only after CI passes. Epics.md Story 1.1 ACs are binding.

## Boundaries & Constraints

**Always:** Stack versions from the spine (TypeScript 6.0, Vite 8.3, React 19.3, Tailwind 4.3, shadcn CLI 4.21, oxlint 1.86, dependency-cruiser 18.4, license-checker-rseidelsohn 5.0, Vitest 5.0, Playwright 1.63). Node 24 LTS pinned in `.nvmrc` and `engines`. Every guardrail is proven by a failing fixture, not only a passing tree. Lint messages name AD-1 or AD-2. Dependencies only from the AD-17 allowlist.

**Never:** No theming, fonts or i18n (Story 1.2). No persistence, Dexie or Project model (Stories 1.3/1.4). No visible UI text on the blank page. No runtime third-party requests (AD-16). No secrets in the repo. No edits to `_bmad-output/planning-artifacts/` or `_bmad/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Core imports React / MapLibre / deck.gl / react-dom / `src/i18n` / an adapter | fixture file under `src/core` | `npm run depcruise` fails naming the rule | N/A |
| Adapter imports another adapter's internal file | fixture `src/render/x.ts` → `src/persistence/db.ts` | depcruise fails; importing `src/persistence/index.ts` passes | N/A |
| Core uses `Math.random`, `Date.now`, `performance.now`, `new Date()`, `crypto.getRandomValues` | fixture under `src/core` | oxlint fails, message contains `AD-2` | N/A |
| Any code calls `.flyTo(`/`.easeTo(`/`.panTo(` | fixture outside core | oxlint fails, message contains `AD-1` | N/A |
| Dependency with non-allowlisted licence | e.g. GPL, CC-BY-4.0 | licence check exits non-zero listing the package | passes if listed in `licence-overrides.json` with a non-empty `reason` |
| Lazy chunk fails after redeploy | `vite:preloadError` event | pending saves flushed, page reloads once | second failure in same session does not reload again |

**Decisions:**
- Full spec kept (~1,800 tokens, single goal).
- Work is committed to a new `main` branch created from this work; `main` is the production branch. Its deploy job runs only once `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` exist.

</frozen-after-approval>

## Code Map

- Greenfield: only `AGENTS.md`, `CLAUDE.md`, `_bmad/`, `_bmad-output/` exist. No `package.json`.
- `AGENTS.md` "Running and verifying" block -- replace the TODO with the real commands after this story (explicitly requested by AGENTS.md).
- Spine Design Paradigm table -- source of the dependency-cruiser rules: core may import only `src/core/**`, `immer`, `zod`, `@turf/*`, `nanoid`; adapters (`render`, `export`, `persistence`, `library`, `telemetry`) import each other only via `index.ts`; UI imports adapters only via `index.ts`.
- Environment: Node 22 is default; install Node 24 via `/opt/nvm`. Chromium for Playwright is at `/opt/pw-browsers` (do not run `playwright install` locally).

## Tasks & Acceptance

**Execution:**
- [x] `package.json`, `index.html`, `vite.config.ts`, `tsconfig*.json`, `src/main.tsx`, `src/ui/App.tsx` -- scaffold via `npm create vite@8.3 -- --template react-ts`, pin versions, title "OPENMAP", render an empty root; remove template demo assets -- AC1
- [x] `tsconfig.core.json` -- `src/core` typechecked with `lib` without DOM -- enforces "no DOM in core" beyond imports
- [x] `src/{core,render,export,persistence,library,telemetry}/index.ts`, `src/ui/`, `src/i18n/`, `pipeline/`, `ops/`, `schemas/`, `tests/e2e/` -- create; adapters export an empty public API; empty dirs get a one-line `README.md` -- ARCH-1
- [x] `components.json`, `src/index.css`, `src/ui/lib/utils.ts` -- run `npx shadcn@4.21 init` with Tailwind 4 (`@tailwindcss/vite`), aliases under `@/ui/...`; keep default tokens (Story 1.2 re-themes)
- [x] `.dependency-cruiser.cjs` -- layer rules above
- [x] `.oxlintrc.json` (+ JS plugin under `tools/oxlint/` only if built-in rules cannot express a ban) -- AD-2 bans scoped to `src/core/**`, AD-1 bans everywhere
- [x] `scripts/check-licences.mjs`, `licence-overrides.json` -- run license-checker-rseidelsohn on the full tree (excluding the root private package), handle SPDX `OR`/`AND`, MPL-2.0 only via overrides; overrides need `package`, `licence`, `reason`
- [x] `tests/guardrails/fixtures/**`, `tests/guardrails/guardrails.test.ts` -- Vitest (node env) runs oxlint, depcruise and the licence classifier on violating fixtures and asserts failure + AD message; fixtures excluded from the normal lint/typecheck/depcruise runs
- [x] `src/ui/chunk-reload.ts` + `src/persistence/index.ts` `flushPendingSaves()` (no-op until Story 1.4) + unit test -- AD-19 once-only reload
- [x] `playwright.config.ts`, `tests/e2e/smoke.spec.ts` -- Chromium, starts dev server, asserts title "OPENMAP" and no page errors
- [x] `.github/workflows/ci.yml` -- on every push: `npm ci`, typecheck, lint, depcruise, licences, Vitest, build, Playwright; `deploy` job needs CI, runs `wrangler pages deploy dist --branch <ref>` (main = prod, others = previews); skips with a notice when `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` are absent
- [x] `.nvmrc`, `engines`, `.gitignore` -- Node 24 pin
- [x] `README.md` -- plain-French section: install, `npm run dev`, each check, `npm run check` (all), Cloudflare setup (secrets, disable Pages Git auto-deploy)
- [x] `AGENTS.md` -- refresh "Running and verifying"

**Acceptance Criteria:**
- Given a fresh clone on Node 24, when `npm ci && npm run check` runs, then typecheck, oxlint, dependency-cruiser, licence check, Vitest, build and Playwright all pass.
- Given `npm run dev`, when the page opens, then it is blank and titled "OPENMAP" with no console errors and no third-party requests.
- Given a push, when CI finishes green on `main`, then the deploy job deploys to Cloudflare Pages production; on another branch it deploys a preview; a red CI never deploys.

## Design Notes

- Once-only reload guard: a `sessionStorage` flag (transient per-tab UI state, not Project data; AD-8 only bans localStorage for persistence).
- Pages project name comes from repo variable `CLOUDFLARE_PAGES_PROJECT`, default `openmap`.

## Verification

**Commands:**
- `npm run check` -- expected: all guardrails pass
- `npx vitest run tests/guardrails` -- expected: every violating fixture is rejected with the right AD id

## Implementation Notes

- `npx shadcn@4.21 init` could not complete: the sandbox egress policy denies `ui.shadcn.com` (403), and the CLI fetches its preset from there. `components.json`, `src/index.css` (neutral default tokens, `tw-animate-css`, `shadcn/tailwind.css`) and `src/ui/lib/utils.ts` were written by hand to match the CLI output for `-t vite -b radix -p nova` without the Geist font (fonts are Story 1.2); `npx shadcn info` reads the config back correctly. Re-run the real init where the host is reachable if exact CLI output matters.
- `create-vite@8.3` still emits Vite 7 / TS 5.9 / ESLint; versions were bumped to the spine Stack (Vite 8.3.1, TS 6.0.3, React 19.3.0, `@vitejs/plugin-react` 6.1.1) and ESLint was dropped in favour of oxlint.
- AD-2 `new Date()`/`Date.now` are enforced with `no-restricted-globals` on `Date` in `src/core/**` (also covers AD-13); `performance` and `crypto` globals are banned there too. No JS plugin was needed.
- Licence overrides (reviewed, dev/build-time only): `lightningcss`/`lightningcss-*` (MPL-2.0, required by Vite 8 and Tailwind 4 — AGENTS.md names only Mediabunny for MPL-2.0, flag for owner), `argparse` (Python-2.0), `caniuse-lite` (CC-BY-4.0), `spdx-exceptions`, `spdx-license-ids`, `spdx-ranges`. Any expression naming a GPL-family id is refused even as a dual licence (AD-17).
- Playwright 1.63 expects a newer Chromium than `/opt/pw-browsers`; `PLAYWRIGHT_CHROMIUM_EXECUTABLE` lets local runs use the preinstalled one, CI runs `playwright install --with-deps chromium`.

## Spec Change Log

## Review Triage Log

| # | Source | Finding | Verdict | Evidence / route |
|---|--------|---------|---------|------------------|
| 1 | blind | package-lock.json missing | false | Lockfile exists; excluded from the review diff only for size. |
| 2 | blind, gap, edge | GPL (and share-alike/NC/ODbL) passes through an override | medium | `checkPackages` consults overrides for every refused licence; AD-17/AGENTS.md say never. patch |
| 3 | blind, gap | lightningcss MPL-2.0 override vs AGENTS.md "MPL only for Mediabunny" | medium | Tailwind 4/Vite 8 (spine Stack) require lightningcss; AD-17 allows unmodified MPL deps via override, AGENTS.md is narrower. Fix edits AGENTS.md → defer + owner decision |
| 4 | blind, edge | Flush failure consumes the once-only flag with no reload | low | Flag set before flush; on reject it stays set. Direct fix: clear flag on flush failure. patch |
| 5 | blind | Once-only flag never cleared; second redeploy in same tab never recovers | medium | Real, but the frozen matrix row mandates "second failure in same session does not reload again"; rejected as intended, reported to owner |
| 6 | blind, edge | Other animated MapLibre camera methods (fitBounds, zoomTo, panBy, rotateTo…) not banned | medium | AD-1 bans "any MapLibre-driven animation"; only 3 names listed. patch |
| 7 | blind | deck.gl `transitions` / CSS transitions on Map content have no guardrail | medium | Real; not expressible with a trivial rule. defer |
| 8 | gap, blind, edge | core override AD-1 entries, `globalThis.*` bans, not-to-unresolvable, npm lib in core lack failing fixtures | medium | Pre-verified by gap layer (deleting entries keeps suite green). patch |
| 9 | gap, blind | Playwright smoke runs dev server, not deployed `dist` | medium | Pre-verified. patch (CI uses `vite preview`) |
| 10 | gap | main.tsx chunk-reload wiring untested | low | No lazy chunks, flush no-op yet. defer (filed disposition) |
| 11 | blind, gap, edge | `src/main.tsx` (top-level src files) not covered by index-only rule | medium | No `from` pattern matches `^src/main.tsx`. patch |
| 12 | blind, edge | core `*.test.ts` exempt from pure-libs rule entirely | low | `pathNot: '\\.test\\.ts$'` exempts all libs, comment says vitest only. Direct fix. patch |
| 13 | blind | No `no-circular` rule | false | Not required by the spine; no named harm. rejected |
| 14 | blind | sprint-status in-progress vs spec in-review | false | Workflow syncs sprint status at present step. |
| 15 | blind | Every branch deploys a public preview | false | AC requires branch previews. |
| 16 | blind | Workflow-level cancel-in-progress can cancel a running deploy | low | Newer run deploys newer code anyway; negligible. rejected |
| 17 | blind | Wrangler via npx outside lockfile and licence gate | low | CI-only tool, but an unchecked dependency. defer |
| 18 | blind | tsconfig.core includes core tests (vitest types may add globals) | low | oxlint still bans the globals; no DOM added. rejected |
| 19 | blind | AGENTS.md hardcodes sandbox paths | low | Fix edits AGENTS.md. defer |
| 20 | edge | Bare `*` / broad override prefix | low | No such override; entries are reviewed. rejected |
| 21 | edge | Root package without name | false | package.json has `name: openmap`. |
| 22 | edge | Unused overrides do not fail | low | Unlikely harm; stale entry still needs exact licence match. rejected |
| 23 | edge | flush never settles | low | Adds timeout complexity; flush is no-op. rejected |
| 24 | edge | Several preloadError events before reload skip preventDefault | low | Only extra console error before reload. rejected |
| 25 | edge | deps.reload throws | false | `location.reload` does not throw in supported browsers. |
| 26 | edge | Foreign WebSocket not detected by smoke test | low | No WebSocket beyond same-origin HMR; speculative. rejected |
| 27 | edge | oxlint JSON parse fragile | low | Failure is loud, not silent. rejected |
| 28 | edge | Tag push deploys a preview named after the tag | low | `on: push` has no branch filter. Direct fix. patch |
| 29 | edge | Node pin not enforced by npm (no engine-strict) | low | Direct fix `.npmrc engine-strict=true`. patch |
