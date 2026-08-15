-- RCCF-61: Agency capacity add-ons — additional managed client websites beyond
-- the plan's included max_clients. Internal recurring entitlement: the agency
-- identity, quantity and unit price are server-derived; (agencyId, idempotencyKey)
-- makes retries idempotent; cancellation is non-destructive (status CANCELLED)
-- so historical billing records are preserved.
CREATE TABLE "AgencyCapacityAddon" (
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

CREATE UNIQUE INDEX "AgencyCapacityAddon_agencyId_idempotencyKey_key" ON "AgencyCapacityAddon"("agencyId", "idempotencyKey");
CREATE INDEX "AgencyCapacityAddon_agencyId_status_idx" ON "AgencyCapacityAddon"("agencyId", "status");
