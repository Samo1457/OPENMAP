---
title: 'Story 1.3: Core Project model, Commands and undo engine'
type: 'feature'
created: '2026-10-01'
status: 'in-progress'
baseline_commit: 'bfe5dd6da8312e8dd4d3c11f75f4bd4c884fcd61'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** No Project document or Command system exists, so no screen can create or edit a Project safely, undoably and deterministically.

**Approach:** Build in pure `src/core` the v1 Project model (Zod schema + committed JSON Schema snapshot + migration registry), the Command system (`apply` returning the new Immer document and its inverse), a history engine (multi-level undo/redo, `clear()`), and a dispatcher with a read-only mode, plus the first Project-level Commands. Epics.md Story 1.3 ACs (AD-2, 3, 4, 9, 12, 13, 24, 25) are binding.

## Boundaries & Constraints

**Always:** Core stays pure: no I/O, no clock, no ambient randomness (AD-2); ids and seed are generated outside `apply` and passed in, so apply and redo are deterministic. Every Command has an inverse and a unit test. Commands are `{type: SCREAMING_SNAKE, payload}`. Expected failures return `Result<T, DomainError{code, params}>`; only programmer errors throw. Domain names follow the spine glossary. `revision` increases on apply, undo and redo and never decreases. Dependencies pinned exactly: zod 4.6.x, immer 11.1.x, nanoid 6.0.x.

**Never:** No UI, persistence, i18n import or autosave (Stories 1.4/1.5). No Territories, Factions, Steps editing or Timeline Commands (later epics). No speculative fields beyond the AC list: later fields arrive through a new schemaVersion and migration (AD-9).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Blank Project | `{id, seed, name, mapLocale}` | v1 doc: schemaVersion 1, revision 0, referenceDate `{year:1900}`, basemap parchment with no adjustment overrides, outputFormat `16:9`, one Step, five Layers in order territories/arrows/tokens/texts/images, empty factions and members; validates against the schema | N/A |
| Apply → undo | any Command | undo restores a deep-equal doc except `revision`; revision went up twice | N/A |
| Redo after new Command | undo, then dispatch another Command | redo stack empty, `canRedo` false | N/A |
| Compound | `BATCH` of N Commands | one undo entry reverts all N | any invalid member → whole batch rejected, doc unchanged |
| Read-only | dispatcher read-only, dispatch/undo/redo | `DomainError{code:'read_only'}`, doc and history unchanged | N/A |
| Invalid payload | e.g. outputFormat `4:3`, month 13 | `DomainError{code:'invalid_payload'}`, doc unchanged | N/A |
| No-op Command | value equal to current | no history entry, revision unchanged | N/A |
| Schema drift | schema edited without new version + snapshot | `npm run test` fails with instructions | N/A |
| Newer document | `schemaVersion` > current | `migrate` returns `DomainError{code:'schema_too_new'}` | caller opens read-only (Story 1.4) |

**Decisions:**
- Default name: "Projet sans titre" / "Untitled project" in the UI language at creation; the UI passes it to `createBlankProject` (core has no i18n).
- Name rules: trimmed, 1–120 characters; an empty (after trim) or longer name is refused with `invalid_payload` and the previous name is kept.
- Reference-date year range: −10000 to 2100 inclusive, astronomical years (year 0 = 1 BCE).
- Undo depth: 100 entries; the oldest entry is dropped beyond that.
- Full spec kept (~1,700 tokens).

</frozen-after-approval>

## Code Map

- `src/core/index.ts` -- `export {}` today; becomes the public core API.
- `.dependency-cruiser.cjs:4,33-41` -- already allows immer, zod, nanoid, `@turf/*` in core; `tsconfig.core.json` -- ES2023, no DOM.
- `.oxlintrc.json` -- bans Date/performance/crypto/Math.random in `src/core/**`; nanoid internals are not flagged.
- `schemas/README.md` -- only file; snapshot goes here.
- `src/persistence/index.ts:14` -- `LanguagePreference 'fr'|'en'`; core must define its own `MapLocale` (cannot import adapters).
- `tests/guardrails/` -- add a violating fixture for the snapshot check (AGENTS.md rule).
- Not installed: zod 4 / immer / nanoid 6 as direct deps (only transitive zod 3, nanoid 3).
- Basemap ids `parchment | sombre | clair | relief`; adjustments (DESIGN.md:356-363): brightness −50..+50, saturation −100..+50, tint `#RRGGBB` + intensity 0..60; each stored as an optional override (absent = Basemap default).

## Tasks & Acceptance

**Execution:**
- [ ] `package.json` -- add zod, immer, nanoid pinned; `schema:snapshot` script
- [ ] `src/core/ids.ts` -- branded ids (`ProjectId`, `StepId`, `LayerId`…), `newId()` (nanoid) for the shell, deterministic id factory for tests
- [ ] `src/core/result.ts` -- `Result`, `DomainError`, error codes
- [ ] `src/core/dates/historical-date.ts` -- `HistoricalDate {year, month?, day?}` + validation (day-in-month, year −10000..2100)
- [ ] `src/core/model/` -- types, Zod schema v1, `createBlankProject({id, seed, name, mapLocale, stepId, layerIds})`, `duplicateProject(project, newId)` (keeps seed)
- [ ] `src/core/schema/` -- `CURRENT_SCHEMA_VERSION`, `migrate(doc)` registry (v1 identity), `validate`, `schemas/project-v1.schema.json` via `z.toJSONSchema`
- [ ] `src/core/commands/` -- `apply(project, command)` → `Result<{project, inverse}>`; `SET_PROJECT_NAME`, `SET_OUTPUT_FORMAT`, `SET_MAP_LOCALE`, `SET_BASEMAP`, `SET_BASEMAP_ADJUSTMENTS`, `SET_REFERENCE_DATE`, `BATCH`
- [ ] `src/core/history/` -- dispatcher: `dispatch`, `undo`, `redo`, `canUndo`, `canRedo`, `clear()`, `setReadOnly`, `reset(project)`, `subscribe(listener)`, `getState()`; depth 100
- [ ] tests -- one unit test file per Command (apply + inverse), history matrix rows, determinism (same inputs → deep-equal output), snapshot test + migration test + violating fixture in `tests/guardrails/`

**Acceptance Criteria:**
- Given `npm run check`, when it runs, then typecheck (core without DOM), lint (AD-2 bans), depcruise (core imports only pure libs), licences and all tests pass.
- Given `src/core`, when grepped, then it imports nothing from React, i18n, DOM or adapters, and calls no clock or ambient randomness.

## Verification

**Commands:**
- `npm run check` -- expected: all green
- `npx vitest run src/core tests/guardrails` -- expected: Command, history, schema snapshot and migration tests pass

## Implementation Notes

## Spec Change Log

## Review Triage Log
