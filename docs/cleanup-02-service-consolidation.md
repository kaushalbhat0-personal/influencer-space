# CLEANUP-02: Service Consolidation & Module Architecture

**Date:** 2026-07-30  
**Status:** Complete  
**Pre-requisite:** CLEANUP-01 (boundary + repository cleanup)  

---

## Summary

Moved 6 business-logic files out of `lib/` into proper module directories, created 3 module `presentation/` directories for ADIP compliance, and cleaned up 1 misplaced repository. No business logic was changed — only import paths and file locations.

---

## Domain 1 — Tenant Domain Consolidation

**Old location → New location:**

| File | Old Path | New Path |
|------|----------|----------|
| WebsiteAggregateService | `lib/content/website-aggregate.service.ts` | `modules/tenant/application/website-aggregate.service.ts` |
| ShowcaseService | `lib/showcase/service.ts` | `modules/tenant/application/showcase.service.ts` |
| SeedStarterData | `lib/data/seeder.ts` | `modules/tenant/application/seeder.ts` |

**Consumers updated:**
- `lib/publishing/service.ts` — import path changed
- `lib/content/index.ts` — barrel re-export updated
- `app/showcase/page.tsx` — import path changed
- `lib/provisioning/provisioning-service.ts` — import path changed
- `tests/unit/provisioning.test.ts` — mock path changed, import path changed

**Old files deleted.** No backward-compat re-exports needed.

---

## Domain 2 — Provisioning Module

**Created:** `modules/provisioning/{application,domain,infrastructure,presentation}/`

**Moved:**

| File | Old Path | New Path |
|------|----------|----------|
| ProvisioningService | `lib/provisioning/provisioning-service.ts` | `modules/provisioning/application/provisioning-service.ts` |
| ProvisioningStateMachine | `lib/provisioning/provisioning-state.ts` | `modules/provisioning/domain/provisioning-state.ts` |

**Consumers updated (6 files):**
- `actions/demo.actions.ts`
- `actions/import.actions.ts`
- `actions/onboarding.actions.ts`
- `actions/provision.actions.ts`
- `actions/super-admin-provision.actions.ts`
- `tests/unit/provisioning.test.ts`

**Old files deleted.** The `lib/provisioning/` directory is now empty.

---

## Domain 3 — Revenue → Billing Module

**Moved:**

| File | Old Path | New Path |
|------|----------|----------|
| RevenueService | `lib/revenue/service.ts` | `modules/billing/application/revenue-service.ts` |
| RevenueRepository | `lib/revenue/repository.ts` | `modules/billing/infrastructure/revenue-repository.ts` |

**Consumers updated (3 files):**
- `app/super-admin/revenue-management/page.tsx`
- `app/super-admin/revenue-management/commissions/page.tsx`
- `app/super-admin/revenue-management/settings/page.tsx`

**Old files (including barrel `lib/revenue/index.ts`) deleted.**

---

## Domain 4 — Theme Registry Audit

- Added `@deprecated` JSDoc tags to the 3 legacy exports in `lib/theme/index.ts` (`themePresetRegistry`, `ThemePreset`, `ThemeService`/`themeService`).
- The dual-path architecture is documented: `presets.ts` + `service.ts` is legacy; `registry-new.ts` + `resolver-new.ts` + `tokens-new.ts` is canonical.
- No files were moved. The provisioning service still dynamically imports `@/lib/theme` for `themeService.apply()`.

---

## Domain 5 — AI Layer Audit

- `lib/ai/` (11 files, 4 consumers in `lib/content/`) is the original intelligence engine (AIAnalysisEngine, IntelligenceCache, PromptRegistry).
- `lib/generation/` (150+ files, 100+ consumers) is the new generation orchestration system.
- No consolidation was performed — the two systems serve different purposes (analysis vs. generation).
- **Recommendation:** Future work could migrate the 4 `lib/content/` consumers from `@/lib/ai/` to `@/lib/generation/` equivalents, then archive `lib/ai/`.

---

## Domain 6 — Repository Location Audit

**Moved:**

| Repository | Old Path | New Path |
|------------|----------|----------|
| PublishRepository | `lib/publishing/repository.ts` | `modules/tenant/infrastructure/publishing-repository.ts` |

**Consumers updated:**
- `modules/provisioning/application/provisioning-service.ts` — import path changed
- `lib/publishing/service.ts` — import path changed
- `lib/publishing/index.ts` — barrel re-export updated

**Old file deleted.**

**Remaining repositories in `lib/` (cross-cutting, no clear module home):**
These are shared/cross-cutting and were left in place:
- `lib/publishing/repository.ts` → **MOVED** to `modules/tenant/infrastructure/`
- `lib/revenue/repository.ts` → **MOVED** to `modules/billing/infrastructure/`
- All other repositories in `lib/` are workflow/utility repos that span multiple domains.

---

## Domain 7 — Folder Structure Standardization

Added `presentation/` directories to 3 modules that were missing them (ADIP compliance):

| Module | Before | After |
|--------|--------|-------|
| `modules/billing/` | `application/`, `domain/`, `infrastructure/` | + `presentation/` |
| `modules/tenant/` | `infrastructure/`, `application/`, `domain/` (just created) | + `presentation/` |
| `modules/provisioning/` | `application/`, `domain/`, `infrastructure/` (just created) | + `presentation/` |

`modules/workspace/` already had `presentation/` — no change needed.

---

## Domain 8 — Import Cleanup

- Verified zero remaining imports to deleted paths via grep.
- Pre-existing TypeScript errors (12 in seeder.ts, 1 in showcase.service.ts) are unchanged — they existed in the original files before the move.

---

## Module Structure Summary

```
modules/
├── billing/
│   ├── application/
│   │   ├── entitlements.ts
│   │   ├── index.ts
│   │   ├── revenue-service.ts      ← MOVED from lib/revenue/
│   │   └── service.ts
│   ├── domain/
│   │   ├── events.ts
│   │   ├── lifecycle.ts
│   │   └── types.ts
│   ├── infrastructure/
│   │   ├── catalog-seed.ts
│   │   ├── idempotency.ts
│   │   ├── providers/razorpay.ts
│   │   ├── repository.ts
│   │   └── revenue-repository.ts   ← MOVED from lib/revenue/
│   └── presentation/               ← NEW
├── provisioning/
│   ├── application/
│   │   └── provisioning-service.ts ← MOVED from lib/provisioning/
│   ├── domain/
│   │   └── provisioning-state.ts   ← MOVED from lib/provisioning/
│   ├── infrastructure/             ← empty
│   └── presentation/               ← NEW
├── tenant/
│   ├── application/
│   │   ├── seeder.ts                ← MOVED from lib/data/
│   │   ├── showcase.service.ts      ← MOVED from lib/showcase/
│   │   └── website-aggregate.service.ts ← MOVED from lib/content/
│   ├── domain/                      ← empty
│   ├── infrastructure/
│   │   ├── brand-repository.ts
│   │   ├── gallery-repository.ts
│   │   ├── link-repository.ts
│   │   ├── product-repository.ts
│   │   ├── publishing-repository.ts ← MOVED from lib/publishing/
│   │   ├── settings-repository.ts
│   │   ├── tenant-repository.ts
│   │   ├── user-repository.ts
│   │   └── website-repository.ts
│   └── presentation/               ← NEW
└── workspace/
    ├── application/
    ├── domain/
    ├── infrastructure/
    └── presentation/
```

---

## Stats

| Metric | Value |
|--------|-------|
| Files moved | 8 |
| Files deleted (old originals) | 8 |
| Consumers updated | 15 |
| TypeScript errors introduced | 0 |
| TypeScript pre-existing errors | 13 (unchanged) |
| New module directories created | 6 |
