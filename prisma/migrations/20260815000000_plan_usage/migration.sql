CREATE TABLE "PlanUsage" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "featureKey" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3),
    "used" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlanUsage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlanUsage_tenantId_featureKey_periodStart_key" ON "PlanUsage"("tenantId", "featureKey", "periodStart");
CREATE INDEX "PlanUsage_tenantId_featureKey_idx" ON "PlanUsage"("tenantId", "featureKey");
