# Empty Section Policy

**Track:** RCCF-LAUNCH-TRACK-04B (Phase 5/6/10)

Storefronts never display empty placeholder sections. This policy is enforced
by two canonical helpers — `sectionHasContent()` and `shouldRenderSection()` —
so the check is defined once and every surface uses it.

## The one content check: `sectionHasContent(baseId, content)`

`src/modules/section-presentation/application/runtime.ts`

| base id | has content when |
| --- | --- |
| `products` | `content.products.length > 0` |
| `gallery` | `content.gallery.length > 0` |
| `timeline` | `content.timeline.length > 0` |
| `testimonials` | `content.testimonials.length > 0` |
| `faq` | `content.faq.length > 0` |
| `courses` / `content_feed` | `courses` ∪ `contentFeed` non-empty |
| `services` / `offerings` | `services` ∪ `offerings` non-empty |
| `games` | `content.games.length > 0` |
| `links` | `content.links` / hero social links non-empty |
| `pricing` | `plans` ∪ `pricingPlans` non-empty |
| `newsletter`, `contact` | always (interactive forms) |
| anything else | always |

The LayoutEngine computes `config.hasContent` **once** per section and every
renderer reads it. Embed/Social presence (`url`, `serverId`, `username`) is
resolved from config by the engine.

## The one render decision: `shouldRenderSection(config)`

- `visibilityMode === "hidden"` → **hidden** (creator explicitly turned it off).
- `visibilityMode === "auto"` && `hasContent === false` → **hidden** (empty).
- otherwise → rendered.

Applied at:
1. **Storefront page** — `src/app/[domain]/page.tsx` filters sections before
   rendering so hidden/empty sections are removed from the DOM (no empty
   landmarks, no stray dividers).
2. **Builder preview** — `interactive-canvas.tsx` uses the identical filter, so
   the canvas preview matches the live site.
3. **Renderers** — each renderer returns `null` when `useVisibility(props)` is
   false, so even a direct render path never emits an empty placeholder.

## Placeholders are developer-only

`EmptyState` and the hero "Your hero goes here" hint render only in
non-production builds. Live storefronts never show them.

## Permanent sections (Phase 6)

`PERMANENT_SECTIONS` = `["hero", "navigation", "footer", "about", "contact"]`.

These always render; `hideWhenEmpty` is ignored for them (an explicit
`visible: false` still hides them). Canonical list is exported from
`@/modules/section-presentation` and documented in
[section-presentation-runtime.md](./section-presentation-runtime.md).
