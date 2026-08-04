# Website Intelligence & Blueprint Engine — IMPLEMENTATION-37

## 1. Architecture summary

Phase 4 of the Creator Intelligence Initiative. Added the missing
**Relationship Intelligence** layer and a deterministic **Website Blueprint
Engine** that produces the canonical storefront blueprint for the detected
creator. The Builder, ComponentRenderer, LayoutEngine and Theme Runtime are
untouched — the Blueprint is pure, serializable, versioned data that guides
them.

```
Acquisition → Knowledge → Identity → Evidence → Relationship Intelligence → Website Blueprint
```

## 2. Website Blueprint

`WebsiteBlueprint { version, entity, layout, sections[], visibleSections[],
navigation[], cta, theme, seo, analytics[], monetization[], integrations[],
publishing, evidence, diagnostics }`. Config-driven per entity; deterministic,
serializable (JSON-stable), versioned (`BLUEPRINT_VERSION = 1`). No UI logic.

## 3. Section Intelligence

Per-entity templates with `required / recommended / optional / hidden`
decisions + ordering:
- **Athlete**: hero, achievements, sponsors, gallery, media, testimonials,
  contact (required) · merchandise, community, events (optional) · courses,
  games, timeline (hidden).
- **Restaurant**: hero, menu, reservations, gallery, location, hours,
  testimonials, contact (required) · courses, games, products (hidden).
- **Developer**: hero, projects, skills, experience, github, contact (required)
  · blog, testimonials, services (optional) · menu, reservations, games
  (hidden).
- **Educator**: hero, courses, testimonials, faq, newsletter, community,
  contact.
- **Fitness**: hero, programs, pricing, transformations, testimonials, booking,
  nutrition, faq, contact.
Business-model evidence **promotes or inserts** sections (e.g. a creator
selling courses gets a Courses section even though the base template omitted
it). Every decision is evidence-backed.

## 4. Navigation Intelligence

`navigation[]` derives only from **visible** sections (hidden excluded), sorted
by order, capped at 6, with labels + anchor hrefs.

## 5. CTA Intelligence

Entity-driven primary/secondary CTAs: athlete → "Shop Merch" / "Follow My
Season"; restaurant → "Reserve Table" / "View Menu"; developer → "View My
Work" / "Hire Me"; educator → "Enroll Now"; fitness → "Book Session". Evidence-
backed, config-driven.

## 6. Theme Intelligence

Theme family + typography + spacing + animation density + visual tone + color
direction per entity (e.g. athlete → bold-sport/high-contrast; restaurant →
warm-dining/serif; developer → dark-tech/mono; educator → academic/calm-blue).
Reuses the Theme Runtime conventions — never hardcodes a theme.

## 7. Layout Intelligence

Entity → layout: athlete/developer/photographer → `portfolio`; restaurant →
`restaurant`; educator → `education`; fitness/coach/musician → `landing`;
doctor/agency → `business`; creator/influencer/streamer → `creator`.

## 8. SEO Intelligence

Title strategy (`{name} — ...`), meta strategy, structured-data type
(`Person`/`Restaurant`/`Course`/`MedicalClinic`/`Organization`/`MusicGroup`),
OpenGraph type, canonical pattern, + entity + niche-derived default keywords.

## 9. Analytics Intelligence

Entity-driven conversion events: athlete → merch_purchase/video_view; restaurant
→ reservation/menu_view/call_click; developer → portfolio_download/
consultation_booking; educator → course_purchase/newsletter_signup; fitness →
consultation_booking/program_purchase.

## 10. Monetization Intelligence

Modules (recommendations only — no payments): athlete → merchandise/
sponsorship/community; restaurant → services/products; developer → services/
digital_products/software; educator → courses/community/newsletter; fitness →
coaching/products/membership. Merged with the detected business models.

## 11. Integration Intelligence

From the Relationship Intelligence graph platforms: youtube/instagram/spotify/
github/discord/twitch/calendly/linkedin/notion/telegram/google_maps, merged with
entity defaults (developer → github+youtube; restaurant → google_maps+instagram;
musician → spotify+youtube).

## 12. Diagnostics

Dev probe (`/dev/generation-experience`) exposes the full blueprint:
`bp-entity`, `bp-layout`, `bp-theme`, `bp-cta`, `bp-seo`, `bp-sections`,
`bp-integrations`, `bp-monetization`, `bp-relationships` (knowledge-graph
chains), `bp-brands`.

## 13. Golden Dataset

53 profiles; blueprint regression anchors added (`expectedLayout`,
`expectedThemeFamily`, `expectedCta`, `expectedSections`, `expectedIntegrations`,
`expectedMonetization`, `expectedSeoType`). A deterministic/serializable
blueprint regression runs across all profiles + a representative-profile matrix
(Messi/restaurant/developer/fitness).

## 14. Runtime flow

```
importProfile → acquisition → KnowledgeBuilder → PersonaEngine
  → hybridIntelligenceEngine.enrich → IdentityProfile
  → buildEvidenceIntelligence → EvidenceIntelligence
  → buildRelationshipGraph(source + platform) → RelationshipGraph
  → buildWebsiteBlueprint(evidence, relationships, identity) → WebsiteBlueprint
  → IdentityProfile.blueprint + ImportProfileResult.blueprint
```

## 15. Files changed

| File | Change |
|---|---|
| `intelligence/evidence/relationship.ts` | Relationship Intelligence (knowledge graph) |
| `blueprint/config.ts` | Per-entity BlueprintTemplate config |
| `blueprint/types.ts` | `WebsiteBlueprint` |
| `blueprint/builder.ts` | Pure/versioned `buildWebsiteBlueprint` |
| `intelligence/enrichment/types.ts` | `IdentityProfile.blueprint` |
| `lib/onboarding/service.ts` | Builds relationships + blueprint |
| `actions/onboarding.actions.ts` + dev probe | Surface blueprint |
| `golden/{types,registry}.ts` | Blueprint anchors |
| tests | `blueprint.test.ts`, `golden-regression.test.ts`, `implementation37.spec.ts` |

## 16. Unit tests

**15 new tests** (blueprint + relationship): FIFA→athlete chain, Nike/Adidas
sponsorship brands, GitHub→developer, no-invention for unrelated text;
athlete/restaurant/developer/educator/fitness blueprints (layout/theme/CTA/SEO/
sections/monetization/integrations); business-model section promotion +
insertion; navigation from visible sections; determinism/serialization/version;
publishing title. Plus golden regression (7): blueprint determinism across all
profiles + representative profile matrix.
Full suite: **89 files / 1840 tests**.

## 17. Build

`npx tsc --noEmit` ✅ · `npm run build` → `✓ Compiled successfully` ✅

## 18. Playwright Local

`R11` — **4/4 passed (30s)**: blueprint renders for Fireship (developer/educator,
entity-driven sections), integrations + monetization from evidence, relationship
surface, DOM↔blueprint sync (MrBeast → creator via platform reinforcement).

## 19. Playwright Production

`https://influencer-space-alpha.vercel.app` — **4/4 passed (35s)** (deployed
commit `4b11cce`).

## 20. Browser verification

The dev probe's `blueprint-line` DOM matches the blueprint runtime locally and
in production: entity-driven sections, layout, theme family, CTA, SEO type,
integrations, monetization, relationship chains and brands all derive from the
deterministic blueprint. Browser DOM → Identity → Evidence → Relationship
Intelligence → Website Blueprint → Builder Runtime stay synchronized.

## 21. Cost analysis

**Zero additional AI cost.** Relationship Intelligence and the Website Blueprint
are fully deterministic. The blueprint reuses the existing IdentityProfile +
hybrid AI output; no new prompts, no new provider calls, no new cache entries.
Average AI cost remains near zero for high-confidence profiles.

## 22. Future roadmap

- Blueprint → actual Builder page/section application (via the existing artifact
  pipeline, not a new renderer).
- Localization-ready navigation + SEO (locale hooks reserved).
- Deeper relationship chains (competitor/peer links, brand partnerships).
- Blueprint-driven AI content generation prompts (single call, cached).

## 23. Commit message suggestion

```
feat(intelligence): Website Intelligence & Blueprint Engine
- Relationship Intelligence knowledge graph (FIFA→Football→Athlete, Nike→
  Sponsorship, github→Developer) — deterministic, no LLM
- versioned Website Blueprint: entity-driven sections/layout/theme/CTA/SEO/
  analytics/monetization/integrations; pure + serializable
- wired into IdentityProfile + dev diagnostics; golden blueprint regression
- 15 unit tests + 7 golden; R11 local & production
```
