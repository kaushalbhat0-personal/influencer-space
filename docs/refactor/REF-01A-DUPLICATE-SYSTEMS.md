# REF-01A — Duplicate Systems Inventory

Each entry below is proven via grep evidence.

## Product CRUD Services — 3 Implementations

| # | File | Alive? | Evidence |
|---|------|--------|----------|
| 1 | `features/products/service.ts` | YES | Imported by `admin/products/page.tsx` |
| 2 | `lib/products/service.ts` | DEAD | Only consumer is dead `product.actions.ts` |
| 3 | `lib/content/entities/product/service.ts` | YES | Content engine chain (separate domain — NOT duplicate) |

**Action:** Delete #2 after confirming #3 is content-engine-only (not admin CRUD).

## Gallery CRUD Services — 3 Implementations

| # | File | Alive? | Evidence |
|---|------|--------|----------|
| 1 | `lib/gallery/service.ts` | YES | Imported by alive `gallery.actions.ts` |
| 2 | `features/gallery/service.ts` | DEAD | 0 importers, only own tests |
| 3 | `lib/content/entities/gallery/service.ts` | YES | Content engine chain |

**Action:** Delete #2.

## Settings Services — 2 Implementations

| # | File | Alive? | Evidence |
|---|------|--------|----------|
| 1 | `services/settings.service.ts` | YES | 4 importers (public.service, settings.actions, settings page, influencer config) |
| 2 | `features/settings/service.ts` | DEAD | 0 importers, only own tests |

**Action:** Merge workspace-level functionality from #2 into #1, then delete #2.

## Website Repositories — 2 Implementations

| # | File | Alive? | Evidence |
|---|------|--------|----------|
| 1 | `modules/tenant/infrastructure/website-repository.ts` | YES | Imported by provisioning, barrel-exported |
| 2 | `lib/website/service.ts` (+ barrel `index.ts`) | YES | Imported by `showcase/service.ts` |

**Action:** Migrate `showcase/service.ts` to use #1, then delete #2 + barrel.

## PublishStatus Repositories — 2 Implementations

| # | File | Alive? | Evidence |
|---|------|--------|----------|
| 1 | `lib/publishing/repository.ts` | YES | Imported internally by publishing subsystem |
| 2 | `modules/.../publish-status-repository.ts` | YES | Imported by `provisioning-service.ts` |

**Action:** Refactor provisioning to use #1's logic, then delete #2.

## PublishStatus Type Definitions — 5 Definitions

| # | File | Values |
|---|------|--------|
| 1 | `lib/publishing/service.ts` | `"draft"\|"preview"\|"live"\|"archived"` |
| 2 | `lib/website/publish.ts` | Same as #1 (exact duplicate) |
| 3 | `lib/builder/types.ts` | `"draft"\|"preview"\|"published"\|"scheduled"` |
| 4 | `components/publish/PublishStatusBadge.tsx` | `"draft"\|"preview"\|"publishing"\|"published"\|"outdated"\|"unavailable"` |
| 5 | Prisma schema (`PublishStatus.state`) | `String` (no enum) |

**Action:** Create `@/types/publish.ts` as single source. Deprecate others.

## Rendering Pipelines — 3 Paths

| # | Path | Entry Point | Alive? |
|---|------|-------------|--------|
| 1 | Artifact → `extractSlots()` → ComponentRegistry | `[domain]/page.tsx` | YES |
| 2 | Legacy → `extractSlots()` → ComponentRegistry | `[domain]/page.tsx` | YES |
| 3 | No snapshot → `FallbackStorefront` → `SectionRegistry` | `[domain]/page.tsx` | YES |

**Action:** Path 3 is alive (dynamic import in FallbackStorefront). Keep until Layout Engine rewrite (REF-01D).

## Registry Systems — 3 Systems

| # | System | File | Alive? | Purpose |
|---|--------|------|--------|---------|
| 1 | ComponentRegistry | `lib/registry/components/` | YES | Storefront component rendering |
| 2 | ModuleRegistry | `lib/module/registry.ts` | YES | Theme/platform registry (5 importers) |
| 3 | SectionRegistry | `lib/storefront/registry.ts` | YES | Legacy fallback rendering |

**Action:** All alive. #3 removable after REF-01D rendering rewrite.

## Auth Check Patterns — 3 Patterns

| # | Pattern | Files | Alive? |
|---|---------|-------|--------|
| 1 | Inline `requireTenant()` | 5 action files | YES — 5 identical implementations |
| 2 | Inline `requireAuth()` | 7 action files | YES — 2 different signatures |
| 3 | Direct `getServerSession()` | 15+ files | YES — varies per file |

**Action:** Consolidate into single `requireTenant()` in `lib/auth/require-tenant.ts`.
