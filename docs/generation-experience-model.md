# Generation Experience Model — IMPLEMENTATION-27

## The model (single source of truth)

`src/lib/generation/experience/stages.ts` defines the canonical onboarding
generation stages as pure configuration:

```
GenerationStageConfig {
  id, title, description, icon, estimatedWeight, status
}
```

The canonical sequence (order matters):

| id | title | weight |
|---|---|---|
| import_profile | Fetching creator profile | 5 |
| knowledge_intelligence | Building knowledge graph | 10 |
| persona_detection | Detecting persona | 10 |
| planning_context | Planning experience | 10 |
| experience_planning | Planning content | 10 |
| composition | Composing storefront | 15 |
| artifact_generation | Generating sections | 15 |
| provisioning | Provisioning workspace | 10 |
| publishing | Publishing storefront | 10 |
| golden_validation | Finalizing | 5 |

Total weight = **100** → weighted progress maps directly to a percentage.

## Derived (never simulated)

- `deriveStageStatus(events, id)` — pending/running/completed/skipped/failed
  from the REAL session events.
- `deriveWeightedProgress(events)` — sums only completed/skipped weights; a
  running/pending stage contributes 0, so progress can never exceed the actual
  workflow (100 only when every stage is done).
- `deriveCurrentStage(events)` — first running stage in sequence order.
- `deriveCompletedCount(events)` — completed/skipped count.

## Hook

`useGenerationExperience({ events, runtimeProgress, elapsedMs, estimatedRemainingMs, hasStarted })`
returns memoized: `stages` (enriched), `current`, `completedCount`,
`progress` (the workflow runtime's own value), `derivedProgress` (cross-check),
`elapsedLabel`, `remainingLabel`, `hasFailure`, `isComplete`.

## Runtime contract

The UI consumes `getGenerationSessionProgress` (the existing server action).
Progress shown = `gs.progressPercent` (workflow-derived), never a timer or
hardcoded value. The stage list shows real statuses.

## Accessibility

- Progress bar: `role="progressbar"`, `aria-valuemin/max/now`, `aria-label`.
- Container: `role="status" aria-live="polite"`.
- Screen-reader current stage via `.sr-only`.
- `motion-reduce:transition-none` for reduced motion.

## Extensibility

Add a stage → one entry in `GENERATION_STAGES`. Future phases (animated
timeline, particles, canvas transitions, section reveals, streaming, theme
preview, skeletons) read this model — no refactoring required.
