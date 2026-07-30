# CLEANUP-03: Code Quality, Consistency & Engineering Standards

**Date:** 2026-07-30  
**Status:** Complete  
**Pre-requisite:** CLEANUP-02 (service consolidation)

---

## Summary

Executed a 10-domain quality audit across the codebase. Applied structural fixes (folder flattening, barrel cleanup, missing barrels), extracted shared constants, fixed import paths, and documented all remaining inconsistencies. Zero new TypeScript errors introduced.

---

## Domain 1 — Naming Audit

**Finding:** Two naming conventions coexist across 45 bare `service.ts` files (relying on folder context) and 20 domain-prefixed service files (e.g., `revenue-service.ts`, `provisioning-service.ts`). Same split for repositories: 4 bare `repository.ts` vs 17 `*-repository.ts`. Also a separator inconsistency: dotted (`*.service.ts` in `services/`) vs hyphenated (`*-service.ts` in `lib/`).

**Action taken:** Documented only. Renaming 45+ service files and updating all consumers is a future-phase refactor. See findings below.

**Remaining debt:**
- `services/` directory uses `*.service.ts` (dotted) while `lib/` and `modules/` use `service.ts` (bare) or `-service.ts` (hyphenated)
- `features/` uses bare `service.ts` exclusively — consistent internally but different from other areas
- `modules/billing/application/` has both `service.ts` (bare) and `revenue-service.ts` (named) — mixed convention within same module
- Theme has 4 `-new` suffix files (`types-new.ts`, `registry-new.ts`, `resolver-new.ts`, `tokens-new.ts`) indicating incomplete refactoring
- `actions/*.types.ts` (7 files) use `.types.ts` suffix while everywhere else uses `types.ts`

---

## Domain 2 — Folder Consistency

### Self-nested directories flattened (3 directories)

| Old Path | Files Moved | New Path |
|----------|-------------|----------|
| `lib/generation/providers/providers/` | 6 provider implementations | `lib/generation/providers/` |
| `lib/generation/composition/variants/variants/` | `all-variants.ts` | `lib/generation/composition/variants/` |
| `lib/platform/workflows/workflows/` | 5 workflow definitions | `lib/platform/workflows/` |

Each move required updating relative imports inside the files, the parent barrel exports, and test file imports. The `workflows/workflows/` inner barrel was merged into the outer `workflows/index.ts`.

### Empty directories removed (4 directories)
- `src/lib/provisioning/` — post CLEANUP-02
- `src/lib/revenue/` — post CLEANUP-02
- `src/lib/showcase/` — post CLEANUP-02
- `src/app/api/admin/` — empty API route

### Remaining empty ADIP layers (kept — architecturally correct)
- `modules/billing/presentation/`
- `modules/provisioning/infrastructure/`
- `modules/provisioning/presentation/`
- `modules/tenant/domain/`
- `modules/tenant/presentation/`

### PascalCase directories in `components/marketing/` (noted)
- `components/marketing/AgencyFeatures/`
- `components/marketing/Pricing/`

---

## Domain 3 — Barrel Consistency

### Critical fix: Circular dependency in `lib/content/`

**File:** `src/lib/content/api.ts` imported from `"./index"` (the barrel), while `index.ts` re-exported from `"./api"`. This created a **self-circular barrel dependency** where `api.ts` → `index.ts` → `api.ts`.

**Fix:** Changed `api.ts` to import directly from source files:
```ts
// Before: import { contentRegistry, contentCommands, ... } from "./index";
// After:  import { contentRegistry } from "./registry";
//         import { contentCommands, contentEvents, ... } from "./engine";
```

### Deprecation tags added

**File:** `src/lib/media/index.ts` — added `/** @deprecated */` JSDoc tags to 3 legacy exports (`AssetRegistry`, `AssetResolver`, types) to match the pattern used in `lib/theme/index.ts`.

### Missing barrel created

**File:** `src/modules/workspace/application/index.ts` — created a barrel for the 5 application layer files, matching the pattern used by `modules/billing/application/index.ts` and `modules/tenant/infrastructure/index.ts`.

### Wildcard export risk (documented)
- `lib/identity/index.ts` uses 16 wildcard `export *` from deeply nested sub-modules — high collision risk
- `lib/billing/index.ts` uses 4 wildcard `export *` mixed with named exports
- `lib/capabilities/index.ts` re-exports `PlanFamily` from two separate modules via wildcard (silent duplicate)

---

## Domain 4 — Type Organization

### Findings (documented — no renames applied)
- 82 `types.ts` files across the codebase, plus 7 `actions/*.types.ts`
- 57 inline type exports in `service.ts` files, 11 in `repository.ts` files, 39 in `.tsx` components
- 9 instances of duplicated types with diverging shapes (e.g., `BillingPlan` in `features/` vs `lib/` has different fields; `CreatorProfile` in 3 different files has 3 different shapes)
- `src/types/` is lean and focused — NOT a dumping ground (only `snapshot.ts`, `storefront.ts`, `next-auth.d.ts`)
- `lib/lifecycle/types.ts` uses `enum` instead of `as const + type` — inconsistent with codebase

---

## Domain 5 — Error Handling

### Findings (documented — no code changes)
- 252 `throw new Error()` calls across 105 files
- 11 custom error classes across 10 files
- 18 files use `Result<T, E>` types (concentrated in `lib/generation/`)
- `src/lib/errors/infrastructure-error.ts` — the only file in `lib/errors/`
- `src/lib/application/errors.ts` — `ApplicationError` class
- `src/lib/generation/domain/errors/index.ts` — 9 generation-specific error classes

**Key finding:** Three error patterns coexist (plain `Error`, custom subclasses, and `Result` types) with no standardization. The generation module is the only area using Result types systematically.

---

## Domain 6 — Logging

### Findings (documented — no code changes)
- 34 `console.log()`, 79 `console.error()`, 8 `console.warn()` scattered across 30+ files
- No structured logger exists (no `logger.info()`, no Pino/Winston)
- `platformTelemetry` in `lib/telemetry/` handles metrics/tracing but not application logging
- `lib/providers/youtube/logger.ts` is a thin wrapper around console
- `lib/observability/` handles performance metrics and production-readiness scoring — not logging

**Key finding:** The codebase lacks a structured application logger. All textual logging goes through raw `console.*` with ad-hoc prefix conventions (`[Retry]`, `[Analytics]`, `[JobRunner]`, `[LLM Engine]`). Platform-level infrastructure logging (retries, bootstrap, beta scenarios) is intentional and should remain.

---

## Domain 7 — Constants

### Shared time constants created

**File:** `src/lib/constants.ts` — merged 9 time constants into the existing route constants file:
```ts
MS_PER_SECOND = 1000
MS_PER_MINUTE = 60_000
MS_PER_HOUR = 3_600_000
MS_PER_DAY = 86_400_000
MS_PER_WEEK = 604_800_000
```

### Files updated to use shared constants

| File | Before | After |
|------|--------|-------|
| `modules/billing/application/revenue-service.ts` | `30 * 86400000` | `30 * MS_PER_DAY` |
| `lib/reliability/retry.ts` | `1000`, `30000` | `MS_PER_SECOND`, `30 * MS_PER_SECOND` |
| `lib/ai/llm-engine.ts` | `Math.pow(2, attempt) * 1000` | `Math.pow(2, attempt) * MS_PER_SECOND` |

### Remaining high-value extraction targets (documented)
- `60000` inline 19 times across provider timeouts, rate-limit windows, and heartbeats
- `86400000` inline 9 times (4 already named)
- `1000` inline ~55 times in retry delays, JWT timestamps, and format helpers

---

## Domain 8 — Documentation

### Deprecation markers (after updates)
Total: 13 `@deprecated` JSDoc tags across 6 files

| File | Tags | Status |
|------|------|--------|
| `lib/theme/index.ts` | 3 | Existing (refined) |
| `lib/media/index.ts` | 3 | **Added** |
| `lib/theme/presets.ts` | 1 | Existing |
| `lib/personalization/personalizer.ts` | 1 | Existing |
| `services/storage.service.ts` | 1 | Existing |
| `services/settings.service.ts` | 1 | Existing |

### Findings
- 0 TODO/FIXME/HACK comments — exceptionally clean
- 0 README.md files in `src/modules/` or `src/lib/` — consistent absence
- Sampled exports have no JSDoc — consistent across codebase (relies on TypeScript types)

---

## Domain 9 — Import Standards

### Duplicate imports merged

**File:** `src/actions/operations.actions.ts` — merged 3 separate `@/lib/reliability` imports into one:
```ts
// Before:
import { getPlatformHealth } from "@/lib/reliability";
import { getDiagnostics } from "@/lib/reliability";
import { jobRunner } from "@/lib/reliability";
// After:
import { getPlatformHealth, getDiagnostics, jobRunner } from "@/lib/reliability";
```

### Findings (documented)
- **0 deep relative imports** at 3+ levels — very clean
- Barrel created for `modules/workspace/application/` — siblings not yet migrated to use it
- Actions import ratio: 120 `@/lib/` vs 16 `@/modules/` (7.5:1 in favor of lib)
- ~6 action files have separate value+type imports from the same module (e.g., `provision.actions.ts`)

---

## Domain 10 — Validation

**TypeScript:** `npx tsc --noEmit` — 13 errors total, all pre-existing (12 in `seeder.ts`, 1 in `showcase.service.ts`). **Zero new errors introduced.**

| Category | Count | Source |
|----------|-------|--------|
| Pre-existing errors | 13 | CLEANUP-02 (unchanged) |
| New errors introduced | 0 | CLEANUP-03 changes |
| Total | 13 | |

---

## Full Change List

| File | Change Type | Description |
|------|-------------|-------------|
| `lib/constants.ts` | Edit | Merged 9 time constants into existing route constants |
| `lib/content/api.ts` | Edit | Fixed circular barrel dependency |
| `lib/media/index.ts` | Edit | Added `@deprecated` JSDoc to 3 legacy exports |
| `lib/reliability/retry.ts` | Edit | Replaced magic numbers with `MS_PER_SECOND` |
| `lib/ai/llm-engine.ts` | Edit | Replaced `* 1000` with `* MS_PER_SECOND` |
| `modules/billing/application/revenue-service.ts` | Edit | Replaced `30 * 86400000` with `30 * MS_PER_DAY` |
| `actions/operations.actions.ts` | Edit | Merged 3 duplicate imports into 1 |
| `lib/generation/providers/mock-provider.ts` | Edit | Fixed import path after move |
| `lib/generation/composition/variants/registry.ts` | Edit | Fixed import path after flatten |
| `modules/workspace/application/index.ts` | Create | New barrel for workspace application layer |
| `lib/generation/providers/*-provider.ts` (6 files) | Move | Flattened from `providers/providers/` |
| `lib/generation/composition/variants/all-variants.ts` | Move | Flattened from `variants/variants/` |
| `lib/platform/workflows/*.ts` (5 files) | Move | Flattened from `workflows/workflows/` |
| `lib/platform/workflows/index.ts` | Edit | Merged inner barrel re-exports |
| `lib/provisioning/` | Delete | Empty directory post CLEANUP-02 |
| `lib/revenue/` | Delete | Empty directory post CLEANUP-02 |
| `lib/showcase/` | Delete | Empty directory post CLEANUP-02 |
| `app/api/admin/` | Delete | Empty API route |
| `lib/generation/providers/providers/` | Delete | Flattened |
| `lib/generation/composition/variants/variants/` | Delete | Flattened |
| `lib/platform/workflows/workflows/` | Delete | Flattened |

---

## Remaining Technical Debt

| Item | Priority | Notes |
|------|----------|-------|
| `lib/identity/index.ts` 16 wildcard exports | Medium | High collision risk |
| `lib/billing/index.ts` 4 wildcard exports | Medium | Named + wildcard mixed |
| Service file naming inconsistency (45 bare vs 20 named) | Low | Large refactor, documentation phase |
| Theme `-new` suffix files | Low | Need coordinated rename + consumer update |
| `.types.ts` vs `types.ts` naming | Low | 7 actions files use `.types.ts` suffix |
| Duplicated types (9 instances) | Medium | Diverging shapes, needs domain expert |
| Console.log/error/warn 121 calls | Low | No structured logger exists |
| `60000` inline 19 times | Low | Provider timeouts, rate-limit windows |
| Empty ADIP layers (5 directories) | None | Architecturally correct, intentionally empty |
| Pre-existing TS errors (13) | Medium | seeder.ts + showcase.service.ts |
