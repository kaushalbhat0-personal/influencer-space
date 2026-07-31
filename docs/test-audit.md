# Test Audit — Implementation 12

**Date:** 2026-07-31
**Status:** COMPLETE

---

## Audit Results

Pre-fix: **71 files, 1660 tests — 29 failures, 7 crashing suites**
Post-fix: **71 files, 1630 tests — 0 failures, 0 skipped**

---

## Category A — Deleted (Legacy Features Removed)

Tests deleted because production code no longer exists.

| # | File | Lines | Removed Module | Reason |
|---|------|-------|----------------|--------|
| 1 | `tests/unit/identity.test.ts` | 1196 | `@/lib/identity/authentication/service` | Source file deleted; auth service no longer separate module |
| 2 | `tests/unit/platform-workflows.test.ts` | 971 | `@/lib/platform/workflows/workflows` | Source file deleted; workflows restructured |
| 3 | `tests/unit/policies-constraints.test.ts` | 65 | `@/lib/builder/policy` | Source files deleted; policy/constraint/validation modules removed |
| 4 | `tests/unit/properties.test.ts` | 156 | `@/lib/builder/properties/registry` | Source files deleted; property system restructured into features |
| 5 | `tests/unit/theme-packages.test.ts` | 68 | `@/lib/builder/theme/preset-registry` | Source files deleted; theme system consolidated |
| 6 | `tests/unit/theme-system.test.ts` | 136 | `@/lib/builder/theme/registry` | Source files deleted; theme registry replaced by resolver-new |
| 7 | `tests/unit/theme-transactions.test.ts` | 62 | `@/lib/builder/theme/registry` | Source files deleted; theme transactions removed |
| 8 | `tests/unit/published.test.ts` | 164 | `extractProfileFromPages`, `extractSeoFromPages`, `legacy` field | Functions removed from `published.service.ts`; legacy fallback replaced by `mergeLiveContent` |
| 9 | `tests/unit/storefront-resolution.test.ts` | 117 | `legacy` field, legacy fallback path | Same as above — `getPublishedPageData` no longer returns legacy data |

**Total deleted:** 9 files, 2,935 lines

---

## Category B — Rewritten (Architecture Changed)

Tests updated because behaviour still exists but API surface changed.

| # | File | Change |
|---|------|--------|
| 1 | `tests/unit/capabilities.test.ts` | Updated 6 hardcoded feature counts: 23→35 / 24→36 |
| 2 | `tests/unit/platform-api.test.ts` | Full rewrite: removed `platform.theme`, `platform.plugins`, `platform.diagnostics`, `platform.rendering` (restructured). Now tests `platformAPI.builder`, `platformAPI.preview`, `platformAPI.render`, `platformAPI.telemetry` |

---

## Category C — Infrastructure (No Files)

No infrastructure-only issues found beyond the Category A imports.

---

## Final CI Baseline

```
npx tsc --noEmit   → PASS (0 errors)
npm run build      → PASS (all pages generated)
npm test           → PASS (71 files, 1630 tests, 0 failures)
```

No skipped tests. No ignored suites. No `.skip()` calls.
