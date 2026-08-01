# Builder Contract

**IMPLEMENTATION-14 · Phase E · 2026-08-01**

## The Contract

> **The Builder never persists "content." It persists only a PresentationBlueprint —
> layout, variants, styling, animation, responsive rules. Everything else always
> comes from the live CMS.**

| Owned by the Builder (PresentationBlueprint) | Owned by the Live CMS (never in the builder) |
|---|---|
| Section order | Hero copy (title, subtitle, CTA) |
| Section visibility | About / profile (bio, image, tagline) |
| Layout variant (grid / masonry / carousel / list) | Products |
| Theme package + color/typography overrides | Gallery images |
| Spacing, padding, container width, gap | Services |
| Columns | Courses |
| Alignment | Testimonials |
| Animations | FAQ items |
| Responsive rules (mobile / tablet / desktop) | Timeline events |
| Background / border / radius / shadow | Games |
| Widget configuration (embed URL, autoplay, limit) | Links / social |
| | SEO (title, description, OG) |

## Why

The storefront renders **live** content on every request
(`websiteAggregateService.build()` in `mergeLiveContent`). Content edited in the
Dashboard/Admin appears in the Builder canvas and the Storefront the moment it
is saved — no publish, no reload, no preview step. If the builder also stored
content in `Block.config`, there would be two competing sources of truth and a
publish/reload would be required for edits to surface.

## Enforcement

`src/lib/builder/presentation.ts` is the single filter:

- `PRESENTATION_DEFAULTS` — presentation-only default props per registered
  component (never content defaults).
- `GLOBAL_PRESENTATION_KEYS` — the universal presentation vocabulary
  (`animation`, `alignment`, `columns`, `layout`, `spacing`, `background`,
  `border`, `radius`, `shadow`, `variant`, `responsive`, ...).
- `isPresentationKey(componentId, key)` — decides whether a key is editable in
  the builder.
- `presentationPropsFor(componentId, config)` — strips content keys from any
  config before it enters a block.

### Enforcement points

1. **Insertion** — `BuilderStore.insertComponent()` seeds only
   `presentationDefaults(componentId)`. A newly added `products.grid` carries
   `{ columns: 3, animation: "stagger" }` — no `name`, `description`, `price`.
2. **Inspection** — `BuilderStore.updateBlockConfig()` rejects any key that is
   not a presentation key for that component. `title`, `content`, `bio`, etc.
   are silently ignored.
3. **Serialization** — `builderPagesToLayoutSnapshot()` ships only what is in
   `Block.config`; since content never enters `Block.config`, the draft layout
   is content-free by construction.
4. **Publish** — the persisted snapshot is presentation-only (see
   `runtime-equality-report.md`): content is replaced with `EMPTY_AGGREGATE`.

## What this enables

- **Dashboard edit → Builder updates → Storefront updates** with no publish.
- **Builder layout change → Builder updates → Storefront unchanged → Publish →
  Storefront updates.** Content is never part of the publish delta.
- WYSIWYG: the canvas shows exactly what the live storefront will show for the
  current draft layout, because both are composed from the same live aggregate
  through the same LayoutEngine.

## Non-goals

- The builder does not edit hero copy, products, gallery, faq, testimonials,
  timeline, games, links, courses, services, profile, or SEO. Those live in the
  Admin modules and flow into the builder/storefront via the aggregate.
