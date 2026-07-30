-- =============================================================================
-- Platform Registry Runtime Schema
-- =============================================================================
-- Run this in Supabase SQL Editor to create missing runtime tables.
-- Idempotent: uses IF NOT EXISTS throughout.
-- Does NOT modify existing runtime tables.
-- Does NOT drop data.
-- Does NOT modify Prisma-managed tables.
-- =============================================================================

-- ── 0. Schema Version Tracking ──────────────────────────────────────────────
-- Used by Registry Sync to verify schema compatibility before syncing.

CREATE TABLE IF NOT EXISTS "_PlatformRuntimeSchema" (
    "id"         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    "version"    TEXT        NOT NULL,
    "upgradedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed the initial version (idempotent)
INSERT INTO "_PlatformRuntimeSchema" ("version")
SELECT '1.0.0'
WHERE NOT EXISTS (SELECT 1 FROM "_PlatformRuntimeSchema" WHERE "version" = '1.0.0');

COMMENT ON TABLE "_PlatformRuntimeSchema" IS 'Runtime schema version tracker. Checked by Registry Sync before synchronization.';

-- ── 1. CommercialPricing ────────────────────────────────────────────────────
-- Commercial pricing for capability plans. Prices only — NOT entitlements.

CREATE TABLE IF NOT EXISTS "CommercialPricing" (
    "id"            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    "planCode"      TEXT        NOT NULL,
    "workspaceType" TEXT        NOT NULL,
    "monthlyPrice"  DOUBLE PRECISION NOT NULL DEFAULT 0,
    "yearlyPrice"   DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency"      TEXT        NOT NULL DEFAULT 'INR',
    "status"        TEXT        NOT NULL DEFAULT 'ACTIVE',
    "effectiveFrom" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "effectiveTo"   TIMESTAMPTZ,
    "version"       INTEGER     NOT NULL DEFAULT 1,
    "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint: one version per planCode
CREATE UNIQUE INDEX IF NOT EXISTS "CommercialPricing_planCode_version_key"
    ON "CommercialPricing" ("planCode", "version");

-- Index for active plan lookups
CREATE INDEX IF NOT EXISTS "CommercialPricing_planCode_status_idx"
    ON "CommercialPricing" ("planCode", "status");

COMMENT ON TABLE "CommercialPricing" IS 'Commercial pricing for capability plans. Prices only — NOT entitlements.';
COMMENT ON COLUMN "CommercialPricing"."status" IS 'ACTIVE | DRAFT | ARCHIVED';

-- ── 1a. BillingPlan (if missing) ─────────────────────────────────────────────
-- NOTE: BillingPlan may already exist if Prisma migrated it.
-- This is included for environments where only runtime tables are managed manually.

CREATE TABLE IF NOT EXISTS "BillingPlan" (
    "id"        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    "code"      TEXT        NOT NULL UNIQUE,
    "family"    TEXT        NOT NULL,
    "name"      TEXT        NOT NULL,
    "price"     DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency"  TEXT        NOT NULL DEFAULT 'INR',
    "cycle"     TEXT        NOT NULL DEFAULT 'monthly',
    "status"    TEXT        NOT NULL DEFAULT 'ACTIVE',
    "version"   INTEGER     NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "BillingPlan_family_idx" ON "BillingPlan" ("family");
CREATE INDEX IF NOT EXISTS "BillingPlan_status_idx" ON "BillingPlan" ("status");

COMMENT ON TABLE "BillingPlan" IS 'Immutable plan catalog entry. Managed by Registry Sync and catalog-seed.';
COMMENT ON COLUMN "BillingPlan"."cycle" IS 'monthly | annual';
COMMENT ON COLUMN "BillingPlan"."status" IS 'ACTIVE | DEPRECATED | GRANDFATHERED';

-- ── 2. RevenueConfiguration ─────────────────────────────────────────────────
-- Platform-wide commercial defaults. Only one ACTIVE record at a time.

CREATE TABLE IF NOT EXISTS "RevenueConfiguration" (
    "id"                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    "status"            TEXT        NOT NULL DEFAULT 'ACTIVE',
    "defaultCurrency"   TEXT        NOT NULL DEFAULT 'INR',
    "defaultTrialDays"  INTEGER     NOT NULL DEFAULT 14,
    "gracePeriodDays"   INTEGER     NOT NULL DEFAULT 7,
    "invoicePrefix"     TEXT        NOT NULL DEFAULT 'INV',
    "autoRenew"         BOOLEAN     NOT NULL DEFAULT true,
    "refundWindowDays"  INTEGER     NOT NULL DEFAULT 30,
    "prorationEnabled"  BOOLEAN     NOT NULL DEFAULT true,
    "effectiveFrom"     TIMESTAMPTZ NOT NULL DEFAULT now(),
    "effectiveTo"       TIMESTAMPTZ,
    "version"           INTEGER     NOT NULL DEFAULT 1,
    "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "RevenueConfiguration_status_version_idx"
    ON "RevenueConfiguration" ("status", "version" DESC);

COMMENT ON TABLE "RevenueConfiguration" IS 'Platform-wide commercial defaults. Only one ACTIVE record at a time.';
COMMENT ON COLUMN "RevenueConfiguration"."status" IS 'ACTIVE | DRAFT | ARCHIVED';

-- ── 3. CommissionPolicy ─────────────────────────────────────────────────────
-- Commission and revenue sharing policies.

CREATE TABLE IF NOT EXISTS "CommissionPolicy" (
    "id"                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    "status"               TEXT        NOT NULL DEFAULT 'ACTIVE',
    "agencyClientPercent"  DOUBLE PRECISION NOT NULL DEFAULT 20,
    "platformPercent"      DOUBLE PRECISION NOT NULL DEFAULT 10,
    "referralPercent"      DOUBLE PRECISION NOT NULL DEFAULT 5,
    "creatorDefaultShare"  DOUBLE PRECISION NOT NULL DEFAULT 70,
    "agencyDefaultShare"   DOUBLE PRECISION NOT NULL DEFAULT 30,
    "effectiveFrom"        TIMESTAMPTZ NOT NULL DEFAULT now(),
    "effectiveTo"          TIMESTAMPTZ,
    "version"              INTEGER     NOT NULL DEFAULT 1,
    "createdAt"            TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "CommissionPolicy_status_version_idx"
    ON "CommissionPolicy" ("status", "version" DESC);

COMMENT ON TABLE "CommissionPolicy" IS 'Commission and revenue sharing policies.';
COMMENT ON COLUMN "CommissionPolicy"."status" IS 'ACTIVE | DRAFT | ARCHIVED';

-- ── 4. BillingConfiguration ─────────────────────────────────────────────────
-- Global billing defaults and operational settings.

CREATE TABLE IF NOT EXISTS "BillingConfiguration" (
    "id"                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    "status"            TEXT        NOT NULL DEFAULT 'ACTIVE',
    "taxMode"           TEXT        NOT NULL DEFAULT 'exclusive',
    "cancellationPolicy" TEXT       NOT NULL DEFAULT 'immediate',
    "defaultRegion"     TEXT        NOT NULL DEFAULT 'IN',
    "effectiveFrom"     TIMESTAMPTZ NOT NULL DEFAULT now(),
    "effectiveTo"       TIMESTAMPTZ,
    "version"           INTEGER     NOT NULL DEFAULT 1,
    "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "BillingConfiguration_status_version_idx"
    ON "BillingConfiguration" ("status", "version" DESC);

COMMENT ON TABLE "BillingConfiguration" IS 'Global billing defaults and operational settings.';
COMMENT ON COLUMN "BillingConfiguration"."status" IS 'ACTIVE | DRAFT | ARCHIVED';

-- =============================================================================
-- Updated-at trigger (applies to all tables with updatedAt)
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_CommercialPricing_updatedAt') THEN
        CREATE TRIGGER set_CommercialPricing_updatedAt
            BEFORE UPDATE ON "CommercialPricing"
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_RevenueConfiguration_updatedAt') THEN
        CREATE TRIGGER set_RevenueConfiguration_updatedAt
            BEFORE UPDATE ON "RevenueConfiguration"
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_CommissionPolicy_updatedAt') THEN
        CREATE TRIGGER set_CommissionPolicy_updatedAt
            BEFORE UPDATE ON "CommissionPolicy"
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_BillingConfiguration_updatedAt') THEN
        CREATE TRIGGER set_BillingConfiguration_updatedAt
            BEFORE UPDATE ON "BillingConfiguration"
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END;
$$;

-- =============================================================================
-- Verification Queries
-- =============================================================================

-- Table existence and row count:
-- SELECT 'CommercialPricing' AS table_name, COUNT(*) AS row_count FROM "CommercialPricing"
-- UNION ALL
-- SELECT 'RevenueConfiguration', COUNT(*) FROM "RevenueConfiguration"
-- UNION ALL
-- SELECT 'CommissionPolicy', COUNT(*) FROM "CommissionPolicy"
-- UNION ALL
-- SELECT 'BillingConfiguration', COUNT(*) FROM "BillingConfiguration"
-- UNION ALL
-- SELECT '_PlatformRuntimeSchema', COUNT(*) FROM "_PlatformRuntimeSchema";

-- Schema version:
-- SELECT "version", "upgradedAt" FROM "_PlatformRuntimeSchema" ORDER BY "createdAt" DESC LIMIT 1;

-- Index verification:
-- SELECT schemaname, tablename, indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename IN ('CommercialPricing', 'RevenueConfiguration', 'CommissionPolicy', 'BillingConfiguration', '_PlatformRuntimeSchema')
-- ORDER BY tablename, indexname;
