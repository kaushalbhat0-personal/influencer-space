-- RCCF-IMPLEMENTATION-74 — Payment Account Runtime & Direct Commerce.
-- Additive, nullable — zero downtime.
--
-- NOTE (RCCF-LAUNCH-POLISH-05 DB sync): "tenantId" must be UUID — it references
-- Tenant."id" which is @db.Uuid. The earlier TEXT version could not be applied.

ALTER TABLE "Product" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'digital';

ALTER TABLE "ProductOrder"
  ADD COLUMN "commerceStrategy" TEXT,
  ADD COLUMN "provider" TEXT,
  ADD COLUMN "providerReference" TEXT,
  ADD COLUMN "providerMetadata" JSONB;

CREATE TABLE "PaymentAccount" (
  "id" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'razorpay',
  "displayName" TEXT,
  "accountHolderName" TEXT,
  "merchantName" TEXT,
  "upiId" TEXT,
  "bankAccountName" TEXT,
  "bankAccountNumber" TEXT,
  "ifsc" TEXT,
  "settlementMode" TEXT NOT NULL DEFAULT 'upi',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "verificationStatus" TEXT NOT NULL DEFAULT 'unverified',
  "capabilities" JSONB NOT NULL DEFAULT '{}',
  "providerKeyId" TEXT,
  "providerKeySecret" TEXT,
  "lastVerifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentAccount_tenantId_key" ON "PaymentAccount"("tenantId");
CREATE INDEX "PaymentAccount_provider_idx" ON "PaymentAccount"("provider");
CREATE INDEX "PaymentAccount_status_idx" ON "PaymentAccount"("status");

ALTER TABLE "PaymentAccount" ADD CONSTRAINT "PaymentAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
