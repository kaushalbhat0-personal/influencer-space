# Goal Alignment

RCCF-EPIC-05 — Phase 10.

`src/modules/goals-runtime/application/alignment.ts`

Goal Alignment measures **how well the storefront supports the selected
goals**: for each weighted goal, what fraction of its supporting knowledge
fields are complete. Deterministic and registry-derived.

## Definition

For each goal in the profile:

```
percent = round(100 × supportingFieldsComplete / supportingFieldsTotal)
```

`overall = Σ (weight × percent) / Σ weight` — a weight-weighted average across
the profile, so a 60% goal contributes more than a 15% one.

## Vacuous completion guard

Some knowledge fields are *vacuously* complete when their parent content is
empty (e.g. "Product Images" is satisfied when there are no products). These
must not count as alignment, otherwise a products goal would look ~40% aligned
with nothing built. The runtime excludes such fields unless the parent content
exists:

```
commerce.productImages       → requires products
commerce.productDescriptions → requires products
content.galleryQuality       → requires gallery
```

## Storefront Score dimension

The Storefront Quality Score (knowledge runtime) accepts an optional Goal
Alignment dimension:

```ts
computeStorefrontScore(snapshot, knowledgeOverall?, { percent, label? })
```

- Without it → **7 dimensions** (unchanged default behaviour).
- With it → **8 dimensions**, `Goal Alignment` appended.

## Displayed where

- **Knowledge Dashboard** (`/admin/knowledge`) — Goal Alignment row in the
  Storefront Quality card + per-goal breakdown.
- **Goals page** (`/admin/goals`) — `GoalAlignmentCard`.
- **Dashboard** (`/admin/dashboard`) — the Business Goal card's progress is the
  primary goal's alignment.

## Example

Goal profile: Get Bookings 60% · Sell Products 25% · Build Email List 15%.

| Goal | Weight | Supporting | Complete | Percent |
| --- | --- | --- | --- | --- |
| Get Bookings | 60 | 5 | 3 | 60 |
| Sell Products | 25 | 5 | 2 | 40 |
| Build Email List | 15 | 4 | 4 | 100 |

`overall = (60×60 + 25×40 + 15×100) / 100 = 61%`
