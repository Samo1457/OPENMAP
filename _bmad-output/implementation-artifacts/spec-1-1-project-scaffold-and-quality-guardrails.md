---
title: 'Story 1.1: Project scaffold and quality guardrails'
type: 'chore'
created: '2026-09-30'
status: 'in-progress'
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
- [ ] `package.json`, `index.html`, `vite.config.ts`, `tsconfig*.json`, `src/main.tsx`, `src/ui/App.tsx` -- scaffold via `npm create vite@8.3 -- --template react-ts`, pin versions, title "OPENMAP", render an empty root; remove template demo assets -- AC1
- [ ] `tsconfig.core.json` -- `src/core` typechecked with `lib` without DOM -- enforces "no DOM in core" beyond imports
- [ ] `src/{core,render,export,persistence,library,telemetry}/index.ts`, `src/ui/`, `src/i18n/`, `pipeline/`, `ops/`, `schemas/`, `tests/e2e/` -- create; adapters export an empty public API; empty dirs get a one-line `README.md` -- ARCH-1
- [ ] `components.json`, `src/index.css`, `src/ui/lib/utils.ts` -- run `npx shadcn@4.21 init` with Tailwind 4 (`@tailwindcss/vite`), aliases under `@/ui/...`; keep default tokens (Story 1.2 re-themes)
- [ ] `.dependency-cruiser.cjs` -- layer rules above
- [ ] `.oxlintrc.json` (+ JS plugin under `tools/oxlint/` only if built-in rules cannot express a ban) -- AD-2 bans scoped to `src/core/**`, AD-1 bans everywhere
- [ ] `scripts/check-licences.mjs`, `licence-overrides.json` -- run license-checker-rseidelsohn on the full tree (excluding the root private package), handle SPDX `OR`/`AND`, MPL-2.0 only via overrides; overrides need `package`, `licence`, `reason`
- [ ] `tests/guardrails/fixtures/**`, `tests/guardrails/guardrails.test.ts` -- Vitest (node env) runs oxlint, depcruise and the licence classifier on violating fixtures and asserts failure + AD message; fixtures excluded from the normal lint/typecheck/depcruise runs
- [ ] `src/ui/chunk-reload.ts` + `src/persistence/index.ts` `flushPendingSaves()` (no-op until Story 1.4) + unit test -- AD-19 once-only reload
- [ ] `playwright.config.ts`, `tests/e2e/smoke.spec.ts` -- Chromium, starts dev server, asserts title "OPENMAP" and no page errors
- [ ] `.github/workflows/ci.yml` -- on every push: `npm ci`, typecheck, lint, depcruise, licences, Vitest, build, Playwright; `deploy` job needs CI, runs `wrangler pages deploy dist --branch <ref>` (main = prod, others = previews); skips with a notice when `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` are absent
- [ ] `.nvmrc`, `engines`, `.gitignore` -- Node 24 pin
- [ ] `README.md` -- plain-French section: install, `npm run dev`, each check, `npm run check` (all), Cloudflare setup (secrets, disable Pages Git auto-deploy)
- [ ] `AGENTS.md` -- refresh "Running and verifying"

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

## Spec Change Log

## Review Triage Log
