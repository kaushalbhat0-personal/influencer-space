# Intelligent Storefront Composition Engine — IMPLEMENTATION-38

## 1. Architecture summary

Phase 5 — final phase — of the Creator Intelligence Initiative. Turned the
Website Blueprint from diagnostic into **executable**: a deterministic
Storefront Composition Engine composes the **Builder Aggregate** (configuration
only — no JSX/components/HTML). The Builder, ComponentRenderer, LayoutEngine,
Theme Runtime, Media Runtime and Publishing Runtime are untouched.

```
WebsiteBlueprint → Storefront Composition Engine → StorefrontComposition
  → builder artifact (buildBuilderArtifactData-compatible)
  → BuilderPage[] draft → Builder Runtime → Published Storefront
```

## 2. Composition Engine

`src/lib/generation/intelligence/composition/engine.ts` — pure, deterministic,
serializable, versioned (`COMPOSITION_VERSION = 1`) `composeStorefront(input)`.
Input: blueprint + identity + evidence + relationships. Output: `StorefrontComposition`
(theme, layout, sections, navigation, SEO, analytics, media, publishing, builder
draft, diagnostics incl. a SHA-1 `deterministicSignature`). The Builder never
knows the configuration came from AI.

## 3. Builder Integration

The composition produces:
- a **builder artifact** (`{ sections:[{id,type,props}], navigation, theme,
  metadata }` — exactly the `buildBuilderArtifactData` shape), and
- **`BuilderPage[]`** (home + optional products page) with one `BuilderSection`
  per visible section and one `BuilderSlot` (`moduleId` + `config`).

**Drafts:** the artifact only seeds the Builder when the DB has zero pages
(`builderService.load` first; `tryLoadFromArtifact` only on empty). Creators own
the draft — the blueprint never overwrites manual edits. Regeneration produces a
new proposal, never an automatic overwrite.

## 4. Section Composition

Blueprint sections → existing registry components (`SECTION_MAP`): hero →
`hero.{default,fitness,education,gaming}` (entity variant), gallery/projects/
transformations → `gallery.grid`, products/merchandise → `products.grid`,
menu/sponsors/github/community/events → `links.default`, reservations/booking/
location → `contact.default`, achievements/experience → `timeline.default`,
hours/nutrition → `faq.default`, programs → `services.default`, media/blog →
`contentFeed.default`, courses → `courses.default`, services/skills →
`services.default`, pricing → `pricing.default`, faq/newsletter/testimonials →
exact, footer → `footer.default`. No new section types; closest-mappings are
documented. A golden regression asserts every visible section maps to a
**registered** component and nothing is left unmapped.

## 5. Theme Composition

Blueprint `themeFamily` → Theme Registry id via a config map
(`bold-sport → com.creatos.cyber-arena`, `warm-dining → com.creatos.
modern-restaurant`, `dark-tech → com.creatos.game-stream`, `academic →
com.creatos.academy`, `energetic-coach → com.creatos.coach`, `creator-lifestyle
→ com.creatos.creator-studio`, …), validated against the registry with a
`com.creatos.neon-dark` fallback. Never hardcodes a theme.

## 6. Layout Composition

Blueprint `layout` → builder page structure: home page always; a `/products`
page only when a products section is visible. Layout string carried through.

## 7. Navigation Composition

Builder navigation from blueprint navigation (only visible sections, correct
order, anchor hrefs).

## 8. SEO Composition

Title, description, keywords (entity + niches), structured-data type, OpenGraph
type and canonical from the blueprint — carried into the composition + artifact.

## 9. Media Composition

Hero media resolved via the existing `resolveHeroMediaForRuntime`
(backgroundUrl/posterUrl from the acquired avatar) → `resolvedMedia/mediaUrl/
mediaPoster/rendererDecision` on the hero section + composition.media. No
duplicate resolver.

## 10. Draft Integration

`builder.artifact` + `builder.pages` are the Builder draft. Once saved by the
creator, the Builder owns it; the blueprint is only the initial composition.

## 11. Diagnostics

Dev probe (`/dev/generation-experience`) exposes: composition themeId, layout,
hero media, deterministic signature, section count + visible, builder page count
(`composition-line`, `cp-theme`, `cp-layout`, `cp-hero`, `cp-signature`,
`cp-sections`, `cp-pages`). `diagnostics.unmappedSections` + `themeMapping` +
`heroVariant` on the composition object.

## 12. Runtime flow

```
importProfile → acquisition → KnowledgeBuilder → hybrid enrich → IdentityProfile
  → buildEvidenceIntelligence → buildRelationshipGraph → buildWebsiteBlueprint
  → composeStorefront(blueprint, identity, evidence, relationships)
      → StorefrontComposition (sections/moduleIds/content, theme id, SEO, media,
        builder artifact + BuilderPage[])
  → ImportProfileResult.composition + IdentityProfile.composition
  → (builder seeds from artifact only when no saved pages)
```

## 13. Files changed

| File | Change |
|---|---|
| `intelligence/composition/config.ts` | Section→component map + themeFamily→themeId map |
| `intelligence/composition/types.ts` | `StorefrontComposition`/`BuilderDraft` |
| `intelligence/composition/engine.ts` | Pure `composeStorefront` + content mapping |
| `intelligence/enrichment/types.ts` | `IdentityProfile.composition` |
| `lib/onboarding/service.ts` | Compose after blueprint |
| `actions/onboarding.actions.ts` + dev probe | Surface composition |
| tests | `composition.test.ts`, `golden-regression.test.ts`, `implementation38.spec.ts` |

## 14. Unit tests

**9 composition tests**: restaurant (theme/moduleIds/nav/no-products-page),
developer (github→links), athlete (achievements→timeline, sponsors→links, hero
content), educator (courses), hero entity variant (fitness→hero.fitness),
never-fabricate (hidden + empty arrays), determinism/versioning/serialization,
artifact shape consumable by the existing loader, real social links attached.
**Golden composition regression**: blueprint→composition→builder deterministic
across all 53 profiles; every visible section maps to a REGISTERED component;
no unmapped sections.
Full suite: **90 files / 1850 tests**.

## 15. Build summary

`npx tsc --noEmit` ✅ · `npm run build` → `✓ Compiled successfully` ✅

## 16. Playwright Local

`R12` — **4/4 passed (55s)**: composition renders a deterministic blueprint→
builder config (developer), entity reflection (theme derived from blueprint),
builder pages + sections from the composition, DOM↔composition sync.

## 17. Playwright Production

`https://influencer-space-alpha.vercel.app` — **4/4 passed (35s)** (deployed
commit `e06408f`).

## 18. Browser verification

The dev probe's `composition-line` DOM matches the composition runtime locally
and in production: themeId (`com.creatos.*`), layout, hero media kind,
deterministic signature, section counts and builder page counts all derive from
the deterministic composition. Browser DOM → Blueprint → Composition → Builder
Aggregate → Runtime → Published Storefront stay synchronized.

## 19. Cost analysis

**Zero additional AI cost.** Composition is fully deterministic and reuses the
WebsiteBlueprint + IdentityProfile (already produced). No new prompts, no new
provider calls, no new cache entries. AI cost remains near zero for
high-confidence profiles.

## 20. Future roadmap

Per the architectural recommendation, the Creator Intelligence Initiative is
complete. Every subsequent AI feature — copy generation, media selection, theme
refinement, SEO enhancement, multilingual content, regeneration — consumes the
**Website Blueprint** and **Storefront Composition** as the single canonical
source, never introducing new intelligence layers. Next: wire the composition
into the actual onboarding provision path (replace the generic `builder_artifact`
seed with the intelligence composition), and Builder regeneration.

## 21. Commit message suggestion

```
feat(intelligence): Intelligent Storefront Composition Engine
- deterministic versioned composition: WebsiteBlueprint → Builder Aggregate
  (sections→existing registry components, theme→theme id, nav/SEO/analytics/media)
- builder artifact + BuilderPage[] draft; never overwrites manual edits
- wired into IdentityProfile + dev diagnostics; golden composition regression
- 9 unit tests + golden; R12 local & production
```
