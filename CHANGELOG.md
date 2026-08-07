# Changelog

## Latest — RCCF-EPIC-07: Business Health Runtime
- Business Health Runtime module (`src/modules/business-health/`) — a derived projection over the shared Runtime Context; owns no business data
- Business Health Score (0–100) becomes the creator's north-star KPI
- 12 weighted dimensions (Knowledge 20, Goal 15, Storefront 15, Success 15, Commerce 10, Brand/Trust/SEO/Config 5, Adoption 3, Perf 2, Future 0) — registry-driven, configurable weights
- Health Engine consumes RuntimeContext only — never rebuilds the WebsiteAggregate, never recomputes existing scores
- Grades (A+ … F) + next milestone + recommended focus
- Immutable `health_history` projections (daily / significant change) + trend engine (improving/stable/declining/new)
- Dashboard `BusinessHealthHero` — score, grade, trend, focus, expandable dimension breakdown (computed from the same context, recorded once per day)
- Recommendation integration — every recommendation declares expected `healthLift` (+ shown on cards)
- Builder `BusinessHealthBadge` — health score + selected section's contribution
- Super Admin `/super-admin/business-health` platform aggregates (average, distribution, top/lowest, fastest improvers, dimension/plan/industry averages) + tenant console headline
- Events: `business-health.updated` / `business-health.grade.changed`
- Public API: evaluate / record / getHistory / getTrend / compare / platformHealth
- Docs: `business-health-runtime.md`, `business-health-scoring.md`, `business-health-registry.md`, `business-health-trends.md`, `implementation-68-report.md`
- Verification: tsc clean, next build green, 99 files / 1962 unit tests passing

## RCCF-INTEGRATION-01: Unified Intelligence Platform
- Runtime Context module (`src/modules/runtime-context/`) — single WebsiteAggregate build per request, request-scoped via React.cache; dashboard/knowledge/goals/super-admin wired (kills 3× snapshot duplication from the audit)
- Intelligence-first onboarding — knowledge score + recommended weighted goals + top 3 recommendations + adaptive questions on the preview step; accepted goals/answers seeded after provisioning
- Generation consumes the accepted goal profile — goal-preferred sections re-order the generated builder artifact (additive, no-op without goals)
- Success Runtime surfaced on the dashboard (milestones + next task) and Super Admin console; hardcoded next-steps block replaced
- Commerce intelligence — goal-aware ordering wired into dashboard quick cards (previously dead `applyCommerceOrder`); prisma-free helpers for client bundles
- Storefront intelligence — aggregate exposes `declaredFacts`; TrustIndicators strip renders creator-verified facts only
- Super Admin Intelligence Console on the tenant page; `/super-admin/recommendations` added to the real sidebar registry
- Runtime Event layer (`src/modules/event-runtime/`) — canonical internal event bus + durable AnalyticsEvent record; emitters for knowledge/goals/recommendations/onboarding/publish
- Builder general recommendation panel — SEO/Domain/Publish/Analytics recommendations now surface
- Docs: `runtime-context.md`, `intelligence-pipeline.md`, `runtime-event-contract.md`, `runtime-request-lifecycle.md`, `runtime-performance.md`, `integration-01-report.md`
- Verification: tsc clean, next build green, 98 files / 1952 unit tests passing

## RCCF-EPIC-06: Recommendation Runtime
- Recommendation Runtime module (`src/modules/recommendation-runtime/`) — DDD domain/application/infrastructure/presentation
- Answers "what should you do next?" from existing runtimes only: Knowledge, Goals, Success, Commerce, Experience, Storefront Score, Dashboard Metrics
- Phase 1: Recommendation Registry — 25 canonical recommendations (category, priority, time, expected impact, prerequisites, goal affinity, knowledge/success deps, when/done/reason)
- Phase 2: deterministic scoring engine (Priority × Business Impact × Goal Alignment × Knowledge Gap × Ease × Progress)
- Phase 3: categories — Critical / High Impact / Quick Wins / Growth / Optimization / Advanced
- Phase 4: dashboard "Today's Best Next Step" card (impact, time, affected scores, Mark done / Not now)
- Phase 5: Builder per-section recommendations panel (selection-aware)
- Phase 6: Knowledge dashboard Recommended Improvements (impact-ordered, replaces flat missing list)
- Phase 7: goal-affinity ranking (booking/commerce/portfolio creators get targeted improvements)
- Phase 8: expected impact per storefront dimension + storefront lift
- Phase 9: commerce chaining via prerequisites (product → polish → testimonials)
- Phase 10: success milestones auto-complete recommendations (shared signals, no duplicate logic)
- Phase 11: recommendation history (`recommendation_history` Setting: dismissed/completed/ignored/accepted + timestamps + completion scores)
- Phase 12: `/super-admin/recommendations` analytics (most/least completed, avg time, lifts)
- Phase 13: public API — getRecommendations / getTopRecommendation / dismiss / complete / refresh
- Server actions: `getRecommendations`, `getTopRecommendation`, `dismissRecommendation`, `completeRecommendation`, `refreshRecommendations`
- Docs: `docs/recommendation-runtime.md`, `docs/recommendation-registry.md`, `docs/recommendation-engine.md`, `docs/recommendation-scoring.md`, `docs/implementation-67-report.md`
- Future evolution documented: Business Health Score rollup (post-EPIC)
- Verification: tsc clean, next build green, 97 files / 1945 unit tests passing

## RCCF-EPIC-05: Creator Goals Runtime
- Creator Goals Runtime module (`src/modules/goals-runtime/`) — DDD domain/application/infrastructure/presentation
- Goals compose with the Knowledge Runtime (never replace it): Knowledge = "who are you?", Goals = "what are you trying to achieve?"
- Weighted goal profile (primary = highest weight) — creators evolve by changing weights, not the model
- Phase 1: Goal Registry — 14 canonical goals (id, label, category, supported sections, nav priority, commerce priority, supporting knowledge, milestones, suggestions)
- Phase 3: deterministic Goal Recommendation Engine (entity pack priors + live knowledge signals, normalized to 100)
- Phase 4/5: goal-driven homepage section + navigation ordering (hero/footer pinned; no-op without a profile)
- Phase 6: dashboard Business Goal card (primary goal, progress, missing items, CTA)
- Phase 7: Builder goal recommendations panel (contextual, only missing knowledge)
- Phase 8: commerce ordering (products/bookings/courses/services priority)
- Phase 9: goal-aware milestones (first booking, 10 orders, …)
- Phase 10: Goal Alignment — 8th Storefront Quality dimension (knowledge-runtime default unchanged)
- Phase 12: `/admin/goals` weighted profile editor + dashboard card + builder panel + knowledge dashboard alignment + nav item
- Server actions: `getGoalsRuntime`, `saveGoalProfile`, `applyRecommendedGoals`, `clearGoalProfile`, `getGoalBuilderSuggestions`
- Docs: `docs/goals-runtime.md`, `docs/goal-registry.md`, `docs/goal-composition.md`, `docs/goal-alignment.md`, `docs/implementation-66-report.md`
- Verification: tsc clean, next build green, 96 files / 1929 unit tests passing

## RCCF-EPIC-04: Knowledge Completion Runtime
- Knowledge Completion Runtime module (`src/modules/knowledge-runtime/`) — DDD domain/application/infrastructure/presentation
- Phase 1: canonical Knowledge Score engine (overall, 10 per-category %, confidence, missing fields)
- Phase 2: registry-driven missing-field detection — never re-asks known data
- Phase 3: Smart Question Engine — max 5 dynamic questions (text/choice/multichoice/action)
- Phase 4: Category Packs — fitness, restaurant, photographer, designer, educator, creator (pack fields replace universal fields)
- Phase 5: single Knowledge Registry — every field declarative (id, label, category, required, priority, validation, aiRelevance, generationUsage, href, source, complete/value)
- Phase 6: `/admin/knowledge` completion dashboard + compact dashboard score card + sidebar nav item
- Phase 7: Builder completion-hints panel (contextual, non-intrusive)
- Phase 8: AI assist boundary — assist only, never invent facts; offline deterministic transforms
- Phase 9: Storefront Quality Score — 7 dimensions (Knowledge, Content, Commerce, Brand, SEO, Trust, Accessibility)
- Persistence via `knowledge_completion` (declared facts) and `knowledge_score` Settings
- Server actions: `getKnowledgeRuntime`, `saveKnowledgeAnswers`, `getBuilderCompletionHints`
- Docs: `docs/knowledge-runtime.md`, `docs/knowledge-score.md`, `docs/completion-engine.md`, `docs/implementation-65-report.md`
- Verification: tsc clean, next build green, 95 files / 1901 unit tests passing

## v2.0.0 (Feature Branch: feature/v1.1-workspace-foundation)

### EPIC-01: Release Maintenance
- Canonical seed service for deterministic E2E data
- Playwright globalSetup for automatic pre-run seeding
- 31/31 core E2E tests passing 3x consecutive
- Architecture Decision Records (ADR-001 through ADR-005)
- Git tag v1.0.0

### EPIC-02: Workspace Foundation
- Workspace model + WorkspaceMember model + enums (WorkspaceType, WorkspaceRole, WorkspaceStatus)
- WorkspaceRepository (CRUD + membership)
- WorkspaceService (getCurrent, switch, list, resolveTenantId)
- AuthorizationService (role→permission mapping, 22 permissions)
- WorkspaceCookie (AES-256-GCM encrypted, versioned)
- JWT carries workspaceId, workspaceType, workspaceRole
- Middleware sets x-workspace-id from JWT
- Provisioning creates Workspace + WorkspaceMember

### EPIC-03: Billing Platform
- Added workspaceId FK to BillingSubscription, BillingEvent, BillingInvoice
- BillingRepository (workspace-aware CRUD for v2 billing tables)
- BillingService (checkout, payment capture, cancel, status)
- Razorpay webhook v2 pipeline with idempotency
- Real checkout flow via billing.actions.ts
- Legacy feature gates replaced with EntitlementService

### EPIC-04: Workspace Experience
- WorkspaceProvider + useWorkspace hook
- WorkspaceSwitcher dropdown component (type-aware)
- workspace.actions.ts (encrypted cookie server action)
- Middleware 308 redirect from /agency/* to /workspace/*
- WorkspaceSwitcher integrated into admin layout topbar

### EPIC-05: Agency Workspace Platform
- Team management actions (invite, remove, change role)
- Real WorkspaceMember data on agency team page
- Freelancer support via isFreelancer field
- Seat quota guard integrated with workspace membership

### v2.0 Release
- globalTeardown for Playwright
- Full release certification
- Migration guide
- 0 TypeScript errors, 0 ESLint errors, 333/333 Vitest
- 94/94 static pages, production build passing
