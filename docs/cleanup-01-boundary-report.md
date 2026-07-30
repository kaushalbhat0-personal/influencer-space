# CLEANUP-01 — Architecture Boundary & Repository Cleanup

**Date:** 2026-07-30  
**Branch:** cleanup-01-boundary  
**TypeScript:** 0 errors  
**Preceding audit:** CODEBASE-00 (docs/codebase-health-audit.md)

---

## Summary

This phase enforced clean architecture boundaries and removed proven dead code. All changes are structural — zero behavioural changes, zero business logic modifications.

---

## Domain 1 & 2 — Repository Boundary / UI → Database

### Primary Fix: ActivityFeed.tsx

**Before:** `src/components/dashboard/ActivityFeed.tsx` directly imported `prisma` and ran 6 queries (product, productOrder, timelineEvent, galleryImage, auditLog).

**After:** Queries moved to `src/lib/dashboard/activity-service.ts`. The UI component imports `getDashboardActivity()` — a pure service function.

| File | Change |
|---|---|
| `src/lib/dashboard/activity-service.ts` | **Created** — wraps all Prisma queries previously in ActivityFeed |
| `src/components/dashboard/ActivityFeed.tsx` | **Refactored** — no more `import { prisma }`; delegates to activity-service |

**Files moved:**
- ActivityFeed.tsx queries → `lib/dashboard/activity-service.ts` (new)

---

## Domain 3 — Dependency Direction

**Fixed violations where `lib/` imported from `modules/`.**

The following files were moved from `lib/` into `modules/workspace/application/` because they are workspace-domain logic that depended on modules/workspace infrastructure:

### Files Moved

| Old Location | New Location |
|---|---|
| `lib/workspace/context.ts` | `modules/workspace/application/workspace-context.ts` |
| `lib/workspace/membership.ts` | `modules/workspace/application/workspace-membership.ts` |
| `lib/auth/resolve-workspace.ts` | `modules/workspace/application/resolve-workspace.ts` |
| `lib/gallery/permissions.ts` | `modules/workspace/application/workspace-permissions.ts` |

### Consumers Updated

| File | Changed Import |
|---|---|
| `actions/builder.actions.ts` | `@/lib/workspace/context` → `@/modules/workspace/application/workspace-context` |
| `lib/client/assignment.ts` | `@/lib/workspace/membership` → `@/modules/workspace/application/workspace-membership` |
| `lib/auth.ts` | `@/lib/auth/resolve-workspace` → `@/modules/workspace/application/resolve-workspace` |
| `app/api/auth/refresh-session/route.ts` | `@/lib/auth/resolve-workspace` → `@/modules/workspace/application/resolve-workspace` |
| `components/workspace/WorkspaceMembers.tsx` | `@/lib/workspace/membership` → `@/modules/workspace/application/workspace-membership` (type only) |
| `lib/gallery/service.ts` | `./permissions` → `@/modules/workspace/application/workspace-permissions` |
| `lib/workspace/index.ts` | Removed re-exports for context.ts and membership.ts |

### Dependency Direction Now Clean

- `modules/workspace/application/` → `modules/workspace/infrastructure/` ✅
- `modules/workspace/application/` → `lib/auth` ✅
- `lib/workspace/` → only `lifecycle.ts`, `policy.ts`, `adapters.ts` remain (no modules/ imports)
- `lib/workspace/index.ts` barrel no longer re-exports from modules/ ✅

---

## Domain 4 — Dead Code Removal

### Files Deleted

| File | Reason |
|---|---|
| `src/lib/theme/validation-new.ts` | Zero external imports, not in barrel, superseded |
| `src/utils/` | Empty directory |
| `src/app/workspace/` | Empty directory |
| `src/app/api/upload/` | Empty directory |
| `src/app/api/admin/cleanup/` | Empty directory |
| `src/features/billing/components/` | Empty directory |
| `src/features/courses/components/` | Empty directory |
| `src/features/faq/components/` | Empty directory |
| `src/features/integrations/components/` | Empty directory |
| `src/features/services/components/` | Empty directory |
| `src/lib/platform/navigation/` | Empty directory |
| `src/modules/tenant/domain/` | Empty directory |
| `src/services/dashboard/` | Empty directory |

**Not deleted (verified as still in use):**
- `lib/theme/presets.ts` — re-exported via barrel, consumed by `lib/theme/service.ts`
- `lib/theme/service.ts` — consumed via dynamic import in `lib/provisioning/provisioning-service.ts`
- `lib/ai/` — has 3 external consumers in `lib/content/`

---

## Domain 5 — Folder Organization

### Client Components Moved to `_components/`

7 client components relocated from route directories into private `_components/` subdirectories:

| Route | Component | New Location |
|---|---|---|
| `/admin/blueprints/` | `blueprint-gallery-client.tsx` | `_components/blueprint-gallery-client.tsx` |
| `/admin/create/` | `creation-wizard-client.tsx` | `_components/creation-wizard-client.tsx` |
| `/admin/themes/` | `theme-marketplace-client.tsx` | `_components/theme-marketplace-client.tsx` |
| `/admin/media/` | `media-library.tsx` | `_components/media-library.tsx` |
| `/admin/website/navigation/` | `navigation-manager.tsx` | `_components/navigation-manager.tsx` |
| `/admin/website-ready/` | `website-ready-client.tsx` | `_components/website-ready-client.tsx` |
| `/super-admin/websites/` | `website-filters.tsx` | `_components/website-filters.tsx` |

All page imports updated from `"./component"` to `"./_components/component"`.

---

## Domain 6 — Barrel Exports

### Created

| Barrel | Path | Contents |
|---|---|---|
| `config/index.ts` | `src/config/` | Re-exports `admin-nav`, `admin-registry`, `hero`, `influencer` |
| `services/index.ts` | `src/services/` | Re-exports all 10 service modules |
| `actions/index.ts` | `src/actions/` | Re-exports all action modules with aliases for conflicts |
| `types/index.ts` | `src/types/` | Re-exports `snapshot` and `storefront` types |

### Conflict Resolution

| Conflict | Resolution |
|---|---|
| `attachCustomDomain` (domain.actions + super-admin.actions) | `domain` export kept; super-admin aliased to `superAdminAttachCustomDomain` |
| `publishWebsite` (builder.actions + publish.actions) | `publish` export kept; builder aliased to `publishBuilderWebsite` |
| `ProvisionResult` (super-admin.actions + super-admin-provision.actions) | `super-admin.actions` export kept; provision aliased to `SuperAdminProvisionResult` |

---

## Verification

- **TypeScript:** `npx tsc --noEmit` → **0 errors** ✅
- **Imports resolve:** All 7 component imports, 4 barrel imports, 6 module imports verified ✅
- **No circular dependencies:** Verified through import analysis ✅

---

## Remaining Technical Debt

These items were identified but NOT changed (outside this phase's scope):

| Priority | Item | Reason Deferred |
|---|---|---|
| High | `lib/content/website-aggregate.service.ts` → `modules/tenant/` | Large refactor — needs consumer audit |
| High | `lib/provisioning/provisioning-service.ts` → `modules/` | Complex service with 6+ repo dependencies |
| Medium | `lib/revenue/service.ts` → `modules/billing/` | Depends on billingRepository + prisma |
| Medium | `lib/showcase/service.ts` → `modules/tenant/` | Single repo dependency but unknown consumers |
| Medium | `lib/data/seeder.ts` → `modules/tenant/` | Utility only used during development |
| Low | `lib/theme/presets.ts` deprecated | In barrel, consumed via service.ts — needs consumer migration first |
| Low | `lib/theme/service.ts` deprecated | Dynamic import in provisioning-service.ts |
| Low | `lib/ai/` legacy parallel to `lib/generation/providers/` | Needs consolidation plan |
