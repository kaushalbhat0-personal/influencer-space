# Generation Experience Foundation — IMPLEMENTATION-27

## Architecture summary

A reusable, runtime-driven **Generation Experience** system for AI storefront
onboarding. Stage definitions are configuration; stage status and progress are
**derived from the real workflow runtime** — never simulated, never
timer-driven, never hardcoded percentages.

```
Workflow runtime (GenerationSession.stages)
  → RuntimeStageEvent[] (type, status, error, duration)
  → deriveStageStatus / deriveWeightedProgress / deriveCurrentStage (pure)
  → useGenerationExperience (memoized client hook)
  → Onboarding generating UI  (ARIA progressbar, stage rows)
```

Future animation phases (timeline, particles, canvas transitions, section
reveals, streaming, skeletons) plug into this model — no new loading
implementations.

## Files changed

| File | Purpose |
|---|---|
| `src/lib/generation/experience/stages.ts` | Config-driven `GenerationStage` model + pure derivation helpers |
| `src/features/onboarding/use-generation-experience.ts` | Memoized client hook (derived state + labels) |
| `src/app/onboarding/page.tsx` | Generating step refactored to consume the model (removed hardcoded `STAGE_LABELS`/`allStageTypes`) |
| `src/app/dev/generation-experience/page.tsx` | Dev visualization of the model from real session-shaped events |
| `tests/unit/generation-experience.test.ts` | 14 unit tests |
| `tests/e2e/production/implementation27.spec.ts` | R1 Playwright test |

## Runtime flow

```
createGenerationSession → runCreatorGeneration
  → sessionService.updateStage(type, running|completed|failed)
  → getGenerationSessionProgress (poll) → { stages, progressPercent, elapsedMs, … }
  → useGenerationExperience(events, runtimeProgress, …)
  → UI: stage rows + progressbar (aria-valuenow = runtime value)
```

## State flow

Stage status is derived (`pending | running | completed | skipped | failed`)
from the session events. `deriveWeightedProgress` counts only
completed/skipped stages — a running/pending stage contributes zero, so
**progress never exceeds actual workflow**. `deriveCurrentStage` = first
running stage in canonical order.

## Test summary

- **14 unit tests**: canonical 10-stage order, unique ids, weights sum to 100,
  status derivation, weighted progress never exceeds reality (0 → 100 only
  when all completed), current/completed derivation, `formatDuration`.
- Full suite: **74 files / 1661 tests**.

## Build summary

`npx tsc --noEmit` ✅ · `npm run build` → `✓ Compiled successfully` ✅

## Playwright Local

`R1 - Generation experience renders stages from the runtime-driven model` —
**1 passed (11.4s)**: canonical stages render, statuses advance with runtime
events, progress bar reflects the runtime value.

## Playwright Production

`https://influencer-space-alpha.vercel.app` — **1 passed (14.6s)** (deployed
commit `0a42135`).

## Performance notes

- Derived state is fully memoized (`useMemo` on the runtime input); the UI only
  re-renders when session events/progress actually change.
- No timers in the product UI (the polling loop is the existing
  `getGenerationSessionProgress` — it reads real runtime).
- Animations are isolated (`transition-all` with `motion-reduce:transition-none`);
  no layout shift (stage rows are fixed-height).
- Hydration-safe: no `localStorage`/`Date.now` in initial render.

## Commit message suggestion

```
feat(onboarding): runtime-driven Generation Experience foundation
- config-driven GenerationStage model + pure status/progress derivation
- onboarding generating screen consumes the model (ARIA progress, no hardcoded
  labels); dev visualization page; 14 unit tests + R1 Playwright
```
