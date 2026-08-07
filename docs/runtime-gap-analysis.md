# Runtime Gap Analysis

RCCF-AUDIT-06 · Launch Readiness Initiative.

Every missing or weak integration identified by the audit, grouped by severity.
Each gap cites evidence (file path). Effort: S (small, <1h), M (medium, <1d),
L (large, >1d).

## Critical

| ID | Gap | Evidence | Effort |
| --- | --- | --- | --- |
| G-CRIT-1 | **Generation pipeline never reads persisted knowledge or goals.** Declared facts (`knowledge_completion`) and weighted goals (`creator_goals`) written after onboarding are invisible to `src/lib/generation/**` — prompts, blueprint and composition react only to niche/business-model/evidence. | `docs/implementation-65-report.md` ("wire consumers to read knowledge_completion — contract is defined"); zero matches for `knowledge_completion|creator_goals` in `src/lib`. | L |
| G-CRIT-2 | **Onboarding is intelligence-blind.** No Knowledge Score, no goal recommendation/seeding, no adaptive questions, no recommendation output on `/onboarding` — a brand-new creator starts with zero goals and zero declared facts until they discover `/admin/goals` and `/admin/knowledge`. | `src/app/onboarding/page.tsx` (`ProfileData` has no identity/rec fields); `importCreatorProfile` computes evidence recommendations then the UI discards them. | M |
| G-CRIT-3 | **Duplicate computation on every dashboard/knowledge render.** `getDashboardData` calls `knowledgeScoreService.evaluate` + `goalRuntime.evaluate` + `recommendationRuntime.getRecommendations`, each building a fresh `buildSnapshot` (~19 queries) → **3× snapshot builds (~57 queries)**, knowledge/storefront scores 2×, goal alignment 2×, counts 2× per render. No cache anywhere on the pipeline. | `src/features/dashboard/actions.ts:16-25`; `knowledge-runtime/application/score-service.ts:44`; `goals-runtime/application/goal-runtime.ts:54`; `recommendation-runtime/infrastructure/context-source.ts:37`. | M |

## High

| ID | Gap | Evidence | Effort |
| --- | --- | --- | --- |
| G-HIGH-1 | **Success Runtime is isolated.** `getCreatorSuccess` (11 milestones, completion %) has a single consumer (Recommendation context) and never reaches the dashboard, builder, knowledge, goals, or super-admin. Three parallel "next step" systems exist with no shared wiring. | `src/lib/creator-success/runtime.ts`; only import is `recommendation-runtime/infrastructure/context-source.ts:19`. | M |
| G-HIGH-2 | **Goal-aware commerce ordering is dead code.** `applyCommerceOrder` / `commercePriority` (goals module) have zero production consumers; commerce admin pages are plain CRUD with no knowledge/goals/recommendation influence. | `goals-runtime/application/commerce.ts`; no consumer outside goals module + tests. | S |
| G-HIGH-3 | **Super Admin has no intelligence visibility.** No per-tenant Knowledge Score (persisted `knowledge_score` Setting + `loadPersistedScore` have **zero consumers**), no goals view, no success view. | `knowledge-runtime/application/score-service.ts:76` (`loadPersistedScore` unused); no `knowledgeScoreService`/`goalRuntime`/`getCreatorSuccess` in `src/app/super-admin`. | M |
| G-HIGH-4 | **`/super-admin/recommendations` is unreachable from the sidebar.** The page exists but the rendered `SuperAdminSidebar` reads `src/config/admin-registry.ts`, which does not contain the route (it was added only to `src/lib/navigation/config.ts`). | `src/components/admin/SuperAdminSidebar.tsx:7`; `src/config/admin-registry.ts` (no `recommendations` entry). | S |
| G-HIGH-5 | **Identity (IdentityProfile) is computed and discarded.** Produced on every import by `hybridIntelligenceEngine`, never persisted, never consumed by generation/storefront/dashboard; the only render surface is the dev probe. | `src/lib/generation/intelligence/enrichment/engine.ts`; consumer = `src/lib/onboarding/service.ts` only; `src/app/dev/generation-experience/page.tsx`. | M |
| G-HIGH-6 | **Recommendation `markShown` writes history on every read.** `getRecommendations` performs a history read + conditional Setting upsert (first impression) on every dashboard/knowledge render — a write path on a read surface. | `recommendation-runtime/application/runtime.ts:25-28`; `history.ts:24`. | S |
| G-HIGH-7 | **Storefront ignores Knowledge declared facts.** The public page reads the aggregate (brand/hero/products/…) but never `knowledge_completion` — declared achievements, refund policy, community/newsletter facts never render (trust/legal sections unaffected by declared facts). | `website-aggregate.service.ts` (no `knowledge_completion` read); `[domain]/page.tsx`. | M |

## Medium

| ID | Gap | Evidence | Effort |
| --- | --- | --- | --- |
| G-MED-1 | **Creation wizard (`/admin/create`) is runtime-free.** Industry → style → review → done with only the creation-local blueprint/theme recommender; no goals, no knowledge score, no recommendations, no success. | `src/lib/creation/wizard/steps.ts`; `creation-wizard-client.tsx`. | M |
| G-MED-2 | **Hardcoded checklist vs runtimes.** `getQuickStartSteps` (5 fixed steps) + a hardcoded 6-step "next steps" block coexist with Success milestones and goal-aware milestones. | `src/features/dashboard/service.ts:109-126`; `dashboard-page.tsx:108-133`. | M |
| G-MED-3 | **Builder recommendations miss global recs.** `builderAction.moduleId` is `null` for ENABLE_SEO, CONNECT_DOMAIN, PUBLISH_SITE, ENABLE_ANALYTICS, VERIFY_EMAIL — the per-section panel never shows them. No builder SEO/brand panel. | `recommendation-runtime/domain/registry.ts`; `builder-recommendation-panel.tsx`. | S |
| G-MED-4 | **No events from intelligence runtimes.** No PlatformEvent/AuditLog/AnalyticsEvent for goal saved, recommendation dismissed/completed, knowledge answered, score computed, milestone reached. `analyticsEngine.ingest` has zero call sites. | `src/modules/{knowledge,goals,recommendation}-runtime/` (no event writes); `src/lib/analytics/engine.ts`. | M |
| G-MED-5 | **`lib/commerce` offering/purchase runtime is dead.** `offeringRegistry` + `purchaseService` have zero consumers; the storefront reads `prisma.offering` directly and checkout uses legacy `product`/`productOrder` + Razorpay. | `src/lib/commerce/registry.ts`, `purchases.ts`; `website-aggregate.service.ts:87-91`; `checkout.actions.ts`. | L |
| G-MED-6 | **Blueprint runtime stacks are aspirational.** `src/modules/blueprint-runtime/` (resolver + 4 adapters) and `src/modules/website-blueprint/` (composeBlueprint) have zero production consumers; production generation uses the legacy `layout-composer`. | `src/modules/blueprint-runtime/**` (no consumers); `src/modules/website-blueprint/**`. | L |

## Low

| ID | Gap | Evidence | Effort |
| --- | --- | --- | --- |
| G-LOW-1 | **Persisted scores never read back.** `knowledge_score` Setting is written only in `saveAnswers` and `loadPersistedScore` is never called; every page recomputes. | `score-service.ts:66-95`. | S |
| G-LOW-2 | **`/super-admin/analytics` is a placeholder** ("Not Yet Implemented"). | `src/app/super-admin/analytics/page.tsx`. | M |
| G-LOW-3 | **Agency/partner portals lack intelligence widgets** (knowledge/goals/success) on client pages. | `src/app/agency/**` (no runtime imports). | M |
| G-LOW-4 | **`analyticsEngine` unused** — the AnalyticsEvent table is only counted, never written. | `src/lib/analytics/engine.ts` (zero ingest call sites). | M |
| G-LOW-5 | **No goal seeding at provisioning** — new tenants get no default goal profile; `/admin/goals` shows an empty state until visited. | `provisioning-service.ts` (writes no `creator_goals`). | S |
| G-LOW-6 | **Storefront mobile nav is fixed at 5 items** and ignores goal ordering for the bottom sheet (desktop nav is goal-ordered). | `src/components/storefront/StorefrontNav.tsx` (`.slice(0,5)`). | S |

## Severity tally

| Severity | Count |
| --- | --- |
| Critical | 3 |
| High | 7 |
| Medium | 6 |
| Low | 6 |
| **Total** | **22** |
