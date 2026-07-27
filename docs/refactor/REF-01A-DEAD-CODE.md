# REF-01A — Dead Code Validation

Only files that pass the FULL runtime usage audit may be deleted. Each entry below has been proven dead via all checks.

## SAFE TO DELETE — Confirmed Dead

### Dead Action Files (9 files)

These action files have ZERO static imports, ZERO dynamic imports, ZERO barrel re-exports, and are not referenced by any route, middleware, test, or registry.

| # | File | Lines | Imports | Dynamic | Tests | Barrel | Verdict |
|---|------|-------|---------|---------|-------|--------|---------|
| 1 | `src/actions/product.actions.ts` | 200+ | 0 | 0 | 0 | None | DELETE |
| 2 | `src/actions/upload.actions.ts` | 25 | 0 | 0 | 0 | None | DELETE |
| 3 | `src/actions/team.actions.ts` | 75 | 0 | 0 | 0 | None | DELETE |
| 4 | `src/actions/billing.actions.ts` | 35 | 0 | 0 | 0 | None | DELETE |
| 5 | `src/actions/agency-provision.actions.ts` | 40 | 0 | 0 | 0 | None | DELETE |

### Dead Feature Action Files (9 files)

Feature-level action files with ZERO external importers:

| # | File | Lines | Imports | Dynamic | Tests | Barrel | Verdict |
|---|------|-------|---------|---------|-------|--------|---------|
| 6 | `src/features/storefront/actions.ts` | 60 | 0 | 0 | 0 | None | DELETE |
| 7 | `src/features/settings/actions.ts` | 20 | 0 | 0 | 0 | None | DELETE |
| 8 | `src/features/services/actions.ts` | 20 | 0 | 0 | 0 | None | DELETE |
| 9 | `src/features/links/actions.ts` | 30 | 0 | 0 | 0 | None | DELETE |
| 10 | `src/features/integrations/actions.ts` | 10 | 0 | 0 | 0 | None | DELETE |
| 11 | `src/features/faq/actions.ts` | 25 | 0 | 0 | 0 | None | DELETE |
| 12 | `src/features/domains/actions.ts` | 25 | 0 | 0 | 0 | None | DELETE |
| 13 | `src/features/courses/actions.ts` | 25 | 0 | 0 | 0 | None | DELETE |
| 14 | `src/features/gallery/actions.ts` | 30 | 0 | 0 | 0 | None | DELETE |
| 15 | `src/features/products/actions.ts` | 50 | 0 | 0 | 0 | None | DELETE |

**NOTE:** Files 6 and 9 DO have associated tests. The tests mock `@/actions/builder.actions` (which is alive) and test `features/builder/publish/index.ts` (which is alive). The specific exports `publishWebsite`, `listSnapshots`, `rollbackToVersion` in `builder.actions.ts` can be deleted.

### Dead Service File (1 file)

**Proven via:** `@/features/gallery/service` has 0 importers. `features/gallery/actions.ts` (its only consumer) is dead. Only own test references it.

| # | File | Lines | Imports | Dynamic | Tests | Barrel | Verdict |
|---|------|-------|---------|---------|-------|--------|---------|
| 16 | `src/features/gallery/service.ts` | 35 | 0 | 0 | tests only | None | DELETE |

### Dead Legacy File (1 file)

| # | File | Lines | Imports | Dynamic | Tests | Verdict |
|---|------|-------|---------|---------|-------|---------|
| 17 | `src/features/storefront/service-legacy.ts` | 60 | 0 | 0 | 0 | DELETE |

### Dead UI Components (8 files)

All have ZERO external imports:

| # | File | Lines | Imports | Dynamic | Tests | Barrel | Verdict |
|---|------|-------|---------|---------|-------|--------|---------|
| 18 | `src/components/ui/ScrollProgress.tsx` | 20 | 0 | 0 | 0 | None | DELETE |
| 19 | `src/components/ui/NicheBackground.tsx` | 60 | 0 | 0 | 0 | None | DELETE |
| 20 | `src/components/ui/GameCarousel.tsx` | 60 | 0 | 0 | 0 | None | DELETE |
| 21 | `src/components/ui/AnimatedSection.tsx` | 50 | 0 | 0 | 0 | None | DELETE |
| 22 | `src/components/ui/AnimatedList.tsx` | 40 | 0 | 0 | 0 | None | DELETE |
| 23 | `src/components/ui/AnimatedCard.tsx` | 30 | 0 | 0 | 0 | None | DELETE |
| 24 | `src/components/ui/LiveStatus.tsx` | 40 | 0 | 0 | 0 | None | DELETE |
| 25 | `src/components/storefront/GalleryLightbox.tsx` | 40 | 0 | 0 | 0 | None | DELETE |

## UNSAFE — Needs Migration Before Deletion

These files have live consumers but SHOULD be migrated to canonical replacements.

| # | File | Reason | Migration Prerequisite |
|---|------|--------|----------------------|
| A | `src/lib/products/service.ts` | Only consumer is dead `product.actions.ts` | Delete `product.actions.ts` first; also check `lib/services/BulkActionEngine` usage |
| B | `src/features/settings/service.ts` | 0 importers but has tests | Merge workspace-settings functionality into `services/settings.service.ts` |
| C | `src/lib/website/index.ts` | Barrel consumed by `showcase/service.ts` | Update `showcase/service.ts` to import from canonical source |
| D | `src/lib/website/publish.ts` | Re-exported through same barrel | Same as C |
| E | `src/lib/website/service.ts` | Re-exported through same barrel | Same as C |
| F | `src/modules/tenant/infrastructure/publish-status-repository.ts` | Consumed by `provisioning-service.ts` | Refactor provisioning to use `lib/publishing/repository.ts` |
| G | `src/actions/analytics.actions.ts` | Has 1 dynamic importer | Keep — actively used |

## SAFE — Must KEEP (Not Dead)

| File | Reason |
|------|--------|
| `src/lib/gallery/service.ts` | Canonical service, imported by alive `gallery.actions.ts` |
| `src/features/products/service.ts` | Canonical service, imported by admin products page |
| `src/lib/content/entities/product/service.ts` | Content engine service, alive through content API |
| `src/lib/content/entities/gallery/service.ts` | Content engine service, alive through content API |
| `src/services/settings.service.ts` | Canonical settings service, 4 importers |
| `src/lib/module/registry.ts` | Imported by registry facade, diagnostics, surface-registry |
| `src/lib/registry/facade.ts` | Imported by bootstrap, platform API, builder properties (5 importers) |
| `src/lib/registry/events.ts` | Imported by theme, provider, module, surface registries |
| `src/lib/registry/cache.ts` | Imported by theme, module, surface registries |
| `src/lib/registry/snapshot.ts` | Imported by theme, module, surface registries |
| `src/lib/storefront/registry.ts` | Imported by `storefront/sections.tsx` (FallbackStorefront) |
| `src/lib/storefront/sections.tsx` | Dynamically imported by `[domain]/page.tsx` FallbackStorefront |
