# Runtime Integration Matrix

RCCF-AUDIT-06 · Launch Readiness Initiative.

Read-only audit of every platform runtime across every integration area.

## Legend

| Mark | Meaning |
| --- | --- |
| ✅ | Fully integrated — runtime output is consumed in production. |
| ◑ | Partially integrated — some consumers wired, others missing. |
| ✗ | Missing — runtime output is never consumed in this area. |
| — | Not applicable / out of scope for this runtime. |

## Matrix

| Runtime | Onboarding | Dashboard | Builder | Generation | Storefront | Commerce | Success | Knowledge | Goals | Recommendation | Super Admin | Events | Performance | Mobile |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Identity | ◑ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ◑ | ✗ |
| Experience | ✅ | ✗ | ◑ | ✅ | ✅ | ✗ | ✗ | ✗ | ✗ | ✗ | ◑ | ◑ | ✅ | ✅ |
| Theme | ✅ | ◑ | ✅ | ✅ | ✅ | ✗ | ✗ | ✗ | ✗ | ✗ | ✅ | ✅ | ✅ | ✅ |
| Blueprint | ◑ | ✗ | ◑ | ◑ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ◑ | ✗ | ◑ | ✗ |
| Commerce | ◑ | ✅ | ◑ | ◑ | ✅ | ✅ | ✗ | ✗ | ✗ | ✗ | ✅ | ✅ | ✅ | ✅ |
| Finance | ✅ | ✅ | ✗ | ✗ | ✗ | ✅ | ✗ | ✗ | ✗ | ✗ | ✅ | ✅ | ✅ | ✅ |
| Success | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✅ | ✗ | ◑ | ✅ | ✗ | ✗ | ✗ | ✗ |
| Knowledge | ✗ | ✅ | ✅ | ✗ | ✗ | ✗ | ✗ | ✅ | ✅ | ✅ | ✗ | ✗ | ✗ | ✅ |
| Goals | ✗ | ✅ | ✅ | ✗ | ✅ | ✗ | ◑ | ✅ | ✅ | ✅ | ✗ | ✗ | ✗ | ✅ |
| Recommendation | ✗ | ✅ | ✅ | ✗ | ✗ | ✗ | ✅ | ✅ | ✅ | ✅ | ◑ | ✗ | ✗ | ✅ |

## Per-area detail

### Area 1 — Onboarding
- ✅ Experience (generation stages drive the progress UI via `use-generation-experience`), Theme (applied at provisioning), Finance (plan resolution at provisioning).
- ◑ Identity (IdentityProfile is computed by `hybridIntelligenceEngine` but **dropped by the onboarding UI** — `ProfileData` has no identity/intelligence fields), Blueprint (legacy layout-composer; `lib/blueprint` only in the `/admin/create` path), Commerce (offerings seeded via provisioning; `lib/commerce` OfferingRegistry unused).
- ✗ Knowledge Score, Goals (no goal step, no seeding), adaptive questions, Recommendation output (evidence recommendations are **computed then discarded** in `importCreatorProfile`).

### Area 2 — Dashboard
- ✅ Knowledge (`KnowledgeScoreCard`), Goals (`GoalDashboardCard`), Recommendations (`NextBestStepCard`), Commerce (metrics), Health (`WebsiteHealth`), Finance (billing card).
- ✗ Success Runtime (`getCreatorSuccess` is **not** surfaced; the dashboard uses a hardcoded `getQuickStartSteps` + a hardcoded 6-step "next steps" block).
- ⚠️ Duplicate computation: `getDashboardData` builds the snapshot **3×** (see Performance).

### Area 3 — Builder
- ✅ Knowledge hints (`BuilderCompletionHints`), Goal suggestions (`GoalBuilderSuggestions`), Recommendation panel (`BuilderRecommendationPanel`), Theme card, Experience preview (device toggle).
- ◑ Commerce (section catalog only; no goal-driven commerce ordering — `applyCommerceOrder` is unused).
- ✗ SEO panel, brand panel; `builderAction.moduleId` is `null` for several recommendations (ENABLE_SEO, CONNECT_DOMAIN, PUBLISH_SITE, ENABLE_ANALYTICS, VERIFY_EMAIL) so those never match a selected section.

### Area 4 — Website Generation
- ✅ Experience (experience plan), Theme (blueprint → provisioning), legacy Blueprint (`layout-composer`/`composeStorefront`).
- ◑ Identity (computed, not persisted/fed), Commerce (offerings seeded by type).
- ✗ Goals (`creator_goals` never read by `src/lib/generation/**`), Knowledge declared facts (`knowledge_completion` never read by generation), Recommendation outputs.

### Area 5 — Storefront
- ✅ Goals (section + nav ordering via `applyGoalSectionOrder`/`applyGoalNavigation`), Experience (`experienceRegistry`), Theme (CSS vars), Commerce (products/services/courses), Trust (testimonials), SEO (snapshot metadata).
- ✗ Knowledge declared facts (never reach the public page), Recommendation (by design admin-only, but note it).
- ◑ Legal (platform-level terms/privacy/refund pages; no per-creator declared refund policy on the storefront).

### Area 6 — Commerce (creator surfaces)
- ✅ Finance (checkout, orders).
- ✗ Knowledge, Goals (`commercePriority`/`applyCommerceOrder` are **dead code** — no consumer), Recommendations, Success. Commerce admin pages are plain CRUD.

### Area 7 — Success Runtime
- ✅ Only feeds the Recommendation context (`context-source.ts`).
- ✗ Not surfaced on dashboard, builder, knowledge, goals, or super-admin. Three parallel "next step" systems exist: `getQuickStartSteps` (hardcoded), `getCreatorSuccess` (unused except recommendations), `goalAwareNextTask` (goals module).

### Area 8 — Knowledge Runtime
- ✅ Dashboard, Knowledge page, Builder hints, Goals (goal alignment), Recommendations.
- ✗ Storefront (declared facts not rendered), Generation (declared facts not consumed), Commerce, Super Admin (`loadPersistedScore` has zero consumers).

### Area 9 — Goals Runtime
- ✅ Homepage ordering, Navigation, Builder, Dashboard, Knowledge (alignment), Recommendations (affinity).
- ✗ Generation (prompts/blueprint), Commerce ordering (dead `applyCommerceOrder`).

### Area 10 — Recommendation Runtime
- ✅ Dashboard, Builder, Knowledge page, Goals (affinity), Success (context), Super Admin analytics.
- ✗ Onboarding, Storefront, Commerce. ⚠️ `markShown` performs a history read + conditional Setting upsert on every `getRecommendations` call.

### Area 11 — Super Admin
- ✅ Finance (revenue/transactions/subscriptions), Health (website health + production score), Commerce (tenants/orders), Recommendations analytics.
- ✗ Per-tenant Knowledge Score, Goals, Success. ⚠️ `/super-admin/recommendations` is missing from the actual sidebar registry (`src/config/admin-registry.ts`).

### Area 12 — Events
- ✅ Platform events, AuditLog, GenerationSession events, Builder events all exist.
- ✗ **No events from any intelligence runtime** (knowledge, goals, recommendations, success). `analyticsEngine.ingest` has zero call sites.

### Area 13 — Performance
- ◑ `getDashboardData` builds the snapshot **3×** per render (~57 DB queries just for snapshot builds), computes scores 2×, no caching on the pipeline; `knowledge_score` Setting persisted but never read back.
- ✅ Operations aggregator, billing and analytics caches exist for other subsystems.

### Area 14 — Mobile
- ✅ Dashboard, Knowledge, Goals, Recommendations, Commerce pages are responsive (grid stack).
- ◑ Builder is desktop-first; mobile uses the device-preview toggle (canvas itself is not a mobile editing surface).
- ✅ Storefront mobile bottom nav (`.slice(0, 5)`).

## Runtime coverage summary

| Runtime | Areas integrated (✅/◑) | Coverage (of 14 areas) |
| --- | --- | --- |
| Identity | 1 | 3% |
| Experience | 5 | 25% |
| Theme | 8 | 46% |
| Blueprint | 3 | 14% |
| Commerce | 7 | 36% |
| Finance | 5 | 29% |
| Success | 2 | 7% |
| Knowledge | 6 | 36% |
| Goals | 8 | 43% |
| Recommendation | 7 | 32% |
