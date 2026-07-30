# Platform Codebase Health & Architecture Audit

**Date:** 2026-07-30
**Auditor:** Principal Software Architect
**Scope:** Repository-wide
**Method:** Static analysis, dependency tracing, pattern matching, manual review
**Policy:** No code was modified during this audit.

---

## 1. REPOSITORY HEALTH SCORE: **7.2 / 10**

| Category | Score | Status |
|---|---|---|
| Structure & Organization | 7.5 / 10 | Good |
| Dependency Hygiene | 6.0 / 10 | Fair |
| Code Quality | 7.0 / 10 | Good |
| Architecture Compliance | 5.5 / 10 | Fair |
| Performance Awareness | 6.5 / 10 | Fair |
| Frontend Consistency | 7.5 / 10 | Good |
| Testing Coverage | 7.0 / 10 | Good |
| Documentation | 8.5 / 10 | Excellent |
| Dead Code | 6.0 / 10 | Fair |
| Maintainability | 6.5 / 10 | Fair |
| **Overall** | **7.2 / 10** | **Good — actionable debt identified** |

---

## 2. PHASE 1 — REPOSITORY STRUCTURE

| Area | Status | Recommendation |
|---|---|---|
| Folder organization | **Good** — DDD-adjacent modules, features, lib separation | Consolidate `src/lib/` (72 subdirs is too many — extract domains) |
| Domain boundaries | **Fair** — `modules/`, `features/`, `lib/` overlap | Clarify: `modules/` = DDD domain, `lib/` = shared infra, `features/` = UI feature slices |
| Module ownership | **Fair** — `lib/workspace/` imports from `modules/workspace/` (reverse dependency) | Invert: modules depend on lib, not the reverse |
| File placement | **Fair** — 7 client components in route dirs instead of `_components/` | Move: `blueprint-gallery-client.tsx`, `creation-wizard-client.tsx`, `media-library.tsx`, `theme-marketplace-client.tsx`, `website-ready-client.tsx`, `navigation-manager.tsx`, `website-filters.tsx` |
| Naming conventions | **Fair** — 4 PascalCase files in `lib/` (kebab-case expected), mixed hook conventions, 1 kebab-case component in `ui/` | Standardize: `BulkActionEngine.ts` → `bulk-action-engine.ts`, unify hook naming |
| Barrel exports | **Excellent** — 130+ `index.ts` files across the project | Add missing barrels: `src/config/`, `src/types/`, `src/services/`, `src/actions/` |
| Shared utilities | **Good** — single `cn()` utility, single `prisma.ts` client | Reduce per-module `mapper.ts`/`constants.ts` boilerplate |

### Structural Anomalies

**15 empty directories** — potential dead code or stalled WIP:
- `src/app/workspace/`, `src/utils/`, `src/services/dashboard/`, `src/modules/tenant/domain/`, `src/app/api/admin/cleanup/`, `src/app/api/upload/`, `src/lib/platform/navigation/`
- Feature component dirs: `billing/components/`, `courses/components/`, `faq/components/`, `integrations/components/`, `services/components/`
- E2E test dirs: `agency/`, `billing/`, `builder/`, `marketplace/`, `performance/`, `public/`, `publishing/`, `regression/`, `super-admin/`, `workspace/`, `accessibility/`, `creator/`

---

## 3. PHASE 2 — DEPENDENCY AUDIT

### Circular Dependencies

No direct circular imports detected through static grep. Risk exists via deep chains though `src/lib/` ↔ `src/modules/` inter-dependency.

### Duplicate Implementations (8 groups identified)

| Group | Duplicates | Risk |
|---|---|---|
| **Gallery** | `lib/gallery/` (active), `lib/content/entities/gallery/` (dead), `features/gallery/` (UI) | Medium |
| **Products** | `lib/products/` (active), `lib/content/entities/product/` (dead), `features/products/` (active), `actions/order.actions.ts` | Medium |
| **AI Providers** | `lib/ai/providers/` (legacy, 3 consumers), `lib/generation/providers/` (active, heavy use) | High — two AI provider abstractions |
| **Dashboard** | `lib/dashboard/`, `features/dashboard/`, `components/dashboard/`, `lib/application/dashboard-app.service.ts` | Medium |
| **Billing** | `modules/billing/` (DDD), `features/billing/` (facade), `components/billing/` (UI) | Low — intentional layered architecture |
| **Theme** | `lib/theme/` (legacy, deprecated), `lib/theme/*-new.ts` (replacement) | **High** — parallel old/new theme systems |
| **Affiliate/Links** | `services/affiliate.service.ts`, `features/links/service.ts`, `actions/link.actions.ts` | Medium |
| **Content Feed** | `services/content-feed.service.ts`, `actions/content-feed.actions.ts`, `features/settings/components/content-feed-manager.tsx` | Medium |

### Layer Violations

**Critical: UI components with direct Prisma access**
- `src/components/dashboard/ActivityFeed.tsx` — directly imports `prisma` and runs 6+ queries
- Violates the architecture rule: *"No direct Prisma or Platform API access from UI"*

**40+ files with direct Prisma usage outside `lib/` or `modules/`:**
- 38 action files under `src/actions/` use `prisma` directly
- 9+ feature services bypass module repositories
- 10 `src/services/*.service.ts` files connect directly to Prisma

**Recommendation:** Create a single `@/repositories` barrel or enforce that only `modules/*/infrastructure/` touches Prisma.

### Infrastructure Leakage

30+ files import Prisma types directly from `@/generated/prisma/client` instead of through domain types. This couples the entire codebase to the Prisma schema.

---

## 4. PHASE 3 — CODE QUALITY

### Largest Hand-Written Files

| File | Lines | Risk |
|---|---|---|
| `src/lib/generation/persona/detectors/all-detectors.ts` | **1,346** | Critical — monolithic |
| `src/lib/registry/components/renderers.tsx` | **743** | High |
| `src/lib/blueprint/providers/built-in.ts` | **659** | High |
| `src/lib/generation/orchestration/orchestrator.ts` | **525** | High |
| `src/lib/testing/creator-dataset-v1.ts` | **496** | Medium |
| `src/lib/module/registry.ts` | **463** | Medium |

**Worst offender:** `all-detectors.ts` at 1,346 lines — likely a giant switch/if-else chain.

### TODO/FIXME Debt

| File | Count |
|---|---|
| `src/lib/commission/repositories/commission-repository.ts` | **7** |
| `src/lib/partners/repositories/partner-repository.ts` | **6** |
| `src/lib/payouts/repositories/payout-repository.ts` | **4** |
| **Total** | **17** |

**Concentrated in 3 repository files** — all in the commission/partner/payout domain.

### Console.log in Production-Adjacent Code

| File | Count | Context |
|---|---|---|
| `scripts/platform-bootstrap.ts` | **54** | CL script (acceptable) |
| `scripts/platform-sync.ts` | **35** | CL script (acceptable) |
| `prisma/cleanup.ts` | **32** | Utility script (acceptable) |

No production code console.log detected.

### Any Type Usage

| File | Count |
|---|---|
| `src/lib/generation/integration/provision-pipeline.ts` | **27** |
| Tests (generation-orchestrator.test.ts) | **40** |

Strong typing gap in generation integration code.

### ts-ignore / ts-expect-error

**Zero** in source code. Excellent.

### eslint-disable

**22 occurrences** — all in generated Prisma model files. Acceptable.

### Per-Module Boilerplate Explosion

10+ domain modules each implement their own `mapper.ts`, `constants.ts`, `queries.ts`, `validation.ts` with significant structural overlap. This creates ~40 redundant files with ~8,000 lines of boilerplate.

---

## 5. PHASE 4 — ARCHITECTURE COMPLIANCE

### "One Source of Truth" Violations

| Principle | Violation |
|---|---|
| One repository per entity | Gallery has 3 repository implementations |
| One service per domain | Products have services in `lib/`, `features/`, `actions/` |
| One registry | Theme has `presets.ts` (deprecated) and `registry-new.ts` (active) |
| One owner | `lib/` and `modules/` both own workspace/tenant logic |

### Modules Following Clean Architecture

| Module | application/ | domain/ | infrastructure/ | presentation/ |
|---|---|---|---|---|
| `modules/billing/` | ✅ | ✅ | ✅ | ❌ |
| `modules/tenant/` | ❌ | Empty | ✅ | ❌ |
| `modules/workspace/` | ✅ | ✅ | ✅ | ✅ |

**`modules/tenant/domain/` is empty** — no domain logic defined.

### Feature Completeness

| Feature | **tests** | actions.ts | components/ | service.ts | types.ts |
|---|---|---|---|---|---|
| analytics | ✅ | ✅ | ✅ | ✅ | ✅ |
| billing | ✅ | ✅ | Empty | ✅ | ✅ |
| courses | ✅ | ✅ | Empty | ✅ | ✅ |
| dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| domains | ✅ | ✅ | ✅ | ✅ | ✅ |
| faq | ✅ | ✅ | Empty | ✅ | ✅ |
| gallery | ❌ | ❌ | ✅ | ❌ | ❌ |
| integrations | ✅ | ✅ | Empty | ✅ | ✅ |
| links | ✅ | ✅ | ✅ | ✅ | ✅ |
| products | ✅ | ✅ | ✅ | ✅ | ✅ |
| profile | ✅ | ✅ | ✅ | ✅ | ✅ |
| seo | ✅ | ✅ | ✅ | ✅ | ✅ |
| services | ✅ | ✅ | Empty | ✅ | ✅ |
| settings | ❌ | ❌ | ✅ | ❌ | ❌ |
| testimonials | ✅ | ✅ | ✅ | ✅ | ✅ |

**Incomplete features:** `gallery` (missing actions, service, types, tests), `settings` (missing actions, service, types, tests).

---

## 6. PHASE 5 — PERFORMANCE

### N+1 Query Risks

Server components in `src/app/super-admin/` and `src/app/admin/` use `async` components that await multiple Prisma queries. Without explicit examination of SQL logs, N+1 patterns are possible in:
- Tenant listing pages with subscription counts
- Dashboard aggregate queries
- Table components with row-level data fetching

### Missing Caching

- **No Redis/memoization layer** detected for Prisma queries
- No `unstable_cache` or React `cache()` usage found in data fetching
- Server components re-execute on every request (no partial prerendering)
- Registry lookups in `src/lib/registry/` may benefit from memoization

### Expensive Operations

- `src/lib/testing/creator-dataset-v1.ts` — 496 lines of hardcoded test data loaded at seed time
- `all-detectors.ts` — 1,346-line persona detection file, likely O(n) over all detectors
- Generation pipeline involves multiple sequential AI provider calls with no parallelization

### React Rendering

- Client components use `"use client"` correctly — no violation of the server component paradigm
- Missing explicit `React.memo()` wrappers on table rows and list items that re-render on parent state change
- No React Compiler (automatic memoization) configured

---

## 7. PHASE 6 — FRONTEND CONSISTENCY

### Admin UI Patterns

| Aspect | Observation |
|---|---|
| Tables | Consistent `admin-table` class usage across all data tables |
| Cards | Consistent `admin-card` pattern for data display |
| Metric cards | Shared `MetricCard` + `MetricGrid` components |
| Page headers | Shared `PageHeader` component with breadcrumbs |
| Loading states | `loading.tsx` files present, but inconsistent spinner patterns |
| Empty states | `<EmptyState>` component used in some pages, missing in others |
| Error states | `error.tsx` boundary files present in most route groups |
| Forms | No shared form framework — each form is bespoke |
| Dialogs/Modals | No shared modal component detected |
| Pagination | No shared pagination component — each table implements its own |
| Search/Filter | No shared search/filter component |
| Accessibility | No `aria-*` audit performed — `alt` text usage appears inconsistent |

### Client Component Placement

7 client components sit directly in route directories instead of `_components/`:
- `admin/blueprints/blueprint-gallery-client.tsx`
- `admin/create/creation-wizard-client.tsx`
- `admin/media/media-library.tsx`
- `admin/themes/theme-marketplace-client.tsx`
- `admin/website-ready/website-ready-client.tsx`
- `admin/website/navigation/navigation-manager.tsx`
- `super-admin/websites/website-filters.tsx`

---

## 8. PHASE 7 — TESTING

| Metric | Value |
|---|---|
| Total test files | **108** |
| Unit tests (Vitest) | 62 |
| Feature tests (colocated) | 16 |
| Architecture tests | 2 |
| E2E specs (Playwright) | 28 |
| Empty E2E project dirs | **12** |
| Features without tests | 2 (`gallery`, `settings`) |
| Skip/Only abuse | None |
| CI/CD pipelines | **None** (.github/workflows/ is empty) |

### Coverage by Domain

| Domain | Tests | Coverage |
|---|---|---|
| Generation Engine | 23 | High |
| Billing | 3 | Medium |
| Auth/Identity | 3 | Medium |
| Builder | 2 | Low |
| Theme System | 3 | Medium |
| Products | 2 | Low |
| Storefront | 2 | Low |
| Payouts/Commission | 2 | Low |
| Partners | 1 | Low |
| Admin Panel (E2E) | 9 | High |

### Testing Strengths
- 108 test files across unit, architecture, E2E, admin
- Good Page Object pattern (10+ page objects)
- Shared E2E infrastructure (global setup, auth, database helpers)
- Both Vitest and Playwright configured

### Testing Gaps
- **12 empty E2E directories** (accessibility, agency, billing, builder, creator, marketplace, performance, public, publishing, regression, super-admin, workspace) — configured in Playwright projects but contain zero tests
- **2 features untested**: `gallery`, `settings`
- **No CI/CD pipelines** — `.github/workflows/` empty
- **No mock/factory library** — all mocks are inline
- **No snapshot tests**
- **No dedicated integration test suite**

---

## 9. PHASE 8 — DOCUMENTATION

| Metric | Value |
|---|---|
| Total .md files | 63+ |
| ADRs | 8 |
| Runbooks | 9 |
| Release documents | 4 |
| Validation reports | 6 |
| Deleted doc archives | 7 directories (refactor, architecture, prd, audits, alpha, rc1, builder) |

### Documentation Strengths
- Rich, well-organized documentation culture
- Comprehensive ADR coverage (8 decisions recorded)
- Detailed runbooks for operational procedures
- Validation reports for every major release
- All docs updated within last 9 days

### Documentation Issues
- **Stale `README.md`** — still contains boilerplate "Create Next App" content
- **Version inconsistency** — `package.json` says `1.0.0`, `CHANGELOG.md` references `v2.0.0`
- **No API reference documentation** — no OpenAPI/Swagger specs
- **Deleted doc archives** may contain useful historical context
- **No CI/CD documentation** — empty workflows directory

---

## 10. PHASE 9 — DEAD CODE

### Unused File Candidates (~30 files)

| Group | Files | Evidence |
|---|---|---|
| `lib/content/entities/` | 10 files (gallery + product entity framework) | Only 2 type imports from outside module |
| `lib/ai/providers/` | 4 files (interface.ts, openai.ts, registry.ts, engine.ts) | Only 3 consumers, superseded by generation module |
| `lib/theme/presets.ts` | 1 file | JSDoc says `@deprecated` |
| `lib/theme/validation-new.ts` | 1 file | Zero external imports |
| `lib/theme/service.ts` | 1 file | Zero external consumers (exported but unused) |
| `lib/testing/creator-dataset-v1.ts` | 1 file | Only consumed by `seed.ts` |

### Deprecated / Legacy Files

| File | Status |
|---|---|
| `src/services/storage.service.ts` | `@deprecated` — 1 consumer |
| `src/lib/theme/types.ts` | Legacy — superseded by `types-new.ts` |
| `src/lib/theme/presets.ts` | `@deprecated` — superseded by `BuiltInThemeProvider` |
| `src/lib/theme/service.ts` | Zero external consumers |

### Duplicate Infrastructure

| Group | Active Path | Dead/Dormant Path |
|---|---|---|
| Gallery | `lib/gallery/` (12 files) | `lib/content/entities/gallery/` (5 files) |
| Products | `lib/products/`, `features/products/` | `lib/content/entities/product/` (5 files) |
| AI Providers | `lib/generation/providers/` (20 files) | `lib/ai/providers/` (4 files) |

### Safe Deletion Candidates

*Require proof before deletion — recommendation only:*
1. `lib/content/entities/product/` — all 5 files (zero external imports)
2. `lib/theme/validation-new.ts` — if superseded by main validation
3. `lib/testing/creator-dataset-v1.ts` — if test data is defined elsewhere
4. `src/utils/` directory (empty)
5. `src/app/workspace/` directory (empty)
6. `src/services/dashboard/` directory (empty)

---

## 11. PHASE 10 — REFACTORING ROADMAP

### HIGH PRIORITY — Blocking architectural debt

| # | Item | Why | Impact | Regression Risk | Effort | Phase |
|---|---|---|---|---|---|---|
| H1 | Consolidate Gallery to single implementation | 3 overlapping implementations create data inconsistency | High | Medium | 3 days | Phase A |
| H2 | Remove `lib/content/entities/` dead code | 10 files with no consumers — dead weight | Low | Low | 1 day | Phase A |
| H3 | Move 7 client components into `_components/` dirs | Structural consistency, Next.js best practice | Low | Low | 2 hours | Phase A |
| H4 | Remove direct Prisma from `ActivityFeed.tsx` | Architecture violation — UI should not query DB | Medium | Medium | 1 day | Phase A |
| H5 | Consolidate Theme system (remove `*-new.ts` dualism) | Two parallel theme systems — guaranteed drift | High | **High** | 5 days | Phase B |
| H6 | Resolve version inconsistency (`1.0.0` vs `v2.0.0`) | Confuses developers and release process | Medium | Low | 1 hour | Phase A |

### MEDIUM PRIORITY — Quality and maintainability

| # | Item | Why | Impact | Regression Risk | Effort | Phase |
|---|---|---|---|---|---|---|
| M1 | Reduce `all-detectors.ts` from 1,346 lines | Monolithic file — extract per-detector modules | Medium | **High** | 3 days | Phase B |
| M2 | Add missing feature scaffolding (`gallery`, `settings`) | 2 incomplete features | Medium | Low | 2 days | Phase A |
| M3 | Standardize hook naming convention | Mixed camelCase/kebab-case | Low | Low | 1 hour | Phase A |
| M4 | Add barrel exports to `config/`, `types/`, `services/`, `actions/` | Import consistency | Low | Low | 4 hours | Phase A |
| M5 | Remove deprecated `storage.service.ts` | Old service with 1 consumer | Low | Low | 4 hours | Phase B |
| M6 | Create shared table/pagination/search components | Eliminate bespoke table implementations | Medium | Low | 3 days | Phase B |
| M7 | Replace `provision-pipeline.ts` `any` types (27 usages) | Weak typing in critical integration code | Medium | Medium | 2 days | Phase B |

### LOW PRIORITY — Nice to have

| # | Item | Why | Impact | Regression Risk | Effort | Phase |
|---|---|---|---|---|---|---|
| L1 | Reduce per-module boilerplate (mapper/constants/queries/validation) | 40 redundant files, ~8,000 lines | Low | **High** | 5 days | Phase C |
| L2 | Add barrel exports to component dirs missing them | Import consistency | Low | Low | 1 day | Phase C |
| L3 | Rename PascalCase files in `lib/` to kebab-case | Naming convention consistency | Low | Medium | 2 hours | Phase C |
| L4 | Rewrite `README.md` — remove boilerplate | Developer experience | Low | Low | 2 hours | Phase A |
| L5 | Add Playwright tests for 12 empty E2E directories | Test coverage completeness | Medium | Low | 8 days | Phase C |
| L6 | Add CI/CD pipeline (`.github/workflows/`) | Automated testing in CI | High | Low | 2 days | Phase B |
| L7 | Add React.memo to table rows and list items | Rendering performance | Low | Low | 1 day | Phase C |
| L8 | Add API documentation (OpenAPI/Swagger) | Developer experience | Medium | Low | 3 days | Phase C |

---

## 12. SUMMARY: TOP 10 ACTIONABLE ITEMS

| Rank | Item | Priority | Effort | Phase |
|---|---|---|---|---|
| 1 | Consolidate Gallery to single implementation | High | 3 days | A |
| 2 | Remove `lib/content/entities/` dead code | High | 1 day | A |
| 3 | Move 7 client components into `_components/` | High | 2 hours | A |
| 4 | Remove direct Prisma from `ActivityFeed.tsx` | High | 1 day | A |
| 5 | Add missing feature scaffolding (gallery, settings) | Medium | 2 days | A |
| 6 | Add barrel exports to config/types/services/actions | Medium | 4 hours | A |
| 7 | Rewrite stale README.md | Low | 2 hours | A |
| 8 | Resolve version number inconsistency | High | 1 hour | A |
| 9 | Consolidate Theme system (remove *-new.ts) | High | 5 days | B |
| 10 | Add CI/CD pipeline | Medium | 2 days | B |

**Phase A** (1-2 weeks): Structural cleanup, dead code removal, architectural compliance fixes
**Phase B** (2-4 weeks): Quality improvements, theme consolidation, CI/CD
**Phase C** (4-8 weeks): Boilerplate consolidation, test coverage, API docs

---

*Audit completed 2026-07-30. No code was modified during this audit.*
