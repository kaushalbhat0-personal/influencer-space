# REF-01A — Canonical Ownership Matrix

## Entity Ownership — Current vs Target

| Entity | Current Owners | Target Owner | Migration Needed |
|--------|---------------|--------------|-----------------|
| **Products** | `features/products/service.ts` (admin UI) + `lib/products/service.ts` (bulk ops) + `lib/content/entities/product/service.ts` (content engine) | `features/products/service.ts` (sole admin product service) | YES — migrate bulk ops from lib/products; content engine is separate domain |
| **Gallery** | `lib/gallery/service.ts` (admin UI) + `features/gallery/service.ts` (dead) + `lib/content/entities/gallery/service.ts` (content engine) | `lib/gallery/service.ts` (sole admin gallery service) | YES — delete dead `features/gallery/service.ts`; content engine is separate |
| **Settings** | `services/settings.service.ts` (canonical) + `features/settings/service.ts` (workspace-level) | `services/settings.service.ts` (sole settings service) | YES — merge workspace-settings functionality |
| **Website** | `modules/tenant/infrastructure/website-repository.ts` (canonical) + `lib/website/service.ts` (duplicate) | `modules/infrastructure/website-repository.ts` | YES — migrate `lib/website` consumers to repository |
| **PublishStatus** | `lib/publishing/repository.ts` (canonical) + `modules/infrastructure/publish-status-repository.ts` (duplicate) | `lib/publishing/repository.ts` | YES — migrate provisioning consumer |
| **Creator Identity** | `services/settings.service.ts` → `Setting.influencer_data` + `Setting.brand_config` + `Brand` table | `Brand` table via `features/profile/service.ts` | YES — data migration needed |
| **Publish Status Type** | 5 definitions across `lib/publishing/service.ts`, `lib/builder/types.ts`, `PublishStatusBadge.tsx`, Prisma schema, `lib/website/publish.ts` | `@/types/publish.ts` (single definition) | YES — consolidate and deprecate others |
| **Content Engine** | `lib/content/` (self-contained: registry, API, entities) | Keep as-is | Separate concern from admin CRUD |

## Service Ownership — Canonical After Consolidation

| Service | File | Responsible for |
|---------|------|----------------|
| **ProductService** | `features/products/service.ts` | Admin product CRUD (list, create, update, delete) |
| **GalleryService** | `lib/gallery/service.ts` | Admin gallery CRUD (fetch, create, update, delete, bulk, reorder, publish) |
| **SettingsService** | `services/settings.service.ts` | All settings CRUD (influencer_data, hero_data, theme_config, workspace) |
| **PublishingService** | `lib/publishing/service.ts` | Orchestrates publish: validate → load data → create snapshot |
| **PublishSnapshotService** | `lib/publishing/snapshot.ts` | Snapshot read/rollback/list |
| **PublishRepository** | `lib/publishing/repository.ts` | Persist publish data (snapshot + status) |
| **BuilderService** | `lib/builder/builder-service.ts` | Builder page/section/block persistence |
| **ProfileService** | `features/profile/service.ts` | Creator identity management (Brand table) |
| **WebsiteRepository** | `modules/tenant/infrastructure/website-repository.ts` | Website CRUD |
| **BrandRepository** | `modules/tenant/infrastructure/brand-repository.ts` | Brand identity CRUD |

## Services Marked for Deletion

| File | Reason |
|------|--------|
| `src/features/gallery/service.ts` | Duplicate — `lib/gallery/service.ts` is canonical and alive |
| `src/lib/products/service.ts` | Only consumer is dead `product.actions.ts` |
| `src/features/settings/service.ts` | Duplicate — `services/settings.service.ts` is canonical |

## Services Marked for Merge

| Source | Target | What to Move |
|--------|--------|-------------|
| `src/lib/website/service.ts` | `modules/.../website-repository.ts` | Website CRUD methods |
| `src/lib/website/publish.ts` | `lib/publishing/repository.ts` | Publish queries |
| `src/modules/.../publish-status-repository.ts` | `lib/publishing/repository.ts` | Status queries used by provisioning |
