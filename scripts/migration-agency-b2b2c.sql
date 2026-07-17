-- ============================================================================
-- Migration: 3-Tier B2B2C Agency Model
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================================

BEGIN;

-- 1. Add new values to existing Role enum
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'AGENCY_ADMIN';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'AGENCY_STAFF';

-- 2. Create AgencyStatus enum
DO $$ BEGIN
  CREATE TYPE "AgencyStatus" AS ENUM ('ACTIVE', 'TRIAL', 'SUSPENDED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Create WebsiteAgency table
CREATE TABLE IF NOT EXISTS "WebsiteAgency" (
  "id"                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"                   TEXT NOT NULL,
  "subdomain"              TEXT NOT NULL UNIQUE,
  "customDomain"           TEXT,
  "razorpayAccountId"      TEXT UNIQUE,
  "razorpaySetupComplete"  BOOLEAN NOT NULL DEFAULT false,
  "defaultThemeId"         UUID REFERENCES "Theme"("id") ON DELETE SET NULL,
  "platformFeePercent"     DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status"                 "AgencyStatus" NOT NULL DEFAULT 'TRIAL',
  "createdAt"              TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create AgencySubscription table
CREATE TABLE IF NOT EXISTS "AgencySubscription" (
  "id"                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "agencyId"               UUID NOT NULL UNIQUE REFERENCES "WebsiteAgency"("id") ON DELETE CASCADE,
  "razorpaySubscriptionId" TEXT,
  "status"                 TEXT NOT NULL DEFAULT 'FREE',
  "plan"                   TEXT NOT NULL DEFAULT 'STARTER',
  "maxManagedTenants"      INTEGER NOT NULL DEFAULT 3,
  "currentPeriodEnd"       TIMESTAMPTZ,
  "createdAt"              TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "AgencySubscription_agencyId_idx" ON "AgencySubscription"("agencyId");

-- 5. Create AgencyTenant junction table
CREATE TABLE IF NOT EXISTS "AgencyTenant" (
  "id"                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "agencyId"               UUID NOT NULL REFERENCES "WebsiteAgency"("id") ON DELETE CASCADE,
  "tenantId"               UUID NOT NULL UNIQUE REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "revSharePercent"        DOUBLE PRECISION NOT NULL DEFAULT 20,
  "productRevSharePercent" DOUBLE PRECISION NOT NULL DEFAULT 10,
  "canEditTheme"           BOOLEAN NOT NULL DEFAULT true,
  "canEditProducts"        BOOLEAN NOT NULL DEFAULT true,
  "canEditGallery"         BOOLEAN NOT NULL DEFAULT true,
  "canEditLinks"           BOOLEAN NOT NULL DEFAULT true,
  "canEditMilestones"      BOOLEAN NOT NULL DEFAULT true,
  "canEditSettings"        BOOLEAN NOT NULL DEFAULT false,
  "status"                 TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt"              TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "AgencyTenant_agencyId_idx" ON "AgencyTenant"("agencyId");

-- 6. Alter User table: add agencyId, make email globally unique
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "agencyId" UUID REFERENCES "WebsiteAgency"("id") ON DELETE SET NULL;

-- Drop old composite unique (if it still exists from Prisma)
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_tenantId_email_key";

-- Add global unique on email (if not already)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'User' AND indexname = 'User_email_key'
  ) THEN
    CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "User_agencyId_idx" ON "User"("agencyId");

-- 7. Alter ProductOrder: add route split fields
ALTER TABLE "ProductOrder"
  ADD COLUMN IF NOT EXISTS "platformFeePercent" DOUBLE PRECISION NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS "agencyFeePercent"   DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "agencyId"           UUID,
  ADD COLUMN IF NOT EXISTS "routeTransferId"    TEXT;

COMMIT;
