---
title: 'Story 1.2: Visual identity, themes and languages'
type: 'feature'
created: '2026-10-01'
status: 'draft'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-OPENMAP-2026-09-29/DESIGN.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The app still wears the default shadcn look, has no fonts, no theme and no languages, so every later screen would be built on the wrong foundation.

**Approach:** Implement the DESIGN.md design-system layer (chrome tokens with light/dark values, mono tokens, type, spacing, radius, elevation, hit-area, focus ring), self-host the fonts, add a System · Light · Dark theme persisted in a Dexie `preferences` table, and add i18next `fr`/`en` with instant switching and a CI check for missing keys. Epics.md Story 1.2 ACs (UX-DR1–28, 102, 150, 151, 153) are binding.

## Boundaries & Constraints

**Always:** Token values copied from DESIGN.md frontmatter (`:17-265`) and the resolution rule at `:294`; shadcn variables mapped per `DESIGN.md:326`; every UI string is an i18next key present in both `fr` and `en`; fonts served from the app origin (AD-16); preferences only through `src/persistence/index.ts` (AD-8, no localStorage); Map colours never come from CSS tokens (AD-6).

**Never:** No Settings dialog, Home or Editor shell (Stories 1.4–1.6). No Project data in Dexie yet (Story 1.4). No `mapLocale` logic (Story 1.3). No CDN or Google Fonts request. Never use `accent` in a `map-*`/`canvas-*` value.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First launch, OS dark | no stored theme, `prefers-color-scheme: dark` | dark tokens applied before first paint of content | N/A |
| User picks Light | stored `system`, OS dark | light tokens at once, stored `light`, survives reload | N/A |
| `system` and OS changes | stored `system`, OS switches | theme follows without reload | N/A |
| Switch fr → en | UI in French | every visible string in English at once, `<html lang>` updated, choice persisted | N/A |
| Missing key | key in `fr` not in `en` (or reverse) | `npm run test` fails naming the key | N/A |
| IndexedDB unavailable | Dexie open fails | app still renders with system theme and default language | choice not persisted; no crash |
| Contrast | every DESIGN.md text/control pair | ≥ 4.5:1 text, ≥ 3:1 border-input, focus-ring, act-rule, in both themes | test fails naming the pair |

</frozen-after-approval>

## Open Questions

1. Where can the user choose the theme and language in this story? The real place is the Settings dialog ("Réglages"), owned by Story 1.6. Options: (a) build the "Apparence" and "Langue" controls now as reusable components shown on a temporary placeholder screen, which 1.6 moves into the dialog (visible and testable today; small throwaway screen) / (b) no visible control: ship the store, providers and setters with tests only (nothing to see until 1.6) / (c) build a minimal Settings dialog now (overlaps Story 1.6).
2. Which language on first launch? Options: (a) French if the browser language starts with `fr`, else English (natural for both audiences) / (b) always French (the PRD's primary audience; English users switch once).

## Code Map

- `src/index.css` -- today shadcn neutral oklch defaults, `--radius .625rem`, `@custom-variant dark (&:is(.dark *))`; replace with OPENMAP tokens, keep the `.dark` class mechanism (mockups use it).
- `components.json` -- radix-nova, cssVariables, lucide, aliases `@/ui/...`; keep.
- `src/persistence/index.ts` -- only `flushPendingSaves()`; add the single Dexie database here so Story 1.4 extends it via version bumps.
- `src/i18n/` -- README only; resources go here.
- `src/main.tsx`, `src/ui/App.tsx` (returns null) -- mount providers.
- `index.html` -- `lang="en"` hard-coded; must follow the active language.
- `.dependency-cruiser.cjs` -- UI reaches persistence only via `index.ts`; core must not import i18n.
- `tests/e2e/smoke.spec.ts` -- asserts empty body text; update if a visible screen is added.
- Packages verified on npm: `@fontsource-variable/libre-baskerville` 5.3 (OFL, wght axis gives 600), `@fontsource-variable/source-sans-3` 5.3 (OFL), `dexie` 4.4.6 (Apache-2.0), `i18next` 26.4.2, `react-i18next` 17.0.15 (MIT), `lucide-react` 1.49 (ISC).

## Tasks & Acceptance

**Execution:**
- [ ] `src/ui/theme/tokens.css` (imported by `src/index.css`) -- all chrome tokens (`:root` light, `.dark` dark), mono tokens, type, spacing, radius, elevation, hit-area, focus ring; shadcn variables mapped per `DESIGN.md:326` (unmapped ones: foregrounds → text-primary, secondary/muted → surface); no shadcn default left
- [ ] `src/ui/theme/tokens.ts` -- the same values as typed data for tests (single source: CSS generated or asserted equal)
- [ ] fonts -- add the two Fontsource variable packages, import in `src/main.tsx`, font stacks from DESIGN.md; `label-caps`, tabular-nums utilities
- [ ] `src/persistence/db.ts` + `index.ts` -- `Dexie('openmap')` v1 with `preferences` (`&key`); typed `getPreference`/`setPreference` for `theme` and `language`; errors never throw to UI
- [ ] `src/ui/theme/ThemeProvider.tsx` -- resolves system/light/dark, toggles `.dark` on `<html>`, listens to `matchMedia`; inline script in `index.html` sets `.dark` before paint from `matchMedia`
- [ ] `src/i18n/index.ts`, `src/i18n/locales/{fr,en}.json` -- i18next init, `setLanguage` updates `<html lang>` and persists; French strings use U+202F before `: ; ? !` and « » quotes
- [ ] `tests/guardrails/i18n-keys.test.ts` -- fails on a key in one locale only (with a violating fixture)
- [ ] `src/ui/theme/contrast.test.ts` -- WCAG ratios for every DESIGN.md pair in both themes, forbidden pair asserted below 4.5
- [ ] Open Question 1 outcome (controls and/or screen) + e2e: theme follows emulated dark scheme, choice persists across reload, language switch changes text without reload
- [ ] `licence-overrides.json`, `README.md` -- only if needed

**Acceptance Criteria:**
- Given `npm run check`, when it runs, then all existing guardrails plus the new i18n and contrast tests pass and no request leaves the app origin.
- Given keyboard focus on any control, when it is focused via keyboard, then the 2px focus ring with 2px offset is visible; it does not appear on mouse click.

## Verification

**Commands:**
- `npm run check` -- expected: all green
- `npx vitest run src/ui/theme tests/guardrails/i18n-keys.test.ts` -- expected: contrast and key-parity tests pass

## Implementation Notes

## Spec Change Log

## Review Triage Log
