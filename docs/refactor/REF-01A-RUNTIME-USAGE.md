# REF-01A — Runtime Usage Audit

## Methodology

Every candidate file was checked for:
- Static imports (`grep "from '@/path'"`)
- Dynamic imports (`grep "import('...path')"`)
- Barrel re-exports (checked parent `index.ts` files)
- Barrel consumer imports (checked who imports the barrel)
- Content entity registrations (checked content APIs, manifests, registries)
- Test file references
- Route/page-level imports

## Service Files Audit

### src/lib/products/service.ts

| Check | Result | Evidence |
|-------|--------|----------|
| Static imports | YES — 1 | `src/actions/product.actions.ts:3` — `import { ProductService } from "@/lib/products/service"` |
| Dynamic imports | NO | Not found |
| Barrel re-export | NO | `src/lib/products/index.ts` does NOT exist (no barrel) |
| Tests | NO | No test file references `lib/products/service` |
| Route/action dependent | CONDITIONAL | `src/actions/product.actions.ts` has ZERO importers itself (see action file audit) |
| **Verdict** | **TRANSITIVELY DEAD** | Only consumer is `actions/product.actions.ts` which itself has zero importers. Safe to delete after confirming product.actions has no dynamic/barrel/test reach. |

### src/features/products/service.ts

| Check | Result | Evidence |
|-------|--------|----------|
| Static imports | YES — 1 | `src/app/admin/products/page.tsx:3` — `import { productService } from "@/features/products/service"` |
| Dynamic imports | NO | Not found |
| Also imported by | YES — 2 | `src/features/products/actions.ts:6` (dead actions file — see below) |
| Tests | YES | `src/features/products/__tests__/products.test.ts` imports from `../service` |
| Route/action dependent | YES | `src/app/admin/products/page.tsx:10` calls `productService.list(tenantId)` |
| **Verdict** | **ALIVE — CANONICAL** | This is the product service used by the production admin route. |
| **Action** | **KEEP** | This is the canonical Product service |

### src/lib/content/entities/product/service.ts

| Check | Result | Evidence |
|-------|--------|----------|
| Static imports | CONDITIONAL | Imported by `./manifest.ts:3` and re-exported from `./index.ts:8` |
| Barrel re-export | YES | `src/lib/content/entities/product/index.ts:8` exports `ProductApplicationService, productService` |
| Barrel imports upstream | YES — 2 | `src/lib/content/api.ts:2` imports `productRegistration` from `./entities/product/manifest`; `src/lib/content/manifest.ts:8` imports Product types |
| Content registry chain | YES | `contentAPI` (`api.ts`) is imported by `content-app.service.ts:20` and `platform.ts:19` |
| Tests | NO | Not directly tested |
| **Verdict** | **ALIVE** | Used by content engine (ContentAPI → contentRegistry → manifests). This is a separate domain service from `features/products/service.ts` — it's the content-engine-level product service. |
| **Action** | **KEEP** | Separate ownership domain (content engine vs admin UI) |

### src/lib/gallery/service.ts

| Check | Result | Evidence |
|-------|--------|----------|
| Static imports | YES — 1 | `src/actions/gallery.actions.ts:3` — `import { GalleryService } from "@/lib/gallery/service"` |
| Dynamic imports | NO | Not found |
| Barrel re-export | NO | No barrel in `src/lib/gallery/` |
| Tests | NO | Not directly tested |
| Route/action dependent | YES | `gallery.actions.ts` IS actively used (see action file audit) |
| **Verdict** | **ALIVE** | Indirectly used by `admin/gallery/page.tsx` → `gallery.actions.ts` → `GalleryService` |
| **Action** | **KEEP** | This IS the canonical Gallery service used by the admin UI |

### src/features/gallery/service.ts

| Check | Result | Evidence |
|-------|--------|----------|
| Static imports | NO | 0 importers |
| Also imported by | MAYBE | `src/features/gallery/actions.ts` (dead actions file) imports from `./service` — but actions file itself has 0 importers |
| Tests | YES | `src/features/gallery/__tests__/gallery.test.ts` imports from `../service` |
| **Verdict** | **DEAD** | Only reference is from dead actions file and own tests |
| **Action** | **DELETE** | Duplicate — `lib/gallery/service.ts` is the canonical service |

### src/lib/content/entities/gallery/service.ts

| Check | Result | Evidence |
|-------|--------|----------|
| Static imports | CONDITIONAL | Imported by `./manifest.ts:10` and re-exported from `./index.ts:20` |
| Barrel imports upstream | YES | `src/lib/content/api.ts:3` imports `galleryRegistration` from `./entities/gallery` |
| Content registry chain | YES | Same chain as product — ContentAPI → manifests |
| **Verdict** | **ALIVE** | Used by content engine |
| **Action** | **KEEP** | Content engine domain |

### src/services/settings.service.ts

| Check | Result | Evidence |
|-------|--------|----------|
| Static imports | YES — 3 | `public.service.ts:3`, `settings.actions.ts:7`, `admin/settings/page.tsx:2` |
| Dynamic imports | YES — 1 | `config/influencer.ts:45` — `const { SettingsService } = await import(...)` |
| **Verdict** | **ALIVE** | 4 active consumers, canonical settings service |
| **Action** | **KEEP** | |

### src/features/settings/service.ts

| Check | Result | Evidence |
|-------|--------|----------|
| Static imports | NO | 0 importers |
| Tests | YES | `src/features/settings/__tests__/settings.test.ts` imports from `../service` |
| **Verdict** | **DEAD** | Only own tests reference it |
| **Action** | **DELETE** | Functionality overlaps with `services/settings.service.ts` — merge needed first |

### src/lib/website/service.ts

| Check | Result | Evidence |
|-------|--------|----------|
| Static imports | CONDITIONAL | Re-exported from `src/lib/website/index.ts` |
| Barrel imports upstream | YES — 1 | `src/lib/showcase/service.ts:2` imports `publishService` from `@/lib/website` — this imports `index.ts` which re-exports `service.ts` |
| **Verdict** | **ALIVE** | `showcase/service.ts` uses `publishService` from this barrel |
| **Action** | **KEEP** | Merge into `website-repository.ts` before deleting |

### src/lib/website/publish.ts

| Check | Result | Evidence |
|-------|--------|----------|
| Static imports | CONDITIONAL | Re-exported from `src/lib/website/index.ts` |
| Barrel imports upstream | YES — 1 | Same as above — `showcase/service.ts` imports from the barrel |
| **Verdict** | **ALIVE** | Same dependency chain |
| **Action** | **MERGE** | Functionality duplicates `lib/publishing/repository.ts` — merge before deleting |

### src/lib/website/index.ts

| Check | Result | Evidence |
|-------|--------|----------|
| Static imports | YES — 1 | `src/lib/showcase/service.ts:2` — `import { publishService } from "@/lib/website"` |
| **Verdict** | **ALIVE** | Barrel file consumed by showcase service |
| **Action** | **REPLACE** | Showcase should import from canonical source (`PublishingService`); after migration, delete |

### src/modules/tenant/infrastructure/website-repository.ts

| Check | Result | Evidence |
|-------|--------|----------|
| Static imports | YES — 1 | `src/lib/provisioning/provisioning-service.ts:13` |
| Barrel re-export | YES — 1 | `src/modules/tenant/infrastructure/index.ts:18` exports are imported by other modules |
| **Verdict** | **ALIVE** | Used by provisioning |
| **Action** | **KEEP** | This is the canonical Website repository |

### src/modules/tenant/infrastructure/publish-status-repository.ts

| Check | Result | Evidence |
|-------|--------|----------|
| Static imports | YES — 1 | `src/lib/provisioning/provisioning-service.ts:15` |
| Barrel re-export | YES | `src/modules/tenant/infrastructure/index.ts` |
| **Verdict** | **ALIVE** | Used by provisioning |
| **Action** | **MERGE** | Merged into `lib/publishing/repository.ts` and `provisioning-service.ts` updated, then delete |

### src/lib/publishing/repository.ts

| Check | Result | Evidence |
|-------|--------|----------|
| Static imports | YES — 2 | `src/lib/publishing/service.ts` and `src/lib/publishing/snapshot.ts` import it internally (NOT via `@/` path — via `./repository`) |
| **Verdict** | **ALIVE** | Internal to publishing subsystem |
| **Action** | **KEEP** | This is the canonical Publish repository |

## Action Files Audit

### src/actions/product.actions.ts

| Check | Result |
|-------|--------|
| `@/actions/product.actions` static imports | 0 |
| `import("@/actions/product.actions")` dynamic | 0 |
| Any file references `product.actions` in path | 0 |
| Barrel re-export | None |
| Tests | 0 |
| **Verdict** | **DEAD** |

### src/actions/upload.actions.ts

| Check | Result |
|-------|--------|
| `@/actions/upload.actions` static imports | 0 |
| Dynamic imports | 0 |
| **Verdict** | **DEAD** |

### src/actions/team.actions.ts

| Check | Result |
|-------|--------|
| `@/actions/team.actions` static imports | 0 |
| Dynamic imports | 0 |
| **Verdict** | **DEAD** |

### src/actions/billing.actions.ts

| Check | Result |
|-------|--------|
| `@/actions/billing.actions` static imports | 0 |
| Dynamic imports | 0 |
| **Verdict** | **DEAD** |

### src/actions/agency-provision.actions.ts

| Check | Result |
|-------|--------|
| `@/actions/agency-provision.actions` static imports | 0 |
| Dynamic imports | 0 |
| **Verdict** | **DEAD** |

### src/features/products/actions.ts

| Check | Result |
|-------|--------|
| `@/features/products/actions` static imports | 0 |
| Dynamic imports | 0 |
| Barrel re-export | `features/products/index.ts` does NOT re-export actions |
| **Verdict** | **DEAD** |

### src/features/gallery/actions.ts

| Check | Result |
|-------|--------|
| `@/features/gallery/actions` static imports | 0 |
| Dynamic imports | 0 |
| **Verdict** | **DEAD** |

### src/features/faq/actions.ts

| Check | Result |
|-------|--------|
| `@/features/faq/actions` static imports | 0 |
| Dynamic imports | 0 |
| **Verdict** | **DEAD** |

### src/features/domains/actions.ts

| Check | Result |
|-------|--------|
| `@/features/domains/actions` static imports | 0 |
| Dynamic imports | 0 |
| **Verdict** | **DEAD** |

### src/features/courses/actions.ts

| Check | Result |
|-------|--------|
| `@/features/courses/actions` static imports | 0 |
| Dynamic imports | 0 |
| **Verdict** | **DEAD** |

### src/features/links/actions.ts

| Check | Result |
|-------|--------|
| `@/features/links/actions` static imports | 0 |
| Dynamic imports | 0 |
| **Verdict** | **DEAD** |

### src/features/integrations/actions.ts

| Check | Result |
|-------|--------|
| `@/features/integrations/actions` static imports | 0 |
| Dynamic imports | 0 |
| **Verdict** | **DEAD** |

### src/features/services/actions.ts

| Check | Result |
|-------|--------|
| `@/features/services/actions` static imports | 0 |
| Dynamic imports | 0 |
| **Verdict** | **DEAD** |

### src/features/storefront/actions.ts

| Check | Result |
|-------|--------|
| `@/features/storefront/actions` static imports | 0 |
| Dynamic imports | 0 |
| Barrel re-export | `features/storefront/index.ts` does NOT re-export actions |
| **Verdict** | **DEAD** |

### src/features/settings/actions.ts

| Check | Result |
|-------|--------|
| `@/features/settings/actions` static imports | 0 |
| Dynamic imports | 0 |
| **Verdict** | **DEAD** |

### src/features/storefront/service-legacy.ts

| Check | Result |
|-------|--------|
| `@/features/storefront/service-legacy` static imports | 0 |
| Dynamic imports | 0 |
| **Verdict** | **DEAD** |

## UI Components Audit

All orphan UI components have zero imports outside their own file:

| File | Self-references only? |
|------|----------------------|
| `src/components/ui/ScrollProgress.tsx` | YES — 0 external importers |
| `src/components/ui/NicheBackground.tsx` | YES — 0 external importers |
| `src/components/ui/GameCarousel.tsx` | YES — 0 external importers |
| `src/components/ui/AnimatedSection.tsx` | YES — 0 external importers |
| `src/components/ui/AnimatedList.tsx` | YES — 0 external importers |
| `src/components/ui/AnimatedCard.tsx` | YES — 0 external importers |
| `src/components/ui/LiveStatus.tsx` | YES — 0 external importers |
| `src/components/storefront/GalleryLightbox.tsx` | YES — 0 external importers |
