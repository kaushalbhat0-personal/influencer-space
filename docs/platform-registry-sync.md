# Platform Registry Sync

Synchronises **runtime configuration tables** with canonical plan definitions from the capabilities layer.

## Architecture

```
plans.ts (canonical plan definitions)
       │
       ▼
PlatformRegistrySyncService
       │
       ├── checkSchema()        → runtime guard (table existence + version)
       ├── getSchemaVersion()   → SchemaVersionInfo
       │
       ├── PlatformSyncRepository (Prisma)
       │       ├── _PlatformRuntimeSchema  ✅ metadata (version tracking)
       │       ├── BillingPlan             ✅ runtime (FK target for subscriptions)
       │       ├── CommercialPricing       ✅ runtime
       │       ├── RevenueConfiguration    ✅ runtime
       │       ├── BillingConfiguration    ✅ runtime
       │       └── CommissionPolicy        ✅ runtime
       │
       ├── API Route    → GET|POST /api/platform/sync
       ├── Super Admin  → /super-admin/platform/sync
       └── CLI Script   → npx tsx scripts/platform-sync.ts
```

## Schema Versioning

Registry Sync verifies both **table existence** and **schema version** before synchronizing.

A `_PlatformRuntimeSchema` table tracks the installed schema version. The `REQUIRED_SCHEMA_VERSION` constant in code defines the expected version.

| Concept | Example |
|---|---|
| `REQUIRED_SCHEMA_VERSION` (code) | `1.0.0` |
| `_PlatformRuntimeSchema.version` (DB) | `1.0.0` |
| Status | Compatible |

If the versions diverge (e.g. DB is `1.0.0` but code requires `1.3.0`), Registry Sync blocks with:

```
Registry Sync blocked.

Runtime schema is v1.0.0
Platform requires v1.3.0

Run:
scripts/sql/platform-registry-runtime-v1.3.sql
```

This prevents subtle runtime issues caused by partially migrated schemas.

## Ownership Matrix

| Table | Owner | Synced by Registry Sync? |
|---|---|---|
| `_PlatformRuntimeSchema` | **Metadata** (version tracking) | ❌ Read-only check |
| `BillingPlan` | **Runtime** (FK target for BillingSubscription) | ✅ Yes |
| `CommercialPricing` | **Runtime** (prices only — not entitlements) | ✅ Yes |
| `RevenueConfiguration` | **Runtime** (platform defaults) | ✅ Yes |
| `BillingConfiguration` | **Runtime** (billing settings) | ✅ Yes |
| `CommissionPolicy` | **Runtime** (revenue sharing) | ✅ Yes |
| `BillingFeature` | **Code-owned** (CapabilityService / catalog-seed) | ❌ No |
| `BillingPlanFeature` | **Code-owned** (CapabilityService / catalog-seed) | ❌ No |

### Why BillingFeature is NOT synchronized

`BillingFeature` is a code-owned registry seeded by `catalog-seed.ts` from `FEATURE_CATALOG` in the capabilities layer. Registry Sync must never duplicate the capability service. Feature definitions, limits, and value types are the sole responsibility of `CapabilityService`.

### Why BillingPlanFeature is NOT synchronized

`BillingPlanFeature` is a join table derived from plan definitions in `plans.ts`. It is managed by `catalog-seed.ts` alongside the capabilities layer. Registry Sync must not duplicate this — doing so creates a second source of truth for entitlements.

## Platform Bootstrap

The **recommended way** to set up a new environment:

```bash
npm run platform:bootstrap
```

This single command orchestrates the full setup:

```
Platform Bootstrap
│
├── Step 1/4 — Check Runtime Schema
│     Verifies all required tables exist
│     If missing → shows SQL instructions → exits
│
├── Step 2/4 — Verify Schema Version
│     Checks _PlatformRuntimeSchema.version
│     If mismatch → shows upgrade instructions → exits
│
├── Step 3/4 — Run Registry Sync
│     Applies all pending changes (--apply)
│
└── Step 4/4 — Verify Runtime
      Confirms tables and version post-sync
      → Platform Ready
```

Use for:
- Local development setup
- Staging / production provisioning
- Disaster recovery

## Runtime Guard

Before synchronizing, the engine verifies:

1. **Table existence** — `CommercialPricing`, `RevenueConfiguration`, `BillingConfiguration`, `CommissionPolicy`
2. **Schema version** — `_PlatformRuntimeSchema.version` matches `REQUIRED_SCHEMA_VERSION`

If either check fails, the sync returns early with `schemaMissing[]` and `schemaVersion` info. No Prisma queries are executed against missing tables — no crashes, no raw exceptions.

### Recovery

```bash
# 1. Run the SQL migration in Supabase SQL Editor
#    Open scripts/sql/platform-registry-runtime.sql
#    Copy-paste into Supabase SQL Editor → Run

# 2. Run bootstrap (recommended)
npm run platform:bootstrap

# 3. Or run steps individually
npx tsx scripts/platform-sync.ts --apply
```

## SQL Installation

The migration file is at:

```
scripts/sql/platform-registry-runtime.sql
```

It is **idempotent** — safe to run multiple times. It creates:

- `_PlatformRuntimeSchema` with initial `1.0.0` version
- `CommercialPricing` with indexes and unique constraint
- `RevenueConfiguration` with index
- `CommissionPolicy` with index
- `BillingConfiguration` with index
- `BillingPlan` (if missing, for environments without Prisma migrations)
- `updated_at` triggers for all tables
- Verification queries (commented out)

### What the SQL does NOT do

- ❌ Does NOT drop existing tables
- ❌ Does NOT delete data
- ❌ Does NOT modify Prisma-managed tables
- ❌ Does NOT seed data

## Usage

### CLI — Bootstrap (recommended)

```bash
npm run platform:bootstrap
```

### CLI — Sync only

```bash
# Validate only (dry run)
npm run platform:sync

# Apply changes to database
npm run platform:sync -- --apply

# Filter specific plans
npx tsx scripts/platform-sync.ts --plans=creator_free,creator_pro --apply
```

### API

```bash
# GET - dry-run diff report
curl -X GET "http://localhost:3000/api/platform/sync" \
  -H "Cookie: next-auth.session-token=..."

# POST - execute sync
curl -X POST "http://localhost:3000/api/platform/sync?dryRun=false" \
  -H "Cookie: next-auth.session-token=..."
```

### Super Admin UI

Navigate to **System → Registry Sync** or `/super-admin/platform/sync`.

Shows:
- Schema version card (required / installed / compatibility)
- Blocked state with missing table list or version mismatch
- Diff report when schema is valid
- Sync execution controls

## What It Syncs

| Entity | Source | Strategy |
|---|---|---|
| `BillingPlan` | `PlanDefinition.code/family/name/price/currency/cycle` | Upsert by `code` |
| `CommercialPricing` | `monthlyPrice` / `yearlyPrice` derived from plan price + cycle | Find active version → update or create |
| `RevenueConfiguration` | Default constants (currency, trial days, grace period, etc.) | Singleton upsert |
| `BillingConfiguration` | Default constants (tax mode, cancellation policy, region) | Singleton upsert |
| `CommissionPolicy` | Default constants (agency, platform, referral percentages) | Singleton upsert |

## Drift Detection

Running with `dryRun: true` (default) produces a diff report showing:

- **Created** — records in source but not in DB
- **Updated** — records whose values differ
- **Deleted** — records in DB but not in source (orphans)

Apply changes by setting `dryRun: false`.

## Error Handling

- Schema guard prevents queries against missing tables
- Version guard prevents sync against incompatible schemas
- Errors per entity are collected in the report rather than aborting
- Report includes `errors[]`, `created/updated/deleted` lists, `durationMs`, `isClean`

## BillingPlan Audit

**Result: Still Required**

`BillingPlan` is referenced by `BillingSubscription.planId` as a foreign key. It is queried at:

- Registration (`src/app/api/auth/register/route.ts`)
- Subscription lookup (`src/modules/billing/infrastructure/repository.ts`)
- Test seeding (`src/lib/testing/seed.ts`)
- Catalog seeding (`src/modules/billing/infrastructure/catalog-seed.ts`)

`BillingPlan` cannot be removed until `BillingSubscription.planId` is replaced with a `planCode` string field (planned for v1.3 schema migration).
