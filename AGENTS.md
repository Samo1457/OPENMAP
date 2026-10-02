<!-- bmad:context -->
<!-- Verified 2026-09-30 against 1f37ae5. Managed by bmad-project-context; edits inside this block are replaced on refresh. Keep anything you want preserved outside the markers. -->

## OPENMAP

Browser editor for animated historical/geopolitical maps, exported as video. Greenfield: no app code yet (Story 1.1 scaffolds it). Stack and invariants are fixed by the architecture spine; planning lives in `_bmad-output/planning-artifacts/`, delivery tracking in `_bmad-output/implementation-artifacts/`.

## Policy

- Commit directly to `main` only after an independent review by a separate agent (`bmad-code-review` or `bmad-review`) has passed on the change; never push unreviewed work — Cloudflare Pages deploys `main`.
- Never edit `_bmad-output/planning-artifacts/` or `_bmad/` while implementing; report the conflict and route it through `bmad-correct-course` or the owning BMAD skill.
- Write code, comments and commit messages in English; user-facing text only through i18n keys in `fr` and `en` (AD-20).
- Add only dependencies licensed MIT, BSD, ISC, Apache-2.0, 0BSD, Unlicense, BlueOak-1.0.0 or OFL; MPL-2.0 only for unmodified Mediabunny, unmodified build-time `lightningcss` and its platform binaries (required by Tailwind 4 and Vite 8, never shipped), and unmodified dev-only `axe-core` and `@axe-core/playwright` (accessibility e2e check, never shipped), each with an entry in `licence-overrides.json`; never GPL/LGPL/AGPL, and never ODbL, share-alike or non-commercial data (AD-17).
- Never send Project content, media, names or ids over the network; runtime calls go only to the app origin and the data origin (AD-16).
- Never commit secrets; server secrets live in env files on the VPS.

## Definition of Done

- Every new tool, panel or dialog registers its shortcuts in the keyboard registry (`src/ui/keyboard/`), is keyboard-operable, announces its state changes and passes the axe e2e check (`tests/e2e/accessibility.spec.ts`); document key collisions in `docs/keyboard.md`.

## Where things are

- Architecture spine (binding, cite AD ids): `_bmad-output/planning-artifacts/architecture/architecture-OPENMAP-2026-09-29/ARCHITECTURE-SPINE.md` — read every AD a story cites before implementing it.
- Stories and acceptance criteria: `_bmad-output/planning-artifacts/epics.md`; status: `_bmad-output/implementation-artifacts/sprint-status.yaml`.
- UX: `_bmad-output/planning-artifacts/ux-designs/ux-OPENMAP-2026-09-29/DESIGN.md` (tokens, look) and `EXPERIENCE.md` (behaviour, French/English microcopy); mockups in `mockups/` beside them.
- Requirement wording (French): `_bmad-output/planning-artifacts/prds/prd-OPENMAP-2026-09-25/prd.md`.

## Running and verifying

- Node.js 24 LTS (`.nvmrc`); in the sandbox the default `node` is 22, so prefix commands with `PATH=/opt/nvm/versions/node/v24.21.0/bin:$PATH` (install with `. /opt/nvm/nvm.sh && nvm install 24` if missing).
- `npm ci`, then `npm run dev` (http://localhost:5173). `npm run check` runs everything CI runs, in order: `typecheck`, `lint` (oxlint), `depcruise`, `licences`, `test` (Vitest), `build`, `e2e` (Playwright, starts the dev server itself).
- Locally, do not run `playwright install`: set `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium`.
- Every new guardrail gets a violating fixture under `tests/guardrails/fixtures/` asserted in `tests/guardrails/guardrails.test.ts`; fixtures are ignored by the normal lint/typecheck/depcruise runs.
- A new dependency whose licence fails `npm run licences` needs a reviewed entry (`package`, `licence`, `reason`) in `licence-overrides.json`, never a weaker allowlist.
- From Story 4.5 on, keep the preview-vs-export golden test green and extend its fixture for every new element type.

## Conventions that differ from defaults

- Change the Project only through Commands in `src/core/commands`; never mutate the document or store directly (AD-3).
- Animate only inside `evaluate(project, t, ctx)`; no CSS transitions on Map content, no deck.gl `transitions`, no MapLibre `flyTo`/`easeTo` — use `jumpTo` from the Scene (AD-1).
- In `src/core`, never use `Math.random`, `Date.now` or `new Date()`; use `rng(seed)` (AD-2).
- Represent historical dates with `HistoricalDate` (astronomical years), never JS `Date` (AD-13).
- Name domain types with the spine glossary (Étape = `Step`, Carte = `Map`, Kit de Faction = `FactionKit`…), not ad-hoc translations.

<!-- /bmad:context -->
