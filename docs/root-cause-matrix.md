# Root Cause Matrix

**IMPLEMENTATION-18 · Phase 10 · 2026-08-01**

Every production issue, with evidence, the broken layer, root cause, minimal
fix, and verification.

---

## Issue 1 — Storefront renders layout but placeholder content

```
Evidence
  Browser: production /test-creator-1 shows "Add products in Dashboard",
    "Add your services", "© — CreatorStore" (empty name).
  Network: GET /test-creator-1 RSC payload → every section resolvedData: [].
  Database: products 2, gallery 3, offerings 4, timeline 3, games 2, links 3 all present.
  Server action: Invalid `prisma.asset.findUnique()` … uuid: "".
Root cause
  Deployed (committed impl-12) aggregate throws Invalid UUID ""; mergeLiveContent
  falls back to the snapshot whose content is EMPTY_AGGREGATE (v6, written by the
  newer publish pipeline).
Minimal fix
  Normalize/reject empty asset ids before Prisma (working tree already does).
Verification
  Local renders the same DB content; runtime-data-audit PASS.
```

## Issue 2 — Builder canvas empty while sidebar shows sections

```
Evidence
  Browser: production /builder → [data-testid="builder-canvas"] count 0;
    sidebar lists 12 sections.
  Network: POST /builder → loadBuilderPages OK; getLivePreviewData → Invalid … uuid: "".
Root cause
  Canvas needs the aggregate (live content); aggregate throws → canvas never mounts.
  Sidebar needs only the layout (loads fine).
Minimal fix
  Same asset-id normalization; aggregate resilience (buildWithDiagnostics).
Verification
  Local builder canvas renders live content.
```

## Issue 3 — Publish intermittently fails

```
Evidence
  Production aggregate (used by publish) throws Invalid UUID "".
  Local publish succeeds (aggregate fixed).
Root cause
  Publish builds the aggregate; the committed aggregate throws on "".
Minimal fix
  Same asset-id normalization + per-module isolation so a single failure
  degrades a module instead of aborting publish.
Verification
  Local production E2E publish 9/9.
```

## Issue 4 — Invalid prisma.asset.findUnique() … uuid: ""

```
Evidence
  REPRODUCED 1:1 against the shared DB with committed logic:
    defaultHeroData.videoAssetId = "" → getHeroData merge → resolveUrls(["", uuid])
    → committed resolveUrls keeps "" → findById("") → Invalid UUID "".
Root cause
  Committed src/config/hero.ts defaults "" and committed src/lib/media/service.ts
  resolveUrls keeps "" (git show HEAD).
Minimal fix
  defaultHeroData asset ids → null; resolveUrls/getPublicUrl/findById reject "".
Verification
  normalizeAssetId("") → null; local storefront has no Invalid UUID.
```

## Issue 5 — getBuilderOverview "Cannot convert undefined or null to object"

```
Evidence
  POST /builder → {"error":"TypeError: Cannot convert undefined or null to object"}.
Root cause
  Committed builder-overview.actions.ts: `heroVal !== null && Object.keys(heroVal)`
  with heroVal = undefined when the "hero" setting is absent (data is under
  "hero_data"). impl-15 fixed locally with `!= null`.
Minimal fix
  Loose null guard (working tree already has it).
Verification
  Local builder overview loads; theme panel renders.
```

## Issue 6 — Production ≠ localhost (root)

```
Evidence
  Deployed page chunk page-a39ff2a98380bd96.js ≠ local page-e88659a8149c2714.js.
  Production lacks data-runtime-signature; exhibits issues 1-5.
Root cause
  Vercel builds from git HEAD (impl-12, commit 0fbe8cf). IMPLEMENTATION-13–17
  fixes are uncommitted working-tree changes and were never deployed.
Minimal fix
  Commit the working tree (or the asset-resolution + overview fixes) and redeploy.
Verification
  After deploy, production storefront should render the same DOM as local.
```

---

## Layer verdict

| Layer | Healthy? |
|---|---|
| Database | ✅ content intact |
| Aggregate | ❌ broken in the deployed build (`""` → Prisma) |
| LayoutEngine / ComponentRenderer | ✅ faithful |
| Builder / Storefront / Publish | ✅ once the aggregate works |
| Browser | ✅ renders what it is given |
| Caching / Middleware / Env | ✅ not the cause |
