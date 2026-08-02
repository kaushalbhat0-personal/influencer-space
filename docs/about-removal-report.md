# About Removal Report — IMPLEMENTATION-19 (Phase B)

## Verdict

The **About section is removed from the entire product**. No placeholder, no
hidden component, no compatibility renderer. Hero is the identity section.

## What was removed

### Runtime / Storefront
- `AboutRenderer` (`src/lib/registry/components/renderers.tsx`) — deleted.
- `about.default` registration (`builtins.ts`) — deleted.
- `"about"` removed from `ComponentCategory` (`types.ts`).
- `about: "about.default"` removed from `resolve-module.ts` `COMPAT_MAP`.
- About branch removed from `LayoutEngine.composeSectionConfig`.

### Builder
- About removed from `SECTION_CATALOG` (insert section), `SECTION_ICONS`,
  `EDIT_LINKS`, `CONTENT_LABELS` (`section-manager.tsx`).
- About default section removed from `builder/store.ts`.
- `about.default` removed from `PRESENTATION_DEFAULTS` and `inspector/schemas.ts`.

### Templates / Blueprints / Seeds
- 7 templates (`template/registry.ts`) — About sections + nav entries removed.
- 11 built-in blueprints (`blueprint/providers/built-in.ts`) — about sections,
  nav anchors, `recommendedSections`, `contentPrompts` removed.
- Business templates (`business-intelligence/domain/templates.ts`), `seed-prod-e2e.ts`.
- Demo seeds, import/adquisition strategies, `business-types.ts` page lists.

### Generation / AI
- `AboutComposer` (file deleted), `AboutGenerator` (file deleted),
  `AboutContentSchema`/`AboutContent` (schemas), `AboutQualityRule` (evaluation),
  about vocab keys, `this.about()` in layout strategies + variants (return `[]`),
  about prompt templates (`prompts/definitions/about.ts` deleted),
  about pages from `PageComposer`, about nav entries, `pageTypes`/`defaultModules`
  module lists, `RuntimeSignature`/parity `ModuleKey` ("about").

### Auto-migration (old layouts)
`isDeprecatedSection()` (in `resolve-module.ts`) is applied at **three** choke
points so legacy About sections disappear everywhere without a data migration:
1. `builderPagesToLayoutSnapshot` (publish + builder preview flattening).
2. `LayoutEngine.buildPages` (storefront rendering).
3. `BuilderService.load` (builder draft hydration — also drops empty sections).

## Tests updated
`builder-store.test`, `layout-engine.test` (dropping About + removed injection
test), `component-registry.test`, `generation-composition.test`,
`generation-evaluation.test`, `generation-prompts.test`, `builder-core.test`,
`integration.test`.

## Verified
- J5: no About section card in the builder sidebar or canvas.
- J1: no About text on the storefront.
- 1647 unit tests pass; 22/22 production E2E pass.
