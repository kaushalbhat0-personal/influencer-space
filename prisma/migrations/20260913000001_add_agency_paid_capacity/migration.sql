-- RCCF-AGENCY-CAPACITY-02 — cumulative paid Partner capacity ledger
-- One immutable row per successful PAID Partner Solo/Scale invoice.
-- Period is YYYY-MM from BillingInvoice.issuedAt, quantity is 5 (Solo) or 25 (Scale).
-- Idempotent via billingInvoiceId @unique (one allocation per invoice, duplicate webhook cannot double-allocate).

CREATE TABLE IF NOT EXISTS "AgencyPaidCapacity" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "billingInvoiceId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "planCode" TEXT NOT NULL,
    "cycle" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgencyPaidCapacity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AgencyPaidCapacity_billingInvoiceId_key" ON "AgencyPaidCapacity"("billingInvoiceId");

CREATE INDEX IF NOT EXISTS "AgencyPaidCapacity_agencyId_idx" ON "AgencyPaidCapacity"("agencyId");

CREATE INDEX IF NOT EXISTS "AgencyPaidCapacity_agencyId_period_idx" ON "AgencyPaidCapacity"("agencyId", "period");
