# IMPLEMENTATION-67 REPORT — Recommendation Runtime

RCCF-EPIC-06 · Launch Readiness Initiative — Phase 8.

Builds a canonical **Recommendation Runtime** that continuously analyzes every
creator's business from existing runtimes and determines the highest-impact
next action. Deterministic, registry-driven, no AI, never invents
recommendations, never owns data.

## 1. Philosophy

The runtime completes the chain:

| Runtime | Answers |
| --- | --- |
| Knowledge | Who are you? |
| Goals | What do you want? |
| Success | What have you achieved? |
| **Recommendation** | **What should you do next?** |

## 2. Phases delivered

| Phase | Deliverable | Location |
| --- | --- | --- |
| 1 Recommendation Registry | 25 canonical recommendations (id, title, category, priority, time, impact, prerequisites, goal affinity, knowledge/success deps, actions, when/done/reason) | `domain/registry.ts` |
| 2 Recommendation Engine | Pure evaluation of context + history → scored, sorted list | `application/engine.ts` |
| 3 Categories | Critical · High Impact · Quick Wins · Growth · Optimization · Advanced | `application/categories.ts` |
| 4 Dashboard | "Today's Best Next Step" card (impact, time, affected scores, Open Action, Mark done / Not now) | `presentation/next-best-step-card.tsx` |
| 5 Builder | "Recommended for this section" panel (selection-aware) | `presentation/builder-recommendation-panel.tsx` |
| 6 Knowledge Runtime | Recommended Improvements (grouped, impact-ordered) replace the flat missing list | `presentation/recommended-improvements.tsx` |
| 7 Goal Runtime | `goalAffinity` scoring term; booking/commerce/portfolio creators get targeted improvements | `application/scoring.ts` |
| 8 Storefront Quality | Per-dimension expected impact + storefront lift | `application/impact.ts` |
| 9 Commerce | Product → polish → testimonials chaining via prerequisites | `domain/registry.ts` |
| 10 Success | Milestones auto-complete recommendations via shared `done()` signals | `application/engine.ts` |
| 11 History | `recommendation_history` Setting: dismissed/completed/ignored/accepted + timestamps + completion scores | `application/history.ts` |
| 12 Admin Analytics | `/super-admin/recommendations` — most/least completed, avg time, lifts | `presentation/recommendation-analytics.tsx` |
| 13 Public API | `getRecommendations`, `getTopRecommendation`, `dismiss`, `complete`, `refresh`, `analytics` | `application/runtime.ts` |
| 14 Documentation | `recommendation-runtime.md`, `recommendation-registry.md`, `recommendation-engine.md`, `recommendation-scoring.md`, this report | `docs/` |

## 3. Architecture

New DDD module `src/modules/recommendation-runtime/`, mirroring the previous
runtimes. The context is assembled ONLY from existing runtimes:

```
Knowledge Runtime → Goals Runtime → Success Runtime → Storefront Score
                                  → Recommendation Runtime
```

- **Existing runtimes unchanged** — Knowledge, Goals, Success, Commerce,
  Experience, Storefront are read but never modified.
- **Existing dashboards unchanged when disabled** — the dashboard card is
  additive; with zero recommendations it renders a "caught up" state.
- Server actions: `src/actions/recommendation.actions.ts`, re-exported from
  `src/actions/index.ts`.

## 4. Verification

### Build

- `tsc --noEmit` — ✅ clean.
- `next build` — ✅ green (`/super-admin/recommendations` compiled).

### Tests (vitest)

- Full unit suite: **97 files / 1945 tests passing** (was 1929 — +16 new).
- New `tests/unit/recommendation-runtime.test.ts` verifies:
  - ✓ Registry (25 recs, required attributes)
  - ✓ Scoring (deterministic, 0–100, goal affinity, knowledge gap)
  - ✓ Goal integration (commerce vs portfolio profiles rank differently)
  - ✓ Knowledge integration (no recommendations for content already present)
  - ✓ Success integration (PUBLISH_SITE disappears when live)
  - ✓ Commerce integration (product → polish chaining)
  - ✓ History (dismissed/completed excluded, ignored resurfaces on refresh, prerequisites)
  - ✓ Categories (grouped, impact-ordered)
  - ✓ Expected impact (lift + non-zero dimensions)
  - ✓ Existing runtimes unchanged (storefront score still 7 dims)

## 5. Constraints

- **No AI calls** — fully deterministic.
- **Registry-driven / SOLID / DRY** — one registry; engine/scoring/categories/history/analytics all derive from it.
- **No duplicate recommendation logic** — exactly one canonical runtime; future AI consumes it.
- **Recommendations derive only from existing runtimes.**
- **Existing storefronts unchanged; existing dashboards unchanged when disabled.**

## 6. Success criteria

- ✅ Every creator always has a highest-impact next action.
- ✅ Dashboard becomes proactive (Today's Best Next Step).
- ✅ Builder becomes contextual (per-section recommendations).
- ✅ Knowledge Runtime becomes actionable (Recommended Improvements).
- ✅ Goals Runtime becomes actionable (goal-affinity ranking).
- ✅ Success Runtime becomes actionable (milestones auto-complete recs).
- ✅ Future AI consumes recommendations instead of generating its own.
- ✅ Recommendation logic exists in exactly one canonical runtime.

## 7. Future roadmap — Business Health Score

The user's proposed next evolution: after this EPIC, introduce a single
**Business Health Score (0–100)** that rolls up the existing independent scores
into a creator north-star metric:

```
Knowledge Score
Storefront Quality Score
Goal Alignment Score
Success Progress
        │
        ▼
Business Health Score (0–100)
```

The Recommendation Runtime already carries every rollup input in its context
(`knowledgeScore`, `storefront`, goal `alignment`, `success`), so the future
score builds naturally on these runtimes rather than introducing a disconnected
system. Once live, the Recommendation Runtime can optimize that score over time
while creators still drill down into the underlying dimensions. This is
deliberately a **post-EPIC-06 evolution** — not part of this implementation.

## Commit Message

`RCCF-EPIC-06: Recommendation Runtime — registry-driven next-action engine, deterministic scoring, dashboard best-step card, builder per-section recommendations, recommended improvements, history, admin analytics`
