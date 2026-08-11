-- RCCF-IMPLEMENTATION-75 — loyalty commission tiers for freelancer/agency
-- partners: automatic recurring share of creator subscriptions that scales
-- with the number of active clients (live BillingSubscription). Config data,
-- resolved by active-client count at commission time.
-- Additive, nullable — zero downtime.

CREATE TABLE "LoyaltyTier" (
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

CREATE INDEX "LoyaltyTier_status_effectiveFrom_effectiveTo_idx" ON "LoyaltyTier"("status", "effectiveFrom", "effectiveTo");
