-- RCCF-INTEGRATIONS-03 — Tenant-owned Resend integration.
-- Additive only. No Tenant/PaymentAccount data touched.
-- Credentials are individually AES-256-GCM encrypted (TOKEN_ENCRYPTION_KEY).

CREATE TABLE "TenantIntegration" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "verificationStatus" TEXT NOT NULL DEFAULT 'unverified',
    "credentials" JSONB,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "lastVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TenantIntegration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantIntegration_tenantId_provider_key" ON "TenantIntegration"("tenantId", "provider");
CREATE INDEX "TenantIntegration_tenantId_status_idx" ON "TenantIntegration"("tenantId", "status");
CREATE INDEX "TenantIntegration_provider_status_idx" ON "TenantIntegration"("provider", "status");

ALTER TABLE "TenantIntegration" ADD CONSTRAINT "TenantIntegration_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
