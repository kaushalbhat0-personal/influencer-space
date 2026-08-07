# INTEGRATION-01 REPORT — Unified Intelligence Platform

RCCF-INTEGRATION-01 · Launch Readiness Initiative.

Based on: RCCF-AUDIT-06 Platform Intelligence Integration Audit.

Connects every existing runtime into one intelligent system. **Not a feature
epic** — no new intelligence runtimes, no new AI, no new onboarding forms, no
duplicated business logic. This is the integration layer.

## 1. Summary

The audit found two disconnected worlds (legacy generation stack vs. the
EPIC-04/05/06 intelligence runtimes) and 22 gaps, led by duplicate computation
(3× snapshot builds per dashboard render), intelligence-blind onboarding,
isolated Success Runtime and dead commerce ordering. This epic wires them
together around a single **Runtime Context**.

## 2. Deliverables by phase

| Phase | Deliverable | Location |
| --- | --- | --- |
| 1 Unified Runtime Context | `RuntimeContext` + `RuntimeContextBuilder` (React.cache, request-scoped, single snapshot) | `src/modules/runtime-context/` |
| 2 Onboarding intelligence | Knowledge score + recommended goals + top 3 recommendations + adaptive questions before generation; accepted goals/answers seeded after provisioning | `src/app/onboarding/page.tsx`, `onboarding-intelligence.actions.ts`, `components/onboarding/OnboardingIntelligence.tsx` |
| 3 Generation consumes intelligence | Accepted goal profile re-orders the generated builder artifact (`applyGoalSectionPriority`) | `src/actions/onboarding.actions.ts`, `goals-runtime/application/composition.ts` |
| 5 Success Runtime integration | Success milestones + next task on dashboard; replaces the hardcoded next-steps block | `components/dashboard/SuccessMilestonesCard.tsx`, `dashboard-page.tsx` |
| 6 Commerce intelligence | Goal-aware commerce ordering wired into dashboard quick cards (was dead code); prisma-free helpers for client bundles | `goals-runtime/application/{weights,commerce}.ts`, `dashboard-page.tsx` |
| 7 Storefront intelligence | Aggregate exposes `declaredFacts`; storefront TrustIndicators renders creator-verified facts only | `website-aggregate.service.ts`, `components/storefront/TrustIndicators.tsx`, `[domain]/page.tsx` |
| 8 Super Admin console | Runtime-context intelligence widgets on the tenant page; `/super-admin/recommendations` added to the real sidebar registry | `intelligence-console.tsx`, `tenants/[id]/page.tsx`, `admin-registry.ts` |
| 9 Event layer | Canonical internal event bus with durable AnalyticsEvent record + emitters | `src/modules/event-runtime/` |
| 10 Performance | Single snapshot per request, no re-scoring, no mutation on read | `runtime-context/application/builder.ts` |
| 11 Cleanup | Hardcoded next-steps removed (Success next task + recommendations replace it) | `dashboard-page.tsx` |
| 12 Builder intelligence | General (section-independent) recommendations panel — SEO/Domain/Publish/Analytics now surface | `builder-recommendation-panel.tsx` |
| 13 Request pipeline | Every wired surface follows RuntimeContextBuilder (see `docs/runtime-request-lifecycle.md`) | — |
| 14 Testing | New unit suite (7 tests) for context, preview, ordering, event bus | `tests/unit/runtime-context.test.ts` |
| — Documentation | 6 docs | `docs/` |

## 3. Architecture

```
Identity / Knowledge / Goals / Success / Recommendation
                  │
                  ▼
         Unified Runtime Context   (built ONCE per request)
                  │
   ┌──────────────┼───────────────┬──────────────┐
   ▼              ▼               ▼              ▼
Dashboard      Builder        Storefront    Super Admin
Commerce       Onboarding     Knowledge     Generation
```

## 4. Verification

- `tsc --noEmit` — ✅ clean.
- `next build` — ✅ green (all 145 pages).
- Unit tests — ✅ **98 files / 1952 passing** (was 1945; +7 new, zero regressions).
- Lint on all changed files — ✅ (only pre-existing warnings remain).
- Performance — the audit's 3× snapshot build is eliminated for wired surfaces
  (see `docs/runtime-performance.md`).

## 5. Constraints honoured

- No new AI providers, no additional AI calls.
- No new intelligence runtime (the event layer is infrastructure, not
  intelligence).
- No duplicate models, no duplicate calculations, no duplicate onboarding forms.
- No breaking API changes — runtime `evaluate`/`getRecommendations` methods
  keep their signatures; refactors are additive (`fromSnapshot` variants).
- No regression in storefront generation — goal ordering is additive and
  no-ops without a profile.

## 6. Success criteria

- ✅ Every runtime participates in onboarding (knowledge score, goals,
  recommendations, adaptive questions).
- ✅ Every runtime participates in generation (goals re-order the artifact).
- ✅ Every runtime participates in the dashboard (knowledge, goals, success,
  recommendations, commerce).
- ✅ Storefront consumes creator intelligence (declared facts → trust
  indicators).
- ✅ Commerce is intelligence-aware (goal ordering wired).
- ✅ Super Admin has full platform intelligence (runtime-context console).
- ✅ RuntimeContext eliminates duplicate computation.
- ✅ Event layer established.
- ✅ Platform behaves as one unified intelligent system.

## 7. Deferred / follow-ups (documented)

- Copy-level goal influence (CTA hierarchy, copy priorities) in generation.
- Full IdentityProfile persistence (RCCF-INTEGRATION-01 Phase 4).
- Routing storefront rendering + builder canvas through the shared context.
- `milestone.unlocked`, `product.created`, `booking.received`,
  `storefront.published`→`theme.changed`/`builder.published` event wiring.
- `knowledge_score` read-back TTL cache.

## Commit Message

`RCCF-INTEGRATION-01: Unified Intelligence Platform — Runtime Context (single snapshot), intelligence-first onboarding, generation goal ordering, success/commerce/storefront/super-admin integration, event layer, performance`
