# IMPLEMENTATION-65 REPORT — Knowledge Completion Runtime

RCCF-EPIC-04 · Launch Readiness Initiative — Phase 6.

Builds a Knowledge Completion Runtime that measures how complete a creator's
profile is, reports only what is missing, and guides the creator (and the
generation pipeline) toward a complete business profile — without asking 30
onboarding questions and without increasing AI cost.

## 1. Summary

Small creators arrive with sparse metadata. This runtime makes the gap visible,
scores it honestly, and turns every missing piece into a single targeted action
— either a smart question (for facts the creator confirms) or a deep-link to the
correct admin page (for content the creator must create). The result: website
quality improves without additional AI calls and without new onboarding forms.

## 2. Phases delivered

| Phase | Deliverable | Location |
| --- | --- | --- |
| 1 Knowledge Score | Overall + per-category %, confidence, missing fields | `application/score-engine.ts` |
| 2 Missing Field Detection | Registry-driven; never re-asks known data | `application/analyzer.ts` |
| 3 Smart Question Engine | Max 5 dynamic questions (text/choice/multi/action) | `application/question-engine.ts` |
| 4 Category Packs | Fitness, Restaurant, Photographer, Designer, Educator, Creator | `domain/category-packs.ts` |
| 5 Knowledge Registry | One canonical registry, all fields declarative | `domain/registry.ts` |
| 6 Completion Dashboard | `/admin/knowledge` + dashboard score card + nav | `presentation/*`, `app/admin/knowledge` |
| 7 Builder Integration | Non-intrusive hints panel in the Builder | `presentation/builder-hints.tsx` |
| 8 AI Integration | Boundary: assist only, never invent facts | `domain/ai-contract.ts` |
| 9 Storefront Quality Score | 7-dimension + overall score | `application/storefront-score.ts` |
| 10 Documentation | `knowledge-runtime.md`, `knowledge-score.md`, `completion-engine.md`, this report | `docs/` |

## 3. Architecture

New DDD module `src/modules/knowledge-runtime/` (domain / application /
infrastructure / presentation), mirroring `business-intelligence`. The runtime
reads the canonical `WebsiteAggregate` plus a handful of direct reads
(`tenant`, `account_data`, `influencer_data`, `knowledge_completion`, theme,
bookings) into a flattened `KnowledgeSnapshot`, then evaluates it through the
registry.

- **No architectural changes** to existing flows: onboarding, provisioning,
  publishing, builder and storefront are untouched.
- Server actions: `src/actions/knowledge.actions.ts` (re-exported from
  `src/actions/index.ts`): `getKnowledgeRuntime`, `saveKnowledgeAnswers`,
  `getBuilderCompletionHints`.
- Persistence: `knowledge_completion` Setting (declared facts) and
  `knowledge_score` Setting (last score).

## 4. Registry-driven design (Phase 5)

`KNOWLEDGE_REGISTRY` (38 universal fields) declares `id`, `label`, `category`,
`required`, `optional`, `priority`, `aiRelevance`, `generationUsage`, `packs`,
`replaces`, `validation`, `href`, `source`, and `complete()/value()` predicates.
The score engine, analyzer, question engine, builder hints and storefront score
contain **zero field knowledge** — everything derives from the registry.
Pack fields *replace* universal ones (`restaurant.menu` replaces
`commerce.products`), so no knowledge model is duplicated.

## 5. Verification

### Build

- `tsc --noEmit` — ✅ clean.
- `next build` — ✅ green (new route `/admin/knowledge` compiled, ƒ dynamic).

### Tests (vitest)

- Full unit suite: **95 files / 1901 tests passing** (was 1884 before — +25
  new knowledge-runtime tests).
- New `tests/unit/knowledge-runtime.test.ts` verifies:
  - ✓ Knowledge scoring (overall, per-category, confidence, complete = 100%)
  - ✓ Missing field detection + "never ask for known data"
  - ✓ Dynamic question generation (≤5, action/text/pack templates)
  - ✓ Entity-specific completion packs (fitness/restaurant/designer/educator/creator)
  - ✓ Completion engine (declared-fact validation, content-field rejection)
  - ✓ Builder hints (critical/warning/info, module ids)
  - ✓ Storefront score (7 dimensions, complete = 100)
  - ✓ AI boundary (allowed vs. prohibited operations)

### Existing onboarding unaffected

- Onboarding flow, `importCreatorProfile`, `runCreatorGeneration` untouched.
- `getDashboardData` gained an additive `knowledge` field; existing consumers
  unchanged.
- All pre-existing 1884 tests still pass.

## 6. Constraints

- **No additional AI calls** unless explicitly requested — the runtime is
  deterministic; `domain/ai-contract.ts` gates any future assist and provides
  offline transforms.
- **No duplicate knowledge models** — pack `replaces` semantics.
- **No duplicate onboarding forms** — content fields deep-link to admin pages.
- **Registry-driven / configuration-driven / SOLID / DRY** — single registry,
  single pack table, no field knowledge in UI.

## 7. Success criteria

- ✅ Small creators receive targeted completion instead of generic onboarding.
- ✅ Knowledge Score accurately reflects profile completeness.
- ✅ Website quality improves without requiring additional social imports
  (declared facts + deep links + storefront score).
- ✅ AI costs remain unchanged (zero new AI calls).
- ✅ Existing onboarding continues to work.
- ✅ Creator can progressively improve their profile over time (score recomputed
  on every evaluation; answers persisted and re-scored immediately).

## 8. Future roadmap

- Wire `KnowledgeGraph` generation-pipeline consumers to read
  `knowledge_completion` declared facts (contract is defined; pipeline already
  consumes `influencer_data`).
- Real AI assist wired to a provider behind `resolveAssist` when explicitly
  requested by a creator (cost-metered, boundary enforced).
- Deeper accessibility measurement for the storefront score (current proxy: alt
  text + hero media + title presence).

## Commit Message

`RCCF-EPIC-04: Knowledge Completion Runtime — registry-driven scoring, missing-field detection, smart questions, category packs, completion dashboard, builder hints, storefront score`
