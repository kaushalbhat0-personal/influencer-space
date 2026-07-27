# BETA-01D — Gallery Runtime Investigation

## Executive Summary

**Architecture health:** 9/10 (structure is correct)
**Functional health:** 0/10 (gallery page crashes at build time)

**Critical findings:** 1

The gallery admin page fails at build time due to a Next.js `"use server"` file constraint violation. Not a runtime error — a compilation error.

---

## Dependency Graph

```
/admin/gallery/page.tsx
  ├─ requireTenant() from @/lib/auth/require-tenant
  ├─ dynamic import → @/actions/gallery.actions (SERVER ACTION FILE)
  │     ├─ "use server"
  │     ├─ import GalleryService from @/lib/gallery/service     ✅ EXISTS
  │     ├─ import BulkActionEngine from @/lib/bulk/BulkActionEngine  ✅ EXISTS
  │     ├─ import type { FetchGalleryParams } from @/lib/gallery/types  ✅ EXISTS
  │     ├─ export const bulkEngine = ...                        ❌ VIOLATION
  │     ├─ export type GalleryItemData = ...                     ❌ VIOLATION
  │     └─ exports 12 async functions                           ✅ OK
  └─ GalleryManager from @/features/gallery/components/gallery-page
        └─ imports 9 async functions from @/actions/gallery.actions  ✅
        └─ imports type GalleryItemData from @/actions/gallery.actions ❌ SAME VIOLATION
```

---

## Import Graph

```
@/app/admin/gallery/page.tsx
  ├─ @/features/gallery/components/gallery-page
  │     ├─ @/actions/gallery.actions          ← SERVER ACTION FILE (has violations)
  │     ├─ @/components/gallery/GalleryCard
  │     ├─ @/components/gallery/GalleryEditor
  │     ├─ @/components/gallery/GalleryToolbar
  │     └─ @/components/gallery/Lightbox
  ├─ @/components/gallery/GalleryCard (for skeleton)
  └─ @/lib/auth/require-tenant
```

All component files exist. No missing imports. No cyclic dependencies. No dead references.

---

## Runtime Trace

| Step | File | Line | Status |
|------|------|------|--------|
| Route handler | `admin/gallery/page.tsx` | 39 | ✅ Executes |
| Server action dynamic import | `page.tsx` | 11 | ❌ FAILS — compile error |
| BulkEngine export | `gallery.actions.ts` | 13 | ❌ VIOLATION |
| Type export | `gallery.actions.ts` | 15 | ❌ VIOLATION |
| GalleryService.fetch | `lib/gallery/service.ts` | 11 | ✅ Never reached |
| findGalleryItems | `lib/gallery/queries.ts` | — | ✅ Never reached |
| GalleryManager component | `features/gallery/components/gallery-page.tsx` | 18 | ✅ Never reached |

**Execution stops at:** dynamic import of `@/actions/gallery.actions` in `page.tsx:11`

---

## Server Action Audit

**File:** `src/actions/gallery.actions.ts`

| Export | Type | Violation |
|--------|------|-----------|
| `bulkExecutor` (line 7-11) | `const` object literal | ❌ Non-function in "use server" file |
| `bulkEngine` (line 13) | `const` instance | ❌ Non-function in "use server" file |
| `GalleryItemData` (line 15) | `type` re-export | ❌ Type export in "use server" file |
| `fetchGalleryItems` (line 17) | `async function` | ✅ OK |
| `createGalleryItem` (line 22) | `async function` | ✅ OK |
| `updateExistingGalleryItem` (line 27) | `async function` | ✅ OK |
| `removeGalleryItem` (line 32) | `async function` | ✅ OK |
| `updateGalleryOrder` (line 37) | `async function` | ✅ OK |
| `publishGalleryItem` (line 42) | `async function` | ✅ OK |
| `unpublishGalleryItem` (line 47) | `async function` | ✅ OK |
| `archiveGalleryItem` (line 52) | `async function` | ✅ OK |
| `restoreGalleryItem` (line 57) | `async function` | ✅ OK |
| `toggleFeatured` (line 62) | `async function` | ✅ OK |
| `bulkPublishGallery` (line 67) | `async function` | ✅ OK |
| `bulkArchiveGallery` (line 72) | `async function` | ✅ OK |
| `bulkDeleteGallery` (line 77) | `async function` | ✅ OK |
| `bulkFeatureGallery` (line 82) | `async function` | ✅ OK |

**3 violations, 14 OK.**

---

## Service Audit

| Layer | File | Status |
|-------|------|--------|
| Server action | `src/actions/gallery.actions.ts` | ❌ Has non-function exports |
| Service | `src/lib/gallery/service.ts` | ✅ Canonical owner (183 lines, 20 methods) |
| Repository | `src/lib/gallery/service.ts` (class, not repo) | ✅ Repository pattern built into service |
| Queries | `src/lib/gallery/queries.ts` | ✅ Exists |
| Types | `src/lib/gallery/types.ts` | ✅ Exists |
| Permissions | `src/lib/gallery/permissions.ts` | ✅ Exists |
| Validation | `src/lib/gallery/validation.ts` | ✅ Exists |

**No duplicate service, no duplicate repository, no dead references.**

---

## Database Flow

```
GalleryManager component
  → dynamic import of gallery.actions.ts  ❌ FAILS HERE
  → fetchGalleryItems({ tenantId, page, limit })
  → GalleryService.fetch(params)
  → findGalleryItems(params)               ← queries.ts
  → prisma.galleryImage.findMany({...})    ← GalleryImage table
  → returns GalleryItemData[]
  → GalleryManager receives items via props
```

The database flow itself is correct. The execution never reaches the database because the server action file fails to compile.

---

## Root Cause

**Issue:** `src/actions/gallery.actions.ts` exports non-async-function values in a `"use server"` file.

**Evidence:**

```typescript
"use server";                          // ← file-level directive

export const bulkEngine = new BulkActionEngine(...);  // ← LINE 13: NOT an async function
export type GalleryItemData = ...;                    // ← LINE 15: NOT an async function
```

**Next.js constraint:** Files with `"use server"` directive may only export `async function` declarations. Constant exports, object exports, and type exports cause the build error: `"A use server file can only export async functions"`.

**Root cause:** During REF-01B service consolidation, `gallery.actions.ts` was retained as the canonical server action file. The non-function exports (`bulkEngine`, `GalleryItemData`) were never extracted to separate files. These were tolerated in development mode but fail in production build (`npx next build`).

**Files affected:**
- `src/actions/gallery.actions.ts` (lines 13 and 15)

**Dependencies:**
- `src/features/gallery/components/gallery-page.tsx` (line 10: imports the type)
- `src/features/gallery/components/gallery-page.tsx` (lines 4-9: imports the actions)

**Canonical fix:**
1. Move `bulkEngine` export to a separate non-server-action file (e.g., `src/lib/gallery/bulk.ts`)
2. Move `GalleryItemData` type to a shared types file (already exists at `src/lib/gallery/types.ts` — just change the import source)
3. The `src/actions/gallery.actions.ts` file will then contain only `async function` exports

**Risk:** LOW. No architectural changes. No pipeline changes. Pure refactor of imports within the gallery feature.

**Estimated effort:** 15 minutes.

---

## Verify Other Server Action Files

The same pattern (non-function exports in `"use server"` files) exists elsewhere. A project-wide scan would be prudent for completeness:

| File | Non-function export | Status |
|------|-------------------|--------|
| `src/actions/link.actions.ts` | `export type LinkData = ...` | ❌ Same violation |
| `src/actions/milestone.actions.ts` | `export type MilestoneData = ...` | ❌ Same violation |
| `src/actions/contact.actions.ts` | `export type ContactData = ...` | ❌ Same violation |
| `src/actions/content-feed.actions.ts` | (check) | TBD |
| `src/actions/domain.actions.ts` | (check) | TBD |

These are pre-existing issues that should be fixed alongside the gallery fix.
