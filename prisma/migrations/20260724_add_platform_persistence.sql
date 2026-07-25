-- Migration: Add Platform Persistence Tables
-- Adds Partner, Commission, Payout, and Event models
--
-- This migration is additive only.
-- No existing tables are modified.
-- No existing columns are modified.

-- ── ENUMS ────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "PartnerType" AS ENUM ('freelancer', 'agency', 'enterprise', 'marketplace', 'affiliate');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PartnerStatus" AS ENUM ('pending', 'active', 'suspended', 'disabled', 'invited', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── PLATFORM EVENTS ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "PlatformEvent" (
    "id" UUID NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "aggregateId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'platform',
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlatformEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PlatformEvent_eventType_occurredAt_idx" ON "PlatformEvent"("eventType", "occurredAt");
CREATE INDEX IF NOT EXISTS "PlatformEvent_aggregateId_idx" ON "PlatformEvent"("aggregateId");
CREATE INDEX IF NOT EXISTS "PlatformEvent_occurredAt_idx" ON "PlatformEvent"("occurredAt");

-- ── PARTNER ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Partner" (
    "id" UUID NOT NULL,
    "type" "PartnerType" NOT NULL DEFAULT 'agency',
    "status" "PartnerStatus" NOT NULL DEFAULT 'active',
    "businessName" TEXT NOT NULL,
    "logo" TEXT,
    "website" TEXT,
    "description" TEXT,
    "taxIdentifier" TEXT,
    "country" TEXT,
    "timezone" TEXT DEFAULT 'Asia/Kolkata',
    "supportEmail" TEXT,
    "contactPerson" TEXT,
    "socialLinks" JSONB NOT NULL DEFAULT '{}',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PartnerMember" (
    "id" UUID NOT NULL,
    "partnerId" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "status" TEXT NOT NULL DEFAULT 'active',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PartnerMember_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PartnerMember_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "PartnerMember_partnerId_userId_key" ON "PartnerMember"("partnerId", "userId");

CREATE TABLE IF NOT EXISTS "PartnerWorkspaceAssignment" (
    "id" UUID NOT NULL,
    "partnerId" UUID NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "workspaceName" TEXT NOT NULL,
    "workspaceSlug" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "reason" TEXT NOT NULL DEFAULT 'created',
    "assignedBy" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transferredAt" TIMESTAMP(3),
    "removedAt" TIMESTAMP(3),
    CONSTRAINT "PartnerWorkspaceAssignment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PartnerWorkspaceAssignment_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "PartnerWorkspaceAssignment_workspaceId_key" ON "PartnerWorkspaceAssignment"("workspaceId");
CREATE INDEX IF NOT EXISTS "PartnerWorkspaceAssignment_partnerId_idx" ON "PartnerWorkspaceAssignment"("partnerId");
CREATE INDEX IF NOT EXISTS "PartnerWorkspaceAssignment_status_idx" ON "PartnerWorkspaceAssignment"("status");

CREATE TABLE IF NOT EXISTS "PartnerInvite" (
    "id" UUID NOT NULL,
    "partnerId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "invitedBy" TEXT NOT NULL,
    "acceptedBy" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PartnerInvite_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PartnerInvite_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "PartnerInvite_partnerId_status_idx" ON "PartnerInvite"("partnerId", "status");
CREATE INDEX IF NOT EXISTS "PartnerInvite_email_idx" ON "PartnerInvite"("email");

-- ── COMMISSION ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "CommissionRule" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'default',
    "status" TEXT NOT NULL DEFAULT 'active',
    "partnerId" UUID,
    "platformSharePercent" INTEGER NOT NULL,
    "partnerSharePercent" INTEGER NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 100,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommissionRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CommissionRule_partnerId_idx" ON "CommissionRule"("partnerId");
CREATE INDEX IF NOT EXISTS "CommissionRule_status_effectiveFrom_effectiveTo_idx" ON "CommissionRule"("status", "effectiveFrom", "effectiveTo");

CREATE TABLE IF NOT EXISTS "CommissionEntry" (
    "id" UUID NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "partnerId" UUID NOT NULL,
    "subscriptionId" TEXT,
    "planCode" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "platformShare" DOUBLE PRECISION NOT NULL,
    "partnerShare" DOUBLE PRECISION NOT NULL,
    "platformPercent" INTEGER NOT NULL,
    "partnerPercent" INTEGER NOT NULL,
    "entryType" TEXT NOT NULL DEFAULT 'commission_created',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "description" TEXT,
    "ruleId" UUID,
    "parentEntryId" UUID,
    "clearedAt" TIMESTAMP(3),
    "reversedAt" TIMESTAMP(3),
    "audit" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommissionEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CommissionEntry_partnerId_createdAt_idx" ON "CommissionEntry"("partnerId", "createdAt");
CREATE INDEX IF NOT EXISTS "CommissionEntry_invoiceId_idx" ON "CommissionEntry"("invoiceId");
CREATE INDEX IF NOT EXISTS "CommissionEntry_status_idx" ON "CommissionEntry"("status");

-- ── PAYOUT ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "PayoutBatch" (
    "id" UUID NOT NULL,
    "partnerId" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "provider" TEXT NOT NULL DEFAULT 'manual',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "total" DOUBLE PRECISION NOT NULL,
    "fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netAmount" DOUBLE PRECISION NOT NULL,
    "entryCount" INTEGER NOT NULL DEFAULT 1,
    "idempotencyKey" TEXT NOT NULL,
    "providerReference" TEXT,
    "bankReference" TEXT,
    "failureReason" TEXT,
    "audit" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PayoutBatch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PayoutBatch_idempotencyKey_key" ON "PayoutBatch"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "PayoutBatch_partnerId_idx" ON "PayoutBatch"("partnerId");
CREATE INDEX IF NOT EXISTS "PayoutBatch_status_idx" ON "PayoutBatch"("status");
CREATE INDEX IF NOT EXISTS "PayoutBatch_idempotencyKey_idx" ON "PayoutBatch"("idempotencyKey");

CREATE TABLE IF NOT EXISTS "PayoutReservation" (
    "id" UUID NOT NULL,
    "batchId" UUID NOT NULL,
    "partnerId" UUID NOT NULL,
    "commissionEntryId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'reserved',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    CONSTRAINT "PayoutReservation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PayoutReservation_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "PayoutBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "PayoutReservation_batchId_idx" ON "PayoutReservation"("batchId");
CREATE INDEX IF NOT EXISTS "PayoutReservation_partnerId_idx" ON "PayoutReservation"("partnerId");
CREATE INDEX IF NOT EXISTS "PayoutReservation_commissionEntryId_idx" ON "PayoutReservation"("commissionEntryId");
CREATE INDEX IF NOT EXISTS "PayoutReservation_status_idx" ON "PayoutReservation"("status");
