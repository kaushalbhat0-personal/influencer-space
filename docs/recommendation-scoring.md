# Recommendation Scoring

RCCF-EPIC-06 — Phase 2.

`src/modules/recommendation-runtime/application/scoring.ts`

Every recommendation is scored deterministically:

```
score = Priority × Business Impact × Goal Alignment
      × Knowledge Gap × Completion Ease × Current Progress
```

| Term | Formula | Meaning |
| --- | --- | --- |
| Priority | `(6 − priority) / 5` | Base importance (priority 1 dominates). |
| Business Impact | `clamp(Σ impact deltas / 40, 0, 1)` | Total expected storefront improvement. |
| Goal Alignment | `0.2 + 0.8 × max(affinity × weight share)` | How well it serves the weighted goal profile. |
| Knowledge Gap | `missingDeps / totalDeps` (0.5 when no deps) | The size of the gap it closes. |
| Completion Ease | `1 − min(time/120, 1)` | Quick tasks rank higher (more likely done). |
| Current Progress | `0.5 + 0.5 × (satisfiedDeps / totalDeps)` | Near-completion recommendations are boosted. |

The product is scaled to a 0–100 display value. **Ordering (not the absolute
value) drives decision making** — the highest score is "Today's Best Next
Step". Everything is deterministic: the same context always yields the same
ranking.

## Expected impact (Phase 8)

Every recommendation declares deltas per storefront dimension:

```
ADD_TESTIMONIALS →  Trust +14 · Goal Alignment +12 · Knowledge +6 · Storefront ~+4
UPLOAD_HERO_IMAGE → Brand +10 · Knowledge +5 · Goal Alignment +5
ENABLE_SEO       →  SEO +8 · Knowledge +6 · Goal Alignment +6
```

The dashboard shows the affected scores plus a single `storefrontLift`
(average delta across the 8 dimensions).

## Score breakdown

`breakdown(def, ctx)` returns each term for debugging/display, e.g.:

```
Priority 1.0 · Impact 0.85 · Goal 0.9 · Gap 0.6 · Ease 0.9 · Progress 0.5  →  20.7
```

## Verification

`tests/unit/recommendation-runtime.test.ts` — "Phase 2: Scoring" verifies
determinism, 0–100 bounds, goal-affinity boosts and knowledge-gap measurement.
