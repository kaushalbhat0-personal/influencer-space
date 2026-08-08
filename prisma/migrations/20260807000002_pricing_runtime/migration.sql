-- RCCF-IMPLEMENTATION-71 — BillingPlan becomes the runtime pricing source.
-- Additive, nullable — zero downtime.
--
-- NOTE (RCCF-LAUNCH-POLISH-05 DB sync): "id"/"planId" are UUID — the schema
-- declares @db.Uuid and planId references BillingPlan."id" (uuid). The earlier
-- TEXT version could not be applied.

ALTER TABLE "BillingPlan"
  ADD COLUMN "runtimeConfig" JSONB,
  ADD COLUMN "gracePeriodDays" INTEGER,
  ADD COLUMN "effectiveAt" TIMESTAMP(3);

CREATE TABLE "PlanPricingVersion" (
  "id" UUID NOT NULL,
  "planCode" TEXT NOT NULL,
  "planId" UUID,
  "payload" JSONB NOT NULL,
  "author" TEXT,
  "changeNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlanPricingVersion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlanPricingVersion_planCode_createdAt_idx" ON "PlanPricingVersion"("planCode", "createdAt");

ALTER TABLE "PlanPricingVersion" ADD CONSTRAINT "PlanPricingVersion_planId_fkey" FOREIGN KEY ("planId") REFERENCES "BillingPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "Coupon" (
  "id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "discountPercent" INTEGER,
  "discountAmount" DOUBLE PRECISION,
  "scope" TEXT NOT NULL DEFAULT 'creator',
  "planCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "maxUses" INTEGER,
  "usedCount" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

CREATE TABLE "LaunchProgram" (
  "id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "discountPercent" INTEGER,
  "discountAmount" DOUBLE PRECISION,
  "scope" TEXT NOT NULL DEFAULT 'platform',
  "planCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "inviteOnly" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "maxEnrollees" INTEGER,
  "enrolledCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LaunchProgram_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LaunchProgram_code_key" ON "LaunchProgram"("code");
