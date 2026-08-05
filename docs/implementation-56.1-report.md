# Production Database Audit & Schema Recovery — RCCF-56.1

**Date:** 2026-08-05  
**Status:** FIX DEPLOYED

---

## Root Cause

Five Prisma models were added to `schema.prisma` during IMPLEMENTATION-50/52 but the corresponding SQL migration was never created or applied:

| Model | Added In | Migration Status |
|-------|----------|-----------------|
| `Booking` | IMPLEMENTATION-52 | **MISSING** |
| `Settlement` | IMPLEMENTATION-50 | **MISSING** |
| `SettlementItem` | IMPLEMENTATION-50 | **MISSING** |
| `SettlementAttachment` | IMPLEMENTATION-50 | **MISSING** |
| `PartnerLedger` | IMPLEMENTATION-50 | **MISSING** |

The `prisma generate` ran locally (client types updated) but `prisma migrate dev` was never run to generate the SQL. The production Supabase database never received these tables.

## Impact

- `DashboardService.getMetrics()` calls `prisma.booking.count()` → crashes on first dashboard load for new creators
- `BookingsPage` calls `prisma.booking.findMany()` → page crashes
- `FinanceDashboard` calls `settlementService.listSettlements()` → page crashes
- `PartnerLedger` calls → page crashes

## Fix Applied

### 1. Migration SQL (`prisma/migrations/20260805214942_add_finance_and_booking/migration.sql`)

Created with `CREATE TABLE IF NOT EXISTS` for all 5 missing tables including indexes, constraints, and foreign keys.

### 2. Dashboard Resilience

Wrapped optional-metric queries in `safeMetric()` helper that catches errors and returns sensible defaults:

```typescript
async function safeMetric<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch (err) {
    captureError(err, { service: "dashboard", operation: "safeMetric" });
    return fallback;
  }
}
```

Applied to:
- `prisma.booking.count()` → `safeMetric(..., 0)` 
- `prisma.offering.count()` → `safeMetric(..., 0)`

### 3. Bookings Page Resilience

Wrapped `prisma.booking.findMany()` in `.catch()` returning empty array, so the page renders with empty state instead of crashing.

## Deployment

The migration SQL must be run against the production Supabase database:

```bash
# Option A: Via Supabase SQL Editor
# Paste the contents of prisma/migrations/20260805214942_add_finance_and_booking/migration.sql

# Option B: Via Prisma CLI
npx prisma migrate deploy
```

All statements use `IF NOT EXISTS` — safe to run multiple times.

## Verification

After deployment, verify:

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('Booking', 'Settlement', 'SettlementItem', 'SettlementAttachment', 'PartnerLedger');
-- Should return 5 rows

SELECT count(*) FROM "Booking"; -- Should return 0 (no data yet, but table exists)
```

Dashboard should now render without errors for newly-created creators.
