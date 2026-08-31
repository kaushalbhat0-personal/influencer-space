-- RCCF-LAUNCH-10 + RCCF-LAUNCH-12 — Multi-provider + Agency Commission ledger
-- Additive, idempotent — zero downtime for existing tenants.

-- Drop old single-provider unique, add multi-provider columns
DROP INDEX IF EXISTS "PaymentAccount_tenantId_key";
ALTER TABLE "PaymentAccount" ADD COLUMN IF NOT EXISTS "providerAccountId" TEXT;
ALTER TABLE "PaymentAccount" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentAccount_tenantId_provider_key" ON "PaymentAccount"("tenantId", "provider");
CREATE INDEX IF NOT EXISTS "PaymentAccount_tenantId_isActive_idx" ON "PaymentAccount"("tenantId", "isActive");

-- Agency commission ledger (idempotent orderId)
CREATE TABLE IF NOT EXISTS "AgencyOrderCommission" (
    "id" UUID NOT NULL,
    "orderId" TEXT NOT NULL,
    "agencyId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "grossAmount" DOUBLE PRECISION NOT NULL,
    "refundAmount" INTEGER NOT NULL DEFAULT 0,
    "eligibleRevenue" DOUBLE PRECISION NOT NULL,
    "commissionRate" DOUBLE PRECISION NOT NULL,
    "commissionEarned" DOUBLE PRECISION NOT NULL,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "outstanding" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNPAID',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AgencyOrderCommission_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AgencyOrderCommission_orderId_key" ON "AgencyOrderCommission"("orderId");
CREATE INDEX IF NOT EXISTS "AgencyOrderCommission_agencyId_createdAt_idx" ON "AgencyOrderCommission"("agencyId", "createdAt");
CREATE INDEX IF NOT EXISTS "AgencyOrderCommission_tenantId_idx" ON "AgencyOrderCommission"("tenantId");
CREATE INDEX IF NOT EXISTS "AgencyOrderCommission_status_idx" ON "AgencyOrderCommission"("status");
CREATE INDEX IF NOT EXISTS "AgencyOrderCommission_createdAt_idx" ON "AgencyOrderCommission"("createdAt");

CREATE TABLE IF NOT EXISTS "AgencyCommissionPayment" (
    "id" UUID NOT NULL,
    "agencyId" UUID NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reference" TEXT,
    "note" TEXT,
    "adminId" UUID,
    "adminEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgencyCommissionPayment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AgencyCommissionPayment_agencyId_createdAt_idx" ON "AgencyCommissionPayment"("agencyId", "createdAt");

CREATE TABLE IF NOT EXISTS "AgencyCommissionAllocation" (
    "id" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "commissionId" UUID NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgencyCommissionAllocation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AgencyCommissionAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "AgencyCommissionPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AgencyCommissionAllocation_commissionId_fkey" FOREIGN KEY ("commissionId") REFERENCES "AgencyOrderCommission"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "AgencyCommissionAllocation_paymentId_commissionId_key" ON "AgencyCommissionAllocation"("paymentId", "commissionId");
CREATE INDEX IF NOT EXISTS "AgencyCommissionAllocation_commissionId_idx" ON "AgencyCommissionAllocation"("commissionId");
