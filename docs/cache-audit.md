# Cache Audit

**IMPLEMENTATION-16 · Phase 16G · 2026-08-01**

## Verdict

Only **presentation caching** remains. Every content cache that could make the
Builder and the Storefront diverge has been removed. Content is always read live
from the CMS on every render.

## Audit

| Cache | Location | Kind | Action |
|---|---|---|---|
| **Storefront ISR** | `src/app/[domain]/page.tsx` `export const revalidate = 60` | **CONTENT** — cached the rendered HTML (with merged live content) for 60s, so a Dashboard edit took up to 60s to appear on the Storefront while the Builder showed it instantly | **REMOVED** → `export const dynamic = "force-dynamic"` |
| React `memo` — `BuilderSidebar` | `sidebar.tsx` | Presentation (UI shell) | ✅ allowed |
| React `useMemo` — canvas resolution | `interactive-canvas.tsx` | Pure calculation keyed on a layout *signature* string; store state itself is never memoized | ✅ allowed |
| `builderQuery` cache | `lib/builder/query/service.ts` | Builder presentation/selection derived from the store; invalidated on every store mutation | ✅ allowed |
| LayoutEngine | `lib/storefront/layout-engine/LayoutEngine.ts` | Pure function; no internal cache | ✅ none |
| Aggregate (`websiteAggregateService.build`) | `modules/tenant/application/website-aggregate.service.ts` | No cache — builds live every call | ✅ none |
| `mergeLiveContent` | `lib/storefront/live-content.ts` | No cache — merges live content per request; falls back to the (presentation-only, empty-content) snapshot only on build failure | ✅ none |
| `getLivePreviewData` (builder) | `actions/builder-preview.actions.ts` | No cache — builds live every call; the canvas refetches on tab focus | ✅ none |
| Publish snapshot | `PublishSnapshot` row | Persists **presentation only** (`content: EMPTY_AGGREGATE`); never a content source | ✅ allowed |
| `React.cache` / `unstable_cache` / `revalidateTag` | (searched) | None present | ✅ none |

## Why the ISR removal is required

The storefront page is server-rendered from the live aggregate. With
`revalidate = 60`, Next.js cached the full HTML — including the content the
aggregate injected — for up to 60 seconds. A creator editing a product in the
Dashboard would see the Builder update instantly (canvas refetch) but the
Storefront serve stale content for up to 60s: **Builder ≠ Storefront**.
Removing the ISR makes every storefront request dynamic, so content is always
live and the parity is exact.

## Divergence guards

- Every builder store mutation bumps `storeVersion` and re-emits the Runtime
  Signature; the canvas rerenders from the live aggregate immediately.
- The E2E parity test (`production.spec.ts 04b`) fails if the Builder and
  Storefront signatures ever differ for the same published state.
- `scripts/runtime-parity-audit.ts` fails if DB counts ≠ aggregate counts or if
  the draft/published signatures differ.
