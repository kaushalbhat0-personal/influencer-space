# Live Storefront Construction Experience — IMPLEMENTATION-29

## 1. Architecture summary

Phase 3 extends the presentation layer only. The workflow engine, generation
runtime, generation experience model, animation runtime, builder, storefront,
theme and publishing runtimes are untouched. A new **Storefront Construction
Runtime** observes the Generation Experience and decides which storefront
portions are eligible to appear — based ONLY on real completed workflow stages.

```
Workflow Engine
  → Generation Runtime
  → useGenerationExperience()
  → Generation Animation Runtime            (IMPLEMENTATION-28)
  → Storefront Construction Runtime         (IMPLEMENTATION-29 — pure consumer)
  → Construction Preview                    (presentational)
```

The Construction Preview is NOT the Builder and NOT a second renderer: real
sections render through the single `ComponentRenderer` with the real runtime
snapshot (assembled via the same `buildRuntimeSnapshot` + `LayoutEngine` +
`componentRegistry` the storefront page and builder canvas use).

## 2. Construction Runtime overview

- `useConstructionRuntime(experience)` / pure `buildConstructionState()` map
  the Generation Experience into per-step eligibility. It never owns workflow
  state, never calculates progress, never modifies the Builder, never
  simulates.
- The preview shows a skeleton for every portion whose stage has not completed
  and swaps to the REAL section the moment the corresponding stage completes.
- Theme (typography/colors) is applied from the runtime theme vars only when
  the `composition` stage completes. Media arrives already resolved by the
  aggregate (`resolveHeroMediaForRuntime`) — no duplicated resolution.

## 3. Configuration model

`src/lib/generation/construction/config.ts` — construction order lives in
config, never in components:

```
ConstructionStep { id, title, description, dependsOnStage, reveals[], animation, skeleton }
CONSTRUCTION_THEME_DEPENDS_ON = "composition"
```

| step | dependsOnStage | reveals (module prefixes) |
|---|---|---|
| shell | — (base) | — |
| profile | import_profile | — |
| nav | experience_planning | nav |
| hero | composition | hero |
| products | artifact_generation | products |
| services | artifact_generation | services |
| testimonials | artifact_generation | testimonials |
| faq | artifact_generation | faq |
| content | artifact_generation | gallery, pricing, links, courses, games, contentFeed, timeline, contact, newsletter |
| footer | publishing | footer |

## 4. Runtime flow

```
getConstructionSnapshot({ sessionId | subdomain })   [server action]
  → tenant ← session.workspaceId → workspace.tenantId   (or subdomain)
  → websiteAggregateService.buildWithDiagnostics()
  → BuilderService.load() + navigationService.getOrGenerate()
  → buildRuntimeSnapshot() → layoutEngine.resolve()
  → { theme, navigation, sections[{moduleId, config}], meta }

ConstructionPreview (client)
  ← useConstructionSnapshot(refreshKey = currentId)   [refetches on stage change]
  ← useConstructionRuntime(experience)                 [eligibility only]
  → real sections via ComponentRenderer / skeletons / theme vars
```

## 5. Files changed

| File | Purpose |
|---|---|
| `src/lib/generation/construction/config.ts` | Config-driven ConstructionStep model + theme gate |
| `src/lib/generation/construction/runtime.ts` | Pure `buildConstructionState` + `useConstructionRuntime` |
| `src/actions/construction.actions.ts` | `getConstructionSnapshot` — real snapshot via existing runtime |
| `src/features/onboarding/components/construction-preview.tsx` | The Construction Preview (presentational) |
| `src/features/onboarding/components/construction-skeleton.tsx` | Layout-mirroring skeletons |
| `src/features/onboarding/hooks/use-construction-snapshot.ts` | Refetch-on-stage-change data hook |
| `src/app/onboarding/page.tsx` | Generating screen shows the live construction |
| `src/app/dev/generation-experience/page.tsx` | Dev visualization + knobs (`?failStage/?speed/?pace`) + Suspense |
| `src/lib/generation/animation/primitives.tsx` | `TransitionGroup` → `mode="wait"` (ref-safe) |
| tests | `construction-runtime.test.ts`, `construction-components.test.tsx`, `implementation29.spec.ts` |

## 6. State flow

Stage status → `buildConstructionState` → per-step `status`
(pending/running/completed/failed) + `isEligible` + `isCurrent`. Eligibility
comes only from `deriveStageStatus` on real events. On failure the state
freezes: completed steps stay eligible, the failed step is marked, nothing
regresses; the preview keeps completed sections and shows a graceful banner
(the existing workflow owns retry).

## 7. Performance notes

- Pure derivation memoized on the experience; refetches happen only when the
  active stage changes.
- Real sections render through the same memoized `ComponentRenderer`; no extra
  rendering pipeline, no duplicated renders.
- Animations use opacity/transform (FadeIn) and theme CSS variables; no layout
  thrash, no paint-heavy shadows/blur, no JS animation loops.
- Skeletons use `animate-pulse` with `motion-reduce:animate-none`; preview is
  `pointer-events-none select-none` during generation.
- Responsive: preview stacks on mobile via existing grid breakpoints.

## 8. Accessibility notes

- `prefers-reduced-motion` respected: transitions/skeletons disabled, structure
  identical, updates instant.
- Progress stays ARIA-backed from the Generation Experience (progressbar,
  aria-live). Construction status is announced via the existing status region.
- Failure banner is non-blocking text; completed content is preserved.
- Contrast/theme: preview uses the runtime theme variables with the global
  fallbacks; decorative chrome/chips are `aria-hidden`.

## 9. Unit test summary

- **14 pure**: config integrity (unique ids, valid stage deps, non-overlapping
  reveals, base shell), stage-driven eligibility (nav/hero+theme/products/…),
  full-completion, current-step, failure freeze (completed preserved, no
  regression), `stageStatusFromExperience`.
- **7 jsdom component/a11y/reduced-motion**: frame + theme-eligible gating,
  real theme vars applied, skeletons before eligibility, real section via
  single renderer after completion, failure banner + preserved sections, step
  chips + status line, reduced-motion instant render.
- Full suite: **78 files / 1699 tests**.

## 10. Build summary

`npx tsc --noEmit` ✅ · `npm run build` → `✓ Compiled successfully` ✅
(fixed a build-time prerender error: `useSearchParams` now wrapped in Suspense
on the dev page).

## 11. Playwright Local

`R3` — **4/4 passed (1.5m)** against `http://localhost:3000`:
1. Construction shell appears; hero builds itself with the REAL resolved media;
   theme flips on at composition.
2. Section gating order verified with held intermediate states
   (nav → hero → products → footer); DOM matches the runtime.
3. Failure at `artifact_generation` freezes construction; completed hero stays;
   theme preserved; products never built.
4. Reduced motion: construction still completes instantly.

## 12. Playwright Production

`https://influencer-space-alpha.vercel.app` — **4/4 passed (1.2m)** (deployed
commit `2c2c1e5`). Same verification against the production runtime.

## 13. Browser verification summary

Browser DOM is the source of truth. The construction preview DOM
(`data-construction-step` / `data-construction-section` / `data-theme-eligible`)
was observed to match the runtime events at every stage locally and in
production: sections appear only when their canonical stage completes, media is
the aggregate-resolved URL, and the theme matches the storefront's runtime
theme. Builder, Storefront, Runtime and Publish remain synchronized because the
preview consumes the exact same `buildRuntimeSnapshot` + `LayoutEngine` +
`componentRegistry` data the storefront page and builder canvas use.

## 14. Commit message suggestion

```
feat(onboarding): Live Storefront Construction Experience
- config-driven ConstructionStep model; pure Construction Runtime derives
  eligibility only from real completed stages (never simulates)
- Construction Preview reuses the single ComponentRenderer + real runtime
  snapshot (buildRuntimeSnapshot/LayoutEngine/registry) — no second renderer
- theme applied from existing Theme Runtime vars at composition; media from the
  resolved aggregate; layout-mirroring skeletons; failure freezes construction
- dev knobs ?failStage/?speed/?pace; useSearchParams Suspense fix
- 21 unit tests + R3 Playwright (4) local & production
```
