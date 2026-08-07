# Completion Engine

RCCF-EPIC-04 — Phase 3, Phase 4, Phase 5, Phase 8.

The Completion Engine turns *"what's missing"* into *"what to ask and where to
put the answer"* — without long forms and without inventing anything.

## Phase 5 — Knowledge Registry

`src/modules/knowledge-runtime/domain/registry.ts`

One canonical registry (`KNOWLEDGE_REGISTRY`). Every field declares:

- `id`, `label`, `category`
- `required` / `optional`
- `priority` (1–5)
- `aiRelevance` (may AI assist rewrite/summarize/improve/expand?)
- `generationUsage` (which pipeline stages consume the field)
- `packs` (entity applicability — absent = universal)
- `replaces` (pack fields replace universal fields — no duplicate models)
- `validation` (minLength / maxLength / minCount)
- `href` (deep-link used to complete the field)
- `source` (`aggregate | table | setting | declared`)
- `complete(snapshot)` + `value(snapshot)`

Everything — scoring, missing-field detection, questions, hints, storefront
score — derives from this registry. There is no field knowledge in any UI.

## Phase 4 — Category Packs

`src/modules/knowledge-runtime/domain/category-packs.ts`

Each entity type gets a different completion experience. Packs map from the
onboarding category value and replace generic fields with entity-specific ones:

| Pack | Onboarding categories | Entity-specific fields |
| --- | --- | --- |
| `fitness` | fitness | Programs, Transformations, Trainer Certifications |
| `restaurant` | restaurant | Menu, Reservations, Cuisine, Location |
| `photography` | photography | Portfolio, Packages, Equipment |
| `designer` | art | Case Studies, Services, Tools, Deliverables |
| `educator` | education | Courses, Teaching Languages, Community |
| `creator` | gaming, music, film, lifestyle, sports, business, … | Sponsors, Affiliate Links, Resources |

A restaurant has a **Menu** (not generic "Products"); a photographer has a
**Portfolio** (not generic "Gallery"). Because pack fields *replace* the
universal field, nothing is double-counted.

## Phase 3 — Smart Question Engine

`src/modules/knowledge-runtime/application/question-engine.ts`

Instead of a 30-question onboarding form, the engine returns at most **5**
questions, generated dynamically from what is actually missing.

- **Pack question templates** take priority (entity-specific prompts, e.g.
  educator languages → multi-select of languages).
- **Text / choice / multi-select** questions collect *declared facts*
  (creator-confirmed reality).
- **Action questions** appear for content that must be created (products,
  gallery, testimonials) and deep-link to the correct admin page — "We couldn't
  find what you sell." → **Add your first product**.

## Completion & persistence

`src/modules/knowledge-runtime/application/completion-engine.ts` and
`application/score-service.ts`

1. `applyDeclaredAnswers(snapshot, answers)` validates every answer against the
   registry `validation` rules and rejects answers for non-declared fields
   (content fields must be created on their own admin pages — no duplicate
   forms).
2. Accepted facts are persisted under the `knowledge_completion` Setting as
   `{ packId, updatedAt, facts }` (keys are the field ids with `.` → `_`).
3. `knowledgeScoreService.saveAnswers` merges new facts with existing ones and
   re-scores immediately so the dashboard reflects the update.

## Phase 8 — AI boundary

`src/modules/knowledge-runtime/domain/ai-contract.ts`

AI only **assists**. It never invents facts. The runtime itself makes zero AI
calls; `resolveAssist(request)` validates any proposed assistance:

| Allowed | Prohibited |
| --- | --- |
| Rewrite existing text | Guess products |
| Summarize existing text | Invent achievements |
| Improve existing text | Create fake testimonials |
| Expand existing text | Infer pricing |

- Fact-only fields (`products`, `pricing`, `testimonials`, `achievements`,
  `affiliateLinks`) reject AI assistance outright.
- Assistance requires an existing value written by the creator — AI never
  starts from nothing.
- `summarize`/`improve` include deterministic offline transforms, so assistance
  remains useful with **no AI cost**.

## Phase 7 — Builder hints

`src/modules/knowledge-runtime/application/builder-hints.ts` +
`presentation/builder-hints.tsx`

Contextual, non-intrusive hints in the Builder's Website panel:

- Gallery — "Add N images for a stronger portfolio."
- Products — "No products yet."
- Hero — "Your hero could be improved with a tagline."

## Phase 9 — Storefront Quality Score

`src/modules/knowledge-runtime/application/storefront-score.ts`

Every generated website receives a storefront score across **seven** dimensions
(Knowledge, Content, Commerce, Brand, SEO, Trust, Accessibility) plus an
overall score — displayed to the creator on `/admin/knowledge`. All
deterministic.
