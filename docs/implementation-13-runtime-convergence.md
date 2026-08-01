# Implementation 13 — Runtime Convergence & Production Stabilization

**Status:** COMPLETE
**Date:** 2026-08-01
**Type:** P0 Runtime Recovery (no redesign, no new architecture, no feature additions)

---

## Objective

Make Builder, Dashboard, Preview, Publish and Storefront behave as **one runtime**.
Products already behave correctly; every other module now uses exactly the same
code path:

```
Admin → Database → Aggregate → LayoutEngine → Renderer → Preview
Admin → Database → Publish → Storefront
```

Every change fixes a root cause. No duplicate paths, no new registries, no new
renderers, no runtime fallbacks.

---

## The Five Production Failures Fixed

| Symptom | Root cause | Fix |
|---|---|---|
| `Unknown component: hero.agency` | Template registry emitted unregistered component ids that were written to `Block.moduleId` | Migrated all data sources to registered component ids; added one-time DB migration |
| Sidebar has sections, Canvas shows "Add Sections" | `InteractiveCanvas` was `memo`ized with no-op store handlers, so it froze on a stale snapshot | Removed `memo`, subscribed to `store:changed`, gated empty state on the store |
| Publishing starts then fails | (a) FK violation — snapshot inserted before `PublishStatus` row; (b) version race on `@@unique([websiteId, version])`; (c) unknown components | `PublishStatus` row created before snapshot insert; P2002 retry; shared snapshot builder |
| `Invalid UUID ""` | Empty-string asset ids in `hero_data` JSONB reached `prisma.asset.findUnique({ where: { id: "" } })` | Centralized `resolveAsset()`; empty/invalid ids never reach Prisma |
| Storefront 404 after publish | Middleware `platformDomains` hardcoded to a deployment that wasn't the real domain → platform host rewritten as tenant host | Platform domains derived from env (`NEXT_PUBLIC_APP_URL`, `VERCEL_URL`, `PLATFORM_DOMAINS`) |

---

## What Changed

### Phase A — Component Registry
- `src/lib/template/registry.ts`: `hero.agency`, `hero.music`, `hero.restaurant`, `hero.portfolio` → `hero.default`.
- `src/modules/website-blueprint/domain/section-registry.ts`: every `type` is now a registered component id; unrepresentable types removed.
- `src/modules/business-intelligence/domain/templates.ts`: all `moduleId`s are registered ids.
- `src/lib/registry/resolve-module.ts`: added `content_feed` mapping; fixed `contentFeed` → `contentfeed` case bug.
- `src/lib/builder/artifact-loader.ts`: drops sections whose resolved module id is unregistered.
- `scripts/migrate-component-ids.ts`: one-time data migration for existing `Block.moduleId` rows (dry-run by default, `--apply` to commit).

### Phase B — Builder Runtime Convergence
- `src/features/builder/canvas/interactive-canvas.tsx`: removed `memo`, added `store:changed` → force render, empty state reads the store.
- `src/features/builder/components/section-manager.tsx`: sidebar catalog is registry-validated; insertion seeds registry default props.
- `src/lib/builder/store.ts`: `hydrate` invalidates the query cache; `insertComponent` accepts default props; `paste` invalidates.

### Phase C — Publish Pipeline
- `src/modules/tenant/infrastructure/publishing-repository.ts`: `PublishStatus` row guaranteed before snapshot insert (FK fix); P2002 version-race retry.
- `src/lib/publishing/service.ts`: publish and preview now share ONE `buildSnapshot()`; publish validates storefront routing exists.

### Phase D — Asset Resolution
- `src/lib/media/resolve.ts`: new `normalizeAssetId()` / `filterValidAssetIds()` — the single asset-resolution boundary.
- Wired into `mediaService.resolveUrls` / `getPublicUrl`, `assetQueries.findById` / `getReferenceCount`, the website aggregate (hero video/poster), and profile `avatarAssetId`/`bannerAssetId` writes.
- `src/config/hero.ts`: `videoAssetId`/`posterAssetId` default to `null`, not `""`.

### Phase E — Storefront Routing
- `src/middleware.ts`: `platformDomains` derived from `NEXT_PUBLIC_APP_URL`, `VERCEL_URL`, `PLATFORM_DOMAINS`.
- Publish now refuses to run without a subdomain or custom domain (no dead storefront URLs).

### Phase F — Runtime Trace
- `src/lib/observability/runtime-trace.ts`: `traceRuntime()` + `aggregateCounts()`.
- Emitted by Builder Preview, Dashboard Preview, Publish, and the Storefront — all four produce identical counts.

---

## Verification

- `npx tsc --noEmit` — **passes**
- `npm run build` — **passes** (`✓ Compiled successfully`)
- `npm test` — **1646 tests, 0 failures** (added `component-registry.test.ts`, `media-resolve.test.ts`)

## Deliverables

- `docs/component-registry-report.md`
- `docs/asset-resolution-audit.md`
- `docs/routing-audit.md`
- `docs/runtime-trace.md`
- `docs/builder-runtime-report.md`
