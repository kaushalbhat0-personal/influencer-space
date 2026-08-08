# Section Presentation Runtime

**Track:** RCCF-LAUNCH-TRACK-04 / 04B
**Status:** Launch readiness — implemented

Section presentation is *cosmetic, canonical, and non-structural*. Creators can
rename section titles, add descriptions, hide titles, and hide empty sections —
without ever changing the canonical section identities that power every runtime.

## What presentation is

Presentation is metadata only, stored under `slot.config.presentation`:

```ts
interface SectionPresentation {
  titleOverride?: string;      // displayed title, overrides the canonical default
  descriptionOverride?: string; // one-line description under the title
  hideTitle?: boolean;          // remove the section heading entirely
  visible?: boolean;            // master visibility switch (default true)
  hideWhenEmpty?: boolean;      // hide the section when it has no content
}
```

Presentation NEVER:
- renames canonical ids (`products.grid` stays `products.grid`),
- creates or deletes sections,
- changes business logic,
- changes runtime context, goals, knowledge, or analytics.

## The pipeline

```
Builder store (config.presentation)
  │  builderPagesToLayoutSnapshot()          ← single flattening rule
  ▼
LayoutSnapshot (Draft + Preview + Publish)   ← config carried verbatim
  │  LayoutEngine.composeSectionConfig()     ← single resolution point
  ▼
config.visibilityMode / hasContent / resolvedTitle / description / hideTitle
  │  shouldRenderSection()                    ← single render decision
  ▼
Renderers (registry) + Storefront page filter + Builder preview
```

Builder → Preview → Publish → Storefront all share the *same* pipeline, so a
title typed in the Builder appears identically in the canvas preview, the
`?preview=true` page, and the published live site.

## Canonical sections

- **Permanent** (always render, `hideWhenEmpty` ignored): `hero`, `navigation`,
  `footer`, `about`, `contact`.
- **Optional** (hide when empty by default): `products`, `gallery`, `timeline`,
  `testimonials`, `faq`, `courses`, `services`, `games`, `contentFeed`,
  `links`, `newsletter`, `pricing`, `embed`, `social`.

See [empty-section-policy.md](./empty-section-policy.md).

## Constraints upheld

- No renderer reads `config.presentation` directly — everything is resolved
  through `SectionPresentationResolver` / `shouldRenderSection`.
- Canonical section ids are never renamed; runtimes keep using them.
- Zero migration: creators without overrides see exactly today's behavior.
