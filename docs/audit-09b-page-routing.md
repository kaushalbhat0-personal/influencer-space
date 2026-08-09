# Audit 09B — Page Routing

**Track:** RCCF-AUDIT-09B
**Type:** READ-ONLY architecture audit (Parts 3/4/6/8/9/10/11/12)
**Status:** No code changed

## Public routes that exist

| Route | Exists | Type |
| --- | --- | --- |
| `/[domain]` | ✅ | homepage — single storefront route |
| `/[domain]/not-found` | ✅ | 404 |
| `/[domain]/products` | ❌ | missing |
| `/[domain]/gallery` | ❌ | missing |
| `/[domain]/games` | ❌ | missing |
| `/[domain]/services` | ❌ | missing |
| `/[domain]/courses` | ❌ | missing |
| `/[domain]/[slug]` | ❌ | missing |
| `/purchase`, `/purchase/[orderId]` | ✅ | order portal (top-level, not storefront) |

The storefront is a **hardcoded single homepage route**. All Builder pages'
sections flatten onto `/` (`src/app/[domain]/page.tsx:176-183`). Page slugs
never drive routing.

## Collection page matrix (Part 6)

| Collection | Public page | Full collection | Featured homepage | Navigation |
| --- | --- | --- | --- | --- |
| Products | ❌ | ❌ | ❌ | anchor only |
| Gallery | ❌ | ❌ | ❌ | anchor only |
| Games | ❌ | ❌ | ❌ | anchor only |
| Services | ❌ | ❌ | ❌ | anchor only |
| Courses | ❌ | ❌ | ❌ | anchor only |
| Testimonials | ❌ | ❌ | ❌ | anchor only |
| Timeline | ❌ | ❌ | ❌ | anchor only |

## Part 7 — Product/commerce

- **Product listing page:** none. `ProductsRenderer` renders in-homepage only.
- **Product detail page:** none. Cards link to `BuyNowButton` → `createCheckout`
  (`src/actions/checkout.actions.ts:25`) directly — no detail route.
- **Checkout:** modal/redirect, not a route. `BuyNowButton` →
  `createCheckout` → PLATFORM_COLLECT (Razorpay order modal) or DIRECT_CREATOR
  (hosted `checkoutUrl` redirect) → `verifyPayment`.
- **Fulfillment:** `OrderFulfillment` model (`schema.prisma:482`), signed
  download token `/api/fulfillment/download/[token]` (TTL 7d, 5 downloads).
- **Purchase portal:** `/purchase`, `/purchase/[orderId]` exist.
- **Conclusion:** an independent `/products` page would reuse the existing
  `ProductsRenderer` + `BuyNowButton` + commerce runtime. No new product
  rendering system would be needed. But there is **no product detail page** —
  a standalone listing page could not deep-link to a per-product page today.

## Part 8 — Gallery

- `GalleryRenderer` (`renderers.tsx:230-274`): grid, columns prop, `slice(0,12)`.
- **No image detail, no lightbox, no categories, no pagination.** `isFeatured`
  + `status` + `isActive` exist; featured is a badge only.
- **Conclusion:** safe to reuse as a standalone gallery page renderer, but the
  page itself, pagination, and image-detail/lightbox are missing.

## Part 9 — Games / other collections

- Games/timeline/courses/services/testimonials/content-feed all render through
  the same `ComponentRenderer` + registry path with no collection-specific
  routing. The system is **generic enough** to reuse one collection-page
  mechanism, provided a page→section resolution exists. Games/timeline have no
  featured field.

## Part 10 — Generic template architecture

**A generic architecture already exists** and is used by the homepage:

```
Page (snapshot layout.pages[i])
  ↓  (not routed today)
Page sections[]
  ↓
Section Registry (builtins.ts) → ComponentRenderer
  ↓
Collection Renderer (ProductsRenderer, GalleryRenderer, ...)
  ↓
Website Aggregate (live content)
```

The only missing piece is a **route + page resolution** that picks a page from
`layout.pages[]` by slug and renders its sections. No per-collection
`ProductsPage.tsx`/`GalleryPage.tsx`/... components would be needed — the
existing renderers are collection-specific already and are selected by
`moduleId`. Creation-time templates (`src/lib/template/`) and the descriptive
`PAGE_REGISTRY` (`src/lib/pages/registry.ts`) are not wired to routing.

## Part 11 — Navigation

| Concern | Verdict |
| --- | --- |
| Stored? | Setting key `"navigation"` |
| Generated? | `generateDefaults()` → all-anchor items |
| Points to homepage? | ✅ Home is `type:"page"` (non-functional anchor fallback) |
| Internal pages? | ❌ page-type is typed but not routed |
| CMS collection pages? | ❌ routes don't exist |
| External links? | ✅ admin nav manager adds externals |
| Generated pages in nav? | ❌ no auto-add; template nav written to `website.themeConfig` is never read back |

## Part 12 — SEO

| Concern | Verdict | Evidence |
| --- | --- | --- |
| Storefront `generateMetadata` | ✅ | `page.tsx:100` (title/desc/robots/canonical/OG/Twitter) |
| Canonical | ⚠️ tenant-root only | `page.tsx:96-98,111` — no per-page canonical |
| Sitemap | ⚠️ tenant roots only | `src/app/sitemap.ts` — no page slugs |
| Robots | ✅ | `src/app/robots.ts` |
| JSON-LD | ✅ canonical names | `LayoutEngine.buildJsonLd` (Person + Product ItemList) |
| Per-page SEO | ❌ | no page routes; `admin/website/seo` is a placeholder; admin SEO feature (`/admin/seo`) writes to Setting but storefront only reads `content.seo` title/description |
| Breadcrumbs | ❌ | not emitted on collection pages (no pages) |

Independent collection pages would be indexable only after routes exist; the
SEO toolkit (`src/lib/seo/`) exists but is not wired into the storefront
metadata pipeline.

## Files inspected

- `src/app/[domain]/page.tsx`, `not-found.tsx`, `_components/buy-now-button.tsx`
- `src/app/sitemap.ts`, `src/app/robots.ts`
- `src/actions/checkout.actions.ts`
- `src/lib/pages/registry.ts`, `src/lib/template/registry.ts`
- `src/lib/navigation/service.ts`
- `src/components/storefront/StorefrontNav.tsx`
- `src/lib/storefront/layout-engine/LayoutEngine.ts`
- `src/lib/registry/components/builtins.ts`, `renderers.tsx`
- `src/app/purchase/page.tsx`, `src/app/purchase/[orderId]/page.tsx`
