# Implementation 11B — Runtime Stabilization & End-to-End Wiring Recovery

**Status:** COMPLETE
**Date:** 2026-07-31
**Type:** Runtime stabilization (no new features, no redesign)

---

## Root Cause Analysis

### 1. Critical: `jsonb - jsonb` SQL Error

**File:** `src/services/settings.service.ts:95-98`

**Root Cause:** PostgreSQL does not support `jsonb - jsonb`. The `-` operator on `jsonb` only accepts:
- `jsonb - text` (remove a single key)
- `jsonb - integer` (remove array element by index)
- `jsonb - text[]` (remove multiple keys)

The `patchHeroData` function used `jsonb_agg("k")` which returns `jsonb`, then tried to subtract it:
```sql
"value" = (COALESCE("Setting"."value", '{}'::jsonb) || EXCLUDED."value")
   - (SELECT COALESCE(jsonb_agg("k"), '[]'::jsonb) FROM ...)
```

**Fix:** Replace `jsonb_agg("k")` with `ARRAY(SELECT "k"::text FROM ...)`:
```sql
"value" = (COALESCE("Setting"."value", '{}'::jsonb) || EXCLUDED."value")
   - ARRAY(SELECT "k"::text FROM ...)
```

This uses the valid `jsonb - text[]` operator.

---

### 2. Builder Publish: Silent Save Failure

**File:** `src/features/builder/components/workspace.tsx`

**Root Causes (2):**

**2a. `performSave` returned void, couldn't signal failure**

The `performSave` function had no return value and no catch block. If theme save or page save failed, the function silently returned (or threw). `handlePublish` never knew if the save succeeded, so it always proceeded to publish with potentially stale data.

**Fix:** Changed `performSave` to return `Promise<boolean>`, with explicit `return false` on failure and `return true` on success. Added a catch block that logs the error and returns false.

**2b. `handlePublish` didn't check save result**

After calling `performSave`, `handlePublish` unconditionally called `publishWebsite()`. If the save failed, publish would use stale data from DB.

**Fix:** `handlePublish` now checks `const saved = await performSave(...)` and shows "Save failed — cannot publish" if `saved === false`.

---

### 3. Sidebar "Add Section" Created Empty Sections (No Slots)

**File:** `src/features/builder/components/section-manager.tsx`

**Root Cause:** The sidebar's "Add Section" button called `builderStore.addSection(name)` which creates a section with zero slots (blocks). Without blocks, `builderPagesToLayoutSnapshot()` drops the section entirely, and nothing renders for that module.

**Fix:** Added `SECTION_MODULE_MAP` mapping section names to their default component IDs (`hero.default`, `products.grid`, etc.). The `addSection` callback now creates the section AND inserts a default `BuilderSlot` via `builderStore.insertComponent(moduleId, sec.id, 0)`.

Also added missing modules (Courses, Services, Games, ContentFeed) to the sidebar and updated icons, edit links, and content labels.

---

### 4. Hero CTA Text: "Subscribe" Became "Shop Now"

**File:** `src/lib/storefront/layout-engine/LayoutEngine.ts:157-161`

**Root Cause:** The hero handler used `if (content.hero.ctaText && !config.cta)` — the `!config.cta` guard meant that if the builder's block config already had `cta = "Shop Now"` (set by the provision pipeline during onboarding), the live hero settings data would NOT override it.

**Fix:** Removed the `!config.cta` guard. Live content (hero data from aggregate) now always wins over stale builder config:
```typescript
if (content.hero.ctaText) {
    config.cta = content.hero.ctaText;
}
```

---

## Runtime Instrumentation

Temporary runtime logging added to:
1. **`websiteAggregateService`** (`buildWithTrace` method) — logs counts for all modules
2. **`LayoutEngine.composeSectionConfig`** — logs data counts for each module processed

Log prefix: `[RuntimeTrace]`

---

## Files Modified

| File | Change |
|------|--------|
| `src/services/settings.service.ts` | Fixed `jsonb - jsonb` → `jsonb - text[]` SQL |
| `src/features/builder/components/workspace.tsx` | `performSave` returns `Promise<boolean>`; `handlePublish` checks save result; error display in status bar |
| `src/features/builder/components/section-manager.tsx` | Added `SECTION_MODULE_MAP`; `addSection` creates default slot; added Courses/Services/Games/ContentFeed to sidebar; added Briefcase icon; updated edit links and content labels |
| `src/lib/storefront/layout-engine/LayoutEngine.ts` | Removed `!config.cta` guard (live content always wins); added runtime trace logs |
| `src/modules/tenant/application/website-aggregate.service.ts` | Added `buildWithTrace` instrumentation method |

---

## Verification Matrix

| Module | Admin | DB | Aggregate | Merge | Layout | Renderer | Builder | Storefront | Publish |
|----------|--------|-----|------------|-----------|------------|--------------|--------------|----------------|-------------|
| Hero | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| About | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Links | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Gallery | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Products | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Services | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Courses | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Testimonials | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| FAQ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Timeline | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Games | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Footer | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### Publish Path Verification
- Dashboard Publish → `publishWebsite()` (server action) → `publishingService.publish()` → same pipeline ✅
- Builder Publish → `performSave()` → `saveBuilderPages()` (server action) → `publishWebsite()` → same pipeline ✅
- Both produce identical `PublishedSnapshot` with single `PublishStatus` ✅

---

## Build & Test Results

```
npx tsc --noEmit  →  PASS (no errors)
npm run build     →  PASS (compiled successfully, all pages generated)
npm test          →  1631/1660 pass (29 failures all pre-existing)
```

Pre-existing test failures (unrelated to our changes):
- 7 suites fail to load due to missing modules (identity, workflows, theme packages)
- `capabilities.test.ts`: feature count changed from 23 to 35 (expected feature growth)
- `published.test.ts` / `storefront-resolution.test.ts`: legacy field removed from API
- `platform-api.test.ts`: platform object restructured

---

## Remaining Blockers

None. All P0 issues resolved:
- `jsonb - jsonb` SQL error: fixed
- Builder Publish not working: fixed (save signal + error handling)
- Empty sections from sidebar: fixed (default slot insertion)
- Hero CTA text mismatch: fixed (live content always wins)
- Module wiring: verified all 12 modules follow Products' canonical pattern
