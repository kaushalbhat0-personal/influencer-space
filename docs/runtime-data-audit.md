# Runtime Data Audit

**IMPLEMENTATION-17 · Phase A · 2026-08-01**

## Verdict

Every module's content flows intact from the database through the aggregate to
the renderer, and the Builder and Storefront render identical section counts.
`npx tsx scripts/runtime-data-audit.ts` reports **PASS** for
`testcreator1@gmail.com`.

## The audited path

```
Database → Aggregate → Runtime (resolvedData) → Builder → Storefront
```

## Evidence — per-module five-way counts

```
— Per-module counts (DB | Aggregate | Runtime | Builder | Storefront) —
module       db    agg   run   bld   str   match
hero            1     1     1     1     1  ✓
about           1     1     1     1     1  ✓
products        2     2     2     1     1  ✓
gallery         3     3     3     1     1  ✓
services        2     2     2     1     1  ✓
courses         2     2     2     1     1  ✓
testimonials    2     2     2     1     1  ✓
faq             2     2     2     1     1  ✓
timeline        3     3     3     1     1  ✓
games           2     2     2     1     1  ✓
links           3     3     3     1     1  ✓
footer          1     1     1     1     1  ✓

— Asset integrity diagnostics —
invalid asset ids: 0
skipped assets:    0
module failures:   0

— Builder vs Storefront parity —
Draft signature:      75e22f9c…
Published signature:  75e22f9c…
Signatures match:      PASS

RUNTIME DATA AUDIT: PASS
```

Semantics:
- **db** = rows in the CMS table / settings.
- **aggregate** = items in `websiteAggregate.build()`.
- **runtime** = items the renderer actually receives (`resolvedData`, injected by
  `LayoutEngine.composeSectionConfig`) — always equals the aggregate.
- **builder** = visible sections of that type in the **draft** layout.
- **storefront** = visible sections of that type in the **published** layout.

The audit fails immediately on any of: `db != aggregate`, `runtime !=
aggregate`, `builder != storefront`, content present but no section, or any
invalid asset id.

## Tooling

- `src/lib/observability/runtime-parity.ts` → `runtimeDataAudit(tenantId)`.
- `scripts/runtime-data-audit.ts` — runnable report; exits non-zero on mismatch.

## Root causes found & fixed (see `asset-integrity-report.md` for detail)

1. **Aggregate hard-failed on a single module error** — one failing query (e.g. an
   asset lookup) made the entire `build()` throw, so the Builder showed an empty
   canvas, the Storefront rendered placeholder content (the published snapshot's
   content is empty by design), and Publish intermittently failed. Fixed with
   per-module isolation in `buildWithDiagnostics()`: a broken module degrades to
   empty and is recorded in `moduleFailures`; the aggregate never hard-fails.
2. **Stale storage URLs in content rows** (gallery/product images pointing at
   replaced/deleted Supabase objects) returned HTTP 400 on the storefront —
   broken/placeholder images. Fixed in the seed by using the tenant's real
   `ACTIVE` asset URLs and repointing product images (data integrity).
