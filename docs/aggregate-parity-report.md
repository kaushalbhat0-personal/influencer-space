# Aggregate Parity Report

**IMPLEMENTATION-17 · Phase A/E · 2026-08-01**

## Verdict

For every module (Hero, About, Products, Gallery, Services, Courses,
Testimonials, FAQ, Timeline, Games, Links, Footer) the aggregate contains
exactly what the database holds, and every content module is wired into a
layout section that renders. **`scripts/runtime-parity-audit.ts` → OVERALL
RUNTIME PARITY: PASS.**

## Per-module parity

```
— Aggregate Parity (DB | Aggregate = items, Layout | Rendered = sections) —
module       db    agg   lay   ren   status
hero            1     1     1     1  OK
about           1     1     1     1  OK
products        2     2     1     1  OK
gallery         3     3     1     1  OK
services        2     2     1     1  OK
courses         2     2     1     1  OK
testimonials    2     2     1     1  OK
faq             2     2     1     1  OK
timeline        3     3     1     1  OK
games           2     2     1     1  OK
links           3     3     1     1  OK
footer          1     1     1     1  OK

Aggregate parity: PASS
```

Status semantics:
- `OK` — DB item count == aggregate item count **and** content is present in the
  layout and rendered.
- `DB-AGG-MISMATCH` — content is dropped between the database and the aggregate.
- `CONTENT-NOT-IN-LAYOUT` — the CMS has content but the layout has no section of
  that type (invisible content).
- `HIDDEN-ONLY` — the section exists but is hidden.

Note: item counts (db/aggregate) and section counts (layout/rendered) are
different granularities — a single `products.grid` section renders N products.

## Why this parity holds

- One aggregate builder (`websiteAggregateService.build`) is the only content
  source for every runtime.
- Per-module isolation (`buildWithDiagnostics`) means a broken module degrades
  and is recorded instead of failing the whole aggregate.
- The aggregate is content-faithful: no truncation, no fallbacks, no
  hardcoded empty modules.

## Tooling

- `src/lib/observability/runtime-parity.ts` → `aggregateParityReport(tenantId)`
  and `runtimeDataAudit(tenantId)`.
- `scripts/runtime-parity-audit.ts`, `scripts/runtime-data-audit.ts`.

## Evidence

- Aggregate parity: **PASS** (12/12 modules OK).
- Runtime Data Audit: **PASS** (DB == Aggregate == Runtime, Builder == Storefront).
- E2E `04b` runtime-parity test: **PASS**.
