# Platform Readiness Report

RCCF-AUDIT-06 · Launch Readiness Initiative.

Executive summary of the platform intelligence integration audit.

## Headline scores

| Metric | Score | Basis |
| --- | --- | --- |
| **Platform Integration Score** | **50 / 100** | Average of the 14 area integration scores. |
| **Runtime Coverage %** | **57%** | Average of the per-runtime Integration dimension (0–10). |
| **Launch Readiness %** | **78 / 100** | Reassessed from the audit; no critical blockers, but intelligence cohesion is incomplete. |
| Runtime architecture quality | 8.3 / 10 | Average Architecture dimension. |
| Future-readiness | 8.1 / 10 | Average Future-ready dimension. |

### Area integration scores

| Area | Score | Area | Score |
| --- | --- | --- | --- |
| Onboarding | 30 | Knowledge | 60 |
| Dashboard | 70 | Goals | 60 |
| Builder | 75 | Recommendation | 55 |
| Website Generation | 35 | Super Admin | 45 |
| Storefront | 80 | Events | 20 |
| Commerce | 30 | Performance | 35 |
| Success | 25 | Mobile | 75 |

## Runtime scorecard (total /50)

| Runtime | Score | Runtime | Score |
| --- | --- | --- | --- |
| Identity | 29 | Success | 29 |
| Experience | 37 | Knowledge | 35 |
| Theme | 38 | Goals | 35 |
| Blueprint | 26 | Recommendation | 33 |
| Commerce | 27 | Finance | 38 |

## Top 20 missing integrations

1. Generation never reads `knowledge_completion` declared facts.
2. Generation never reads `creator_goals` (prompts/blueprint/composition).
3. Onboarding shows no Knowledge Score.
4. Onboarding never recommends or seeds goals.
5. Onboarding never shows adaptive questions (completion questionnaire).
6. Onboarding discards the recommendation output it already computes.
7. Storefront never renders Knowledge declared facts.
8. Creation wizard (`/admin/create`) is runtime-free.
9. Commerce surfaces ignore all runtimes (no knowledge/goals/recommendations).
10. Goal-aware commerce ordering (`applyCommerceOrder`) is unused production code.
11. Success Runtime not surfaced on the dashboard.
12. Success Runtime not surfaced in Super Admin.
13. Super Admin has no per-tenant Knowledge Score view.
14. Super Admin has no per-tenant Goals view.
15. Super Admin has no per-tenant Success view.
16. `/super-admin/recommendations` missing from the actual sidebar nav.
17. Recommendation Runtime not on onboarding / storefront / commerce.
18. Identity (IdentityProfile) computed then discarded (never persisted).
19. `blueprint-runtime` + `website-blueprint` modules are dead/aspirational.
20. `lib/commerce` OfferingRegistry + PurchaseService are dead code.

## Top 20 low-effort wins

1. Share one `buildSnapshot` across dashboard/knowledge/recommendation (kills 3×/2× duplication).
2. Add `/super-admin/recommendations` to `src/config/admin-registry.ts` (one line).
3. Read back persisted `knowledge_score` on the dashboard instead of recomputing.
4. Surface the Success Runtime next-task on the dashboard.
5. Surface `importCreatorProfile`'s already-computed recommendations in onboarding preview.
6. Seed a recommended goal profile at provisioning (from niche).
7. Use goal `commercePriority` to order dashboard quick cards / commerce nav.
8. Emit a PlatformEvent on goal save / recommendation dismiss / complete.
9. Move recommendation `markShown` off the read path (batch or lazy).
10. Add knowledge score + goal alignment to `/super-admin/tenants/[id]`.
11. Remove the hardcoded 6-step "next steps" block (NextBestStepCard supersedes it).
12. Wire `goalAwareNextTask` into quick-start steps.
13. Render declared facts (refund policy, achievements) on the storefront footer/trust.
14. Show builder global recommendations (moduleId null) in a "General" section.
15. React.cache/memoize `buildSnapshot` per request.
16. Add intelligence widgets to the agency portal tenant page.
17. Unify the three "next step" systems behind the top recommendation.
18. Surface Success milestones on the knowledge page (compose with goal milestones).
19. Add an onboarding knowledge-score + goal summary card to the preview step.
20. Wire `analyticsEngine.ingest` to the event layer.

## Top 10 high-impact improvements

1. **Shared runtime context** — build the snapshot once, compute all scores once (performance + consistency).
2. **Generation consumes goals + declared facts** — generated sites reflect post-onboarding knowledge.
3. **Onboarding intelligence step** — recommended goals + adaptive questions + knowledge score (new creators start complete).
4. **Success Runtime surfaced** — goal-aware milestones as the primary dashboard checklist + super-admin view.
5. **Storefront consumes declared facts** — trust/legal sections reflect refund policy, achievements, community.
6. **Commerce driven by goals + knowledge** — commerce ordering + recommended product/pricing defaults.
7. **Super-admin intelligence console** — per-tenant knowledge/goals/recommendations/success.
8. **Intelligence event layer** — goals saved, recommendations dismissed/completed, scores computed (foundation for EPIC-07/08).
9. **Single next-step source of truth** — replace hardcoded checklists with recommendation-driven tasks.
10. **Business Health Score rollup (post-sprint)** — rolls up Knowledge, Storefront, Goal Alignment, Success into a north-star metric.

## Recommended next phase

**Priority: focused integration sprint** (resolve G-CRIT-1/2/3, G-HIGH-1/2/3/4,
G-MED-4). This is lower risk and higher immediate cohesion value than a new
runtime, and it creates the shared context + event foundation that both
candidate runtimes need.

Then choose, in order:

1. **EPIC-08 — Business Health Runtime**: rolls up Knowledge + Storefront +
   Goal Alignment + Success into a 0–100 north-star metric. The Recommendation
   Runtime already carries every rollup input in its context.
2. **EPIC-07 — Insights Runtime**: consumes the new event layer for
   cross-tenant intelligence (which creators complete, lift analysis).

## Constraints honoured

- Read-only audit — **no files outside `docs/` were modified**.
- No implementation, no refactoring, no runtime changes, no AI changes.

## Committed deliverables

- `docs/audit-06-platform-intelligence.md`
- `docs/runtime-integration-matrix.md`
- `docs/runtime-dependency-map.md`
- `docs/runtime-gap-analysis.md`
- `docs/platform-readiness-report.md`
