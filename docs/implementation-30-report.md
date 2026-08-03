# AI Activity Feed Runtime — IMPLEMENTATION-30

## 1. Architecture summary

Phase 4 adds a transparency layer: a reusable **AI Activity Feed Runtime** that
visualizes REAL workflow milestones. It is a pure consumer — it never owns
workflow state, never calculates progress, never mutates the workflow.

```
Workflow Engine
  → Generation Runtime
  → Generation Experience           (IMPLEMENTATION-27)
  → Generation Animation Runtime    (IMPLEMENTATION-28)
  → Storefront Construction Runtime (IMPLEMENTATION-29)
  → AI Activity Feed Runtime        (IMPLEMENTATION-30 — pure consumer)
  → Activity Feed View
```

No timers, no polling, no simulated events, no invented actions, no
chain-of-thought exposure.

## 2. Activity Feed Runtime overview

`src/lib/generation/activity/runtime.ts` — `buildActivityState(experience,
snapshot?)` (pure) + `useActivityFeed(experience, snapshot?)` (memoized). It
derives every activity's status, chronological ordering, timestamp and metadata
ENTIRELY from the runtime:

- **Status** from the real stage status (pending/running/completed/skipped/
  failed; `cancelled` supported for future workflows).
- **Timestamps** from real per-stage `duration` values summed cumulatively; the
  age label ("Just now" / "3s ago") uses the existing elapsed source.
- **Metadata** attached only when the real storefront snapshot provides it
  (theme id, hero media kind, section counts) — never fabricated.
- A single **terminal** activity ("Storefront ready") completes when the
  workflow completes and locks the feed.

## 3. Configuration model

`src/lib/generation/activity/config.ts` — all mappings in ONE configuration:

```
ActivityDefinition { id, title, description, dependsOnStage, category,
                     severity?, metadataKind?, terminal? }
ACTIVITY_CATEGORIES = [preparation, import, analysis, generation, optimization,
                       validation, publishing, completion]
```

| activity | dependsOnStage | category | metadata |
|---|---|---|---|
| preparing_workspace | — (base) | preparation | — |
| import_profile | import_profile | import | — |
| knowledge_intelligence | knowledge_intelligence | analysis | — |
| persona_detection | persona_detection | analysis | — |
| planning_context | planning_context | generation | — |
| planning_content | experience_planning | generation | — |
| hero_composition | composition | generation | hero media kind |
| theme_applied | composition | generation | theme id |
| sections_generation | artifact_generation | generation | section counts |
| workspace_provision | provisioning | preparation | — |
| publishing | publishing | publishing | — |
| validation | golden_validation | validation | — |
| storefront_ready | — (terminal) | completion | — |

## 4. Runtime flow

```
Generation Experience (stages + elapsedMs) + real snapshot (optional)
  → buildActivityState()
      stage status   → activity status
      stage duration → cumulative timestampMs → ageLabel
      snapshot data  → metadata (theme / heroMedia / sections)
  → Activity Feed View (role=log, deployment-log timeline)
```

## 5. Activity derivation flow

1. Stage activity → maps 1:1 to a canonical generation stage.
2. Status = derived stage status; base always complete; terminal completes only
   on `experience.isComplete`.
3. Newest running activity is marked `isActive` (the one to watch).
4. Timestamps = cumulative completed durations; absent when durations are
   unknown (never estimated).
5. Metadata = only keys the snapshot actually contains.

## 6. Files changed

| File | Purpose |
|---|---|
| `src/lib/generation/activity/config.ts` | Config-driven ActivityDefinition + categories |
| `src/lib/generation/activity/runtime.ts` | Pure `buildActivityState` + `useActivityFeed` |
| `src/features/onboarding/components/activity-feed.tsx` | Deployment-log style Activity Feed View |
| `src/features/onboarding/use-generation-experience.ts` | Added `elapsedMs` to the experience (additive) |
| `src/actions/construction.actions.ts` | Snapshot meta now includes `themeId`/`creatorName`/`tagline` |
| `src/app/dev/generation-experience/page.tsx` | 3-col dev layout (experience \| activity \| construction) + honest stage durations |
| `src/app/onboarding/page.tsx` | Generating screen shows the feed |
| tests | `activity-runtime.test.ts`, `activity-components.test.tsx`, `implementation30.spec.ts` |

## 7. State flow

Stage status → activity status. Failure freezes the feed: completed rows
remain, the failed row is highlighted, later rows stay pending, the terminal
stays pending. Completion completes the terminal activity and locks the feed
(the construction preview remains; Builder transition is future work).

## 8. Performance considerations

- Derivation is pure + `useMemo`-ized on the experience/snapshot — no duplicate
  runtime subscriptions, no unnecessary re-renders.
- No JS animation loops; microinteractions reuse the existing framer-motion
  primitives (opacity/transform only).
- The feed is capped (`max-h` + overflow) so long runs don't grow the DOM
  unboundedly; rows are stable-keyed (no re-mount churn).
- No new timers — elapsed comes from the workflow runtime's own elapsed time.

## 9. Accessibility notes

- `role="log"` + `aria-live="polite"` + `aria-label="AI activity timeline"`.
- Ordered list semantics (`ol`/`li`, `role="listitem"`).
- `prefers-reduced-motion` respected — transitions disabled, updates instant.
- Status conveyed via text (title/description), color (contrast-safe emerald/
  red/muted) and the status indicator — not color alone.
- Failure is announced in a non-blocking banner; completed history remains
  readable; decorative header/category chips are muted.

## 10. Unit test summary

- **19 pure**: config integrity (unique ids, valid stage deps, valid categories,
  single terminal), chronological ordering, status derivation + transitions
  (pending→running→completed, skipped/failed), newest-active, base/terminal
  semantics, cumulative timestamps (real durations, null when absent), age
  labels ("Just now"/"Ns ago"), failure freeze (history preserved, later rows
  frozen), metadata derivation (theme/media/sections, none when snapshot
  absent).
- **8 jsdom component/a11y/reduced-motion**: all activities render exactly once
  (no duplicates), `role="log"`+live region, runtime statuses on rows, metadata
  chips, no-metadata when absent, failure freeze + banner, terminal lock,
  reduced-motion render.
- Full suite: **80 files / 1726 tests**.

## 11. Build summary

`npx tsc --noEmit` ✅ · `npm run build` → `✓ Compiled successfully` ✅

## 12. Playwright Local

`R4` — **5/5 passed (1.4m)** against `http://localhost:3000`:
1. Feed appears on workflow start; every configured activity renders once (no
   duplicates); runtime age labels appear.
2. Activities activate in runtime order (import before knowledge; hero while
   sections running); exactly one active activity.
3. Completed history is monotonic and stays visible; terminal "Storefront
   ready" completes and locks the feed.
4. Failure at `artifact_generation` freezes the feed (completed preserved,
   failed highlighted, later rows pending).
5. Reduced motion: instant updates, DOM matches runtime (progress 100 at
   completion).

## 13. Playwright Production

`https://influencer-space-alpha.vercel.app` — **5/5 passed (1.3m)** (deployed
commit `9b60bb5`). Same verification against the production runtime.

## 14. Browser verification summary

The activity DOM (`data-activity` / `data-activity-status` /
`data-activity-active`) was observed to match the runtime at every stage locally
and in production: statuses track the real stage events, timestamps derive from
real durations, the newest running activity is active, failure freezes history,
and completion locks the feed. Activity Feed Runtime ↔ Generation Runtime ↔
Workflow/API remain synchronized because the feed is a pure derivation of the
Generation Experience.

## 15. Commit message suggestion

```
feat(onboarding): AI Activity Feed Runtime
- config-driven ActivityDefinition + reusable categories; pure
  buildActivityState derives status/timestamps/metadata from the runtime only
- deployment-log Activity Feed View reusing animation primitives; failure
  freezes history, terminal locks feed; role=log + reduced-motion
- useGenerationExperience exposes elapsedMs; dev 3-col layout; R4 Playwright
```
