-- ============================================================================
-- RCCF-70.4 — Remaining Prisma migrations as idempotent SQL for Supabase
-- ============================================================================
-- The production DB has NO `_prisma_migrations` table, so `prisma migrate`
-- cannot run against it (P1001: DIRECT_URL:5432 unreachable from dev network;
-- pooled :6543 works). The following 10 migrations are NOT yet applied to the
-- database (verified by inspecting information_schema + pg_indexes/pg_constraint
-- through the pooled endpoint on 2026-08-15).
--
-- Verified missing objects:
--   tables      : LoyaltyTier, PlanUsage, AgencyTeamInvitation,
--                 AgencyCapacityAddon
--   columns     : AgencyTenant.offboardedAt, AuditLog.agencyId,
--                 Product.commerceMode, Offering.bookable, Booking.offeringId
--   constraints : SettlementItem_commissionEntryId_key (unique),
--                 AuditLog_agencyId_fkey, AuditLog_one_scope_check,
--                 Booking_offeringId_fkey
--   indexes     : PlanUsage_tenantId_featureKey_periodStart_key,
--                 PlanUsage_tenantId_featureKey_idx,
--                 LoyaltyTier_status_effectiveFrom_effectiveTo_idx,
--                 AgencyTeamInvitation_token_key/workspaceId_idx/email_idx,
--                 AuditLog_agencyId_createdAt_idx,
--                 AgencyCapacityAddon_agencyId_idempotencyKey_key,
--                 AgencyCapacityAddon_agencyId_status_idx,
--                 Booking_offeringId_idx
--
-- This file is IDEMPOTENT (safe to paste into the Supabase SQL Editor and run
-- again). It faithfully reproduces the migration bodies in order.
-- ============================================================================

BEGIN;

-- ── 1. 20260811000001_loyalty_tier ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "LoyaltyTier" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "name" TEXT NOT NULL,
    "minActiveClients" INTEGER NOT NULL,
    "maxActiveClients" INTEGER,
    "commissionPercent" INTEGER NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyTier_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "LoyaltyTier_status_effectiveFrom_effectiveTo_idx"
  ON "LoyaltyTier"("status", "effectiveFrom", "effectiveTo");

-- ── 2. 20260815000000_plan_usage ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "PlanUsage" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "featureKey" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3),
    "used" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlanUsage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PlanUsage_tenantId_featureKey_periodStart_key"
  ON "PlanUsage"("tenantId", "featureKey", "periodStart");
CREATE INDEX IF NOT EXISTS "PlanUsage_tenantId_featureKey_idx"
  ON "PlanUsage"("tenantId", "featureKey");

-- ── 3. 20260815000001_settlement_item_unique ───────────────────────────────
-- Verified: no duplicate "SettlementItem"."commissionEntryId" rows exist.
CREATE UNIQUE INDEX IF NOT EXISTS "SettlementItem_commissionEntryId_key"
  ON "SettlementItem"("commissionEntryId");

-- ── 4. 20260815000002_agency_tenant_offboarded_at ──────────────────────────
ALTER TABLE "AgencyTenant" ADD COLUMN IF NOT EXISTS "offboardedAt" TIMESTAMP(3);

-- ── 5. 20260815000003_rccf53_agency_team_invitation ────────────────────────
CREATE TABLE IF NOT EXISTS "AgencyTeamInvitation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "invitedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgencyTeamInvitation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AgencyTeamInvitation_token_key"
  ON "AgencyTeamInvitation"("token");
CREATE INDEX IF NOT EXISTS "AgencyTeamInvitation_workspaceId_idx"
  ON "AgencyTeamInvitation"("workspaceId");
CREATE INDEX IF NOT EXISTS "AgencyTeamInvitation_email_idx"
  ON "AgencyTeamInvitation"("email");

-- ── 6. 20260815000004_rccf55_agency_audit_scope ────────────────────────────
ALTER TABLE "AuditLog" ALTER COLUMN "tenantId" DROP NOT NULL;

ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "agencyId" UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AuditLog_agencyId_fkey'
  ) THEN
    ALTER TABLE "AuditLog"
      ADD CONSTRAINT "AuditLog_agencyId_fkey"
      FOREIGN KEY ("agencyId") REFERENCES "WebsiteAgency"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "AuditLog_agencyId_createdAt_idx"
  ON "AuditLog"("agencyId", "createdAt");

-- ── 7. 20260815000005_auditlog_one_scope ───────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AuditLog_one_scope_check'
  ) THEN
    ALTER TABLE "AuditLog"
      ADD CONSTRAINT "AuditLog_one_scope_check"
      CHECK (("tenantId" IS NOT NULL AND "agencyId" IS NULL) OR ("tenantId" IS NULL AND "agencyId" IS NOT NULL));
  END IF;
END $$;

-- ── 8. 20260815000006_rccf61_agency_capacity_addon ─────────────────────────
CREATE TABLE IF NOT EXISTS "AgencyCapacityAddon" (
    "id" TEXT NOT NULL,
    "agencyId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceInr" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "AgencyCapacityAddon_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AgencyCapacityAddon_agencyId_idempotencyKey_key"
  ON "AgencyCapacityAddon"("agencyId", "idempotencyKey");
CREATE INDEX IF NOT EXISTS "AgencyCapacityAddon_agencyId_status_idx"
  ON "AgencyCapacityAddon"("agencyId", "status");

-- ── 9. 20260815000007_rccf66_product_commerce_mode ─────────────────────────
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "commerceMode" TEXT NOT NULL DEFAULT 'ONLINE';

-- ── 10. 20260816000001_rccf675_service_booking ─────────────────────────────
ALTER TABLE "Offering" ADD COLUMN IF NOT EXISTS "bookable" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "offeringId" UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Booking_offeringId_fkey'
  ) THEN
    ALTER TABLE "Booking" ADD CONSTRAINT "Booking_offeringId_fkey"
      FOREIGN KEY ("offeringId") REFERENCES "Offering"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Booking_offeringId_idx" ON "Booking"("offeringId");

COMMIT;

-- ============================================================================
-- Verification queries (run after the block above):
--
--   SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN
--     ('LoyaltyTier','PlanUsage','AgencyTeamInvitation','AgencyCapacityAddon');
--
--   SELECT column_name FROM information_schema.columns WHERE table_schema='public'
--     AND (table_name, column_name) IN (('AgencyTenant','offboardedAt'),
--     ('AuditLog','agencyId'),('Product','commerceMode'),('Offering','bookable'),
--     ('Booking','offeringId'));
--
--   SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname IN
--     ('PlanUsage_tenantId_featureKey_periodStart_key',
--      'SettlementItem_commissionEntryId_key',
--      'AuditLog_agencyId_createdAt_idx',
--      'Booking_offeringId_idx');
-- ============================================================================