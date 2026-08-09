# Audit 09B — Independent Content Pages

**Track:** RCCF-AUDIT-09B
**Type:** READ-ONLY architecture audit (Requirement B)
**Status:** No code changed

## Purpose

Determine whether the platform can support websites where large collections
live on independent pages (`/products`, `/gallery`, `/games`, ...) instead of
crowding the homepage.

## Current architecture (verified)

### Storefront is a single-URL homepage

- `src/app/[domain]/` contains **only** `page.tsx` and `not-found.tsx`.
- **There is no `/[domain]/layout.tsx`, no `/[domain]/[slug]`, and no
  collection routes** (`/products`, `/gallery`, `/games`, `/services`,
  `/courses`, `/testimonials`, `/faq`, `/checkout`). All verified absent.
- `page.tsx:176-183` **flattens every page's sections onto the single `/`
  URL**: `pages.flatMap(p => p.sections)`. Page slugs, `isHome` and `order`
  are metadata only — they never drive routing.

### Page model — EXISTS but unused for routing

- `prisma/schema.prisma:714` — `model Page` (`id, websiteId, name, slug,
  order, isHome, theme, config`; `@@unique([websiteId, slug])`).
- `prisma/schema.prisma:733` — `model Section` (`pageId, name, order,
  visible, locked, config, blocks`).
- `prisma/schema.prisma:751` — `model Block` (`sectionId, moduleId, parentId,
  order, visible, locked, config`).
- `src/types/snapshot.ts:179` — `LayoutSnapshot.pages[]` includes `name, slug,
  isHome, order, sections[]`. The snapshot's page structure is real.
- **But no route consumes a page slug.** The storefront ignores
  `isHome`/`slug`/`order` and renders everything on `/`.

### Page templates — creation-time only, not runtime

- `src/lib/template/registry.ts` — 7 hardcoded **site-creation templates**
  (gaming/fitness/education/music/restaurant/portfolio/agency), each a single
  Home page. Applied once at site creation (`service.ts`), not a runtime engine.
- `src/lib/pages/registry.ts` — `PAGE_REGISTRY` (foundation `/`, `/about`,
  `/contact`; legal `/privacy`, `/terms`, `/refund`; **dynamic `/products`,
  `/services`, `/courses`, `/bookings`, `/gallery`, `/testimonials`, `/faq`**).
  This documents the intended page set but is **not wired to routing**.
- `src/modules/website-blueprint/application/composition-engine.ts` —
  `composeBlueprint()` builds a multi-page blueprint from a business profile
  during generation. Pre-provisioning only.
- **No runtime template engine maps a page slug to a rendered route.**

### Navigation

- Stored as a `Setting` row key `"navigation"` (`src/lib/navigation/service.ts`).
- `generateDefaults()` emits **all-anchor** items (`#hero`, `#products`, ...).
- `NavigationItem.type` supports `"page" | "anchor" | "external"`
  (`snapshot.ts:230`), but the storefront (`StorefrontNav.tsx`) only routes
  anchors (scrollIntoView) and externals; `"page"` type degrades to anchor
  behavior and would be a dead link (no routes exist).
- The admin nav manager (`admin/website/navigation/navigation-manager.tsx`)
  only adds external links — no UI for page-type items.

### Website aggregate & publish

- `WebsiteAggregate` (`snapshot.ts:74`) has **no page notion** — pure content.
- Published snapshots keep the full section list in `layout.pages[].sections[]`
  but **empty the content** (`service.ts:194-197`); the storefront re-hydrates
  content live on every request (`live-content.ts:32`).

## Answers to Part 3 (Pages architecture)

| Question | Verdict | Evidence |
| --- | --- | --- |
| 1. Create a page? | ⚠️ Only in Builder | `/admin/website/pages` is read-only; page creation is Builder-side (draft) |
| 2. Edit a page? | ✅ In Builder | page sections/slots editable in `/builder` |
| 3. Publish a page? | ✅ Together with site | publish persists `layout.pages[].sections[]` |
| 4. Page has sections? | ✅ | `Page.sections[]` + `Section.blocks[]` |
| 5. Page contains CMS renderers? | ✅ | sections reference module renderers via `Block.moduleId` |
| 6. Linked from navigation? | ❌ | page-type nav is typed but non-functional (no routes) |
| 7. In the Website Aggregate? | ❌ | aggregate has no pages field |
| 8. In snapshots? | ✅ | `layout.pages[]` in the published snapshot |
| 9. Published? | ✅ | layout persisted on publish |
| 10. Public storefront routes to them? | ❌ | single `/` route; all pages flatten onto it |

## Answers to Part 4 (public routing)

| Route | Exists? | Behavior |
| --- | --- | --- |
| `/[domain]` | ✅ | homepage — flattens all pages' sections |
| `/[domain]/products` | ❌ | missing |
| `/[domain]/gallery` | ❌ | missing |
| `/[domain]/games` | ❌ | missing |
| `/[domain]/services` | ❌ | missing |
| `/[domain]/courses` | ❌ | missing |
| `/[domain]/[slug]` | ❌ | missing |
| `/purchase`, `/purchase/[orderId]` | ✅ | order lookup/download (not storefront pages) |

Classification: public pages are **hardcoded to a single homepage route**;
independent collection pages are **missing**; the page records exist in the DB
and snapshots but are not routed.

## Gap summary

1. **No independent page routing** — every page renders on `/`.
2. **No runtime page template engine** — only creation-time templates.
3. **`PAGE_REGISTRY` is descriptive, not wired** — the intended dynamic page
   slugs (`/products`, etc.) have no corresponding routes or renderers.
4. **Navigation page-type is non-functional.**
5. **Aggregate lacks pages** — independent pages would need a page→section
   resolution (already present in `layout.pages[]`) + per-page content.

## Reuse path (for a future Phase 2)

The building blocks already exist: `Page` model, `Page.sections`, layout
snapshot `pages[]`, section registry renderers, `LayoutEngine`. An independent
page route is the missing glue — a `[domain]/[slug]` (or explicit collection
routes) that resolves a page from the published snapshot and renders its
sections through the exact same `ExperienceSection` + `DataBoundRenderer`
path the homepage uses. No new runtime is required; the collection renderers
already exist.

## Files inspected

- `src/app/[domain]/page.tsx`, `src/app/[domain]/not-found.tsx`
- `prisma/schema.prisma` (Page/Section/Block, 714/733/751)
- `src/types/snapshot.ts`
- `src/lib/template/registry.ts`, `src/lib/template/service.ts`
- `src/lib/pages/registry.ts`
- `src/modules/website-blueprint/application/composition-engine.ts`
- `src/lib/navigation/service.ts`, `src/lib/navigation/config.ts`
- `src/components/storefront/StorefrontNav.tsx`
- `src/app/admin/website/pages/page.tsx`
- `src/lib/publishing/service.ts`, `src/lib/storefront/build-snapshot.ts`
