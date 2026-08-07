-- RCCF-LAUNCH-01 — Production Scale Hardening: composite index migration.
-- Adds the audited composite indexes (RCCF-VALIDATION-05 Phase 2) and drops
-- redundant single-column indexes already covered by composite/unique indexes.
-- SAFETY: apply against the DIRECT PostgreSQL connection (port 5432), NOT the
-- pooled Supavisor endpoint. Verified via `prisma validate` + baseline index
-- inventory; `prisma migrate diff` (shadow-DB) equivalent was authored manually
-- because no live DB was available during the sprint.

-- ── ADD composite indexes ────────────────────────────────────────────────

CREATE INDEX "Setting_key_idx" ON "Setting"("key");

CREATE INDEX "AnalyticsEvent_tenantId_eventType_occurredAt_idx" ON "AnalyticsEvent"("tenantId", "eventType", "occurredAt");

CREATE INDEX "GalleryImage_tenantId_status_isActive_order_idx" ON "GalleryImage"("tenantId", "status", "isActive", "order");

CREATE INDEX "Product_tenantId_status_isActive_order_idx" ON "Product"("tenantId", "status", "isActive", "order");

CREATE INDEX "ProductOrder_tenantId_status_idx" ON "ProductOrder"("tenantId", "status");
CREATE INDEX "ProductOrder_tenantId_createdAt_idx" ON "ProductOrder"("tenantId", "createdAt");

CREATE INDEX "BillingInvoice_workspaceId_issuedAt_idx" ON "BillingInvoice"("workspaceId", "issuedAt");
CREATE INDEX "BillingInvoice_status_issuedAt_idx" ON "BillingInvoice"("status", "issuedAt");

CREATE INDEX "GenerationSession_status_updatedAt_idx" ON "GenerationSession"("status", "updatedAt");

CREATE INDEX "BillingEvent_type_createdAt_idx" ON "BillingEvent"("type", "createdAt");

CREATE INDEX "CommissionEntry_createdAt_idx" ON "CommissionEntry"("createdAt");

CREATE INDEX "User_role_idx" ON "User"("role");

CREATE INDEX "Tenant_createdAt_idx" ON "Tenant"("createdAt");

CREATE INDEX "BillingSubscription_planId_status_idx" ON "BillingSubscription"("planId", "status");

-- ── DROP redundant indexes (covered by composite/unique prefixes) ────────

DROP INDEX IF EXISTS "Website_tenantId_idx";
DROP INDEX IF EXISTS "PublishStatus_websiteId_idx";
DROP INDEX IF EXISTS "PublishSnapshot_websiteId_idx";
DROP INDEX IF EXISTS "Subscription_tenantId_idx";
DROP INDEX IF EXISTS "WorkspaceMember_workspaceId_idx";
DROP INDEX IF EXISTS "NewsletterSubscriber_tenantId_idx";
DROP INDEX IF EXISTS "Setting_tenantId_idx";
DROP INDEX IF EXISTS "SocialStats_tenantId_idx";
DROP INDEX IF EXISTS "Page_websiteId_idx";
DROP INDEX IF EXISTS "BillingSubscription_workspaceId_idx";
DROP INDEX IF EXISTS "Asset_tenantId_idx";
DROP INDEX IF EXISTS "Offering_tenantId_idx";
DROP INDEX IF EXISTS "Settlement_settlementRef_idx";
DROP INDEX IF EXISTS "Product_status_idx";
DROP INDEX IF EXISTS "GalleryImage_status_idx";
