# Intelligence Pipeline

RCCF-INTEGRATION-01 · Phases 2, 3, 6, 7, 12.

How every platform surface now consumes the intelligence runtimes through the
shared Runtime Context.

## Onboarding (Phase 2)

`src/app/onboarding/page.tsx` + `src/actions/onboarding-intelligence.actions.ts`

After import and before generation, onboarding now surfaces:

1. **Knowledge Score** — overall + top categories + top missing fields,
   computed from the imported profile (`computeOnboardingPreview`).
2. **Recommended weighted goal profile** — from the Goals Runtime
   (`recommendGoals`), with an **accept / skip** toggle.
3. **Top 3 recommendations** — from the Recommendation Runtime.
4. **Adaptive questions** — reused from the Knowledge Runtime question engine
   (text/choice, optional).

Accepted goals + answers are seeded after provisioning via
`seedOnboardingIntelligence` (writes `creator_goals` + `knowledge_completion`
through the existing runtimes — no new forms, no new models).

## Generation consumes intelligence (Phase 3)

`runCreatorGeneration` now accepts the accepted `goals` profile and applies
`applyGoalSectionPriority` to the generated builder artifact — goal-preferred
sections are ordered earlier (hero first, footer last). Additive and guarded:
no goals → identical output.

## Commerce is intelligence-aware (Phase 6)

- `applyCommerceOrder` / `commercePriority` (previously dead code) now drive the
  dashboard quick cards — booking-first creators see Bookings first,
  products-first see Products first. No-op without a goal profile.
- The helpers were extracted into a **prisma-free** module
  (`goals-runtime/application/weights.ts` + `commerce.ts`) so they are safe for
  client components.

## Storefront consumes creator intelligence (Phase 7)

- The WebsiteAggregate now exposes `declaredFacts` from the
  `knowledge_completion` setting.
- The storefront renders a **TrustIndicators** strip (Achievements, Mission,
  Languages, Refund policy, Community, Newsletter) — **only creator-verified
  declared facts**, never AI-generated. Renders nothing when no facts exist.

## Builder (Phase 12)

- The builder recommendation panel now shows section-matched **and** global
  (section-independent) recommendations — SEO, Domain, Publish, Analytics
  previously never surfaced because their `builderAction.moduleId` is null.

## Success Runtime (Phase 5)

- Success milestones + next task are included in the Runtime Context and
  surfaced on the dashboard (`SuccessMilestonesCard`) and the Super Admin
  intelligence console.
- The hardcoded 6-step "next steps" block on the dashboard was replaced with
  the Success Runtime next task.

## Consumers summary

| Surface | Knowledge | Goals | Success | Recommendations | Commerce |
| --- | --- | --- | --- | --- | --- |
| Onboarding | ✅ | ✅ | — | ✅ | — |
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Builder | ✅ | ✅ | — | ✅ | — |
| Storefront | ✅ (declared facts) | ✅ (ordering) | — | — | ✅ |
| Super Admin | ✅ | ✅ | ✅ | ✅ | — |
| Knowledge page | ✅ | ✅ (alignment) | — | ✅ | — |
| Goals page | ✅ | ✅ | — | — | ✅ (priority) |
