# Runtime Dependency Map

RCCF-AUDIT-06 · Launch Readiness Initiative.

Dependency map of every platform runtime: what each produces, what it consumes,
and who consumes it. Direction = data/production flow.

## Canonical runtime index

| # | Runtime | Canonical file | Produces |
| --- | --- | --- | --- |
| R1 | Identity | `src/lib/generation/intelligence/enrichment/engine.ts` | `IdentityProfile` (entity, persona, audience, brand, business model, theme/section recs) |
| R2 | Experience (visual) | `src/modules/theme/runtime/experience/experience-registry.ts` | `ThemeExperience` (section background/decoration/motion) |
| R2b | Experience (stages) | `src/lib/generation/experience/stages.ts` | Generation progress stages |
| R3 | Theme | `src/lib/theme/registry-new.ts` + `resolver-new.ts` | Resolved theme (colors/typography/tokens) |
| R4 | Blueprint | `src/modules/blueprint-runtime/` + `src/modules/website-blueprint/` + `src/lib/blueprint/` | Blueprint (pages/sections/order) |
| R5 | Commerce | `src/lib/commerce/` (offerings/purchases) + `src/config/commerce/plans.ts` | Offerings, purchases, plan config |
| R6 | Finance | `src/modules/billing/` | Subscriptions, revenue, entitlements |
| R7 | Success | `src/lib/creator-success/runtime.ts` | Milestones, completion %, next task |
| R8 | Knowledge | `src/modules/knowledge-runtime/` | Snapshot, Knowledge Score, missing fields, questions, storefront score |
| R9 | Goals | `src/modules/goals-runtime/` | Weighted goal profile, ordering, alignment, milestones |
| R10 | Recommendation | `src/modules/recommendation-runtime/` | Scored next-action list, history, analytics |

## Dependency graph

```
                       ┌────────────────────────────┐
                       │      Source adapters       │
                       │  (YouTube/URL/Google/AI)   │
                       └─────────────┬──────────────┘
                                     ▼
   ┌────────────────  R1 Identity (enrichment)  ────────────────┐
   │  produces IdentityProfile  →  consumed by onboarding only, │
   │  then DROPPED (never persisted, never fed downstream)      │
   └─────────────────────────────────────────────────────────────┘

   ┌────────────  Generation pipeline (src/lib/generation)  ─────────────┐
   │  KnowledgeBuilder → KnowledgeGraph → ExperiencePlan → LayoutComposer │
   │  → ArtifactEngine → provisioning (writes influencer_data,            │
   │    builder_artifact, hero_data, seo)                                 │
   │  reads:  source, R3 Theme, R2b Experience                            │
   │  does NOT read: R8 declared facts, R9 goals, R10 recommendations     │
   └──────────────────────────────┬───────────────────────────────────────┘
                                  ▼
   ┌────────────  Persisted creator state  ────────────────┐
   │  Brand / hero_data / seo / products / gallery / etc.  │
   │  influencer_data.niche · creator_goals (R9)           │
   │  knowledge_completion + knowledge_score (R8)          │
   │  recommendation_history (R10)                         │
   └──────────────────────────────┬───────────────────────┘
                                  ▼
   ┌────────────  WebsiteAggregate (src/modules/tenant)  ──┐
   │  buildSnapshot → the single read model                 │
   │  consumed by: Storefront, Builder, Knowledge (R8),     │
   │               Goals (R9), Recommendation (R10)         │
   └──────────────┬───────────┬───────────┬───────────────┘
                  ▼           ▼           ▼
             Storefront   Builder    Dashboard
             R9 ✅ R3 ✅   R8 ✅      R8 ✅ R9 ✅ R10 ✅
             R2 ✅ R5 ✅   R9 ✅      R7 ✗ (success not surfaced)
             R8 ✗ R10 ✗   R10 ✅     R6 ✅ R5 ✅
```

## Per-runtime dependency table

| Runtime | Consumes | Consumed by | Direction |
| --- | --- | --- | --- |
| R1 Identity | source + enrichment config | `src/lib/onboarding/service.ts` (only) → dropped | Dead-end (computed, discarded) |
| R2 Experience | theme id/category/premium | `[domain]/page.tsx` (storefront render), theme marketplace, dev | Storefront visual layer |
| R2b Experience (stages) | workflow events | `use-generation-experience` (onboarding UI) | Onboarding progress |
| R3 Theme | website.themePackageId | provisioning, `build-snapshot.ts`, `[domain]/page.tsx`, builder, marketplace, ~28 consumers | Fully wired |
| R4 Blueprint | — (aspirational) | `blueprint-runtime`/`website-blueprint`: **none**; `lib/blueprint`: create wizard + marketplace + operations | Mostly dead |
| R5 Commerce | offerings (unused registry), plans | `checkout.actions.ts` (coupons), pricing, billing plan-source; offerings read directly by aggregate | Partially wired |
| R6 Finance | Razorpay | billing actions, webhook, super-admin/admin/agency dashboards, operations, theme entitlement | Fully wired |
| R7 Success | prisma counts | `recommendation-runtime/infrastructure/context-source.ts` (only) | Isolated (1 consumer) |
| R8 Knowledge | aggregate snapshot, settings | dashboard, `/admin/knowledge`, builder hints, goals (alignment), recommendation (context) | Partially wired |
| R9 Goals | knowledge snapshot | storefront (ordering), dashboard, builder, `/admin/goals`, knowledge (alignment), recommendation (affinity) | Partially wired |
| R10 Recommendation | R8 + R9 + R7 + storefront score + metrics | dashboard, builder, `/admin/knowledge`, `/super-admin/recommendations` | Partially wired |

## Key dependency observations

1. **R8/R9/R10 all depend on the same `buildSnapshot`** but each builds its own
   copy — the snapshot is the shared dependency that is recomputed (see
   `docs/runtime-gap-analysis.md` G-PERF-1).
2. **R7 Success is a leaf** with exactly one consumer (R10). Its milestone data
   is the same real data R8/R9 read, but it is never surfaced independently.
3. **R1 Identity is a pure dead-end**: produced in the hottest pipeline path,
   never persisted, never rendered outside `/dev/generation-experience`.
4. **R4 Blueprint has two aspirational stacks with zero production consumers**
   and one partially-used stack; the production generation path uses the legacy
   `layout-composer` instead.
5. **The storefront is the least-integrated surface for the new runtimes**:
   it consumes R9 (goals), R3, R2, R5 — but not R8 declared facts or R10.
6. **Generation never reads back any persisted intelligence** (`creator_goals`,
   `knowledge_completion`): the write side (provisioning) and read side
   (generation) of creator intelligence are disconnected.
