# Component Registry Report

**IMPLEMENTATION-13 · Phase A · 2026-08-01**

## Verdict

Every component id that can reach the renderer, the publish validator, or the
storefront now exists exactly once in the ComponentRegistry. No missing ids, no
aliases, no dead ids, no stale ids.

## The Production Error

```
Unknown component: hero.agency
```

`hero.agency` existed only in `src/lib/template/registry.ts` (the AGENCY
template). `src/lib/template/service.ts:100` writes template `moduleId` values
directly to `Block.moduleId`. Any site provisioned with the Agency template had
a block referencing a component that was never registered.

## Every Place Component Ids Originate — Audited

| Source | File | Result |
|---|---|---|
| Component registry (canonical) | `src/lib/registry/components/builtins.ts` | 24 registered ids, unique |
| Template registry | `src/lib/template/registry.ts` | Fixed: 4 stale hero ids → `hero.default` |
| Provision pipeline (template apply) | `src/lib/template/service.ts` | Writes `Block.moduleId`; now only registered ids |
| Blueprint generator | `src/modules/website-blueprint/application/composition-engine.ts` | Reads SECTION_REGISTRY; now only registered types |
| Section registry | `src/modules/website-blueprint/domain/section-registry.ts` | Rewritten: every `type` is a registered id |
| Business templates | `src/modules/business-intelligence/domain/templates.ts` | All `moduleId`s are registered ids |
| Generation composition | `src/lib/generation/composition/*` | Section types resolved via `resolveModuleId` before reaching the builder |
| Blueprint-runtime adapters | `src/modules/blueprint-runtime/infrastructure/*.ts` | Map `section.type` → `moduleId`; types are now registered ids |
| LayoutEngine | `src/lib/storefront/layout-engine/LayoutEngine.ts` | Pass-through; compose branches are `moduleId.startsWith(...)` — no new ids emitted |
| Publish validator | `src/lib/publishing/service.ts:collectBlockingIssues` | Validates against the registry; now passes for all generated data |
| InteractiveCanvas | `src/features/builder/canvas/interactive-canvas.tsx` | Renders `section.moduleId` from the layout — data from the builder store |
| Snapshot serializer | `src/lib/publishing/snapshot-serializer.ts` | Copies ids verbatim; input is already validated upstream |
| Builder catalog (sidebar) | `src/features/builder/components/section-manager.tsx` | Registry-validated at module load |
| Artifact loader | `src/lib/builder/artifact-loader.ts` | Drops sections whose resolved id is not registered |

## Canonical Component Registry (24 ids)

`hero.default` `hero.gaming` `hero.fitness` `hero.education` · `about.default` ·
`gallery.grid` · `products.grid` · `timeline.default` · `links.default` ·
`footer.default` · `testimonials.default` · `faq.default` · `contact.default` ·
`newsletter.default` · `pricing.default` · `courses.default` · `services.default`
· `games.default` · `contentFeed.default` · `embed.spotify` · `embed.youtube` ·
`social.discord` · `social.instagram`

## Removed Legacy Ids (migrated, never runtime-fallback)

```
hero.agency        → hero.default
hero.music         → hero.default
hero.restaurant    → hero.default
hero.portfolio     → hero.default
hero.creator       → hero.default
hero.professional  → hero.default
hero.corporate     → hero.default
hero.minimal       → hero.default
about.summary      → about.default
products.featured  → products.grid
services.grid      → services.default
services.list      → services.default
pricing.table      → pricing.default
testimonials.carousel → testimonials.default
reviews.carousel   → testimonials.default
faq.accordion      → faq.default
newsletter.signup  → newsletter.default
contact.form       → contact.default
booking.cta        → contact.default
cta.contact        → contact.default
cta.signup         → contact.default
cta.banner         → contact.default
social.proof       → links.default
portfolio.grid     → gallery.grid
case_studies.grid  → gallery.grid
videos.gallery     → gallery.grid
menu.preview       → gallery.grid
location.map       → contact.default
community.preview  → links.default
programs.grid      → services.default
stats              → timeline.default
content_feed       → contentFeed.default
```

## Data Migration

`scripts/migrate-component-ids.ts` rewrites existing `Block.moduleId` rows to
their canonical equivalent. Dry-run by default; run with `--apply` to commit.
After migration no block can reference an unregistered component.

## Regression Guard

`tests/unit/component-registry.test.ts` asserts that every template block,
SECTION_REGISTRY type, business template module id, and `resolveModuleId` compat
target is a registered id, and that no legacy hero id survives in any data
source.
