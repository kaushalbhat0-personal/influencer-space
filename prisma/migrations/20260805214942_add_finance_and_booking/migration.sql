-- Migration: Add Booking, Settlement, SettlementItem, SettlementAttachment, PartnerLedger
-- Safe for re-run: uses IF NOT EXISTS

-- Booking
CREATE TABLE IF NOT EXISTS "Booking" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "duration" INTEGER NOT NULL DEFAULT 60,
    "slotDate" TIMESTAMP(3) NOT NULL,
    "slotStart" TEXT NOT NULL DEFAULT '09:00',
    "slotEnd" TEXT NOT NULL DEFAULT '10:00',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "customerName" TEXT,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "notes" TEXT,
    "approvalRequired" BOOLEAN NOT NULL DEFAULT true,
    "approvedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Booking_tenantId_idx" ON "Booking"("tenantId");
CREATE INDEX IF NOT EXISTS "Booking_tenantId_status_idx" ON "Booking"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "Booking_slotDate_idx" ON "Booking"("slotDate");

-- Settlement
CREATE TABLE IF NOT EXISTS "Settlement" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "partnerId" UUID NOT NULL,
    "partnerName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL DEFAULT 'manual',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "feeAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netAmount" DOUBLE PRECISION NOT NULL,
    "entryCount" INTEGER NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "transferRef" TEXT,
    "transferMethod" TEXT,
    "notes" TEXT,
    "failureReason" TEXT,
    "settlementRef" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Settlement_settlementRef_key" ON "Settlement"("settlementRef");
CREATE INDEX IF NOT EXISTS "Settlement_partnerId_idx" ON "Settlement"("partnerId");
CREATE INDEX IF NOT EXISTS "Settlement_status_idx" ON "Settlement"("status");
CREATE INDEX IF NOT EXISTS "Settlement_settlementRef_idx" ON "Settlement"("settlementRef");

-- SettlementItem
CREATE TABLE IF NOT EXISTS "SettlementItem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "settlementId" UUID NOT NULL,
    "commissionEntryId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SettlementItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SettlementItem_settlementId_idx" ON "SettlementItem"("settlementId");
CREATE INDEX IF NOT EXISTS "SettlementItem_commissionEntryId_idx" ON "SettlementItem"("commissionEntryId");

-- SettlementAttachment
CREATE TABLE IF NOT EXISTS "SettlementAttachment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "settlementId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SettlementAttachment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SettlementAttachment_settlementId_idx" ON "SettlementAttachment"("settlementId");

-- PartnerLedger
CREATE TABLE IF NOT EXISTS "PartnerLedger" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "partnerId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reference" TEXT,
    "referenceType" TEXT,
    "description" TEXT NOT NULL,
    "settlementId" UUID,
    "commissionId" TEXT,
    "balanceBefore" DOUBLE PRECISION NOT NULL,
    "balanceAfter" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PartnerLedger_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PartnerLedger_partnerId_idx" ON "PartnerLedger"("partnerId");
CREATE INDEX IF NOT EXISTS "PartnerLedger_type_idx" ON "PartnerLedger"("type");
CREATE INDEX IF NOT EXISTS "PartnerLedger_reference_idx" ON "PartnerLedger"("reference");
CREATE INDEX IF NOT EXISTS "PartnerLedger_settlementId_idx" ON "PartnerLedger"("settlementId");

-- Foreign keys
ALTER TABLE "SettlementItem" ADD CONSTRAINT "SettlementItem_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "Settlement"("id") ON DELETE CASCADE;
ALTER TABLE "SettlementAttachment" ADD CONSTRAINT "SettlementAttachment_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "Settlement"("id") ON DELETE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
