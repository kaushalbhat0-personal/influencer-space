# Knowledge Completion Runtime

RCCF-EPIC-04 — Launch Readiness Initiative, Phase 6.

The Knowledge Completion Runtime transforms incomplete creator profiles into
complete business profiles before (and after) website generation. It measures
**what is already known**, reports **only what is missing**, and guides the
creator through targeted completion — never a 30-question onboarding form, and
never an AI that invents facts.

```
Small Creator
      ↓
Sparse Metadata
      ↓
Knowledge Completion Runtime
      ↓
Complete Knowledge Graph
      ↓
Premium Website
```

## Core principle

Do NOT ask users 30 onboarding questions.

Instead: measure knowledge quality. Ask only for what is missing.

## Architecture

```
Creator Import
        │
        ▼
Knowledge Graph (persisted storefront: WebsiteAggregate + settings)
        │
        ▼
Knowledge Analyzer (registry-driven)
        │
        ▼
Knowledge Score (overall, per-category, confidence, missing fields)
        │
        ▼
Knowledge Completion Engine (smart questions + declared facts)
        │
        ▼
Updated Knowledge Graph (knowledge_completion setting)
        │
        ▼
Generation Pipeline
```

## Module

All code lives in `src/modules/knowledge-runtime/` following the project's DDD
convention (`domain` / `application` / `infrastructure` / `presentation`).

| Layer | File | Responsibility |
| --- | --- | --- |
| Domain | `domain/types.ts` | `KnowledgeSnapshot`, `KnowledgeField`, `KnowledgeScore`, `CompletionQuestion`, `CategoryPack`, `StorefrontScore`, `BuilderHint` |
| Domain | `domain/registry.ts` | `KNOWLEDGE_REGISTRY` — the canonical field registry |
| Domain | `domain/category-packs.ts` | `CATEGORY_PACKS` — entity-specific completion packs |
| Domain | `domain/ai-contract.ts` | The AI assist boundary (allowed vs. prohibited) |
| App | `application/analyzer.ts` | Missing-field detection |
| App | `application/score-engine.ts` | Knowledge Score |
| App | `application/question-engine.ts` | Smart question generation |
| App | `application/completion-engine.ts` | Answer validation + declared-fact persistence |
| App | `application/storefront-score.ts` | Storefront Quality Score |
| App | `application/builder-hints.ts` | Builder completion hints |
| App | `application/score-service.ts` | Orchestration + Setting persistence |
| Infra | `infrastructure/aggregate-source.ts` | Builds the snapshot from the live tenant |
| Pres | `presentation/knowledge-score-card.tsx` | Score widget (dashboard + knowledge page) |
| Pres | `presentation/knowledge-dashboard.tsx` | `/admin/knowledge` page |
| Pres | `presentation/completion-questionnaire.tsx` | Phase 3 question UI |
| Pres | `presentation/storefront-score-card.tsx` | Storefront score display |
| Pres | `presentation/builder-hints.tsx` | Builder side-panel hints |

## Data flow

1. `knowledgeAggregateSource.buildSnapshot(tenantId)` reads the canonical
   `WebsiteAggregate` (`src/modules/tenant/application/website-aggregate.service.ts`)
   plus a few direct reads: tenant (domain), `account_data`, `influencer_data`,
   `knowledge_completion`, theme colors, bookings. The output is a flattened,
   read-only `KnowledgeSnapshot`.
2. `computeKnowledgeScore(snapshot)` runs the registry against the snapshot:
   per-category %, overall %, confidence, missing fields.
3. `generateCompletionQuestions(snapshot, missing)` returns at most **5**
   targeted questions (pack templates first, deterministic fallback otherwise).
4. `knowledgeScoreService.saveAnswers(tenantId, answers)` validates answers,
   persists creator-confirmed **declared facts** under the `knowledge_completion`
   Setting, and re-scores immediately.
5. Content that must be created (products, gallery, testimonials…) is never
   written here — it becomes an **action question** that deep-links to the
   correct admin page. No duplicate onboarding forms.

## Settings used

| Setting key | Purpose |
| --- | --- |
| `knowledge_completion` | Declared facts + pack id + timestamp |
| `knowledge_score` | Last computed score (diagnostics / observability) |

## Integration points

- **Dashboard** (`/admin/dashboard`): compact `KnowledgeScoreCard` in the side
  column (`getDashboardData` returns `knowledge`).
- **Knowledge page** (`/admin/knowledge`): full completion dashboard — score,
  per-category bars, smart questions, storefront score, all missing fields with
  deep links, builder hints. Added to the admin sidebar under **Profile**.
- **Builder** (`/builder`): `BuilderCompletionHints` panel in the Website side
  — contextual, non-intrusive hints per section.
- Server actions: `src/actions/knowledge.actions.ts`
  (`getKnowledgeRuntime`, `saveKnowledgeAnswers`, `getBuilderCompletionHints`),
  re-exported from `src/actions/index.ts`.

## Constraints honoured

- **No additional AI calls.** The runtime is 100% deterministic. AI assists
  only when a creator explicitly requests it, and only within the boundary in
  `domain/ai-contract.ts`.
- **No duplicate knowledge models.** Pack fields *replace* universal fields
  (`replaces`), never duplicate them.
- **No duplicate onboarding forms.** Content fields route to existing admin
  pages; only declared facts are collected inline.
- **Registry-driven, configuration-driven, SOLID / DRY.** Every field, pack,
  question, hint and score derives from `domain/registry.ts` and
  `domain/category-packs.ts`.

## See also

- `docs/knowledge-score.md` — scoring methodology.
- `docs/completion-engine.md` — questions, packs, persistence, AI boundary.
- `docs/implementation-65-report.md` — verification report for this EPIC.
