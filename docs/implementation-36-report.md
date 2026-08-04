# Entity, Niche & Evidence Intelligence — IMPLEMENTATION-36

## 1. Architecture summary

Phase 3 of the Creator Intelligence Initiative. Transformed CreatorStore from a
persona detector into an **evidence-driven Creator Intelligence engine**: it now
detects who a creator is (entity), what they do (multi-niche), who they serve
(audience), how they earn (business models), every conclusion backed by
**evidence**, an explainable composable **confidence**, and config-driven
**recommendations**. The existing KnowledgeBuilder, PersonaEngine,
ExperienceProfileBuilder and acquisition pipeline are untouched — this layer
extends the IdentityProfile produced by the Hybrid Intelligence engine.

```
Acquisition → KnowledgeBuilder → Hybrid Intelligence → IdentityProfile
                                                          ↓
                                  Evidence Intelligence (IMPLEMENTATION-36)
                                    entities · niches · business · audience
                                    evidence · confidence · recommendations
```

## 2. Entity Intelligence

`evidence/config.ts` — 31 canonical entity types (creator, influencer, streamer,
athlete, sports_team, fitness, coach, educator, teacher, doctor, lawyer,
consultant, developer, designer, artist, musician, actor, photographer, trader,
investor, restaurant, startup, agency, brand, company, podcast, public_figure,
event, ngo, government, organization). Each rule has base keywords, strong
keywords (weighted higher) and niche affinity. **Never assumes "Creator"** —
entities are detected from evidence and AI only reinforces.

## 3. Niche Intelligence

Expanded multi-niche matrix (50+ niches incl. sports, fitness, nutrition,
finance, forex, crypto, AI, machine_learning, programming, web/mobile
development, photography, travel, comedy, luxury, beauty, fashion, gaming,
education, business, marketing, real_estate, food, cooking, music, dance,
health, mental_health, productivity, parenting, pets, automotive, science,
entertainment, ...). Detection is **multi-niche and weighted** — the top niche
is strongest, all detected niches carry confidence + evidence.

## 4. Evidence Engine

Every detection records `EvidenceItem { source, value, kind }` — the actual
matched signals (e.g. `fifa`, `champions league`, `real madrid` for an athlete;
`menu`, `reservation` for a restaurant). Conclusions are never unexplained:
`evidenceCount` is exposed and tested.

## 5. Confidence Engine

Composable, explained confidence: `{ overall, entity, niche, business, audience,
acquisition, breakdown[] }` where breakdown lists per-source scores + weights
(Deterministic + AI + Acquisition + Knowledge + Evidence). `overall` is the
weighted blend; AI reinforcement raises entity confidence (no extra AI calls).

## 6. Audience Intelligence

Config-driven segments (beginners, professionals, students, parents, creators,
developers, traders, investors, fitness, education) with evidence + confidence.
(Language/region/scope scaffolding is reserved; deterministic hooks exist.)

## 7. Business Intelligence

Config-driven business-model detection (courses, consulting, membership,
affiliate, products, services, community, newsletter, speaking, sponsorship,
coaching, digital_products, software, marketplace) — multiple allowed, each
evidence-backed.

## 8. Recommendation Engine

Entity → recommendation config: theme, sections, CTA, products, services,
brandTone, colorStyle, typography, SEO keywords. Deterministic and config-driven
(never random) — e.g. athlete → bold-sport + products; restaurant →
warm-dining + menu/reservations + "Book a table"; developer → dark-tech +
projects/blog; educator → academic + courses.

## 9. Diagnostics

Dev probe (`/dev/generation-experience`) exposes: detected entities (+
confidence), niches, business models, audience, recommendations
(theme/sections/CTA), overall confidence and evidence count
(`intelligence-line`, `int-entities`, `int-niches`, `int-business`,
`int-audience`, `int-recs`, `int-confidence`, `int-evidence`).

## 10. Golden Dataset

Expanded to **53 profiles** (was 14) across athletes, restaurants, developers,
doctors, musicians, teachers, companies, influencers, finance, gaming,
education, travel, beauty, fitness, lawyers, photographers, science, pets,
automotive, real-estate, news, AI, designers, artists, marketing, comedy, NGO,
podcasts, startups, consultants. Each new profile defines `expectedEntityType`,
`expectedNiches`, `expectedAudience`, `minimumConfidence` — a 39-entry evidence
regression suite.

## 11. Runtime flow

```
importProfile → acquisition → KnowledgeBuilder → PersonaEngine
  → hybridIntelligenceEngine.enrich (AI gap-fill, cache) → IdentityProfile
  → buildEvidenceIntelligence(source, graph, identityProfile)
      deterministic: entities/niches/business/audience (+ evidence)
      merge: AI entity/niches/business reinforcement (reuses hybrid output)
      recommendations (entity → config)
      confidence: composable + explained
  → ImportProfileResult.identityProfile.intelligence
```

## 12. Files changed

| File | Change |
|---|---|
| `intelligence/evidence/config.ts` | Entity/niche/business/audience matrices + recommendation map |
| `intelligence/evidence/detect.ts` | Deterministic multi-detection + evidence + AI merge + build |
| `intelligence/evidence/types.ts` | `EvidenceIntelligence` etc. |
| `intelligence/enrichment/types.ts` | `IdentityProfile.intelligence` |
| `intelligence/enrichment/config.ts` | Entity set expanded to 38 |
| `lib/onboarding/service.ts` | Builds + attaches evidence intelligence |
| `actions/onboarding.actions.ts` + dev probe | Surface intelligence |
| `golden/{types,registry}.ts` | 53 profiles + evidence anchors |
| tests | `evidence.test.ts`, `golden-regression.test.ts`, `implementation36.spec.ts` |

## 13. Unit tests

**18 evidence tests**: entity detection (athlete/restaurant/developer/doctor/
lawyer — never assumes Creator), multi-niche weighted (finance+crypto,
programming+web+ai), business models (courses+consulting, products), audience
(developers, students), recommendations (athlete products/CTA, restaurant
menu/reservations), composable confidence with breakdown, AI reinforcement
raises confidence, AI entity merge, Ronaldo + MrBeast golden targets.
**Golden regression (5)**: 53-profile dataset, rich sources don't collapse,
enriched entityType, Ronaldo resolution, + 39-entry evidence expectations
(entity/niches/confidence ≥ floor/evidence > 0).
Full suite: **88 files / 1825 tests**.

## 14. Build

`npx tsc --noEmit` ✅ · `npm run build` → `✓ Compiled successfully` ✅

## 15. Playwright Local

`R10` — **4/4 passed (30s)**:
1. MrBeast → creator intelligence (entities, niches, evidence, recs, confidence).
2. Fireship → developer/educator + technology niche + evidence.
3. NASA → science + organization intelligence + confidence.
4. DOM matches the runtime intelligence (consistent entities/recs/confidence).

## 16. Playwright Production

`https://influencer-space-alpha.vercel.app` — **4/4 passed (38s)** (deployed
commit `3039983`).

## 17. Browser verification

The dev probe's `intelligence-line` DOM matches the runtime evidence
intelligence locally and in production (MrBeast/Fireship/NASA with real YouTube
data). Browser DOM → Acquisition → Knowledge → Identity (hybrid) → Evidence
Intelligence → Recommendations → Website Generation stay synchronized. Entity/
niche/evidence correctness is additionally covered by the 39-entry golden
regression suite.

## 18. Cost analysis

Evidence intelligence is **fully deterministic** — zero LLM calls. AI remains
optional and only fills gaps via the existing Hybrid Intelligence call
(threshold-gated, cached). The evidence layer reuses the hybrid AI output (AI
entity/niches/business merge) with **no additional AI cost**: average AI cost
near zero for high-confidence profiles, and exactly one call at most for
low-confidence ones.

## 19. Future roadmap

- Language/region/global-vs-local audience inference (hooks reserved).
- Recommendation → actual storefront theme/section application.
- Evidence-driven golden scoring (entity/niche accuracy vs persona dims).
- AI-gap-fill for entity/niches when deterministic ambiguity is high.
- Diagnostics page with evidence drill-down.

## 20. Commit message suggestion

```
feat(intelligence): Entity, Niche & Evidence Intelligence
- config-driven evidence engine: 31 entity types, multi-niche weighted, business
  models, audience segments, recommendation map — every conclusion evidence-backed
- deterministic-first with AI reinforcement (reuses hybrid output, zero extra calls)
- composable explained confidence; wired into IdentityProfile + dev diagnostics
- golden dataset expanded to 53 profiles; 18 unit + 39-entry evidence regression
- R10 local & production
```
