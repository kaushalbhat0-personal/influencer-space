# IMPLEMENTATION-66 REPORT — Creator Goals Runtime

RCCF-EPIC-05 · Launch Readiness Initiative — Phase 7.

Builds a canonical **Creator Goals Runtime** that understands what a creator
wants to achieve and adapts the website, navigation, Builder, dashboard,
commerce ordering, milestones and storefront score around those goals — as a
**weighted profile** that composes with (never replaces) the Knowledge Runtime.

## 1. Summary

The initial idea was refined: **goals do not replace knowledge — they compose
with it.** The architecture is:

```
Knowledge Runtime → Goals Runtime → Recommendation Runtime (future)
                                        → Website Composition → Builder → Dashboard → Analytics
```

Goals are modelled as a **weighted profile** (primary = highest weight), per
the requested enhancement, so homepage, navigation, Builder suggestions and the
future recommendation engine make nuanced decisions — and creators evolve their
business by changing weights, never by replacing the goal model.

## 2. Phases delivered

| Phase | Deliverable | Location |
| --- | --- | --- |
| 1 Goal Registry | 14 canonical goals (id, label, category, sections, nav, commerce, SEO, knowledge, milestones, suggestions) | `domain/registry.ts` |
| 2 Goal Profile | Weighted profile persisted in `creator_goals` Setting | `application/profile-service.ts` |
| 3 Recommendation Engine | Deterministic goals from the Knowledge Runtime (pack priors + live signals, normalized to 100) | `application/recommendation-engine.ts` + `domain/goal-packs.ts` |
| 4 Website Composition | Goal-driven homepage section re-ordering (hero/footer pinned, no templates added) | `application/composition.ts` |
| 5 Navigation Runtime | Goal-driven nav re-ordering (home first, contact last) | `application/navigation.ts` |
| 6 Dashboard | Business Goal card (primary goal, progress, missing, CTA) | `application/dashboard.ts` + `presentation/goal-dashboard-card.tsx` |
| 7 Builder | Contextual goal recommendations panel (only for missing knowledge) | `application/builder-suggestions.ts` + `presentation/goal-builder-suggestions.tsx` |
| 8 Commerce | `commercePriority` / `commerceRank` / `applyCommerceOrder` | `application/commerce.ts` |
| 9 Success Integration | Goal-aware milestones (first booking, 10 orders, …) composing with existing counts | `application/milestones.ts` |
| 10 Storefront Score | Goal Alignment dimension appended to the storefront score | `application/alignment.ts` + knowledge-runtime optional param |
| 11 Recommendation Contract | Canonical runtime exports for future Recommendation / AI runtimes | `application/goal-runtime.ts`, `index.ts` |
| 12 UI | `/admin/goals` weighted editor, dashboard card, builder panel, knowledge dashboard alignment, nav item | `presentation/*`, `app/admin/goals` |
| 13 Documentation | `goals-runtime.md`, `goal-registry.md`, `goal-composition.md`, `goal-alignment.md`, this report | `docs/` |

## 3. Architecture

New DDD module `src/modules/goals-runtime/`, mirroring `knowledge-runtime`.
Goals **read** the Knowledge Runtime (`knowledgeAggregateSource.buildSnapshot`)
and compose with it. Existing runtimes are untouched:

- **Knowledge Runtime** — only gained an *optional* Goal Alignment param on
  `computeStorefrontScore` (default behaviour unchanged: still 7 dimensions).
- **Storefront** (`src/app/[domain]/page.tsx`) — with a profile set,
  navigation + sections are re-ordered at render time; with no profile it is a
  strict no-op, so existing storefronts behave identically.
- **Builder, Commerce, Success runtimes** — untouched; the goals runtime reads
  the same canonical counts.

Server actions: `src/actions/goals.actions.ts` (`getGoalsRuntime`,
`saveGoalProfile`, `applyRecommendedGoals`, `clearGoalProfile`,
`getGoalBuilderSuggestions`), re-exported from `src/actions/index.ts`.

## 4. Verification

### Build

- `tsc --noEmit` — ✅ clean.
- `next build` — ✅ green (`/admin/goals` compiled, ƒ dynamic; `/admin/knowledge` rebuilt).

### Tests (vitest)

- Full unit suite: **96 files / 1929 tests passing** (was 1901 — +28 goals tests).
- New `tests/unit/goals-runtime.test.ts` verifies:
  - ✓ Goal Registry (14 goals, required attributes)
  - ✓ Goal Recommendation (entity → goal, weights sum to 100, signal adjustment)
  - ✓ Goal Composition (section re-ordering, hero/footer pinned, no-op without profile)
  - ✓ Navigation ordering (products earlier, home/contact pinned, no-op)
  - ✓ Dashboard (primary goal, progress, missing, CTA, commerce priority)
  - ✓ Builder hints (only missing knowledge; quiet when complete)
  - ✓ Goal-aware milestones (done states)
  - ✓ Goal Alignment (weighted, vacuous-completion guard, 0 → 100)
  - ✓ Commerce ordering (surface priority)
  - ✓ Profile validation (weights, known goals)
  - ✓ Knowledge Runtime unchanged (7 dimensions without alignment; 8 with)

### Existing runtime checks

- Knowledge Runtime tests: unchanged, all passing.
- Dashboard / builder tests: unchanged, all passing.
- Storefront default behaviour verified by the no-op guarantee on
  `applyGoalNavigation` / `applyGoalSectionOrder`.

## 5. Constraints

- **No AI calls** — the runtime is fully deterministic.
- **No duplicate registries** — one `GOAL_REGISTRY`; everything derives from it.
- **No duplicate builder logic** — suggestions reuse knowledge-runtime missing
  fields; ordering is a read-only render-time transform.
- **Registry-driven / configuration-driven / SOLID / DRY** — goal packs are
  data, not code.
- **Preserve all existing runtimes** — verified.

## 6. Success criteria

- ✅ Every creator can define business goals (weighted profile editor).
- ✅ Goals are recommended deterministically from the Knowledge Runtime.
- ✅ Website composition adapts to business objectives (section + nav ordering).
- ✅ Builder surfaces contextual recommendations.
- ✅ Dashboard tracks goal progress (Business Goal card).
- ✅ Storefront receives a Goal Alignment Score (8th dimension).
- ✅ Existing architecture remains unchanged.

## 7. Future roadmap

- Wire the exposed contract into the future **Recommendation Runtime** and
  cost-metered **AI Runtime** (Phase 11 contract is ready).
- Persist goal selections during onboarding (a lightweight step on the preview
  screen) so new creators start with goals from day one.
- Add order-volume milestones (5/25 bookings, 10/100 orders) to the dashboard
  card when order data matures.

## Commit Message

`RCCF-EPIC-05: Creator Goals Runtime — weighted goal profile, deterministic recommendation, composition/navigation ordering, dashboard card, builder suggestions, goal-aware milestones, goal alignment score`
