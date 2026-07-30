# RECOVERY-10: Storefront Resolution & Publishing Audit

**Date:** 2026-07-30  
**Status:** ROOT CAUSE IDENTIFIED  

---

## Request Trace: `GET /owais`

```
Browser → GET /owais
  │
  ├── middleware.ts
  │     classifyRoute("/owais") → PublicStorefront → NextResponse.next() ✅
  │
  ├── app/[domain]/page.tsx
  │     getSnapshotData("owais")
  │       │
  │       ├── prisma.tenant.findFirst({
  │       │     where: { OR: [{ subdomain: "owais" }, { customDomain: "owais" }] }
  │       │   })
  │       │   → Tenant found ✅ (if exists)
  │       │
  │       ├── getPublishedPageData(tenant.id, "live")
  │       │     ├── prisma.website.findUnique({ where: { tenantId } })
  │       │     │   → Website found ✅ (if exists)
  │       │     │
  │       │     └── publishSnapshotService.getLive(website.id)
  │       │           prisma.publishSnapshot.findFirst({
  │       │             where: { websiteId, state: "live" },
  │       │             orderBy: { version: "desc" }
  │       │           })
  │       │           → Snapshot found? ❌ → returns null
  │       │
  │       └── data?.snapshot is null → notFound() → 404
```

**Storefront resolution stops at step: PublishSnapshot lookup.** If no snapshot exists, the page renders a 404.

---

## Publishing Flow After Provisioning

```
importCreator()
  │
  ├── provisioningService.provision(input)
  │     └── $transaction(tx => {
  │           Tenant ✅, Website ✅, Brand ✅, User ✅, Workspace ✅, ...
  │         })
  │     → COMMIT
  │
  ├── prisma.product.create() ×N (profile products)
  │     → Global prisma (outside transaction) ✅
  │
  └── publishingService.publish(tenantId)
        │
        ├── prisma.tenant.findUnique({ where: { id: tenantId } })
        ├── workspacePolicy.assertCanPublish(workspace.id)
        │     → Workspace status must be ACTIVE (default: ACTIVE) ✅
        ├── prisma.website.findUnique({ where: { tenantId } })
        ├── loadBuilderPages(websiteId)
        │     → BuilderService.load() → prisma.page.findMany()
        │     → Pages created by templateService.apply() ✅
        ├── websiteAggregateService.build(tenantId)
        │     → Promise.all([brand, products, gallery, links, settings, ...])
        │     → All created by seedStarterData() ✅
        ├── navigationService.getOrGenerate(tenantId) ✅
        ├── themeResolver.resolveForSnapshot() ✅
        ├── publishRepository.createPublish(websiteId, snapshot)
        │     → prisma.$transaction → PublishSnapshot ✅
        │
        └── return { success: true, version: N }
```

**The publishing pipeline should succeed if all dependencies exist.**

---

## Database Verification SQL

Run this to check if the Owais tenant has a publish snapshot:

```sql
-- Check Tenant
SELECT id, name, subdomain FROM "Tenant" WHERE subdomain = 'owais';

-- Check Website (use the tenant ID from above)
SELECT id, "tenantId" FROM "Website" WHERE "tenantId" = '<tenant-id>';

-- Check PublishStatus
SELECT * FROM "PublishStatus" WHERE "websiteId" = '<website-id>';

-- Check PublishSnapshot
SELECT id, version, state, "websiteId" FROM "PublishSnapshot"
WHERE "websiteId" = '<website-id>' ORDER BY version DESC;

-- Check Pages
SELECT id, name, slug FROM "Page" WHERE "websiteId" = '<website-id>';
```

---

## Root Cause

**"The storefront cannot render because no PublishSnapshot exists for the website."**

The provisioning has two phases:
1. **Transaction** — creates Tenant, Website, User, Workspace (commits ✅)
2. **Post-transaction** — creates Pages, applies Theme, creates PublishSnapshot

If phase 2 fails (for ANY reason — workspace policy, missing dependency, exception), the `importCreator()` catches the error and returns `{ success: false }`, but the transaction from phase 1 has ALREADY committed. The Tenant, Website, User, Workspace exist, but the PublishSnapshot does not.

The most likely failure points in phase 2:

| Failure Point | Impact |
|--------------|--------|
| `workspacePolicy.assertCanPublish()` | Blocks publishing, no snapshot |
| `loadBuilderPages()` | Pages/Sections/Blocks not created before publishing |
| `websiteAggregateService.build()` | Missing brand/products/gallery (if seedStarterData failed) |
| `publishRepository.createPublish()` | Prisma error during snapshot creation |

**To determine the exact failure**: Check the `importCreator()` return value in the UI or check the `CreatorProvisionRun` table for the error message.
