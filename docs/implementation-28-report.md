# Generation Animation Runtime — IMPLEMENTATION-28

## Architecture summary

A single reusable **animation orchestration layer** that is a pure consumer of
the Generation Experience foundation (IMPLEMENTATION-27). It observes the
runtime-driven model and orchestrates premium UI transitions. It never owns
progress, never adds timers, never simulates workflow — it only visualizes.

```
Generation Runtime
  → useGenerationExperience()               (runtime values, derived state)
  → useGenerationAnimation() / buildGenerationAnimation()   (animation targets)
  → GenerationAnimationRuntime (lib/generation/animation)
  → GenerationExperienceView                (presentational)
  → Motion primitives                       (FadeIn, ProgressBar, Glow, …)
```

Animations never calculate state — they only react to it.

## Animation architecture

- **Primitives** (`src/lib/generation/animation/primitives.tsx`) — reusable,
  not coupled to onboarding (publishing, theme apply, AI regeneration, media
  processing, long-running jobs):
  - `FadeIn` — stage enter/exit (opacity + translateY, tween ease).
  - `TransitionGroup` — AnimatePresence wrapper for enter/exit sequences.
  - `SuccessIcon` — icon success transition (scale settle, no bounce).
  - `GlowIndicator` — soft current-stage pulse (opacity only, no shadow).
  - `ProgressBar` — smooth fill via `transform: scaleX`, tween, no overshoot.
  - `Crossfade` — text/title/description swap (keyed).
  - `useAnimatedNumber` — counter tween that lands exactly on the target.
  - Pure helpers `normalizeProgress` / `progressAria` (no JSX).
- **Runtime orchestration** (`runtime.ts`) — `buildGenerationAnimation`
  (pure) maps the experience into motion targets; the hook only memoizes it.
  Progress/completed counts pass through verbatim — never fabricated.
- **Presentational view** (`GenerationExperienceView`) — consumes the runtime;
  no business logic, no state, no timers.

## Files changed

| File | Purpose |
|---|---|
| `src/lib/generation/animation/primitives.tsx` | Motion primitives (reusable) |
| `src/lib/generation/animation/progress.ts` | Pure progress + ARIA helpers |
| `src/lib/generation/animation/runtime.ts` | Orchestrator + pure `buildGenerationAnimation` |
| `src/features/onboarding/components/generation-experience-view.tsx` | Presentational animated view |
| `src/app/onboarding/page.tsx` | Generating step → `GenerationExperienceView` (logic untouched) |
| `src/app/dev/generation-experience/page.tsx` | Dev visualization now renders the animated view |
| `src/lib/generation/animation/__tests__/*` | 10 pure + 7 component tests |
| `tests/e2e/production/implementation28.spec.ts` | R2 Playwright (3 tests) |
| `vitest.config.ts` / `package.json` | oxc JSX + jsdom for component tests |

## Performance considerations

- Animation properties are limited to **opacity + transform** (`scaleX`,
  `translateY`) — no layout, no forced reflow.
- Progress bar uses `transform: scaleX` (GPU-composited) — not `width`.
- Glow uses **opacity pulse**, not paint-heavy box-shadows/blur.
- No JS animation loops / rAF loops by us; framer-motion tween is the only
  driver and runs only while values change.
- Memoized derivation — re-renders happen only when the runtime input changes.
- `initial` keyframes are reduce- and hydration-stable (SSR renders the same
  first frame; only `duration` drops to 0 under reduced motion).

## Accessibility notes

- Progress bar: `role="progressbar"`, `aria-valuemin/valuemax/valuenow` =
  rounded exact runtime value, `aria-label`.
- Container `role="status" aria-live="polite"`.
- Screen-reader current stage via `.sr-only` announcement.
- `prefers-reduced-motion`: movement/glide/glow/pulse disabled — instant
  updates, identical DOM/A11y structure.

## Tests

- 10 pure (node env): stage→motion mapping, current/completed/failed flags,
  transition signature changes only on stage change, fast sequential updates
  stay consistent, exact-value contract (clamps, NaN→0), ARIA values.
- 7 component (jsdom): ARIA progressbar exact value, polite status region,
  all canonical stages + runtime statuses, completed/current(glow)/upcoming
  states, failure banner, sr-only announcement, reduced-motion instant render.
- Full suite: **76 files / 1678 tests** (was 1661).

## Build

`npx tsc --noEmit` ✅ · `npm run build` → `✓ Compiled successfully` ✅

## Playwright Local

`R2` — **3/3 passed (1.3m)**:
1. Stage transitions animate once; progress ends at the EXACT runtime value;
   DOM always reflects runtime (data-status/aria-valuenow).
2. Fast stage updates → list stays consistent, no broken transitions.
3. Reduced motion → instant updates, same structure, no hydration errors.

## Playwright Production

`https://influencer-space-alpha.vercel.app` — **3/3 passed (49.4s)** (deployed
commit `0b10099`).

## Commit message suggestion

```
feat(onboarding): reusable Generation Animation Runtime
- motion primitives (FadeIn/SuccessIcon/GlowIndicator/ProgressBar/Crossfade/
  useAnimatedNumber) + pure normalizeProgress/progressAria
- buildGenerationAnimation pure orchestrator; progress passes through verbatim
- GenerationExperienceView presentational consumer; onboarding + dev refactored
- reduced-motion + SSR-hydration safe (initial frames constant)
- 17 unit tests + R2 Playwright (3) local & production
```
